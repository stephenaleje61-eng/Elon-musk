/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface ImageModalProps {
  imageUrl: string | null;
  caption?: string;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, caption, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900 border-b border-zinc-800">
          <span className="text-xs font-mono text-zinc-400">TELEMETRY IMAGE VIEWER</span>
          <div className="flex items-center space-x-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors"
              title="Open full image in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="p-2 flex items-center justify-center bg-black overflow-auto max-h-[75vh]">
          <img
            src={imageUrl}
            alt={caption || 'Chat upload'}
            className="max-h-[70vh] w-auto max-w-full object-contain rounded"
          />
        </div>

        {/* Caption */}
        {caption && (
          <div className="px-4 py-3 bg-zinc-900/90 border-t border-zinc-800 text-xs text-zinc-200 font-sans">
            {caption}
          </div>
        )}
      </div>
    </div>
  );
};
