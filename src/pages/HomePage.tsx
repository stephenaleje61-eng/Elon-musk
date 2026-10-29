/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Rocket,
  Shield,
  Zap,
  ArrowRight,
  Radio,
  Users,
  Mic,
  Lock,
  Sparkles,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { LoungeChat } from '../components/LoungeChat';
import { VisitorChat } from '../components/VisitorChat';
import { UsernameModal } from '../components/UsernameModal';
import { ProfileModal } from '../components/ProfileModal';
import {
  initAnonymousGuest,
  getUserProfile,
  setOnlinePresence,
} from '../services/loungeService';
import { UserProfile } from '../types';
import { ADMIN_EMAIL } from '../lib/firebase';

interface HomePageProps {
  navigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  // Session states
  const [hasEnteredChat, setHasEnteredChat] = useState<boolean>(() => {
    return localStorage.getItem('elonverse_has_entered_chat') === 'true';
  });
  const [guestUid, setGuestUid] = useState<string | null>(null);
  const [guestProfile, setGuestProfile] = useState<UserProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [showUsernameModal, setShowUsernameModal] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [chatMode, setChatMode] = useState<'lounge' | 'elon'>('lounge');

  // Initialize session if already entered
  useEffect(() => {
    let active = true;

    async function checkExistingSession() {
      if (hasEnteredChat) {
        setIsInitializing(true);
        const { uid } = await initAnonymousGuest();
        if (!active) return;
        setGuestUid(uid);

        const profile = await getUserProfile(uid);
        if (!active) return;

        if (profile) {
          setGuestProfile(profile);
          setOnlinePresence(uid, true);
        } else {
          setShowUsernameModal(true);
        }
        setIsInitializing(false);
      }
    }

    checkExistingSession();

    return () => {
      active = false;
      if (guestUid) {
        setOnlinePresence(guestUid, false);
      }
    };
  }, [hasEnteredChat]);

