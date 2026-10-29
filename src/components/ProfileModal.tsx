/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  User,
  Shield,
  Save,
  Lock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../types';
import { updateUserProfile, upgradeGuestAccount } from '../services/loungeService';

interface ProfileModalProps {
  isOpen: boolean;
  profile: UserProfile;
  onClose: () => void;
  onProfileUpdated: (updated: UserProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  profile,
  onClose,
  onProfileUpdated,
}) => {
  const [displayName, setDisplayName] = useState(profile.displayName || profile.username);
  const [bio, setBio] = useState(profile.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Upgrade account states (100% optional!)
  const [showUpgradeSection, setShowUpgradeSection] = useState(false);
  const [upgradeEmail, setUpgradeEmail] = useState('');
  const [upgradePassword, setUpgradePassword] = useState('');
  const [isUpgrading, setIsUpgrading] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setStatusMessage(null);

      await updateUserProfile(profile.uid, {
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim(),
      });

      const updated: UserProfile = {
        ...profile,
        displayName: displayName.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim(),
      };
      onProfileUpdated(updated);
      setStatusMessage({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpgradeAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upgradeEmail || !upgradePassword) {
      setStatusMessage({ type: 'error', text: 'Email and password are required for upgrade.' });
      return;
    }

    try {
      setIsUpgrading(true);
      setStatusMessage(null);

      const res = await upgradeGuestAccount(upgradeEmail, upgradePassword);
      if (!res.success) {
        setStatusMessage({ type: 'error', text: res.error || 'Upgrade failed.' });
        return;
      }

      const updated: UserProfile = {
        ...profile,
        isAnonymous: false,
      };
      onProfileUpdated(updated);
      setStatusMessage({
        type: 'success',
        text: 'Account upgraded! Your username, conversations, and history are permanently preserved.',
      });
      setShowUpgradeSection(false);
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to upgrade account.' });
    } finally {
      setIsUpgrading(false);
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
        className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative text-white max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
          <div className="flex items-center space-x-2.5">
            <User className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold font-mono tracking-wide text-white">
              GUEST PROFILE SETTINGS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-white rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMessage && (
          <div
            className={`mb-4 p-3 rounded-lg text-xs font-mono flex items-center space-x-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                : 'bg-red-950/60 border border-red-800 text-red-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Profile Details Form */}
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="flex items-center space-x-4 p-3 bg-zinc-900/60 rounded-xl border border-zinc-800">
            <div className="w-14 h-14 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-zinc-400" />
              )}
            </div>
            <div>
              <div className="text-xs font-mono text-zinc-400">CALLSIGN / USERNAME</div>
              <div className="text-sm font-mono font-bold text-white flex items-center gap-2">
                @{profile.username}
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950/60 text-cyan-300 border border-cyan-800">
                  {profile.isAnonymous ? 'Guest' : 'Verified'}
                </span>
              </div>
              <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                UID: {profile.uid.substring(0, 14)}...
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 rounded-lg text-xs font-mono text-white border border-zinc-700 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">Avatar Image URL (Optional)</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="w-full px-3 py-2 bg-zinc-900 rounded-lg text-xs font-mono text-white border border-zinc-700 focus:outline-none focus:border-cyan-400 placeholder-zinc-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-zinc-400 mb-1">Biography (Optional)</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Starship enthusiast, space explorer, quantum engineer..."
              className="w-full px-3 py-2 bg-zinc-900 rounded-lg text-xs text-white border border-zinc-700 focus:outline-none focus:border-cyan-400 placeholder-zinc-600 resize-none font-sans"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-black font-semibold text-xs font-mono flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Profile</span>
            </button>
          </div>
        </form>

        {/* Optional Account Upgrade Section */}
        <div className="mt-6 pt-6 border-t border-zinc-900">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-semibold text-zinc-200">
                OPTIONAL ACCOUNT UPGRADE
              </span>
            </div>
            {!showUpgradeSection && (
              <button
                type="button"
                onClick={() => setShowUpgradeSection(true)}
                className="text-xs font-mono text-cyan-400 hover:underline cursor-pointer"
              >
                + Link Email
              </button>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
            Guests can chat forever without registering. If you wish to secure your callsign across multiple devices, you can link an email/password credential without losing your conversations.
          </p>

          {showUpgradeSection && (
            <form onSubmit={handleUpgradeAccount} className="mt-4 space-y-3 p-4 bg-zinc-900/60 rounded-xl border border-zinc-800 animate-in fade-in">
              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={upgradeEmail}
                  onChange={(e) => setUpgradeEmail(e.target.value)}
                  placeholder="astronaut@spacex.com"
                  className="w-full px-3 py-2 bg-zinc-900 rounded-lg text-xs font-mono text-white border border-zinc-700 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-zinc-400 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  value={upgradePassword}
                  onChange={(e) => setUpgradePassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-zinc-900 rounded-lg text-xs font-mono text-white border border-zinc-700 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpgradeSection(false)}
                  className="px-3 py-1.5 text-xs font-mono text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpgrading}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs font-mono rounded-lg flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isUpgrading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>Link Account</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
