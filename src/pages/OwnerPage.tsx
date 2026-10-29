/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  User,
  ShieldCheck,
  Rocket,
  Cpu,
  Radio,
  ExternalLink,
  Satellite,
  ArrowRight,
} from 'lucide-react';
import { ADMIN_EMAIL } from '../lib/firebase';

interface OwnerPageProps {
  navigate: (path: string) => void;
  currentUserEmail?: string | null;
}

export const OwnerPage: React.FC<OwnerPageProps> = ({ navigate }) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-black text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono tracking-wide text-white">
                OWNER DIRECTORY PORTAL
              </h1>
              <p className="text-xs text-zinc-400 font-mono">
                Executive Space Command • Planetary Operations
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-zinc-200">{ADMIN_EMAIL}</span>
          </div>
        </div>

        {/* Orbit Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <Rocket className="w-5 h-5 text-cyan-400" />
              <h2 className="text-sm font-bold font-mono text-zinc-200">
                STARBASE FLIGHT TELEMETRY
              </h2>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Super Heavy Booster and Starship orbital synchronization relays. High-rate data downlink
              for test flights, staging, and Mars colonization trajectories.
            </p>
            <div className="pt-2 flex items-center space-x-3 text-xs font-mono text-emerald-400">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>ORBITAL VELOCITY: 27,400 KM/H</span>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <Radio className="w-5 h-5 text-zinc-300" />
              <h2 className="text-sm font-bold font-mono text-zinc-200">
                STARLINK LASER MESH
              </h2>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              Inter-satellite optical cross-links delivering real-time, low-latency broadband
              across both polar routes and cis-lunar transfer orbits.
            </p>
            <div className="pt-2 flex items-center space-x-3 text-xs font-mono text-cyan-400">
              <Satellite className="w-4 h-4" />
              <span>ACTIVE SATELLITES: 6,400+</span>
            </div>
          </div>
        </div>

        {/* Quick Command Navigation */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Cpu className="w-5 h-5 text-zinc-400" />
            <div>
              <div className="text-sm font-semibold font-mono text-white">
                ADMIN CONTROL CENTER
              </div>
              <div className="text-xs text-zinc-400">
                Manage live visitor chats, review media uploads, and execute deletions.
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/admin')}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs font-mono flex items-center justify-center space-x-2 transition-all cursor-pointer"
          >
            <span>Access Admin Control</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
