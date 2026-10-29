/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Rocket, ShieldCheck, LogOut, Terminal, Satellite, User } from 'lucide-react';
import { auth, ADMIN_EMAIL, isAuthorizedAdmin } from '../lib/firebase';
import { isCurrentAdmin } from '../services/chatService';
import { signOut } from 'firebase/auth';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
  currentUserEmail?: string | null;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, navigate, currentUserEmail }) => {
  const isAdmin = isAuthorizedAdmin(currentUserEmail) || isCurrentAdmin();

  const handleLogout = async () => {
    try {
      localStorage.removeItem('elonverse_admin_session');
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.warn('Logout notice:', err);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-md border-b border-zinc-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div
          onClick={() => navigate('/')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center group-hover:border-zinc-400 transition-colors">
            <Rocket className="w-5 h-5 text-zinc-100 group-hover:scale-110 transition-transform" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-widest text-white flex items-center gap-2">
              ELONVERSE
              <span className="text-[10px] tracking-normal font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                v2.4
              </span>
            </div>
            <div className="text-[10px] text-zinc-400 tracking-wider font-mono">
              INTERPLANETARY NEURAL LINK
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
          <button
            onClick={() => navigate('/')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-colors ${
              currentPath === '/' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Terminal / Chat
          </button>
          <button
            onClick={() => navigate('/admin')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
              currentPath === '/admin' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Admin Control
          </button>
          <button
            onClick={() => navigate('/owner')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
              currentPath === '/owner' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Owner Portal
          </button>
          <button
            onClick={() => navigate('/space-owner')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
              currentPath === '/space-owner' ? 'bg-zinc-800 text-white border border-zinc-700' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Satellite className="w-3.5 h-3.5" />
            Space Fleet
          </button>
        </nav>

        {/* Admin Badge & Actions */}
        <div className="flex items-center space-x-3">
          {/* Preserved Admin Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-[11px] font-mono text-zinc-300">
            <ShieldCheck className={`w-3.5 h-3.5 ${isAdmin ? 'text-emerald-400' : 'text-zinc-400'}`} />
            <span className="truncate max-w-[200px]">{ADMIN_EMAIL}</span>
          </div>

          {currentUserEmail ? (
            <button
              onClick={handleLogout}
              title="Logout from session"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-xs font-mono text-white transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span>LOGOUT</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/admin-login')}
              className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-xs font-mono text-zinc-300 hover:text-white transition-all cursor-pointer"
            >
              Admin Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
