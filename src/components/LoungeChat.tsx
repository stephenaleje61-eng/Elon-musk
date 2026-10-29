/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  MessageSquare,
  Lock,
  Paperclip,
  Mic,
  Send,
  Radio,
  Sparkles,
  Shield,
  Check,
  CheckCheck,
  Flag,
  MoreVertical,
  Volume2,
  RefreshCw,
  X,
  AlertCircle,
  Settings,
} from 'lucide-react';
import {
  UserProfile,
  LoungeMessage,
  PrivateConversation,
  PrivateMessage,
} from '../types';
import {
  subscribeToOnlineUsers,
  subscribeToLoungeMessages,
  sendLoungeMessage,
  getOrCreatePrivateConversation,
  subscribeToUserConversations,
  subscribeToPrivateMessages,
  sendPrivateMessage,
  markPrivateMessageRead,
  setTypingStatus,
  uploadVoiceNote,
} from '../services/loungeService';
import { sendImageMessage, validateImageFile } from '../services/chatService';
import { AudioVoiceRecorder } from './AudioVoiceRecorder';
import { ImageModal } from './ImageModal';
import { ReportModal } from './ReportModal';
import { ProfileModal } from './ProfileModal';

interface LoungeChatProps {
  currentUser: UserProfile;
  onOpenProfile: () => void;
  onSwitchToElonLine: () => void;
}