  // Handle "ENTER CHAT" button click
  const handleEnterChat = async () => {
    try {
      setIsInitializing(true);
      const { uid } = await initAnonymousGuest();
      setGuestUid(uid);
      localStorage.setItem('elonverse_has_entered_chat', 'true');
      setHasEnteredChat(true);

      const profile = await getUserProfile(uid);
      if (profile) {
        setGuestProfile(profile);
        setOnlinePresence(uid, true);
      } else {
        setShowUsernameModal(true);
      }
    } catch (err) {
      console.warn('Enter chat error:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleUsernameSuccess = (profile: UserProfile) => {
    setGuestProfile(profile);
    setShowUsernameModal(false);
    setOnlinePresence(profile.uid, true);
  };

  // If user is inside the Chat Dashboard
  if (hasEnteredChat && guestProfile) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-black text-white p-3 sm:p-5 flex flex-col justify-between">
        <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
          {/* Top Status Bar with mode switch */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-zinc-900 text-xs font-mono text-zinc-400">
            <div className="flex items-center space-x-3">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                GUEST SESSION ACTIVE
              </span>
              <span>•</span>
              <span className="text-zinc-200">CALLSIGN: @{guestProfile.username}</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setChatMode(chatMode === 'lounge' ? 'elon' : 'lounge')}
                className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-white transition-colors cursor-pointer flex items-center space-x-1.5"
              >
                {chatMode === 'lounge' ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Switch to Elon Musk Uplink</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Return to Elon Musk Lounge</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setShowProfileModal(true)}
                className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                Profile Settings
              </button>
            </div>
          </div>

          {/* Active Workspace: Lounge Chat or Direct Elon Line */}
          <div className="flex-1 flex flex-col">
            {chatMode === 'lounge' ? (
              <LoungeChat
                currentUser={guestProfile}
                onOpenProfile={() => setShowProfileModal(true)}
                onSwitchToElonLine={() => setChatMode('elon')}
              />
            ) : (
              <div className="flex flex-col h-[calc(100vh-8rem)]">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-mono text-zinc-400">
                    DIRECT PRIVATE UPLINK: ELON MUSK SPACE COMMAND • PERMANENT ARCHIVE
                  </div>
                  <button
                    onClick={() => setChatMode('lounge')}
                    className="text-xs font-mono text-cyan-400 hover:underline"
                  >
                    ← Back to Elon Musk Lounge
                  </button>
                </div>
                <div className="flex-1">
                  <VisitorChat />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Profile Settings Modal */}
        <ProfileModal
          isOpen={showProfileModal}
          profile={guestProfile}
          onClose={() => setShowProfileModal(false)}
          onProfileUpdated={(updated) => setGuestProfile(updated)}
        />
      </div>
    );
  }

  // Frictionless Welcome Landing Page with "ENTER CHAT" Button
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-black text-white flex flex-col justify-between">
      {/* Telemetry Header Line */}
      <div className="border-b border-zinc-900 bg-zinc-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between text-[11px] font-mono text-zinc-400 gap-2">
          <div className="flex items-center space-x-3">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              FREE INSTANT ACCESS ACTIVE
            </span>
            <span>•</span>
            <span className="text-zinc-300">NO REGISTRATION REQUIRED</span>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-cyan-400">ELON MUSK LOUNGE: LIVE</span>
            <span className="text-zinc-600">|</span>
            <span>REAL CONNECTED CREW</span>
          </div>
        </div>
      </div>

      {/* Hero Welcome Screen */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex-1 flex flex-col items-center justify-center text-center">
        {/* Glow Badge */}
        <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs font-mono text-zinc-300 mb-6 shadow-inner">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>INSTANT GUEST CHAT • NO SIGNUP OR PASSWORD</span>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-tight font-sans max-w-4xl">
          ELON MUSK EVERSE{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 via-zinc-400 to-zinc-600">
            CHAT PORTAL
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-5 text-sm sm:text-lg text-zinc-400 leading-relaxed font-sans max-w-2xl">
          Enter immediately with zero friction. No email, no password, no phone number, and no subscription.
          Connect with guests in <span className="text-white font-semibold">Elon Musk Lounge</span>,
          exchange encrypted private messages, share photos, and record audio voice notes.
        </p>

        {/* THE "ENTER CHAT" ACTION BUTTON */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
          <button
            type="button"
            disabled={isInitializing}
            onClick={handleEnterChat}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-extrabold text-sm sm:text-base font-mono uppercase tracking-widest flex items-center justify-center space-x-3 transition-all cursor-pointer shadow-2xl shadow-white/10 hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {isInitializing ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Entering Interstellar Network...</span>
              </div>
            ) : (
              <>
                <Rocket className="w-5 h-5 text-black" />
                <span>ENTER CHAT</span>
                <ChevronRight className="w-5 h-5 text-black" />
              </>
            )}
          </button>
        </div>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-12 w-full text-left">
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1.5">
            <div className="flex items-center space-x-2 text-emerald-400">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-mono font-bold">100% FREE ACCESS</span>
            </div>
            <p className="text-xs text-zinc-400">
              No payments, subscriptions, or credit card requirements. Completely open.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1.5">
            <div className="flex items-center space-x-2 text-cyan-400">
              <Users className="w-4 h-4" />
              <span className="text-xs font-mono font-bold">ELON MUSK LOUNGE</span>
            </div>
            <p className="text-xs text-zinc-400">
              Public chat room to meet real connected guests with instant callsigns.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1.5">
            <div className="flex items-center space-x-2 text-zinc-300">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold">PRIVATE MESSAGING</span>
            </div>
            <p className="text-xs text-zinc-400">
              1-on-1 encrypted chats with genuine delivery and read receipts.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-1.5">
            <div className="flex items-center space-x-2 text-zinc-300">
              <Mic className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold">VOICE NOTES & PHOTOS</span>
            </div>
            <p className="text-xs text-zinc-400">
              Transmit live audio notes and high-resolution images up to 5MB.
            </p>
          </div>
        </div>
      </main>

      {/* Username Claim Modal */}
      {guestUid && (
        <UsernameModal
          uid={guestUid}
          isOpen={showUsernameModal}
          onSuccess={handleUsernameSuccess}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-black py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-zinc-400 gap-2">
          <div>
            ELON MUSK EVERSE • FREE INSTANT GUEST ACCESS © 2026
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/admin')}
              className="hover:text-white underline underline-offset-4"
            >
              Admin Control ({ADMIN_EMAIL})
            </button>
            <span>•</span>
            <span className="text-emerald-400">ZERO FRICTION</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
