/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Trash2,
  Paperclip,
  Send,
  MessageSquare,
  Shield,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  User,
  RefreshCw,
} from 'lucide-react';
import {
  subscribeToAllConversations,
  subscribeToMessages,
  deleteConversation,
  deleteMessage,
  sendTextMessage,
  sendImageMessage,
  validateImageFile,
  markAsReadByAdmin,
  isCurrentAdmin,
} from '../services/chatService';
import { Conversation, ChatMessage } from '../types';
import { ChatMessageItem } from './ChatMessageItem';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { ImageModal } from './ImageModal';
import { ADMIN_EMAIL, auth, isAuthorizedAdmin } from '../lib/firebase';

interface AdminChatProps {
  currentUserEmail: string | null;
}

export const AdminChat: React.FC<AdminChatProps> = ({ currentUserEmail }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedVisitorId, setSelectedVisitorId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Input states
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  // Status & modal states
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name?: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; caption?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const isVerifiedAdmin = isAuthorizedAdmin(currentUserEmail) || isCurrentAdmin();

  // 1. Subscribe to all conversations in real-time
  useEffect(() => {
    if (!isVerifiedAdmin) return;

    const unsubscribe = subscribeToAllConversations(
      (convs) => {
        setConversations(convs);
        // If nothing is selected, select the first conversation
        if (!selectedVisitorId && convs.length > 0) {
          setSelectedVisitorId(convs[0].visitorId);
        }
      },
      (err) => {
        console.error('Admin conversations subscription error:', err);
      }
    );

    return () => unsubscribe();
  }, [isVerifiedAdmin, selectedVisitorId]);

  // 2. Subscribe to selected visitor's messages in real-time
  useEffect(() => {
    if (!selectedVisitorId || !isVerifiedAdmin) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToMessages(
      selectedVisitorId,
      (fetchedMsgs) => {
        setMessages(fetchedMsgs);
        markAsReadByAdmin(selectedVisitorId);
      },
      (err) => {
        console.error('Error fetching messages for visitor:', err);
      }
    );

    return () => unsubscribe();
  }, [selectedVisitorId, isVerifiedAdmin]);

  // Auto-scroll chat on message change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, uploadProgress]);

  // File selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStatusMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setStatusMessage({ type: 'error', text: validation.error || 'Invalid file format.' });
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

  // Send Admin message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedVisitorId || isSending) return;

    setStatusMessage(null);

    // Send Image
    if (selectedFile) {
      try {
        setIsSending(true);
        setUploadProgress(0);

        await sendImageMessage(
          selectedVisitorId,
          selectedFile,
          'admin',
          inputText.trim() || undefined,
          (progress) => setUploadProgress(progress)
        );

        handleClearSelectedFile();
        setInputText('');
      } catch (err: any) {
        setStatusMessage({ type: 'error', text: err.message || 'Image upload failed.' });
      } finally {
        setIsSending(false);
        setUploadProgress(null);
      }
      return;
    }

    // Send Text
    const trimmed = inputText.trim();
    if (!trimmed) return;

    try {
      setIsSending(true);
      await sendTextMessage(selectedVisitorId, trimmed, 'admin');
      setInputText('');
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to send message.' });
    } finally {
      setIsSending(false);
    }
  };

  // Execute conversation deletion
  const handleConfirmDeleteConversation = async () => {
    if (!deleteTarget) return;

    const targetId = deleteTarget.id;
    try {
      setIsDeleting(true);
      setStatusMessage(null);

      // Verify with backend verification endpoint
      try {
        await fetch('/api/admin/verify-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userEmail: currentUserEmail,
            action: 'deleteConversation',
            visitorId: targetId,
          }),
        });
      } catch (beErr) {
        console.warn('Backend verify warning (fallback to direct Firestore rules check):', beErr);
      }

      // Perform secure deletion in Firestore & Storage
      const result = await deleteConversation(targetId);

      // Remove conversation from state list immediately
      setConversations((prev) => prev.filter((c) => c.visitorId !== targetId));

      // Reset selection if deleted conversation was active
      if (selectedVisitorId === targetId) {
        setSelectedVisitorId(null);
      }

      setDeleteTarget(null);
      setStatusMessage({
        type: 'success',
        text: `Conversation and ${result.deletedMessagesCount} message(s) deleted permanently.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to delete conversation. Please retry.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete individual message (admin only)
  const handleDeleteSingleMessage = async (messageId: string) => {
    if (!selectedVisitorId) return;
    try {
      await deleteMessage(selectedVisitorId, messageId);
      setStatusMessage({ type: 'success', text: 'Message deleted.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to delete message.' });
    }
  };

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.visitorId.toLowerCase().includes(q) ||
      (c.visitorName && c.visitorName.toLowerCase().includes(q)) ||
      (c.lastMessage && c.lastMessage.toLowerCase().includes(q))
    );
  });

  const selectedConv = conversations.find((c) => c.visitorId === selectedVisitorId);

  if (!isVerifiedAdmin) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-8 text-center text-white max-w-lg mx-auto my-12">
        <Shield className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold font-mono">ADMINISTRATIVE AUTHORIZATION REQUIRED</h3>
        <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
          The Admin Control console is restricted to <span className="text-white font-mono">{ADMIN_EMAIL}</span>.
        </p>
        <div className="mt-6">
          <a
            href="/admin-login"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-white text-black font-semibold text-xs tracking-wide hover:bg-zinc-200 transition-colors"
          >
            Authenticate with Google / Admin
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-10rem)] min-h-[600px] bg-black border border-zinc-800 rounded-xl overflow-hidden shadow-2xl text-white">
      {/* LEFT SIDEBAR: Conversation Directory & Controls */}
      <div className="w-full lg:w-80 xl:w-96 bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-zinc-100">
                ACTIVE CHAT SESSIONS
              </h2>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-400">
              {conversations.length} TOTAL
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-1.5 bg-zinc-900 rounded-lg text-xs font-mono text-zinc-200 placeholder-zinc-500 border border-zinc-800 focus:outline-none focus:border-zinc-600"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-zinc-500">
              No conversations located.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.visitorId === selectedVisitorId;
              const hasUnread = (conv.unreadByAdmin || 0) > 0;

              return (
                <div
                  key={conv.visitorId}
                  onClick={() => setSelectedVisitorId(conv.visitorId)}
                  className={`p-3 flex items-start justify-between group cursor-pointer transition-colors ${
                    isSelected ? 'bg-zinc-900 border-l-2 border-cyan-400' : 'hover:bg-zinc-900/50'
                  }`}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-1.5 truncate">
                        <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="text-xs font-semibold text-zinc-200 truncate">
                          {conv.visitorName || 'Voyager ' + conv.visitorId.slice(-4)}
                        </span>
                      </div>
                      {hasUnread && (
                        <span className="px-1.5 py-0.2 rounded-full bg-cyan-500 text-black text-[10px] font-bold font-mono">
                          {conv.unreadByAdmin}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-400 truncate mb-1">
                      {conv.lastSender === 'admin' ? 'You: ' : ''}
                      {conv.lastMessage || 'No messages'}
                    </p>

                    <div className="flex items-center space-x-2 text-[10px] font-mono text-zinc-600">
                      <Clock className="w-3 h-3" />
                      <span>{conv.updatedAt ? new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}</span>
                      <span>•</span>
                      <span className="truncate max-w-[90px]">{conv.visitorId}</span>
                    </div>
                  </div>

                  {/* ADMIN TRASH BUTTON BESIDE EACH CONVERSATION */}
                  <button
                    type="button"
                    title="Delete this chat forever (Admin only)"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({ id: conv.visitorId, name: conv.visitorName });
                    }}
                    className="p-1.5 text-zinc-500 hover:text-red-400 rounded hover:bg-zinc-800 transition-colors cursor-pointer shrink-0 ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT CHAT PANE: Active Conversation Message History & Sender */}
      <div className="flex-1 flex flex-col bg-black overflow-hidden">
        {selectedVisitorId ? (
          <>
            {/* Header of selected conversation */}
            <div className="px-4 py-3 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs sm:text-sm font-semibold font-mono text-white">
                    {selectedConv?.visitorName || 'Visitor ' + selectedVisitorId.slice(-4)}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-400">
                    ID: {selectedVisitorId}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                  Permanent storage uplink • Real-time synchronization
                </div>
              </div>

              {/* Header Trash Button */}
              <button
                type="button"
                onClick={() => setDeleteTarget({ id: selectedVisitorId, name: selectedConv?.visitorName })}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-red-950/40 hover:bg-red-950 border border-red-800/60 text-xs font-mono text-red-300 transition-colors cursor-pointer"
                title="Delete this entire conversation forever"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Delete Chat</span>
              </button>
            </div>

            {/* Notification / Alert Bar */}
            {statusMessage && (
              <div
                className={`px-4 py-2 border-b flex items-center justify-between text-xs font-mono ${
                  statusMessage.type === 'success'
                    ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                    : 'bg-red-950/70 border-red-800 text-red-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {statusMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  )}
                  <span>{statusMessage.text}</span>
                </div>
                <button onClick={() => setStatusMessage(null)} className="p-1 text-zinc-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Messages Scroll View */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#000000]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500 font-mono text-xs">
                  No transmissions found for this session.
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatMessageItem
                    key={msg.id}
                    message={msg}
                    isVisitorView={false}
                    onImageClick={(url, caption) => setPreviewImageModal({ url, caption })}
                    onDeleteMessage={handleDeleteSingleMessage}
                  />
                ))
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Upload Progress */}
            {uploadProgress !== null && (
              <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-800 text-xs font-mono text-zinc-300">
                <div className="flex items-center justify-between mb-1 text-[11px]">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    Transmitting image to visitor...
                  </span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Selected image preview before sending */}
            {filePreviewUrl && (
              <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <img
                    src={filePreviewUrl}
                    alt="Pending upload"
                    className="w-12 h-12 object-cover rounded border border-zinc-700"
                  />
                  <div className="text-xs font-mono">
                    <div className="text-zinc-200 truncate max-w-xs">{selectedFile?.name}</div>
                    <div className="text-zinc-400 text-[10px]">
                      {((selectedFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB • Ready
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelectedFile}
                  className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-red-400 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Input Bar */}
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

              {/* Paperclip Button for Admin Image Sending */}
              <button
                type="button"
                disabled={isSending}
                onClick={() => fileInputRef.current?.click()}
                title="Attach image for visitor (JPG, PNG, WEBP up to 5MB)"
                className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                  selectedFile
                    ? 'bg-cyan-950/60 border-cyan-500/70 text-cyan-300'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
                } disabled:opacity-50`}
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <div className="flex-1">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isSending}
                  placeholder={selectedFile ? 'Optional image caption...' : 'Type message to visitor...'}
                  className="w-full bg-zinc-900 text-white placeholder-zinc-500 text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-zinc-700 focus:outline-none focus:border-zinc-400 transition-colors font-sans"
                />
              </div>

              <button
                type="submit"
                disabled={isSending || (!inputText.trim() && !selectedFile)}
                className="p-2.5 rounded-lg bg-zinc-100 hover:bg-white text-black font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500 font-mono">
            <MessageSquare className="w-10 h-10 mb-3 text-zinc-600" />
            <h3 className="text-sm text-zinc-300 font-medium">SELECT A CONVERSATION</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm">
              Select an active chat session from the sidebar to view persistent messages, send telemetry images, or manage communications.
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deleteTarget}
        visitorId={deleteTarget?.id || null}
        visitorName={deleteTarget?.name}
        isDeleting={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDeleteConversation}
      />

      {/* Lightbox Modal */}
      <ImageModal
        imageUrl={previewImageModal?.url || null}
        caption={previewImageModal?.caption}
        onClose={() => setPreviewImageModal(null)}
      />
    </div>
  );
};
