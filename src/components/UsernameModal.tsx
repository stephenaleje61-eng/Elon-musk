/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User, Sparkles, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { claimUsername } from '../services/loungeService';
import { UserProfile } from '../types';

interface UsernameModalProps {
  uid: string;
  isOpen: boolean;
  onSuccess: (profile: UserProfile) => void;
}

export const UsernameModal: React.FC<UsernameModalProps> = ({
  uid,
  isOpen,
  onSuccess,
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = usernameInput.trim();
    if (!clean) {
      setErrorMessage('Please enter a username.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);

      const res = await claimUsername(uid, clean);
      if (!res.success || !res.profile) {
        setErrorMessage(res.error || 'Could not claim username. Try another.');
        return;
      }

      onSuccess(res.profile);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error claiming username.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in"
    >
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-white">
        {/* Glow header bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-white to-emerald-400" />

        <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-6 h-6 text-cyan-400" />
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold font-mono tracking-wide text-white">
            CHOOSE YOUR CALLSIGN
          </h2>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            FREE INSTANT ACCESS • NO PASSWORD REQUIRED
          </p>
        </div>

        <p className="text-xs text-zinc-400 mb-6 text-center leading-relaxed font-sans">
          Welcome to <span className="text-white font-semibold">ELONVERSE</span> & <span className="text-cyan-300 font-semibold">Elon Musk Lounge</span>.
          Choose a unique username to start chatting with guests and crew members in real time.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
              Unique Callsign / Username
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">
                @
              </span>
              <input
                type="text"
                autoFocus
                value={usernameInput}
                onChange={(e) => {
                  setUsernameInput(e.target.value);
                  setErrorMessage(null);
                }}
                disabled={isLoading}
                placeholder="StarshipCommander"
                maxLength={25}
                className="w-full pl-8 pr-4 py-2.5 bg-zinc-900 text-white rounded-xl border border-zinc-700 focus:outline-none focus:border-cyan-400 text-sm font-mono placeholder-zinc-600 transition-colors"
              />
            </div>
            <p className="text-[10px] text-zinc-500 font-mono mt-1">
              2–25 characters, letters, numbers, and underscores only.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !usernameInput.trim()}
            className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs font-mono uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking availability...</span>
              </>
            ) : (
              <>
                <span>Enter Chat</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-zinc-900 text-center">
          <p className="text-[10px] text-zinc-500 font-mono">
            Optional profile picture and biography can be customized later in Settings.
          </p>
        </div>
      </div>
    </div>
  );
};
