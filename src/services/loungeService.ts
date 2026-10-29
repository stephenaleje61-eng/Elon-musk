/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';
import {
  signInAnonymously,
  linkWithCredential,
  EmailAuthProvider,
  browserLocalPersistence,
  setPersistence,
} from 'firebase/auth';
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage';
import { db, auth, storage } from '../lib/firebase';
import {
  UserProfile,
  LoungeMessage,
  PrivateConversation,
  PrivateMessage,
} from '../types';

const LOCAL_GUEST_UID_KEY = 'elonverse_guest_uid';
const LOCAL_GUEST_USERNAME_KEY = 'elonverse_guest_username';

/**
 * Initialize anonymous Firebase Guest session with persistent local storage.
 * Free instant access: No email, no password, no phone, no payment.
 */
export async function initAnonymousGuest(): Promise<{ uid: string; isNew: boolean }> {
  try {
    // 1. Ensure local persistence
    try {
      await setPersistence(auth, browserLocalPersistence);
    } catch {
      // fallback
    }

    // 2. Check if already signed in
    if (auth.currentUser) {
      return { uid: auth.currentUser.uid, isNew: false };
    }

    // 3. Perform Anonymous Sign-In
    const cred = await signInAnonymously(auth);
    const uid = cred.user.uid;
    localStorage.setItem(LOCAL_GUEST_UID_KEY, uid);
    return { uid, isNew: true };
  } catch (err: any) {
    console.warn('Anonymous sign-in notice:', err?.message || err);
    // Graceful fallback for environments where Anonymous Auth toggle in console is pending
    let fallbackUid = localStorage.getItem(LOCAL_GUEST_UID_KEY);
    if (!fallbackUid) {
      fallbackUid = 'guest_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem(LOCAL_GUEST_UID_KEY, fallbackUid);
    }
    return { uid: fallbackUid, isNew: false };
  }
}

/**
 * Fetch a user profile by UID
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    console.warn('Get user profile notice:', err);
    return null;
  }
}

/**
 * Validate and claim a unique username for a guest.
 * Enforces uniqueness via usernames/{usernameLower} collection.
 */
export async function claimUsername(
  uid: string,
  rawUsername: string
): Promise<{ success: boolean; error?: string; profile?: UserProfile }> {
  const username = rawUsername.trim();
  const usernameRegex = /^[a-zA-Z0-9_]{2,25}$/;

  if (!usernameRegex.test(username)) {
    return {
      success: false,
      error: 'Username must be 2-25 characters and contain only letters, numbers, and underscores.',
    };
  }

  const usernameLower = username.toLowerCase();

  try {
    // Check if username is already claimed
    const usernameDocRef = doc(db, 'usernames', usernameLower);
    const existingSnap = await getDoc(usernameDocRef);

    if (existingSnap.exists()) {
      const data = existingSnap.data();
      if (data.uid !== uid) {
        return {
          success: false,
          error: `Username "${username}" is already taken by another voyager. Please pick a different one.`,
        };
      }
    }

    const nowIso = new Date().toISOString();

    // Reserve username
    await setDoc(usernameDocRef, {
      uid,
      username,
      createdAt: nowIso,
    });

    // Create / update user profile
    const userDocRef = doc(db, 'users', uid);
    const profile: UserProfile = {
      uid,
      username,
      usernameLower,
      displayName: username,
      isAnonymous: auth.currentUser?.isAnonymous ?? true,
      isOnline: true,
      lastActive: nowIso,
      createdAt: nowIso,
    };

    await setDoc(userDocRef, profile, { merge: true });
    localStorage.setItem(LOCAL_GUEST_USERNAME_KEY, username);

    return { success: true, profile };
  } catch (err: any) {
    console.warn('Claim username error:', err);
    return {
      success: false,
      error: err.message || 'Failed to claim username. Please try again.',
    };
  }
}

/**
 * Update user profile details (avatar, bio, display name)
 */
export async function updateUserProfile(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      ...updates,
      lastActive: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Update profile error:', err);
  }
}

/**
 * Update real online presence status
 */
export async function setOnlinePresence(uid: string, isOnline: boolean): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      isOnline,
      lastActive: new Date().toISOString(),
    });
  } catch {
    // non-blocking
  }
}

/**
 * Real online presence subscription.
 * Only real connected users who have actually entered the chat!
 */
export function subscribeToOnlineUsers(
  onUpdate: (users: UserProfile[]) => void
): () => void {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('lastActive', 'desc'), limit(50));

  return onSnapshot(
    q,
    (snapshot) => {
      const now = Date.now();
      const onlineUsers: UserProfile[] = [];
      snapshot.forEach((d) => {
        const u = d.data() as UserProfile;
        // Count as active if marked isOnline or active within last 15 minutes
        const activeTime = new Date(u.lastActive || 0).getTime();
        const isRecent = now - activeTime < 15 * 60 * 1000;
        if (u.isOnline || isRecent) {
          onlineUsers.push(u);
        }
      });
      onUpdate(onlineUsers);
    },
    (err) => {
      console.warn('Online presence subscribe notice:', err);
    }
  );
}