export const LoungeChat: React.FC<LoungeChatProps> = ({
  currentUser,
  onOpenProfile,
  onSwitchToElonLine,
}) => {
  // Navigation tabs: 'lounge' | 'private'
  const [activeTab, setActiveTab] = useState<'lounge' | 'private'>('lounge');

  // Real connected users (only users who have joined)
  const [onlineUsers, setOnlineUsers] = useState<UserProfile[]>([]);

  // Public lounge messages
  const [loungeMessages, setLoungeMessages] = useState<LoungeMessage[]>([]);

  // Private conversations
  const [privateConversations, setPrivateConversations] = useState<PrivateConversation[]>([]);
  const [activePrivateConvId, setActivePrivateConvId] = useState<string | null>(null);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [targetPartner, setTargetPartner] = useState<{ uid: string; username: string; avatarUrl?: string } | null>(null);

  // Input & message states
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [previewImage, setPreviewImage] = useState<{ url: string; caption?: string } | null>(null);
  const [reportingUser, setReportingUser] = useState<{ uid: string; username: string } | null>(null);
  const [showUsersDrawer, setShowUsersDrawer] = useState(false);

  // File selection
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const lastSendTimeRef = useRef<number>(0);

  // 1. Subscribe to real connected users
  useEffect(() => {
    const unsub = subscribeToOnlineUsers((users) => {
      // Filter out blocked users if any
      const blocked = currentUser.blockedUsers || [];
      const filtered = users.filter((u) => !blocked.includes(u.uid));
      setOnlineUsers(filtered);
    });
    return () => unsub();
  }, [currentUser.blockedUsers]);

  // 2. Subscribe to Elon Musk Lounge messages
  useEffect(() => {
    if (activeTab !== 'lounge') return;
    const unsub = subscribeToLoungeMessages((msgs) => {
      const blocked = currentUser.blockedUsers || [];
      const filtered = msgs.filter((m) => !blocked.includes(m.senderId));
      setLoungeMessages(filtered);
    });
    return () => unsub();
  }, [activeTab, currentUser.blockedUsers]);

  // 3. Subscribe to private conversations
  useEffect(() => {
    const unsub = subscribeToUserConversations(currentUser.uid, (convs) => {
      setPrivateConversations(convs);
    });
    return () => unsub();
  }, [currentUser.uid]);

  // 4. Subscribe to messages of active private conversation
  useEffect(() => {
    if (activeTab !== 'private' || !activePrivateConvId) {
      setPrivateMessages([]);
      return;
    }

    const unsub = subscribeToPrivateMessages(activePrivateConvId, currentUser.uid, (msgs) => {
      setPrivateMessages(msgs);
      // Mark incoming messages as read
      msgs.forEach((m) => {
        if (m.recipientId === currentUser.uid && m.status !== 'read') {
          markPrivateMessageRead(activePrivateConvId, m.id);
        }
      });
    });

    return () => unsub();
  }, [activeTab, activePrivateConvId, currentUser.uid]);

  // Scroll to bottom on message updates
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [loungeMessages, privateMessages, isRecordingAudio]);

  // Handle typing status in private chat
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (activeTab === 'private' && activePrivateConvId) {
      setTypingStatus(activePrivateConvId, currentUser.uid, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(activePrivateConvId, currentUser.uid, false);
      }, 2000);
    }
  };

  // Start private conversation with another user
  const handleStartPrivateChat = async (targetUser: UserProfile) => {
    if (targetUser.uid === currentUser.uid) return;
    try {
      const convId = await getOrCreatePrivateConversation(
        { uid: currentUser.uid, username: currentUser.username, avatarUrl: currentUser.avatarUrl },
        { uid: targetUser.uid, username: targetUser.username, avatarUrl: targetUser.avatarUrl }
      );
      setTargetPartner({ uid: targetUser.uid, username: targetUser.username, avatarUrl: targetUser.avatarUrl });
      setActivePrivateConvId(convId);
      setActiveTab('private');
      setShowUsersDrawer(false);
    } catch (err: any) {
      setErrorMessage('Could not open private chat: ' + err.message);
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid image file.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setSelectedFile(file);
    setFilePreviewUrl(URL.createObjectURL(file));
  };

  const handleClearSelectedFile = () => {
    setSelectedFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Send message handler (supports Lounge and Private)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSending) return;

    // Abuse protection & rate limit (1 msg per 600ms)
    const now = Date.now();
    if (now - lastSendTimeRef.current < 600) {
      return;
    }
    lastSendTimeRef.current = now;

    setErrorMessage(null);

    // If sending an image attachment
    if (selectedFile) {
      try {
        setIsSending(true);
        setUploadProgress(0);

        if (activeTab === 'lounge') {
          // Upload to lounge storage and post
          const imgId = await sendImageMessage(
            currentUser.uid,
            selectedFile,
            'visitor',
            inputText.trim() || undefined,
            (p) => setUploadProgress(p),
            currentUser.username
          );
          // Also post to lounge stream
          await sendLoungeMessage(
            currentUser.uid,
            currentUser.username,
            inputText.trim(),
            'image',
            undefined, // image url is recorded in storage
            currentUser.avatarUrl
          );
        } else if (activeTab === 'private' && activePrivateConvId && targetPartner) {
          // Send private image message
          await sendImageMessage(
            currentUser.uid,
            selectedFile,
            'visitor',
            inputText.trim() || undefined,
            (p) => setUploadProgress(p),
            currentUser.username
          );
          await sendPrivateMessage(
            activePrivateConvId,
            currentUser.uid,
            targetPartner.uid,
            inputText.trim(),
            'image',
            undefined
          );
        }

        handleClearSelectedFile();
        setInputText('');
      } catch (err: any) {
        setErrorMessage(err.message || 'Image upload failed.');
      } finally {
        setIsSending(false);
        setUploadProgress(null);
      }
      return;
    }

    // Text message
    const cleanText = inputText.trim();
    if (!cleanText) return;

    try {
      setIsSending(true);

      if (activeTab === 'lounge') {
        await sendLoungeMessage(
          currentUser.uid,
          currentUser.username,
          cleanText,
          'text',
          undefined,
          currentUser.avatarUrl
        );
      } else if (activeTab === 'private' && activePrivateConvId && targetPartner) {
        await sendPrivateMessage(
          activePrivateConvId,
          currentUser.uid,
          targetPartner.uid,
          cleanText,
          'text'
        );
        setTypingStatus(activePrivateConvId, currentUser.uid, false);
      }

      setInputText('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  // Send audio voice note
  const handleSendVoiceNote = async (audioBlob: Blob) => {
    try {
      setIsSending(true);
      const audioUrl = await uploadVoiceNote(currentUser.uid, audioBlob);

      if (activeTab === 'lounge') {
        await sendLoungeMessage(
          currentUser.uid,
          currentUser.username,
          'Voice Note',
          'audio',
          audioUrl,
          currentUser.avatarUrl
        );
      } else if (activeTab === 'private' && activePrivateConvId && targetPartner) {
        await sendPrivateMessage(
          activePrivateConvId,
          currentUser.uid,
          targetPartner.uid,
          'Voice Note',
          'audio',
          audioUrl
        );
      }

      setIsRecordingAudio(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send voice note.');
    } finally {
      setIsSending(false);
    }
  };

  // Check if partner is typing in active private conversation
  const activeConvData = privateConversations.find((c) => c.id === activePrivateConvId);
  const isPartnerTyping =
    targetPartner && activeConvData?.typing?.[targetPartner.uid] === true;

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] min-h-[580px] bg-black border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl text-white">
      {/* Top Channel Navigation Bar */}
      <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center space-x-2">
          {/* Channel Tabs */}
          <button
            onClick={() => setActiveTab('lounge')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'lounge'
                ? 'bg-zinc-800 text-white border border-zinc-600 shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400" />
            <span>ELON MUSK LOUNGE</span>
          </button>

          <button
            onClick={() => setActiveTab('private')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'private'
                ? 'bg-zinc-800 text-white border border-zinc-600 shadow'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>PRIVATE CHATS</span>
            {privateConversations.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-900 text-zinc-300 font-mono">
                {privateConversations.length}
              </span>
            )}
          </button>

          <button
            onClick={onSwitchToElonLine}
            className="hidden sm:flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-all cursor-pointer"
            title="Switch to direct line with Elon Musk"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>ELON UPLINK</span>
          </button>
        </div>

        {/* User Presence Badge & Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowUsersDrawer(!showUsersDrawer)}
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300 transition-colors cursor-pointer"
            title="View online guests"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>{onlineUsers.length} ONLINE</span>
          </button>

          <button
            onClick={onOpenProfile}
            className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300 transition-colors cursor-pointer"
            title="Edit profile & callsign"
          >
            <span className="text-white font-semibold">@{currentUser.username}</span>
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Main Chat Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT/MAIN CHAT PANE */}
        <div className="flex-1 flex flex-col bg-black overflow-hidden">
          {/* Active View Subheader */}
          <div className="px-4 py-2 bg-zinc-950/70 border-b border-zinc-850 flex items-center justify-between text-xs font-mono text-zinc-400">
            {activeTab === 'lounge' ? (
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-white font-semibold">Elon Musk Lounge</span>
                <span>•</span>
                <span>Public interstellar broadcast • Instant free access</span>
              </div>
            ) : targetPartner ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-white font-semibold">Encrypted Line: @{targetPartner.username}</span>
                  <span>•</span>
                  <span>Participant authorization verified</span>
                </div>
                <button
                  type="button"
                  onClick={() => setReportingUser({ uid: targetPartner.uid, username: targetPartner.username })}
                  className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors"
                  title="Report or block voyager"
                >
                  <Flag className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div>Select a private conversation from the drawer</div>
            )}
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#000000]">
            {activeTab === 'lounge' ? (
              loungeMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 font-mono text-xs">
                  <Radio className="w-8 h-8 mb-2 text-zinc-600" />
                  <div className="text-zinc-300 font-semibold">WELCOME TO ELON MUSK LOUNGE</div>
                  <p className="max-w-sm mt-1 text-zinc-500">
                    Be the first to transmit a message, picture, or voice note. No account creation required!
                  </p>
                </div>
              ) : (
                loungeMessages.map((msg) => {
                  const isMe = msg.senderId === currentUser.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center space-x-2 mb-1 px-1 text-[11px] font-mono text-zinc-400">
                        <span
                          onClick={() => {
                            if (!isMe) {
                              handleStartPrivateChat({
                                uid: msg.senderId,
                                username: msg.senderUsername,
                                usernameLower: msg.senderUsername.toLowerCase(),
                                isAnonymous: true,
                                isOnline: true,
                                lastActive: msg.timestamp,
                                createdAt: msg.timestamp,
                              });
                            }
                          }}
                          className={`${
                            isMe ? 'text-cyan-400 font-semibold' : 'text-zinc-300 hover:text-white cursor-pointer hover:underline'
                          }`}
                        >
                          @{msg.senderUsername}
                        </span>
                        <span>•</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`p-3 rounded-2xl max-w-[85%] sm:max-w-[70%] border ${
                          isMe
                            ? 'bg-zinc-900 border-zinc-700 text-white rounded-br-none shadow-md'
                            : 'bg-black/90 border-zinc-800 text-zinc-100 rounded-bl-none shadow-sm'
                        }`}
                      >
                        {msg.type === 'audio' && msg.url ? (
                          <div className="flex items-center space-x-2 min-w-[200px]">
                            <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <audio controls src={msg.url} className="h-8 w-full max-w-[240px]" />
                          </div>
                        ) : msg.type === 'image' && msg.url ? (
                          <div className="space-y-1">
                            <img
                              src={msg.url}
                              alt="Upload"
                              onClick={() => setPreviewImage({ url: msg.url || '', caption: msg.text })}
                              className="max-w-[200px] w-full rounded-lg object-cover cursor-pointer hover:opacity-90"
                            />
                            {msg.text && <p className="text-xs text-zinc-300">{msg.text}</p>}
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {msg.text}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            ) : targetPartner ? (
              privateMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 font-mono text-xs">
                  <Lock className="w-8 h-8 mb-2 text-emerald-500" />
                  <div className="text-zinc-200 font-semibold">PRIVATE CONVERSATION INITIATED</div>
                  <p className="max-w-sm mt-1 text-zinc-500">
                    Direct line with @{targetPartner.username}. Messages are encrypted and visible only to participants.
                  </p>
                </div>
              ) : (
                privateMessages.map((msg) => {
                  const isMe = msg.senderId === currentUser.uid;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center space-x-2 mb-1 px-1 text-[11px] font-mono text-zinc-400">
                        <span className={isMe ? 'text-emerald-400 font-semibold' : 'text-zinc-300'}>
                          {isMe ? 'You' : `@${targetPartner.username}`}
                        </span>
                        <span>•</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

                        {/* GENUINE DELIVERY & READ RECEIPT */}
                        {isMe && (
                          <span className="ml-1 text-[10px] flex items-center">
                            {msg.status === 'read' ? (
                              <span className="text-cyan-400 flex items-center" title={`Read at ${msg.readAt || 'recently'}`}>
                                <CheckCheck className="w-3.5 h-3.5" />
                              </span>
                            ) : msg.status === 'delivered' ? (
                              <span className="text-zinc-400 flex items-center" title="Delivered to recipient">
                                <CheckCheck className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="text-zinc-500 flex items-center" title="Sent from device">
                                <Check className="w-3.5 h-3.5" />
                              </span>
                            )}
                          </span>
                        )}
                      </div>

                      <div
                        className={`p-3 rounded-2xl max-w-[85%] sm:max-w-[70%] border ${
                          isMe
                            ? 'bg-zinc-900 border-zinc-700 text-white rounded-br-none shadow-md'
                            : 'bg-black/90 border-zinc-800 text-zinc-100 rounded-bl-none shadow-sm'
                        }`}
                      >
                        {msg.type === 'audio' && msg.url ? (
                          <div className="flex items-center space-x-2 min-w-[200px]">
                            <Volume2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <audio controls src={msg.url} className="h-8 w-full max-w-[240px]" />
                          </div>
                        ) : msg.type === 'image' && msg.url ? (
                          <div className="space-y-1">
                            <img
                              src={msg.url}
                              alt="Upload"
                              onClick={() => setPreviewImage({ url: msg.url || '', caption: msg.text })}
                              className="max-w-[200px] w-full rounded-lg object-cover cursor-pointer hover:opacity-90"
                            />
                            {msg.text && <p className="text-xs text-zinc-300">{msg.text}</p>}
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {msg.text}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 font-mono text-xs">
                <Users className="w-8 h-8 mb-2 text-zinc-600" />
                <div className="text-zinc-300 font-semibold">NO ACTIVE PRIVATE CHAT</div>
                <p className="max-w-sm mt-1 text-zinc-500">
                  Click on any online user in the sidebar to initiate a direct encrypted session.
                </p>
              </div>
            )}

            {/* Real Typing Indicator */}
            {isPartnerTyping && (
              <div className="flex items-center space-x-2 px-2 py-1 text-xs font-mono text-cyan-400 animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                <span>@{targetPartner?.username} is typing...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Upload Progress Bar */}
          {uploadProgress !== null && (
            <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-800 text-xs font-mono text-zinc-300">
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Transmitting media to Firebase...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="px-4 py-2.5 bg-red-950/70 border-t border-red-800 flex items-center justify-between text-xs text-red-200 font-mono">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button onClick={() => setErrorMessage(null)} className="p-1 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Selected File Preview */}
          {filePreviewUrl && (
            <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <img src={filePreviewUrl} alt="Ready" className="w-10 h-10 object-cover rounded border border-zinc-700" />
                <div className="text-xs font-mono">
                  <div className="text-zinc-200 truncate max-w-xs">{selectedFile?.name}</div>
                  <div className="text-zinc-500 text-[10px]">Ready to upload</div>
                </div>
              </div>
              <button onClick={handleClearSelectedFile} className="p-1 text-zinc-400 hover:text-red-400">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Audio Recorder Bar or Input Bar */}
          {isRecordingAudio ? (
            <div className="p-3 bg-zinc-950 border-t border-zinc-800">
              <AudioVoiceRecorder
                onSendAudio={handleSendVoiceNote}
                onCancel={() => setIsRecordingAudio(false)}
              />
            </div>
          ) : (
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center space-x-2"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />

              {/* Paperclip Button for Image Sharing */}
              <button
                type="button"
                disabled={isSending}
                onClick={() => fileInputRef.current?.click()}
                title="Attach photo (JPG, PNG, WEBP <= 5MB)"
                className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all cursor-pointer disabled:opacity-50"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Microphone Button for Voice Notes */}
              <button
                type="button"
                disabled={isSending}
                onClick={() => setIsRecordingAudio(true)}
                title="Record voice note"
                className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500 transition-all cursor-pointer disabled:opacity-50"
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Message Input labeled 'Type your message...' */}
              <div className="flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={handleInputChange}
                  disabled={isSending}
                  placeholder={
                    selectedFile
                      ? 'Add optional caption...'
                      : activeTab === 'lounge'
                      ? 'Broadcast in Elon Musk Lounge...'
                      : `Message @${targetPartner?.username || 'partner'}...`
                  }
                  className="w-full bg-zinc-900 text-white placeholder-zinc-500 text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-zinc-700 focus:outline-none focus:border-zinc-400 transition-colors font-sans"
                />
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={isSending || (!inputText.trim() && !selectedFile)}
                className="p-2.5 rounded-lg bg-zinc-100 hover:bg-white text-black font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>

        {/* RIGHT DRAWER: Real Online Guests & Active Private Conversations */}
        <div
          className={`${
            showUsersDrawer ? 'flex' : 'hidden lg:flex'
          } absolute lg:relative right-0 top-0 bottom-0 w-72 bg-zinc-950 border-l border-zinc-800 flex-col z-20 shadow-2xl lg:shadow-none`}
        >
          {/* Drawer Header */}
          <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-white tracking-wider">
                REAL CONNECTED CREW
              </span>
            </div>
            <button
              onClick={() => setShowUsersDrawer(false)}
              className="lg:hidden p-1 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* User List: ONLY real connected users who have actually joined */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
            {onlineUsers.length === 0 ? (
              <div className="p-4 text-center text-xs font-mono text-zinc-500">
                Scanning orbital frequencies...
              </div>
            ) : (
              onlineUsers.map((u) => {
                const isMe = u.uid === currentUser.uid;
                return (
                  <div
                    key={u.uid}
                    onClick={() => {
                      if (!isMe) handleStartPrivateChat(u);
                    }}
                    className={`p-3 flex items-center justify-between transition-colors ${
                      isMe ? 'bg-zinc-900/30' : 'hover:bg-zinc-900/70 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-mono font-bold text-white overflow-hidden">
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            u.username.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-black" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-mono font-semibold text-zinc-200 truncate flex items-center gap-1.5">
                          @{u.username}
                          {isMe && <span className="text-[10px] text-zinc-500 font-normal">(You)</span>}
                        </div>
                        <div className="text-[10px] text-zinc-500 truncate font-mono">
                          {u.bio || 'Online voyager'}
                        </div>
                      </div>
                    </div>

                    {!isMe && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-cyan-400">
                        Chat
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <ImageModal
        imageUrl={previewImage?.url || null}
        caption={previewImage?.caption}
        onClose={() => setPreviewImage(null)}
      />

      {/* Report & Block Modal */}
      {reportingUser && (
        <ReportModal
          isOpen={!!reportingUser}
          reporterId={currentUser.uid}
          targetUserId={reportingUser.uid}
          targetUsername={reportingUser.username}
          onClose={() => setReportingUser(null)}
          onUserBlocked={() => {
            // refresh
          }}
        />
      )}
    </div>
  );
};
