import React, { useState, useEffect } from 'react';
import { Search, X, UserPlus, UserCheck, Sparkles, TrendingUp } from 'lucide-react';
import { UserProfile } from '../types';
import { searchUsers, followUser, unfollowUser, checkIsFollowing } from '../lib/dataService';
import { useAuth } from '../lib/authContext';
import { getAvatarUrl } from '../lib/constants';

interface SearchModalProps {
  onClose: () => void;
  onOpenUserProfile: (userId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  onClose,
  onOpenUserProfile,
}) => {
  const { userProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [followingMap, setFollowingMap] = useState<{ [id: string]: boolean }>({});

  useEffect(() => {
    // Perform search on query change or initial popular creators
    const doSearch = async () => {
      setLoading(true);
      try {
        const users = await searchUsers(searchTerm || 'a'); // initial discovery
        setResults(users.filter(u => u.userId !== userProfile?.userId));

        // Check follow states
        if (userProfile) {
          const map: { [id: string]: boolean } = {};
          for (const u of users) {
            map[u.userId] = await checkIsFollowing(userProfile.userId, u.userId);
          }
          setFollowingMap(map);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(doSearch, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, userProfile]);

  const handleToggleFollow = async (e: React.MouseEvent, targetUserId: string) => {
    e.stopPropagation();
    if (!userProfile) return;

    const isFoll = followingMap[targetUserId] || false;
    const next = !isFoll;

    setFollowingMap(prev => ({ ...prev, [targetUserId]: next }));

    try {
      if (next) {
        await followUser(userProfile.userId, targetUserId);
      } else {
        await unfollowUser(userProfile.userId, targetUserId);
      }
    } catch (err) {
      setFollowingMap(prev => ({ ...prev, [targetUserId]: isFoll }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-0 select-none">
      <div className="relative w-full max-w-[480px] h-full bg-[#0b0c0e] flex flex-col overflow-hidden">
        {/* Search Header */}
        <div className="p-4 border-b border-[#222630] flex items-center space-x-3 bg-[#111319]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search creators, usernames, artists..."
              className="w-full bg-[#181a24] text-white placeholder-slate-500 rounded-full pl-10 pr-4 py-2.5 text-sm border border-[#2b2f3d] focus:outline-none focus:border-pink-500"
              autoFocus
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-300 hover:text-white px-2 py-1"
          >
            Cancel
          </button>
        </div>

        {/* Search Results List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 px-1 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-pink-400" />
            <span>{searchTerm ? 'Search Results' : 'Suggested Creators'}</span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-2">
              <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500">Searching VYBE network...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-slate-400">No users found matching "{searchTerm}"</p>
              <p className="text-xs text-slate-600 mt-1">Try searching by full username or display name</p>
            </div>
          ) : (
            results.map((user) => (
              <div
                key={user.userId}
                onClick={() => {
                  onClose();
                  onOpenUserProfile(user.userId);
                }}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#14161d] border border-[#222530] hover:border-slate-700 transition cursor-pointer"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <img
                    src={getAvatarUrl(user.photoURL)}
                    alt={user.username}
                    className="w-12 h-12 rounded-full object-cover ring-1 ring-slate-700"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {user.displayName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      @{user.username}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5 max-w-[180px]">
                      {user.bio || `${(user.followerCount || 0).toLocaleString()} followers`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => handleToggleFollow(e, user.userId)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition flex items-center space-x-1.5 flex-shrink-0 ${
                    followingMap[user.userId]
                      ? 'bg-[#222633] text-slate-300 hover:bg-red-500/20 hover:text-red-300'
                      : 'bg-white text-black hover:bg-slate-200'
                  }`}
                >
                  {followingMap[user.userId] ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
