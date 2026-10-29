/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldAlert, X, Ban, Flag, CheckCircle2 } from 'lucide-react';
import { reportUser, blockUser } from '../services/loungeService';

interface ReportModalProps {
  isOpen: boolean;
  reporterId: string;
  targetUserId: string;
  targetUsername: string;
  onClose: () => void;
  onUserBlocked?: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  reporterId,
  targetUserId,
  targetUsername,
  onClose,
  onUserBlocked,
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  if (!isOpen) return null;

  const handleReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    try {
      setIsSubmitting(true);
      await reportUser(reporterId, targetUserId, reason.trim());
      setIsDone(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.warn('Report error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlock = async () => {
    try {
      setIsSubmitting(true);
      await blockUser(reporterId, targetUserId);
      if (onUserBlocked) onUserBlocked();
      onClose();
    } catch (err) {
      console.warn('Block error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative text-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <div className="flex items-center space-x-2 text-red-400">
            <ShieldAlert className="w-5 h-5" />
            <span className="text-sm font-mono font-bold">REPORT OR BLOCK VOYAGER</span>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {isDone ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-mono font-bold text-white">REPORT RECEIVED</h4>
            <p className="text-xs text-zinc-400">
              Thank you for keeping Elon Musk Lounge safe. Our moderation system is reviewing this report.
            </p>
          </div>
        ) : (
          <form onSubmit={handleReport} className="space-y-4">
            <p className="text-xs text-zinc-400">
              Reporting user: <span className="text-white font-mono font-semibold">@{targetUsername}</span>
            </p>

            <div>
              <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                Reason for report (Spam, Harassment, Inappropriate Media)
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe what occurred..."
                className="w-full px-3 py-2 bg-zinc-900 rounded-lg text-xs text-white border border-zinc-700 focus:outline-none focus:border-red-400 resize-none font-sans"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleBlock}
                disabled={isSubmitting}
                className="px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-300 hover:text-red-400 flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                <span>Block User</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !reason.trim()}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs font-mono flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Submit Report</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
