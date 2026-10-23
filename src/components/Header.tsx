import React, { useState } from 'react';
import { Search, Heart, MessageCircle, PlusSquare, Lock, Moon, Sun, UserPlus, LogOut, Sparkles, UserCheck } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { useTheme } from '../lib/themeContext';
import { useAppLock } from '../lib/appLockContext';
import { VybeLogo } from './VybeLogo';
import { getAvatarUrl } from '../lib/constants';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenCreate?: () => void;
  onOpenDirectMessages?: () => void;
  onOpenDMs?: () => void;
  onOpenNotifications: () => void;
  onOpenSwitchAccount?: () => void;
  onSwitchAccount?: () => void;
  onOpenProfile: () => void;
  onOpenAppLock?: () => void;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenCreate,
  onOpenDirectMessages,
  onOpenDMs,
  onOpenNotifications,
  onOpenSwitchAccount,
  onSwitchAccount,
  onOpenProfile,
  onOpenAppLock,
  unreadCount = 0,
}) => {
  const { userProfile, currentUser, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lockApp, isAppLockConfigured } = useAppLock();
  const [showMenu, setShowMenu] = useState(false);

  const handleDMClick = onOpenDirectMessages || onOpenDMs || (() => {});
  const handleSwitchAccount = onSwitchAccount || onOpenSwitchAccount || (() => {});
  const handleAppLockClick = () => {
    if (isAppLockConfigured) {
      lockApp();
    } else if (onOpenAppLock) {
      onOpenAppLock();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#0b0c0e]/90 border-b border-[#222630] px-4 py-3 flex items-center justify-between transition-colors">
      {/* Brand Logo - Official VYBE Logo */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center focus:outline-none group text-left transition hover:opacity-95"
        >
          <VybeLogo className="h-7 w-auto" />
        </button>
      </div>

      {/* Top Action Icons */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Search */}
        <button
          onClick={onOpenSearch}
          className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
          title="Search users"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Create (+ icon) */}
        <button
          onClick={onOpenCreate}
          className="p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
          title="Create post, reel, or story"
        >
          <PlusSquare className="w-5 h-5" />
        </button>

        {/* Notifications */}
        <button
          onClick={onOpenNotifications}
          className="relative p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
          title="Notifications"
        >
          <Heart className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full ring-2 ring-[#0b0c0e]" />
          )}
        </button>

        {/* Direct Messages */}
        <button
          onClick={handleDMClick}
          className="relative p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-slate-800/60 transition"
          title="Direct messages"
        >
          <MessageCircle className="w-5 h-5" />
        </button>

        {/* User Avatar Menu Trigger */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center focus:outline-none ring-1 ring-[#333742] hover:ring-pink-500 rounded-full p-0.5 transition"
          >
            <img
              src={getAvatarUrl(userProfile?.photoURL)}
              alt={userProfile?.displayName || 'User'}
              className="w-7 h-7 rounded-full object-cover"
            />
          </button>

          {/* Quick Menu Dropdown */}
          {showMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-[#161820] border border-[#2b2f3d] rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3.5 py-2 border-b border-[#252834]">
                <p className="text-sm font-semibold text-white truncate">
                  {userProfile?.displayName || 'VYBE User'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  @{userProfile?.username || 'username'}
                </p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onOpenProfile();
                  }}
                  className="w-full text-left px-3.5 py-2 text-sm text-slate-200 hover:bg-white/5 flex items-center space-x-2.5"
                >
                  <UserCheck className="w-4 h-4 text-slate-400" />
                  <span>My Profile</span>
                </button>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    toggleTheme();
                  }}
                  className="w-full text-left px-3.5 py-2 text-sm text-slate-200 hover:bg-white/5 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-2.5">
                    <Sparkles className="w-4 h-4 text-pink-400" />
                    <span>Theme</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    {theme === 'vybe_colorful' ? 'Colorful' : 'Gray+White'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleAppLockClick();
                  }}
                  className="w-full text-left px-3.5 py-2 text-sm text-amber-300 hover:bg-amber-500/10 flex items-center space-x-2.5"
                >
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>{isAppLockConfigured ? 'Lock App Now' : 'Set Up AppLock'}</span>
                </button>

                <button
                  onClick={() => {
                    setShowMenu(false);
                    handleSwitchAccount();
                  }}
                  className="w-full text-left px-3.5 py-2 text-sm text-slate-200 hover:bg-white/5 flex items-center space-x-2.5"
                >
                  <UserPlus className="w-4 h-4 text-slate-400" />
                  <span>Switch Account</span>
                </button>
              </div>

              <div className="pt-1 border-t border-[#252834]">
                <button
                  onClick={async () => {
                    setShowMenu(false);
                    await logout();
                  }}
                  className="w-full text-left px-3.5 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center space-x-2.5"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
