/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChatMessage } from '../types';
import { ImageOff, Loader2, Trash2 } from 'lucide-react';

interface ChatMessageItemProps {
  message: ChatMessage;
  isVisitorView: boolean;
  onImageClick?: (url: string, caption?: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  isVisitorView,
  onImageClick,
  onDeleteMessage,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Formatting timestamp
  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const isOutgoing = isVisitorView ? message.sender === 'visitor' : message.sender === 'admin';

  const senderLabel = isVisitorView
    ? message.sender === 'visitor'
      ? 'You'
      : 'Elon Musk / Admin'
    : message.sender === 'admin'
    ? 'You (Admin)'
    : 'Visitor';

  // Render Image Message
  const renderImageMessage = (msg: ChatMessage) => {
    return (
      <div className="flex flex-col space-y-1.5">
        <div className="relative max-w-[200px] w-full min-h-[100px] bg-zinc-950 rounded-lg overflow-hidden border border-zinc-700/60 group">
          {/* Loading Indicator */}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80">
              <Loader2 className="w-5 h-5 text-zinc-400 animate-spin" />
            </div>
          )}

          {/* Fallback Error Display */}
          {imageError ? (
            <div className="flex flex-col items-center justify-center p-4 text-center text-zinc-500 bg-zinc-900/90 text-xs">
              <ImageOff className="w-6 h-6 mb-1 text-zinc-600" />
              <span>Image unavailable</span>
            </div>
          ) : (
            <img
              src={msg.url}
              alt={msg.text || 'Telemetry image'}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageError(true);
                setImageLoaded(true);
              }}
              onClick={() => onImageClick?.(msg.url || '', msg.text)}
              className={`max-w-[200px] w-full h-auto max-h-[220px] object-cover cursor-pointer hover:opacity-90 transition-opacity rounded-lg ${
                imageLoaded ? 'block' : 'opacity-0'
              }`}
            />
          )}
        </div>

        {/* Optional Caption */}
        {msg.text && msg.text.trim().length > 0 && (
          <p className="text-xs text-zinc-200 mt-1 max-w-[200px] break-words">
            {msg.text}
          </p>
        )}
      </div>
    );
  };

  // Render Text Message
  const renderTextMessage = (msg: ChatMessage) => {
    return (
      <p className="text-xs sm:text-sm text-zinc-100 whitespace-pre-wrap break-words leading-relaxed font-sans">
        {msg.text}
      </p>
    );
  };

  return (
    <div
      className={`flex flex-col my-2 ${
        isOutgoing ? 'items-end' : 'items-start'
      }`}
    >
      {/* Sender & Timestamp Header */}
      <div className="flex items-center space-x-2 mb-1 px-1 text-[11px] font-mono text-zinc-400">
        <span className={message.sender === 'admin' ? 'text-cyan-400 font-semibold' : 'text-zinc-300'}>
          {senderLabel}
        </span>
        <span>•</span>
        <span>{formatTime(message.timestamp)}</span>

        {/* Admin message delete action (STRICTLY HIDDEN IN VISITOR VIEW) */}
        {!isVisitorView && onDeleteMessage && (
          <button
            onClick={() => onDeleteMessage(message.id)}
            title="Delete this message (Admin Only)"
            className="text-zinc-500 hover:text-red-400 ml-1 p-0.5 rounded transition-colors cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Bubble container */}
      <div
        className={`relative p-3 rounded-2xl max-w-[85%] sm:max-w-[70%] border ${
          isOutgoing
            ? 'bg-zinc-900 border-zinc-700 text-white rounded-br-none shadow-md'
            : 'bg-black/90 border-zinc-800 text-zinc-100 rounded-bl-none shadow-sm'
        }`}
      >
        {message.type === 'image' ? renderImageMessage(message) : renderTextMessage(message)}
      </div>
    </div>
  );
};
