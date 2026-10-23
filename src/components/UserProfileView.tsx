import React, { useState, useEffect } from 'react';
import { contentApi, favoritesApi, subscribeToEvents } from '../lib/api';
import { Post, Reel, UserProfile, AppTheme } from '../types';
import { useAuth } from '../lib/authContext';
import { useTheme } from '../lib/themeContext';
import { useAppLock } from '../lib/appLockContext';
import { getFavorites } from '../lib/dataService';
import { getAvatarUrl } from '../lib/constants';
import { Grid, Film, Bookmark, Lock, Edit3, Sparkles, LogOut, Check, X, Shield, Plus } from 'lucide-react';

interface UserProfileViewProps {
  onOpenEditProfile: () => void;
  onOpenFollowers: (userId: string, initialTab: 'followers' | 'following') => void;
  onOpenPost: (post: Post) => void;
  onOpenReel: (reel: Reel) => void;
  onOpenAppLockSetup: () => void;
}

export const UserProfileView: React.FC<UserProfileViewProps> = ({
  onOpenEditProfile,
  onOpenFollowers,
  onOpenPost,
  onOpenReel,
  onOpenAppLockSetup,
}) => {
  const { userProfile, updateUserProfile, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { isAppLockConfigured, lockApp } = useAppLock();

  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'favorites'>('posts');
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userReels, setUserReels] = useState<Reel[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) return;
    let active = true;
    const load = async () => {
      try {
        const [posts, reels, favorites] = await Promise.all([contentApi.userPosts(userProfile.userId), contentApi.userReels(userProfile.userId), favoritesApi.list()]);
        if (!active) return;
        setUserPosts(posts.posts); setUserReels(reels.reels); setFavoriteItems(favorites.favorites);
      } catch (err) { console.error('Profile content error:', err); }
      finally { if (active) setLoading(false); }
    };
    void load();
    const unsubscribe = subscribeToEvents(event => { if (event.topic === `profile:${userProfile.userId}` || event.topic === 'feed' || event.topic === 'reels') void load(); });
    return () => { active = false; unsubscribe(); };
  }, [userProfile]);

  const handleThemeChange = async (newTheme: AppTheme) => {
    setTheme(newTheme);
    await updateUserProfile({ theme: newTheme });
  };

  const handleLockClick = () => {
    if (isAppLockConfigured) {
      lockApp();
    } else {
      onOpenAppLockSetup();
    }
  };

  return (
    <div className="w-full pb-24 bg-[#0b0c0e] min-h-screen text-white select-none">
      {/* Top Profile Card */}
      <div className="p-4 bg-[#11131a] border-b border-[#20232e]">
        {/* Avatar & Counts Row */}
        <div className="flex items-center justify-between space-x-4 mb-4">
          {/* Circular Profile Picture */}
          <div className="relative">
            <div className="p-0.5 rounded-full ring-2 ring-slate-600">
              <img
                src={getAvatarUrl(userProfile?.photoURL)}
                alt={userProfile?.displayName || 'User Profile'}
                className="w-20 h-20 rounded-full object-cover"
              />
            </div>
          </div>

          {/* Stats Badges */}
          <div className="flex-1 flex justify-around text-center">
            <div>
              <p className="text-base font-bold text-white">
                {userPosts.length || userProfile?.postCount || 0}
              </p>
              <p className="text-xs text-slate-400">Posts</p>
            </div>

            <button
              onClick={() => userProfile && onOpenFollowers(userProfile.userId, 'followers')}
              className="text-center focus:outline-none hover:opacity-80 transition"
            >
              <p className="text-base font-bold text-white">
                {(userProfile?.followerCount || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">Followers</p>
            </button>

            <button
              onClick={() => userProfile && onOpenFollowers(userProfile.userId, 'following')}
              className="text-center focus:outline-none hover:opacity-80 transition"
            >
              <p className="text-base font-bold text-white">
                {(userProfile?.followingCount || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">Following</p>
            </button>
          </div>
        </div>

        {/* Bio Details */}
        <div className="mb-4">
          <h3 className="text-base font-bold text-white leading-tight">
            {userProfile?.displayName || 'VYBE User'}
          </h3>
          <p className="text-xs text-slate-400 font-medium mb-1">
            @{userProfile?.username || 'user'}
          </p>
          <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
            {userProfile?.bio || 'Living the VYBE lifestyle.'}
          </p>
        </div>

        {/* ====================================================
            EXACT BUTTON LAYOUT AS MANDATED BY PROMPT:
            [ Edit Profile ] [ Favorites ]
                      [ Lock ]
            ==================================================== */}
        <div className="space-y-2 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onOpenEditProfile}
              className="py-2 px-4 rounded-xl bg-[#1d202b] hover:bg-[#282c3c] border border-[#2d3245] text-xs font-semibold text-white flex items-center justify-center space-x-1.5 transition active:scale-98"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Profile</span>
            </button>

            <button
              onClick={() => setActiveTab('favorites')}
              className={`py-2 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition active:scale-98 ${
                activeTab === 'favorites'
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                  : 'bg-[#1d202b] hover:bg-[#282c3c] border-[#2d3245] text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Favorites</span>
            </button>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleLockClick}
              className="w-full py-2 px-4 rounded-xl bg-[#1d202b] hover:bg-amber-500/20 border border-[#2d3245] hover:border-amber-500/50 text-xs font-semibold text-amber-300 flex items-center justify-center space-x-1.5 transition active:scale-98"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isAppLockConfigured ? 'Lock Application' : 'Set Up AppLock PIN'}</span>
            </button>
          </div>
        </div>

        {/* Theme System Selector */}
        <div className="pt-3 border-t border-[#20232e] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-semibold text-slate-300">App Theme</span>
          </div>

          <div className="flex bg-[#191b24] p-1 rounded-xl border border-[#2b2f3e] space-x-1">
            <button
              onClick={() => handleThemeChange('gray_white')}
              className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition ${
                theme === 'gray_white'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Gray + White
            </button>
            <button
              onClick={() => handleThemeChange('vybe_colorful')}
              className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition ${
                theme === 'vybe_colorful'
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              VYBE Colorful
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Row: Posts, Reels, Favorites */}
      <div className="flex border-b border-[#20232e] bg-[#0b0c0e]">
        <button
          onClick={() => setActiveTab('posts')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center space-x-1.5 transition border-b-2 ${
            activeTab === 'posts'
              ? 'border-white text-white'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Posts ({userPosts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reels')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center space-x-1.5 transition border-b-2 ${
            activeTab === 'reels'
              ? 'border-white text-white'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Reels ({userReels.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center space-x-1.5 transition border-b-2 ${
            activeTab === 'favorites'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Saved</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-1">
        {/* POSTS TAB */}
        {activeTab === 'posts' && (
          userPosts.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Grid className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No posts shared yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {userPosts.map(post => (
                <div
                  key={post.postId}
                  onClick={() => onOpenPost(post)}
                  className="aspect-square bg-[#151720] overflow-hidden cursor-pointer relative group"
                >
                  <img
                    src={post.mediaURL}
                    alt={post.caption}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                  />
                </div>
              ))}
            </div>
          )
        )}

        {/* REELS TAB */}
        {activeTab === 'reels' && (
          userReels.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Film className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No reels posted yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {userReels.map(reel => (
                <div
                  key={reel.reelId}
                  onClick={() => onOpenReel(reel)}
                  className="aspect-[9/16] bg-[#151720] overflow-hidden cursor-pointer relative group rounded-md"
                >
                  <video
                    src={reel.mediaURL}
                    className="w-full h-full object-cover"
                    muted
                  />
                  <div className="absolute bottom-1 left-1 text-[10px] text-white bg-black/60 px-1 rounded flex items-center space-x-1">
                    <Film className="w-2.5 h-2.5" />
                    <span>{reel.likeCount || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* FAVORITES TAB */}
        {activeTab === 'favorites' && (
          favoriteItems.length === 0 ? (
            <div className="py-16 text-center text-slate-500">
              <Bookmark className="w-8 h-8 mx-auto mb-2 text-amber-500/50" />
              <p className="text-xs">No saved favorites yet.</p>
              <p className="text-[10px] text-slate-600 mt-1">Bookmark posts and reels to find them here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {favoriteItems.map(fav => (
                <div
                  key={fav.contentId}
                  onClick={() => fav.contentType === 'post' ? onOpenPost(fav.contentData) : onOpenReel(fav.contentData)}
                  className="aspect-square bg-[#151720] overflow-hidden cursor-pointer relative group"
                >
                  <img
                    src={fav.contentData?.mediaURL || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400'}
                    alt="Saved"
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                  />
                  <div className="absolute top-1 right-1 bg-black/60 p-1 rounded-full">
                    <Bookmark className="w-3 h-3 text-amber-400 fill-amber-400" />
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};
