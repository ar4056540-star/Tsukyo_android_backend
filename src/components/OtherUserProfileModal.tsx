import React, { useState, useEffect } from 'react';
import { contentApi } from '../lib/api';
import { Post, Reel, UserProfile } from '../types';
import { useAuth } from '../lib/authContext';
import { getUserProfileById, checkIsFollowing, followUser, unfollowUser } from '../lib/dataService';
import { getAvatarUrl } from '../lib/constants';
import { ChevronLeft, MessageCircle, UserPlus, UserCheck, Grid, Film, Share2 } from 'lucide-react';

interface OtherUserProfileModalProps {
  userId: string;
  onClose: () => void;
  onOpenPost: (post: Post) => void;
  onOpenReel: (reel: Reel) => void;
  onStartMessage: (targetUser: UserProfile) => void;
  onOpenFollowers: (userId: string, tab: 'followers' | 'following') => void;
}

export const OtherUserProfileModal: React.FC<OtherUserProfileModalProps> = ({
  userId,
  onClose,
  onOpenPost,
  onOpenReel,
  onStartMessage,
  onOpenFollowers,
}) => {
  const { userProfile: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reels, setReels] = useState<Reel[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels'>('posts');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      try {
        const u = await getUserProfileById(userId);
        if (u) {
          setProfile(u);
          if (currentUser) {
            const f = await checkIsFollowing(currentUser.userId, u.userId);
            setIsFollowing(f);
          }

          const [postsResult, reelsResult] = await Promise.all([contentApi.userPosts(u.userId), contentApi.userReels(u.userId)]);
          setPosts(postsResult.posts);
          setReels(reelsResult.reels);
        }
      } catch (err) {
        console.error('Failed to load other profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [userId, currentUser]);

  const handleToggleFollow = async () => {
    if (!currentUser || !profile) return;
    const next = !isFollowing;
    setIsFollowing(next);

    setProfile(prev => prev ? {
      ...prev,
      followerCount: next ? (prev.followerCount || 0) + 1 : Math.max(0, (prev.followerCount || 0) - 1)
    } : null);

    try {
      if (next) {
        await followUser(currentUser.userId, profile.userId);
      } else {
        await unfollowUser(currentUser.userId, profile.userId);
      }
    } catch (err) {
      setIsFollowing(!next);
    }
  };

  if (loading || !profile) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-0 select-none">
      <div className="relative w-full max-w-[480px] h-full bg-[#0b0c0e] flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="p-3.5 bg-[#11131a] border-b border-[#20232e] flex items-center justify-between">
          <button onClick={onClose} className="p-1.5 text-slate-300 hover:text-white rounded-full transition">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h4 className="text-sm font-bold text-white">@{profile.username}</h4>
          <button
            onClick={() => {
              if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
                alert('Profile link copied!');
              }
            }}
            className="p-1.5 text-slate-300 hover:text-white rounded-full transition"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 bg-[#11131a] border-b border-[#20232e]">
            <div className="flex items-center space-x-4 mb-4">
              <img
                src={getAvatarUrl(profile.photoURL)}
                alt={profile.username}
                className="w-20 h-20 rounded-full object-cover ring-2 ring-slate-700"
              />

              <div className="flex-1 flex justify-around text-center">
                <div>
                  <p className="text-base font-bold text-white">{posts.length}</p>
                  <p className="text-xs text-slate-400">Posts</p>
                </div>
                <button onClick={() => onOpenFollowers(profile.userId, 'followers')} className="focus:outline-none">
                  <p className="text-base font-bold text-white">{(profile.followerCount || 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-400">Followers</p>
                </button>
                <button onClick={() => onOpenFollowers(profile.userId, 'following')} className="focus:outline-none">
                  <p className="text-base font-bold text-white">{(profile.followingCount || 0).toLocaleString()}</p>
                  <p className="text-xs text-slate-400">Following</p>
                </button>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-base font-bold text-white">{profile.displayName}</h3>
              <p className="text-xs text-slate-300 mt-1">{profile.bio}</p>
            </div>

            {/* Follow & Message Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleToggleFollow}
                className={`py-2 px-4 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition ${
                  isFollowing
                    ? 'bg-[#1e2230] text-slate-300 hover:bg-red-500/20 hover:text-red-300 border border-[#2e3347]'
                    : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Follow</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  onClose();
                  onStartMessage(profile);
                }}
                className="py-2 px-4 rounded-xl bg-[#1d202b] hover:bg-[#282c3c] border border-[#2d3245] text-xs font-semibold text-white flex items-center justify-center space-x-1.5 transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Message</span>
              </button>
            </div>
          </div>

          {/* Grid Tabs */}
          <div className="flex border-b border-[#20232e] bg-[#0b0c0e]">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center space-x-1.5 border-b-2 ${
                activeTab === 'posts' ? 'border-white text-white' : 'border-transparent text-slate-500'
              }`}
            >
              <Grid className="w-4 h-4" />
              <span>Posts ({posts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('reels')}
              className={`flex-1 py-3 text-xs font-semibold flex items-center justify-center space-x-1.5 border-b-2 ${
                activeTab === 'reels' ? 'border-white text-white' : 'border-transparent text-slate-500'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>Reels ({reels.length})</span>
            </button>
          </div>

          <div className="p-1">
            {activeTab === 'posts' && (
              posts.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs">No posts yet.</div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {posts.map(post => (
                    <div
                      key={post.postId}
                      onClick={() => onOpenPost(post)}
                      className="aspect-square bg-[#151720] overflow-hidden cursor-pointer"
                    >
                      <img src={post.mediaURL} alt={post.caption} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )
            )}

            {activeTab === 'reels' && (
              reels.length === 0 ? (
                <div className="py-16 text-center text-slate-500 text-xs">No reels yet.</div>
              ) : (
                <div className="grid grid-cols-3 gap-1">
                  {reels.map(reel => (
                    <div
                      key={reel.reelId}
                      onClick={() => onOpenReel(reel)}
                      className="aspect-[9/16] bg-[#151720] overflow-hidden cursor-pointer rounded"
                    >
                      <video src={reel.mediaURL} className="w-full h-full object-cover" muted />
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
