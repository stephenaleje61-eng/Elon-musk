/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AdminChat } from '../components/AdminChat';
import { ShieldCheck, LogOut, ArrowLeft, Terminal } from 'lucide-react';
import { ADMIN_EMAIL, auth, isAuthorizedAdmin } from '../lib/firebase';
import { isCurrentAdmin } from '../services/chatService';
import { signOut } from 'firebase/auth';

interface AdminPageProps {
  navigate: (path: string) => void;
  currentUserEmail: string | null;
}

export const AdminPage: React.FC<AdminPageProps> = ({
  navigate,
  currentUserEmail,
}) => {
  const isVerifiedAdmin =
    isAuthorizedAdmin(currentUserEmail) || isCurrentAdmin();

  const handleLogout = async () => {
    localStorage.removeItem('elonverse_admin_session');
    await signOut(auth);
    navigate('/');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-black text-white p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Return to Visitor Terminal"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-cyan-400" />
                <h1 className="text-base sm:text-lg font-bold font-mono tracking-wide text-white">
                  ADMIN CONTROL DASHBOARD
                </h1>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Persistent Chat Sessions • Image Transmissions • Secure Admin Deletion
              </p>
            </div>
          </div>

          {/* Admin Badge & Logout */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950 border border-zinc-800 text-xs font-mono">
              <ShieldCheck
                className={`w-4 h-4 ${
                  isVerifiedAdmin ? 'text-emerald-400' : 'text-zinc-500'
                }`}
              />
              <span className="text-zinc-300 font-semibold">{ADMIN_EMAIL}</span>
              {isVerifiedAdmin && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 font-bold">
                  VERIFIED ROOT
                </span>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-xs font-mono text-white transition-colors cursor-pointer"
              title="Logout from administrator session"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span>LOGOUT</span>
            </button>
          </div>
        </div>

        {/* The Admin Control & Chat Center */}
        <div className="flex-1">
          <AdminChat currentUserEmail={currentUserEmail} />
        </div>
      </div>
    </div>
  );
};
