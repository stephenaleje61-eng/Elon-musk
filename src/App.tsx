/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminPage } from './pages/AdminPage';
import { OwnerPage } from './pages/OwnerPage';
import { SpaceOwnerPage } from './pages/SpaceOwnerPage';
import { auth } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);

  // Listen to browser navigation popstate
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  // Custom client router
  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo(0, 0);
    }
  };

  // Render appropriate view based on route
  const renderCurrentPage = () => {
    switch (currentPath) {
      case '/admin-login':
        return (
          <AdminLoginPage
            navigate={navigate}
            currentUserEmail={currentUser?.email || null}
          />
        );
      case '/admin':
        return (
          <AdminPage
            navigate={navigate}
            currentUserEmail={currentUser?.email || null}
          />
        );
      case '/owner':
        return (
          <OwnerPage
            navigate={navigate}
            currentUserEmail={currentUser?.email || null}
          />
        );
      case '/space-owner':
        return (
          <SpaceOwnerPage
            navigate={navigate}
            currentUserEmail={currentUser?.email || null}
          />
        );
      case '/':
      default:
        return <HomePage navigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#FFFFFF] flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      {/* Background Subtle Stars / Nebula Aesthetic */}
      <div className="fixed inset-0 pointer-events-none opacity-20 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800 via-black to-black" />

      {/* Main App Container */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar
          currentPath={currentPath}
          navigate={navigate}
          currentUserEmail={currentUser?.email || null}
        />
        <div className="flex-1">
          {renderCurrentPage()}
        </div>
      </div>
    </div>
  );
}
