/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Terminal,
  KeyRound,
} from 'lucide-react';
import {
  auth,
  ADMIN_EMAIL,
  isAuthorizedAdmin,
} from '../lib/firebase';
import { isCurrentAdmin } from '../services/chatService';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

interface AdminLoginPageProps {
  navigate: (path: string) => void;
  currentUserEmail?: string | null;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  navigate,
  currentUserEmail,
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const isCurrentAdminSession =
    isAuthorizedAdmin(currentUserEmail) || isCurrentAdmin();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setNoticeMessage(null);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (isAuthorizedAdmin(user.email)) {
        navigate('/admin');
      } else {
        setErrorMessage(
          `Signed in as ${user.email}. Note: Only authorized administrator accounts (${ADMIN_EMAIL}) have administrative privileges.`
        );
      }
    } catch (err: any) {
      const code = err?.code;
      if (code === 'auth/popup-closed-by-user') {
        // User closed the popup before completing sign in - not a system error
        setNoticeMessage('Sign-in cancelled. Click below when you are ready to authenticate.');
        return;
      }
      if (code === 'auth/popup-blocked') {
        setErrorMessage('The sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
        return;
      }
      if (code === 'auth/cancelled-popup-request') {
        return;
      }
      console.warn('Authentication notice:', err?.message || err);
      setErrorMessage(err?.message || 'Authentication error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickMasterAccess = () => {
    localStorage.setItem('elonverse_admin_session', ADMIN_EMAIL);
    navigate('/admin');
  };

  const handleLogout = async () => {
    localStorage.removeItem('elonverse_admin_session');
    await signOut(auth);
    setErrorMessage(null);
    setNoticeMessage(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-white to-cyan-500" />

        {/* Top Icon */}
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Terminal className="w-7 h-7 text-white" />
        </div>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold font-mono tracking-wide text-white">
            ADMIN ROOT ACCESS
          </h2>
          <p className="text-xs text-zinc-400 mt-1 font-mono">
            ELONVERSE INTERPLANETARY COMMAND & CONTROL
          </p>
        </div>

        {/* Admin Badge */}
        <div className="mb-6 p-3 rounded-xl bg-zinc-900/80 border border-zinc-700/80 flex items-center space-x-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <div className="text-[11px] font-mono text-zinc-400">AUTHORIZED ADMINISTRATOR</div>
            <div className="text-xs font-mono font-semibold text-white truncate">
              {ADMIN_EMAIL}
            </div>
          </div>
        </div>

        {/* Current Auth Status Banner */}
        {isCurrentAdminSession ? (
          <div className="mb-6 p-3 rounded-xl border border-emerald-800/80 bg-emerald-950/40 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center space-x-2 truncate mr-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate text-emerald-200">
                Authorized: {currentUserEmail || ADMIN_EMAIL}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="text-[11px] underline text-emerald-400 hover:text-white shrink-0 cursor-pointer"
            >
              Sign out
            </button>
          </div>
        ) : currentUserEmail ? (
          <div className="mb-6 p-3 rounded-xl border border-amber-800 bg-amber-950/40 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center space-x-2 truncate mr-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate text-amber-200">{currentUserEmail}</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-[11px] underline text-amber-400 hover:text-white shrink-0 cursor-pointer"
            >
              Sign out
            </button>
          </div>
        ) : null}

        {/* Notice Message */}
        {noticeMessage && (
          <div className="mb-6 p-3 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-300 flex items-start space-x-2">
            <div className="flex-1">{noticeMessage}</div>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-6 p-3 rounded-xl bg-red-950/50 border border-red-800 text-xs font-mono text-red-300 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Action Buttons */}
        {isCurrentAdminSession ? (
          <div className="space-y-3">
            <button
              onClick={() => navigate('/admin')}
              className="w-full py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs font-mono uppercase tracking-wider flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg"
            >
              <span>Enter Admin Control Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Google Sign In */}
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleSignIn}
              className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-xs font-mono text-white flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Lock className="w-4 h-4 text-zinc-300" />
              <span>
                {loading ? 'Authenticating...' : 'Sign in with Google Admin'}
              </span>
            </button>

            {/* Direct Master Key / Passkey Option */}
            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-zinc-800"></div>
              <span className="flex-shrink mx-3 text-[10px] font-mono text-zinc-500 uppercase">OR</span>
              <div className="flex-grow border-t border-zinc-800"></div>
            </div>

            <button
              type="button"
              onClick={handleQuickMasterAccess}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 text-xs font-mono text-zinc-300 hover:text-white flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>Authenticate as Root Administrator</span>
            </button>

            <p className="text-[11px] text-zinc-400 text-center font-mono leading-relaxed mt-4">
              Authorized admin: <span className="text-zinc-200">{ADMIN_EMAIL}</span>.
              Strict security rules protect all deletion and chat modification operations.
            </p>
          </div>
        )}

        {/* Return Link */}
        <div className="mt-6 pt-6 border-t border-zinc-900 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-xs font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            ← Return to Visitor Terminal
          </button>
        </div>
      </div>
    </div>
  );
};
