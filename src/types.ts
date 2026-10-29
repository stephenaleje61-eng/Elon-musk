/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ChatMessage {
  id: string;
  visitorId: string;
  sender: 'visitor' | 'admin';
  type: 'text' | 'image' | 'audio';
  text?: string;
  url?: string;
  timestamp: string;
}

export interface Conversation {
  visitorId: string;
  visitorName?: string;
  lastMessage?: string;
  lastSender?: 'visitor' | 'admin';
  createdAt: string;
  updatedAt: string;
  unreadByAdmin?: number;
  unreadByVisitor?: number;
}

export interface AdminAuditLog {
  id?: string;
  action: 'deleteConversation' | 'deleteMessage';
  adminEmail: string;
  targetVisitorId: string;
  targetMessageId?: string;
  timestamp: string;
}

export interface UserProfile {
  uid: string;
  username: string;
  usernameLower: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  isAnonymous: boolean;
  isOnline: boolean;
  lastActive: string;
  blockedUsers?: string[];
  createdAt: string;
}

export interface LoungeMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderUsername: string;
  senderAvatar?: string;
  type: 'text' | 'image' | 'audio';
  text?: string;
  url?: string;
  timestamp: string;
}

export interface PrivateConversation {
  id: string;
  participants: string[];
  participantData?: {
    [uid: string]: {
      username: string;
      avatarUrl?: string;
    };
  };
  lastMessage?: string;
  lastSenderId?: string;
  lastTimestamp?: string;
  typing?: {
    [uid: string]: boolean;
  };
  readBy?: string[];
}

export interface PrivateMessage {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  type: 'text' | 'image' | 'audio';
  text?: string;
  url?: string;
  status: 'sent' | 'delivered' | 'read';
  deliveredAt?: string;
  readAt?: string;
  timestamp: string;
}
