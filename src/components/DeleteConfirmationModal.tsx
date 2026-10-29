/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  visitorId: string | null;
  visitorName?: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  visitorId,
  visitorName,
  isDeleting,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen || !visitorId) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-zinc-950 border border-red-900/60 rounded-xl p-6 shadow-2xl text-white">
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 rounded-full bg-red-950/60 border border-red-700/60 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white tracking-wide">
              Delete this chat forever?
            </h3>
            <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
              This action is <span className="text-red-400 font-semibold">permanent</span> and cannot be undone. All conversation records, messages, and uploaded telemetry images for{' '}
              <span className="font-mono text-zinc-200">{visitorName || visitorId}</span> will be permanently deleted from Firestore and Firebase Storage.
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end space-x-3">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-mono font-medium text-white shadow-lg shadow-red-950/50 flex items-center space-x-2 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Forever</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
