/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
import {
  db,
  auth,
  storage,
  ADMIN_EMAIL,
  isAuthorizedAdmin,
  OperationType,
  handleFirestoreError,
} from '../lib/firebase';
import { ChatMessage, Conversation, AdminAuditLog } from '../types';

const VISITOR_ID_KEY = 'elonverse_visitorId';
const VISITOR_NAME_KEY = 'elonverse_visitor_name';

/**
 * Get or create a permanent visitor ID stored in localStorage.
 * Chat history will persist across page refreshes, browser restarts, and deployments.
 */
export function getOrCreateVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY) || localStorage.getItem('elonverse_visitor_id');
    if (!id || id.trim().length === 0) {
      id = 'visitor_' + Math.random().toString(36).substring(2, 15);
    }
    localStorage.setItem(VISITOR_ID_KEY, id);
    return id;
  } catch {
    return 'visitor_' + Math.random().toString(36).substring(2, 15);
  }
}

export function getVisitorName(): string {
  try {
    return localStorage.getItem(VISITOR_NAME_KEY) || 'Starship Voyager';
  } catch {
    return 'Starship Voyager';
  }
}

export function setVisitorName(name: string): void {
  try {
    localStorage.setItem(VISITOR_NAME_KEY, name.trim());
  } catch {
    // ignore
  }
}

/**
 * Check if the current authenticated user is an authorized administrator.
 */
export function isCurrentAdmin(): boolean {
  const user = auth.currentUser;
  if (!user || !user.email) {
    const sessionEmail = localStorage.getItem('elonverse_admin_session');
    return isAuthorizedAdmin(sessionEmail);
  }
  return isAuthorizedAdmin(user.email);
}

/**
 * Log administrative operations safely to the immutable admin_audit_logs collection.
 */
async function recordAdminAuditLog(log: Omit<AdminAuditLog, 'timestamp'>): Promise<void> {
  try {
    const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const logRef = doc(db, 'admin_audit_logs', logId);
    await setDoc(logRef, {
      ...log,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Audit log write error:', err);
  }
}

/**
 * Send a text message to a conversation.
 */
export async function sendTextMessage(
  visitorId: string,
  text: string,
  sender: 'visitor' | 'admin',
  visitorName?: string
): Promise<string> {
  const cleanText = text.trim();
  if (!cleanText) throw new Error('Message text cannot be empty');

  // Verify non-admins cannot impersonate admin
  if (sender === 'admin' && !isCurrentAdmin()) {
    throw new Error('Unauthorized: Only verified admin can send messages as admin.');
  }

  const nowIso = new Date().toISOString();
  const convRef = doc(db, 'conversations', visitorId);
  const messagesColRef = collection(db, 'conversations', visitorId, 'messages');
  const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const msgDocRef = doc(messagesColRef, messageId);

  try {
    // 1. Ensure conversation document exists / updated
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) {
      await setDoc(convRef, {
        visitorId,
        visitorName: visitorName || getVisitorName(),
        lastMessage: cleanText,
        lastSender: sender,
        createdAt: nowIso,
        updatedAt: nowIso,
        unreadByAdmin: sender === 'visitor' ? 1 : 0,
        unreadByVisitor: sender === 'admin' ? 1 : 0,
      });
    } else {
      const existing = convSnap.data() as Conversation;
      await setDoc(
        convRef,
        {
          visitorId,
          lastMessage: cleanText,
          lastSender: sender,
          updatedAt: nowIso,
          unreadByAdmin: sender === 'visitor' ? (existing.unreadByAdmin || 0) + 1 : 0,
          unreadByVisitor: sender === 'admin' ? (existing.unreadByVisitor || 0) + 1 : 0,
        },
        { merge: true }
      );
    }

    // 2. Add message document
    await setDoc(msgDocRef, {
      visitorId,
      sender,
      type: 'text',
      text: cleanText,
      timestamp: nowIso,
    });

    return messageId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `conversations/${visitorId}/messages/${messageId}`);
  }
}

export interface UploadProgressCallback {
  (progress: number): void;
}

/**
 * Validate image file constraints:
 * - JPG, JPEG, PNG, WEBP
 * - Max size: 5 MB (5 * 1024 * 1024 bytes)
 */
