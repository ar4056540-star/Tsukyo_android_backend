import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Trash2, Share2, Sparkles } from 'lucide-react';
import { Post, UserProfile } from '../types';
import { useAuth } from '../lib/authContext';
import { toggleLikePost, checkIsPostLiked, toggleFavorite, checkIsFavorited, deletePost } from '../lib/dataService';
import { getAvatarUrl } from '../lib/constants';

interface PostCardProps {
  post: Post;
  onOpenComments: (post: Post) => void;
  onOpenUserProfile: (userId: string) => void;
  onPostDeleted?: (postId: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onOpenComments,
  onOpenUserProfile,
  onPostDeleted,
}) => {
  const { userProfile } = useAuth();
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [likeCount, setLikeCount] = useState<number>(post.likeCount || 0);
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [isLiking, setIsLiking] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [heartBurst, setHeartBurst] = useState(false);
  const [copiedToast, setCopiedToast] = useState(false);

  const isOwner = userProfile?.userId === post.ownerId;

  useEffect(() => {
    if (userProfile) {
      checkIsPostLiked(post.postId, userProfile.userId).then(setIsLiked);
      checkIsFavorited(userProfile.userId, post.postId).then(setIsFavorited);
    }
  }, [post.postId, userProfile]);

  const handleLikeToggle = async () => {
    if (!userProfile || isLiking) return;
    setIsLiking(true);

    const nextState = !isLiked;
    const nextCount = nextState ? likeCount + 1 : Math.max(0, likeCount - 1);
    setIsLiked(nextState);
    setLikeCount(nextCount);

    if (nextState) {
      setHeartBurst(true);
      setTimeout(() => setHeartBurst(false), 700);
    }

    try {
      const isNowLiked = await toggleLikePost(post.postId, userProfile.userId);
      setIsLiked(isNowLiked);
    } catch (err) {
      // Revert on error
      setIsLiked(!nextState);
      setLikeCount(likeCount);
      console.error('Failed to toggle like:', err);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDoubleTap = () => {
    setShowHeartAnimation(true);
    setTimeout(() => setShowHeartAnimation(false), 900);

    if (!isLiked) {
      handleLikeToggle();
    }
  };

  const handleFavoriteToggle = async () => {
    if (!userProfile) return;
    const next = !isFavorited;
    setIsFavorited(next);
    try {
      await toggleFavorite(userProfile.userId, post.postId, 'post', post);
    } catch (err) {
      setIsFavorited(!next);
      console.error('Failed to favorite post:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!isOwner || isDeleting) return;

    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deletePost(post.postId, post.ownerId);
      setShowDeleteConfirm(false);
      if (onPostDeleted) {
        onPostDeleted(post.postId);
      }
    } catch (err) {
      console.error('Post deletion failed:', err);
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  return (
    <article className="w-full bg-[#0b0c0e] border-b border-[#20232d] pb-3 transition relative">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181a24] border border-[#2c3040] rounded-2xl p-5 max-w-xs w-full shadow-2xl text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">Delete Post?</h4>
            <p className="text-xs text-slate-400 mb-4">
              Are you sure you want to permanently delete this post? This action cannot be undone.
            </p>
            {deleteError && (
              <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded-lg mb-3 break-words">
                {deleteError}
              </p>
            )}
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="flex-1 py-2 px-3 rounded-xl bg-[#242838] hover:bg-[#2e3346] text-xs font-semibold text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-semibold text-white transition flex items-center justify-center space-x-1"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header: User Info & Options */}
      <div className="flex items-center justify-between px-4 py-3">
        <div
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={() => onOpenUserProfile(post.ownerId)}
        >
          <img
            src={getAvatarUrl(post.ownerPhotoURL)}
            alt={post.ownerUsername}
            className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-700 group-hover:ring-pink-500 transition"
          />
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-semibold text-white group-hover:underline">
                {post.ownerUsername}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              {post.ownerDisplayName}
            </span>
          </div>
        </div>

        {/* Options & Owner Delete */}
        <div className="relative">
          <button
            onClick={() => setShowOptions(!showOptions)}
            className="p-1.5 text-slate-400 hover:text-white rounded-full transition"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {showOptions && (
            <div className="absolute right-0 mt-1 w-44 bg-[#181a24] border border-[#2c3040] rounded-xl shadow-xl py-1 z-30 animate-in fade-in zoom-in-95">
              {isOwner ? (
                <button
                  onClick={() => {
                    setShowOptions(false);
                    setShowDeleteConfirm(true);
                  }}
                  disabled={isDeleting}
                  className="w-full text-left px-3.5 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  <span>Delete Post</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowOptions(false);
                    onOpenUserProfile(post.ownerId);
                  }}
                  className="w-full text-left px-3.5 py-2 text-sm text-slate-200 hover:bg-white/5"
                >
                  View Profile
                </button>
              )}
              <button
                onClick={() => {
                  setShowOptions(false);
                  handleShare();
                }}
                className="w-full text-left px-3.5 py-2 text-sm text-slate-200 hover:bg-white/5 flex items-center space-x-2"
              >
                <Share2 className="w-4 h-4 text-slate-400" />
                <span>Share Link</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Post Media Container with Double Tap to Like */}
      <div
        className="relative w-full aspect-square bg-[#13151b] overflow-hidden select-none"
        onDoubleClick={handleDoubleTap}
      >
        <img
          src={post.mediaURL}
          alt={post.caption || 'Post media'}
          className="w-full h-full object-cover"
          loading="lazy"
        />

        {/* Double-tap pulse heart overlay with vibrant neon glow & floating particles */}
        {showHeartAnimation && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="relative flex items-center justify-center">
              {/* Expanding glowing ring */}
              <div className="absolute w-32 h-32 rounded-full bg-pink-500/30 animate-ping" />
              {/* Main Heart with bounce & scale */}
              <div className="animate-in zoom-in-50 duration-300 scale-125 transition-transform">
                <Heart className="w-28 h-28 text-pink-500 fill-pink-500 drop-shadow-[0_0_25px_rgba(255,20,147,0.9)]" />
              </div>
              {/* Sparkle bursts */}
              <div className="absolute -top-3 -right-3 text-yellow-300 animate-pulse">
                <Sparkles className="w-8 h-8 drop-shadow-md" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons Bar */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center space-x-4">
          {/* Like Heart Button with dynamic animation */}
          <div className="relative flex items-center justify-center">
            <button
              onClick={handleLikeToggle}
              className={`focus:outline-none transition-transform duration-200 ${
                heartBurst ? 'scale-135' : 'active:scale-125'
              }`}
              title={isLiked ? 'Unlike' : 'Like'}
            >
              <Heart
                className={`w-6 h-6 transition-all duration-200 ${
                  isLiked
                    ? 'text-pink-500 fill-pink-500 drop-shadow-[0_0_8px_rgba(255,20,147,0.7)]'
                    : 'text-slate-200 hover:text-white'
                }`}
              />
            </button>
            {/* Mini particle ring on like */}
            {heartBurst && (
              <span className="absolute -inset-2 rounded-full border-2 border-pink-400 opacity-75 animate-ping pointer-events-none" />
            )}
          </div>

          {/* Comment Button */}
          <button
            onClick={() => onOpenComments(post)}
            className="text-slate-200 hover:text-white focus:outline-none transition transform active:scale-110"
            title="Comments"
          >
            <MessageCircle className="w-6 h-6" />
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="text-slate-200 hover:text-white focus:outline-none transition transform active:scale-110 relative"
            title="Share"
          >
            <Send className="w-5 h-5" />
            {copiedToast && (
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow border border-slate-700 whitespace-nowrap">
                Copied!
              </span>
            )}
          </button>
        </div>

        {/* Favorite / Bookmark Button */}
        <button
          onClick={handleFavoriteToggle}
          className="text-slate-200 hover:text-white focus:outline-none transition transform active:scale-125"
          title={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
        >
          <Bookmark
            className={`w-6 h-6 transition-colors ${
              isFavorited ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]' : 'text-slate-200 hover:text-white'
            }`}
          />
        </button>
      </div>

      {/* Likes Count */}
      <div className="px-4 py-1">
        <p className="text-sm font-semibold text-white">
          {likeCount.toLocaleString()} {likeCount === 1 ? 'like' : 'likes'}
        </p>
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="px-4 py-1 text-sm text-slate-200">
          <span
            className="font-semibold text-white mr-2 cursor-pointer hover:underline"
            onClick={() => onOpenUserProfile(post.ownerId)}
          >
            {post.ownerUsername}
          </span>
          <span>{post.caption}</span>
        </div>
      )}

      {/* Comments link */}
      <div className="px-4 pt-1">
        <button
          onClick={() => onOpenComments(post)}
          className="text-xs text-slate-400 hover:text-slate-200 transition"
        >
          {post.commentCount > 0
            ? `View all ${post.commentCount} comments`
            : 'Add a comment...'}
        </button>
        <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-1">
          {new Date(post.createdAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}
        </p>
      </div>
    </article>
  );
};