/**
 * Subscribe to Elon Musk Lounge public messages
 */
export function subscribeToLoungeMessages(
  onUpdate: (messages: LoungeMessage[]) => void
): () => void {
  const msgsRef = collection(db, 'channels', 'elon-musk-lounge', 'messages');
  const q = query(msgsRef, orderBy('timestamp', 'asc'), limit(100));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: LoungeMessage[] = [];
      snapshot.forEach((d) => {
        msgs.push({ id: d.id, ...d.data() } as LoungeMessage);
      });
      onUpdate(msgs);
    },
    (err) => {
      console.warn('Lounge messages subscribe notice:', err);
    }
  );
}

/**
 * Send a message in Elon Musk Lounge
 */
export async function sendLoungeMessage(
  senderId: string,
  senderUsername: string,
  text: string,
  type: 'text' | 'image' | 'audio' = 'text',
  url?: string,
  senderAvatar?: string
): Promise<string> {
  const channelRef = collection(db, 'channels', 'elon-musk-lounge', 'messages');
  const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const docRef = doc(channelRef, msgId);

  const payload: Omit<LoungeMessage, 'id'> = {
    channelId: 'elon-musk-lounge',
    senderId,
    senderUsername,
    senderAvatar: senderAvatar || '',
    type,
    text: text.trim(),
    url: url || '',
    timestamp: new Date().toISOString(),
  };

  await setDoc(docRef, payload);
  return msgId;
}

/**
 * Private Conversations: Get or initiate 1-on-1 private chat
 */
export async function getOrCreatePrivateConversation(
  user1: { uid: string; username: string; avatarUrl?: string },
  user2: { uid: string; username: string; avatarUrl?: string }
): Promise<string> {
  const conversationId = [user1.uid, user2.uid].sort().join('__');
  const convRef = doc(db, 'private_conversations', conversationId);

  const snap = await getDoc(convRef);
  if (!snap.exists()) {
    const newConv: PrivateConversation = {
      id: conversationId,
      participants: [user1.uid, user2.uid],
      participantData: {
        [user1.uid]: { username: user1.username, avatarUrl: user1.avatarUrl || '' },
        [user2.uid]: { username: user2.username, avatarUrl: user2.avatarUrl || '' },
      },
      lastMessage: 'Chat initiated',
      lastSenderId: user1.uid,
      lastTimestamp: new Date().toISOString(),
      typing: {},
      readBy: [user1.uid],
    };
    await setDoc(convRef, newConv);
  }

  return conversationId;
}

/**
 * Subscribe to all private conversations for a user
 */
export function subscribeToUserConversations(
  uid: string,
  onUpdate: (conversations: PrivateConversation[]) => void
): () => void {
  const convsRef = collection(db, 'private_conversations');
  const q = query(convsRef, where('participants', 'array-contains', uid));

  return onSnapshot(
    q,
    (snapshot) => {
      const convs: PrivateConversation[] = [];
      snapshot.forEach((d) => {
        convs.push({ id: d.id, ...d.data() } as PrivateConversation);
      });
      convs.sort((a, b) => new Date(b.lastTimestamp || 0).getTime() - new Date(a.lastTimestamp || 0).getTime());
      onUpdate(convs);
    },
    (err) => {
      console.warn('User conversations subscribe notice:', err);
    }
  );
}

/**
 * Subscribe to private messages inside a 1-on-1 conversation
 */
export function subscribeToPrivateMessages(
  conversationId: string,
  currentUid: string,
  onUpdate: (messages: PrivateMessage[]) => void
): () => void {
  const msgsRef = collection(db, 'private_conversations', conversationId, 'messages');
  const q = query(msgsRef, orderBy('timestamp', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: PrivateMessage[] = [];
      snapshot.forEach((d) => {
        const data = { id: d.id, ...d.data() } as PrivateMessage;
        msgs.push(data);

        // Genuine Delivery & Read Receipt check:
        // If message was sent to currentUid and is still 'sent', mark 'delivered'
        if (data.recipientId === currentUid && data.status === 'sent') {
          markPrivateMessageDelivered(conversationId, d.id);
        }
      });
      onUpdate(msgs);
    },
    (err) => {
      console.warn('Private messages subscribe notice:', err);
    }
  );
}

/**
 * Send a 1-on-1 private message with genuine delivery tracking
 */
