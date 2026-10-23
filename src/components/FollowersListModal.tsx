import React, { useState, useEffect } from 'react';
import { usersApi } from '../lib/api';
import { UserProfile } from '../types';
import { useAuth } from '../lib/authContext';
import { checkIsFollowing, followUser, unfollowUser, getUserProfileById } from '../lib/dataService';
import { getAvatarUrl } from '../lib/constants';
import { X, UserPlus, UserCheck, Users } from 'lucide-react';

interface FollowersListModalProps {
  userId: string;
  initialTab?: 'followers' | 'following';
  onClose: () => void;
  onSelectUser: (userId: string) => void;
}

export const FollowersListModal: React.FC<FollowersListModalProps> = ({
  userId,
  initialTab = 'followers',
  onClose,
  onSelectUser,
}) => {
  const { userProfile: currentUser } = useAuth();
  const [tab, setTab] = useState<'followers' | 'following'>(initialTab);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [followingStates, setFollowingStates] = useState<{ [id: string]: boolean }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadList = async () => {
      setLoading(true);
      try {
        const ids = tab === 'followers' ? (await usersApi.followers(userId)).userIds : (await usersApi.following(userId)).userIds;

        const profiles: UserProfile[] = [];
        const followMap: { [id: string]: boolean } = {};

        for (const id of ids) {
          const profile = await getUserProfileById(id);
          if (profile) {
            profiles.push(profile);
            if (currentUser) {
              followMap[profile.userId] = await checkIsFollowing(currentUser.userId, profile.userId);
            }
          }
        }

        setUsersList(profiles);
        setFollowingStates(followMap);
      } catch (err) {
        console.error('Failed to load followers/following:', err);
      } finally {
        setLoading(false);
      }
    };

    loadList();
  }, [userId, tab, currentUser]);

  const handleToggleFollow = async (e: React.MouseEvent, targetUserId: string) => {
    e.stopPropagation();
    if (!currentUser) return;

    const currentFoll = followingStates[targetUserId] || false;
    const next = !currentFoll;

    setFollowingStates(prev => ({ ...prev, [targetUserId]: next }));

    try {
      if (next) {
        await followUser(currentUser.userId, targetUserId);
      } else {
        await unfollowUser(currentUser.userId, targetUserId);
      }
    } catch (err) {
      setFollowingStates(prev => ({ ...prev, [targetUserId]: currentFoll }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-0 select-none">
      <div className="relative w-full max-w-[480px] h-[80vh] bg-[#0b0c0e] rounded-t-3xl sm:rounded-3xl border border-[#222634] flex flex-col overflow-hidden text-white">
        {/* Header with Tabs */}
        <div className="p-4 bg-[#11131a] border-b border-[#20232e] flex items-center justify-between">
          <div className="flex space-x-4">
            <button
              onClick={() => setTab('followers')}
              className={`text-sm font-bold pb-1 transition border-b-2 ${
                tab === 'followers' ? 'border-pink-500 text-white' : 'border-transparent text-slate-400'
              }`}
            >
              Followers
            </button>
            <button
              onClick={() => setTab('following')}
              className={`text-sm font-bold pb-1 transition border-b-2 ${
                tab === 'following' ? 'border-pink-500 text-white' : 'border-transparent text-slate-400'
              }`}
            >
              Following
            </button>
          </div>

          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : usersList.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No {tab} found.</p>
            </div>
          ) : (
            usersList.map(user => (
              <div
                key={user.userId}
                onClick={() => {
                  onClose();
                  onSelectUser(user.userId);
                }}
                className="flex items-center justify-between p-3 rounded-2xl bg-[#14161f] border border-[#222634] hover:border-slate-700 transition cursor-pointer"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <img
                    src={getAvatarUrl(user.photoURL)}
                    alt={user.username}
                    className="w-11 h-11 rounded-full object-cover ring-1 ring-slate-700"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{user.displayName}</p>
                    <p className="text-xs text-slate-400 truncate">@{user.username}</p>
                  </div>
                </div>

                {currentUser?.userId !== user.userId && (
                  <button
                    onClick={(e) => handleToggleFollow(e, user.userId)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1 transition ${
                      followingStates[user.userId]
                        ? 'bg-[#212534] text-slate-300 hover:bg-red-500/20 hover:text-red-300'
                        : 'bg-white text-black hover:bg-slate-200'
                    }`}
                  >
                    {followingStates[user.userId] ? (
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
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
