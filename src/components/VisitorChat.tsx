/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Paperclip,
  Sparkles,
  Wifi,
  Radio,
  AlertCircle,
  X,
} from 'lucide-react';
import {
  getOrCreateVisitorId,
  getVisitorName,
  sendTextMessage,
  sendImageMessage,
  validateImageFile,
  subscribeToMessages,
  markAsReadByVisitor,
} from '../services/chatService';
import { ChatMessage } from '../types';
import { ChatMessageItem } from './ChatMessageItem';
import { ImageModal } from './ImageModal';

export const VisitorChat: React.FC = () => {
  const [visitorId] = useState<string>(() => getOrCreateVisitorId());
  const [visitorName] = useState<string>(() => getVisitorName());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; caption?: string } | null>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Subscribe to real-time persistent messages with Firestore onSnapshot
  useEffect(() => {
    if (!visitorId) return;

    const unsubscribe = subscribeToMessages(
      visitorId,
      (fetchedMessages) => {
        setMessages(fetchedMessages);
        markAsReadByVisitor(visitorId);
      },
      (error) => {
        console.error('Failed to listen to messages:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [visitorId]);

  // Scroll to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, uploadProgress]);

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
    const objectUrl = URL.createObjectURL(file);
    setFilePreviewUrl(objectUrl);
  };

  const handleClearSelectedFile = () => {
    setSelectedFile(null);
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Send message (text or image with optional caption)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSending) return;

    setErrorMessage(null);

    // If an image is selected, upload image with input text as optional caption
    if (selectedFile) {
      try {
        setIsSending(true);
        setUploadProgress(0);

        await sendImageMessage(
          visitorId,
          selectedFile,
          'visitor',
          inputText.trim() || undefined,
          (progress) => setUploadProgress(progress),
          visitorName
        );

        // Reset inputs on success
        handleClearSelectedFile();
        setInputText('');
      } catch (err: any) {
        setErrorMessage(err.message || 'Image upload failed. Please try again.');
      } finally {
        setIsSending(false);
        setUploadProgress(null);
      }
      return;
    }

    // Text message
    const trimmed = inputText.trim();
    if (!trimmed) return;

    try {
      setIsSending(true);
      await sendTextMessage(visitorId, trimmed, 'visitor', visitorName);
      setInputText('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send message.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Chat Terminal Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800 text-white">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center">
              <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-black" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs sm:text-sm font-semibold tracking-wide font-mono text-zinc-100">
                STARLINK UPLINK: ELON COMMAND
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-900 text-emerald-400 border border-zinc-700">
                ACTIVE
              </span>
            </div>
            <div className="text-[11px] text-zinc-400 font-mono">
              Direct line to Elon Musk / Admin • No expiration
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-[11px] font-mono text-zinc-400">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">24/7 PERMANENT ARCHIVE</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#000000]">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
            <div className="w-12 h-12 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-zinc-400" />
            </div>
            <h4 className="text-sm font-mono text-zinc-300 font-medium">DIRECT ORBITAL RELAY</h4>
            <p className="text-xs text-zinc-400 max-w-sm mt-1 leading-relaxed">
              Send a transmission or upload telemetry/photos (JPG, PNG, WEBP up to 5MB).
              Your chat is permanently recorded and synchronized in real time.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatMessageItem
              key={msg.id}
              message={msg}
              isVisitorView={true}
              onImageClick={(url, caption) => setPreviewImageModal({ url, caption })}
            />
          ))
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Uploading Progress Indicator */}
      {uploadProgress !== null && (
        <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-800 text-xs font-mono text-zinc-300">
          <div className="flex items-center justify-between mb-1 text-[11px]">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              Transmitting image to Firebase Storage...
            </span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-200"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="px-4 py-2.5 bg-red-950/70 border-t border-red-800/80 flex items-center justify-between text-xs text-red-200">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-300 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Image Preview Thumbnail before sending */}
      {filePreviewUrl && (
        <div className="px-4 py-2.5 bg-zinc-950 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img
              src={filePreviewUrl}
              alt="Ready to send"
              className="w-12 h-12 object-cover rounded-md border border-zinc-700"
            />
            <div className="text-xs font-mono">
              <div className="text-zinc-200 truncate max-w-[200px] sm:max-w-xs">{selectedFile?.name}</div>
              <div className="text-zinc-400 text-[10px]">
                {((selectedFile?.size || 0) / (1024 * 1024)).toFixed(2)} MB • Ready to transmit
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearSelectedFile}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
            title="Remove selected image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Chat Input Bar */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 bg-zinc-950 border-t border-zinc-800 flex items-center space-x-2"
      >
        {/* Hidden File Picker Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Paperclip Button Immediately beside input */}
        <button
          type="button"
          disabled={isSending}
          onClick={() => fileInputRef.current?.click()}
          title="Attach image (JPG, PNG, WEBP up to 5MB)"
          className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
            selectedFile
              ? 'bg-cyan-950/60 border-cyan-500/70 text-cyan-300 shadow-sm'
              : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500'
          } disabled:opacity-50`}
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Text Input labeled 'Type your message...' */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            placeholder={selectedFile ? 'Add an optional image caption...' : 'Type your message...'}
            className="w-full bg-zinc-900 text-white placeholder-zinc-500 text-xs sm:text-sm px-3.5 py-2.5 rounded-lg border border-zinc-700 focus:outline-none focus:border-zinc-400 transition-colors font-sans"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={isSending || (!inputText.trim() && !selectedFile)}
          className="p-2.5 rounded-lg bg-zinc-100 hover:bg-white text-black font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0 shadow"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Lightbox Modal */}
      <ImageModal
        imageUrl={previewImageModal?.url || null}
        caption={previewImageModal?.caption}
        onClose={() => setPreviewImageModal(null)}
      />
    </div>
  );
};