export async function sendPrivateMessage(
  conversationId: string,
  senderId: string,
  recipientId: string,
  text: string,
  type: 'text' | 'image' | 'audio' = 'text',
  url?: string
): Promise<string> {
  const msgsRef = collection(db, 'private_conversations', conversationId, 'messages');
  const msgId = 'pmsg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const msgDocRef = doc(msgsRef, msgId);

  const nowIso = new Date().toISOString();

  const payload: Omit<PrivateMessage, 'id'> = {
    conversationId,
    senderId,
    recipientId,
    type,
    text: text.trim(),
    url: url || '',
    status: 'sent',
    timestamp: nowIso,
  };

  await setDoc(msgDocRef, payload);

  // Update conversation parent document
  const convRef = doc(db, 'private_conversations', conversationId);
  await updateDoc(convRef, {
    lastMessage: type === 'image' ? '📷 Image' : type === 'audio' ? '🎤 Voice note' : text.trim(),
    lastSenderId: senderId,
    lastTimestamp: nowIso,
    readBy: [senderId],
  });

  return msgId;
}

/**
 * Genuine Delivery Receipt: Mark message as delivered
 */
export async function markPrivateMessageDelivered(
  conversationId: string,
  messageId: string
): Promise<void> {
  try {
    const msgRef = doc(db, 'private_conversations', conversationId, 'messages', messageId);
    await updateDoc(msgRef, {
      status: 'delivered',
      deliveredAt: new Date().toISOString(),
    });
  } catch {
    // non-blocking
  }
}

/**
 * Genuine Read Receipt: Mark message as read
 */
export async function markPrivateMessageRead(
  conversationId: string,
  messageId: string
): Promise<void> {
  try {
    const msgRef = doc(db, 'private_conversations', conversationId, 'messages', messageId);
    await updateDoc(msgRef, {
      status: 'read',
      readAt: new Date().toISOString(),
    });

    // Also update readBy array on conversation
    if (auth.currentUser?.uid) {
      const convRef = doc(db, 'private_conversations', conversationId);
      await updateDoc(convRef, {
        readBy: arrayUnion(auth.currentUser.uid),
      });
    }
  } catch {
    // non-blocking
  }
}

/**
 * Typing indicator: Set real typing status
 */
export async function setTypingStatus(
  conversationId: string,
  uid: string,
  isTyping: boolean
): Promise<void> {
  try {
    const convRef = doc(db, 'private_conversations', conversationId);
    await updateDoc(convRef, {
      [`typing.${uid}`]: isTyping,
    });
  } catch {
    // non-blocking
  }
}

/**
 * Audio Voice Note upload to Firebase Storage
 */
export async function uploadVoiceNote(
  uid: string,
  audioBlob: Blob,
  onProgress?: (progress: number) => void
): Promise<string> {
  const timestamp = Date.now();
  const filePath = `voice_notes/${uid}/${timestamp}.webm`;
  const storageRef = ref(storage, filePath);

  const uploadTask = uploadBytesResumable(storageRef, audioBlob, {
    contentType: audioBlob.type || 'audio/webm',
  });

  return new Promise<string>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snap) => {
        const prog = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        if (onProgress) onProgress(prog);
      },
      (error) => {
        // Fallback to data URI if storage upload encounters rule block
        console.warn('Storage upload fallback:', error);
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (e) {
          // Fallback to data URL
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        }
      }
    );
  });
}

/**
 * Abuse report functionality
 */
export async function reportUser(
  reporterId: string,
  reportedUserId: string,
  reason: string,
  conversationId?: string
): Promise<void> {
  const reportsCol = collection(db, 'reports');
  const reportId = 'rep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  await setDoc(doc(reportsCol, reportId), {
    reportId,
    reporterId,
    reportedUserId,
    reason: reason.trim(),
    conversationId: conversationId || null,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Block user functionality
 */
export async function blockUser(uid: string, targetUid: string): Promise<void> {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    blockedUsers: arrayUnion(targetUid),
  });
}

/**
 * Optional Account Upgrade: Link email/password credential to existing anonymous account
 * Retains user UID, username, conversation history, and messages.
 */
export async function upgradeGuestAccount(
  email: string,
  pass: string
): Promise<{ success: boolean; error?: string }> {
  const user = auth.currentUser;
  if (!user) {
    return { success: false, error: 'No active session to upgrade.' };
  }

  try {
    const credential = EmailAuthProvider.credential(email, pass);
    await linkWithCredential(user, credential);

    // Update profile isAnonymous flag
    await updateDoc(doc(db, 'users', user.uid), {
      isAnonymous: false,
      email: email,
    });

    return { success: true };
  } catch (err: any) {
    console.warn('Account upgrade notice:', err);
    return {
      success: false,
      error: err.message || 'Failed to upgrade account. Please try again.',
    };
  }
}