export function validateImageFile(file: File): { valid: boolean; error?: string; extension: string } {
  const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedMime.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPG, PNG, and WEBP formats are accepted.',
      extension: 'jpg',
    };
  }

  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
  if (file.size > MAX_SIZE) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeInMB} MB). Maximum allowed size is 5 MB.`,
      extension: 'jpg',
    };
  }

  let extension = 'jpg';
  if (file.type === 'image/png') extension = 'png';
  else if (file.type === 'image/webp') extension = 'webp';
  else if (file.name.toLowerCase().endsWith('.png')) extension = 'png';
  else if (file.name.toLowerCase().endsWith('.webp')) extension = 'webp';

  return { valid: true, extension };
}

/**
 * Send an image message with upload progress tracking and Storage URL storage.
 * Storage path: chat_images/{visitorId}/{timestamp}_image.{ext}
 */
export async function sendImageMessage(
  visitorId: string,
  file: File,
  sender: 'visitor' | 'admin',
  caption?: string,
  onProgress?: UploadProgressCallback,
  visitorName?: string
): Promise<string> {
  if (sender === 'admin' && !isCurrentAdmin()) {
    throw new Error('Unauthorized: Only verified admin can send messages as admin.');
  }

  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const timestamp = Date.now();
  const filePath = `chat_images/${visitorId}/${timestamp}_image.${validation.extension}`;
  const storageReference = ref(storage, filePath);

  // 1. Upload to Firebase Storage
  const uploadTask = uploadBytesResumable(storageReference, file, {
    contentType: file.type,
  });

  const downloadURL = await new Promise<string>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (onProgress) onProgress(progress);
      },
      (error) => {
        reject(new Error(`Storage upload failed: ${error.message}`));
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (e) {
          reject(e);
        }
      }
    );
  });

  // 2. Save image message to Firestore conversation
  const nowIso = new Date().toISOString();
  const convRef = doc(db, 'conversations', visitorId);
  const messagesColRef = collection(db, 'conversations', visitorId, 'messages');
  const messageId = 'msg_' + timestamp + '_' + Math.random().toString(36).substring(2, 7);
  const msgDocRef = doc(messagesColRef, messageId);

  const displaySnippet = caption && caption.trim().length > 0 ? `📷 ${caption.trim()}` : '📷 Image';

  try {
    const convSnap = await getDoc(convRef);
    if (!convSnap.exists()) {
      await setDoc(convRef, {
        visitorId,
        visitorName: visitorName || getVisitorName(),
        lastMessage: displaySnippet,
        lastSender: sender,
        createdAt: nowIso,
        updatedAt: nowIso,
        unreadByAdmin: sender === 'visitor' ? 1 : 0,
        unreadByVisitor: sender === 'admin' ? 1 : 0,
      });
    } else {
      const existing = convSnap.data() as Conversation;
      await setDoc(
        convRef,
        {
          visitorId,
          lastMessage: displaySnippet,
          lastSender: sender,
          updatedAt: nowIso,
          unreadByAdmin: sender === 'visitor' ? (existing.unreadByAdmin || 0) + 1 : 0,
          unreadByVisitor: sender === 'admin' ? (existing.unreadByVisitor || 0) + 1 : 0,
        },
        { merge: true }
      );
    }

    await setDoc(msgDocRef, {
      visitorId,
      sender,
      type: 'image',
      url: downloadURL,
      text: caption ? caption.trim() : '',
      timestamp: nowIso,
    });

    return messageId;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `conversations/${visitorId}/messages/${messageId}`);
  }
}

/**
 * Delete a specific message.
 * STRICT ADMIN ONLY: verified email elonmuskspace241@gmail.com.
 */
export async function deleteMessage(visitorId: string, messageId: string): Promise<void> {
  if (!isCurrentAdmin()) {
    throw new Error(`Unauthorized: Deletion denied. Administrator verification required for ${ADMIN_EMAIL}.`);
  }

  const msgRef = doc(db, 'conversations', visitorId, 'messages', messageId);

  try {
    // If message is an image, attempt deleting file from storage
    try {
      const snap = await getDoc(msgRef);
      if (snap.exists()) {
        const data = snap.data() as ChatMessage;
        if (data.type === 'image' && data.url) {
          try {
            // Delete via storage reference from URL
            const fileRef = ref(storage, data.url);
            await deleteObject(fileRef);
          } catch (storageErr) {
            console.warn('Could not delete storage image file:', storageErr);
          }
        }
      }
    } catch {
      // Proceed with Firestore deletion even if storage lookup is partial
    }

    await deleteDoc(msgRef);

    // Record audit log
    await recordAdminAuditLog({
      action: 'deleteMessage',
      adminEmail: auth.currentUser?.email || ADMIN_EMAIL,
      targetVisitorId: visitorId,
      targetMessageId: messageId,
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `conversations/${visitorId}/messages/${messageId}`);
  }
}

/**
 * Delete a conversation, its messages, and its associated Storage images.
 * STRICT ADMIN ONLY: verified email elonmuskspace241@gmail.com.
 * Uses Firestore chunked batch operations for large conversations (max 400 per batch).
 */
export async function deleteConversation(visitorId: string): Promise<{ success: boolean; deletedMessagesCount: number }> {
  if (!isCurrentAdmin()) {
    throw new Error(`Unauthorized: Deletion denied. Only verified administrator (${ADMIN_EMAIL}) can delete conversations.`);
  }

  const convRef = doc(db, 'conversations', visitorId);
  const messagesColRef = collection(db, 'conversations', visitorId, 'messages');

  let totalDeleted = 0;

  try {
    // 1. Fetch all messages in the conversation
    const messagesSnap = await getDocs(messagesColRef);
    const messageDocs = messagesSnap.docs;

    // 2. Delete messages in chunks of 400 to comply with batch limits
    const CHUNK_SIZE = 400;
    for (let i = 0; i < messageDocs.length; i += CHUNK_SIZE) {
      const chunk = messageDocs.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      for (const msgDoc of chunk) {
        batch.delete(msgDoc.ref);
      }
      await batch.commit();
      totalDeleted += chunk.length;
    }

    // 3. Delete associated storage images under chat_images/{visitorId}/
    try {
      const folderRef = ref(storage, `chat_images/${visitorId}`);
      const fileList = await listAll(folderRef);
      await Promise.allSettled(fileList.items.map((item) => deleteObject(item)));
    } catch (storageErr) {
      console.warn('Chat images folder cleanup note:', storageErr);
    }

    // 4. Delete the parent conversation document
    await deleteDoc(convRef);

    // 5. Audit log
    await recordAdminAuditLog({
      action: 'deleteConversation',
      adminEmail: auth.currentUser?.email || ADMIN_EMAIL,
      targetVisitorId: visitorId,
    });

    return { success: true, deletedMessagesCount: totalDeleted };
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `conversations/${visitorId}`);
  }
}

/**
 * Real-time subscription to a single visitor's messages.
 */
export function subscribeToMessages(
  visitorId: string,
  onUpdate: (messages: ChatMessage[]) => void,
  onError?: (error: Error) => void
): () => void {
  const messagesColRef = collection(db, 'conversations', visitorId, 'messages');
  const q = query(messagesColRef, orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        msgs.push({
          id: docSnap.id,
          visitorId: data.visitorId || visitorId,
          sender: data.sender || 'visitor',
          type: data.type || 'text',
          text: data.text || '',
          url: data.url || '',
          timestamp: data.timestamp || new Date().toISOString(),
        });
      });
      onUpdate(msgs);
    },
    (error) => {
      console.error(`Error subscribing to messages for ${visitorId}:`, error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, `conversations/${visitorId}/messages`);
    }
  );
}

/**
 * Real-time subscription to all conversations for the Admin Dashboard.
 */
export function subscribeToAllConversations(
  onUpdate: (conversations: Conversation[]) => void,
  onError?: (error: Error) => void
): () => void {
  const convColRef = collection(db, 'conversations');
  const q = query(convColRef, orderBy('updatedAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const convs: Conversation[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        convs.push({
          visitorId: docSnap.id,
          visitorName: data.visitorName || 'Voyager ' + docSnap.id.slice(-4),
          lastMessage: data.lastMessage || '',
          lastSender: data.lastSender || 'visitor',
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || '',
          unreadByAdmin: data.unreadByAdmin || 0,
          unreadByVisitor: data.unreadByVisitor || 0,
        });
      });
      onUpdate(convs);
    },
    (error) => {
      console.error('Error subscribing to conversations:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, 'conversations');
    }
  );
}

/**
 * Mark messages as read by admin
 */
export async function markAsReadByAdmin(visitorId: string): Promise<void> {
  if (!isCurrentAdmin()) return;
  try {
    const convRef = doc(db, 'conversations', visitorId);
    await setDoc(convRef, { unreadByAdmin: 0 }, { merge: true });
  } catch (err) {
    console.warn('Could not reset admin unread count:', err);
  }
}

/**
 * Mark messages as read by visitor
 */
export async function markAsReadByVisitor(visitorId: string): Promise<void> {
  try {
    const convRef = doc(db, 'conversations', visitorId);
    await setDoc(convRef, { unreadByVisitor: 0 }, { merge: true });
  } catch (err) {
    console.warn('Could not reset visitor unread count:', err);
  }
}
