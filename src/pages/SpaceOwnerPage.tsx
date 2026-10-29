/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Satellite,
  ShieldCheck,
  Radio,
  Flame,
  ArrowRight,
  Sparkles,
  Compass,
} from 'lucide-react';
import { ADMIN_EMAIL } from '../lib/firebase';

interface SpaceOwnerPageProps {
  navigate: (path: string) => void;
  currentUserEmail?: string | null;
}

export const SpaceOwnerPage: React.FC<SpaceOwnerPageProps> = ({ navigate }) => {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-black text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center">
              <Satellite className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono tracking-wide text-white">
                SPACE FLEET & ORBITAL COMMAND
              </h1>
              <p className="text-xs text-zinc-400 font-mono">
                Interplanetary Transport System • Starship Fleet Array
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-zinc-200">{ADMIN_EMAIL}</span>
          </div>
        </div>

        {/* Space Fleet Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-2">
            <div className="flex items-center space-x-2 text-zinc-400 text-xs font-mono">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>RAPTOR 3 ENGINES</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white">33 BOOSTER / 6 SHIP</div>
            <div className="text-[11px] text-zinc-400">
              Full-flow staged combustion delivering 280 tf thrust at 350 bar chamber pressure.
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-2">
            <div className="flex items-center space-x-2 text-zinc-400 text-xs font-mono">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>MARS TRAJECTORY</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white">DELTA-V 3.8 KM/S</div>
            <div className="text-[11px] text-zinc-400">
              Synodic transfer window open. Automated cryogenic propellant transfer nominal.
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-5 space-y-2">
            <div className="flex items-center space-x-2 text-zinc-400 text-xs font-mono">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>COMMUNICATION MESH</span>
            </div>
            <div className="text-2xl font-bold font-mono text-white">0% PACKET LOSS</div>
            <div className="text-[11px] text-zinc-400">
              Persistent Firestore uplink with real-time onSnapshot listeners and image sharing.
            </div>
          </div>
        </div>

        {/* Navigation back to Admin or Chat */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Radio className="w-5 h-5 text-emerald-400" />
            <div>
              <div className="text-sm font-semibold font-mono text-white">
                INTERPLANETARY CHAT COMMS
              </div>
              <div className="text-xs text-zinc-400">
                Engage in direct transmission with visitors or monitor fleet feeds in Admin Control.
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={() => navigate('/')}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-200 hover:text-white transition-colors cursor-pointer"
            >
              Visitor Chat
            </button>
            <button
              onClick={() => navigate('/admin')}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-lg bg-white hover:bg-zinc-200 text-black font-semibold text-xs font-mono flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <span>Admin Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
