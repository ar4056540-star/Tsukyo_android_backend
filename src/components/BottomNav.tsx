import React from 'react';
import { Home, Search, PlusCircle, Film, User } from 'lucide-react';
import { useAuth } from '../lib/authContext';
import { useTheme } from '../lib/themeContext';
import { getAvatarUrl } from '../lib/constants';

export type MainTab = 'feed' | 'search' | 'reels' | 'profile';

interface BottomNavProps {
  activeTab: MainTab;
  onChangeTab: (tab: MainTab) => void;
  onOpenCreate: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenCreate,
}) => {
  const { userProfile } = useAuth();
  const { theme } = useTheme();

  const isColorful = theme === 'vybe_colorful';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-[480px] mx-auto bg-[#0b0c0e]/95 backdrop-blur-lg border-t border-[#222630] px-4 py-2 flex items-center justify-around transition-colors">
      {/* Home / Feed */}
      <button
        onClick={() => onChangeTab('feed')}
        className={`flex flex-col items-center justify-center p-2 rounded-xl transition ${
          activeTab === 'feed'
            ? isColorful ? 'text-pink-400 font-bold' : 'text-white font-bold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Home className="w-6 h-6" />
        <span className="text-[10px] mt-0.5">Feed</span>
      </button>

      {/* Search */}
      <button
        onClick={() => onChangeTab('search')}
        className={`flex flex-col items-center justify-center p-2 rounded-xl transition ${
          activeTab === 'search'
            ? isColorful ? 'text-pink-400 font-bold' : 'text-white font-bold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Search className="w-6 h-6" />
        <span className="text-[10px] mt-0.5">Discover</span>
      </button>

      {/* Create Button */}
      <button
        onClick={onOpenCreate}
        className={`p-2 rounded-full transition transform active:scale-95 ${
          isColorful
            ? 'vybe-glow-button text-white'
            : 'bg-white text-black hover:bg-slate-200'
        }`}
        title="Create new post, reel or story"
      >
        <PlusCircle className="w-6 h-6" />
      </button>

      {/* Reels */}
      <button
        onClick={() => onChangeTab('reels')}
        className={`flex flex-col items-center justify-center p-2 rounded-xl transition ${
          activeTab === 'reels'
            ? isColorful ? 'text-pink-400 font-bold' : 'text-white font-bold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Film className="w-6 h-6" />
        <span className="text-[10px] mt-0.5">Reels</span>
      </button>

      {/* Profile */}
      <button
        onClick={() => onChangeTab('profile')}
        className={`flex flex-col items-center justify-center p-2 rounded-xl transition ${
          activeTab === 'profile'
            ? isColorful ? 'text-pink-400 font-bold' : 'text-white font-bold'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <div className={`rounded-full p-0.5 ${activeTab === 'profile' ? (isColorful ? 'ring-2 ring-pink-500' : 'ring-2 ring-white') : ''}`}>
          <img
            src={getAvatarUrl(userProfile?.photoURL)}
            alt="Profile"
            className="w-5 h-5 rounded-full object-cover"
          />
        </div>
        <span className="text-[10px] mt-0.5">Profile</span>
      </button>
    </nav>
  );
};
