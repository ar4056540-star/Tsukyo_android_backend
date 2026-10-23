import React, { useState, useEffect } from 'react';
import { contentApi, subscribeToEvents } from '../lib/api';
import { CommentItem, Post, Reel } from '../types';
import { useAuth } from '../lib/authContext';
import { addComment } from '../lib/dataService';
import { getAvatarUrl } from '../lib/constants';
import { X, Send, Trash2, Heart } from 'lucide-react';

interface CommentsDrawerProps {
  target: Post | Reel;
  type: 'post' | 'reel';
  onClose: () => void;
}

export const CommentsDrawer: React.FC<CommentsDrawerProps> = ({
  target,
  type,
  onClose,
}) => {
  const { userProfile } = useAuth();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const collectionName = type === 'post' ? 'posts' : 'reels';
  const targetId = type === 'post' ? (target as Post).postId : (target as Reel).reelId;

  useEffect(() => {
    let active = true;
    const load = async () => { try { const result = await contentApi.comments(collectionName, targetId); if (active) setComments(result.comments); } catch (err) { console.error('Comments load error:', err); } finally { if (active) setLoading(false); } };
    void load();
    const unsubscribe = subscribeToEvents(event => { if (event.topic === `comments:${collectionName}:${targetId}`) void load(); });
    return () => { active = false; unsubscribe(); };
  }, [collectionName, targetId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !userProfile || isSubmitting) return;

    const text = newCommentText.trim();
    setNewCommentText('');
    setIsSubmitting(true);

    try {
      await addComment(
        collectionName,
        targetId,
        {
          userId: userProfile.userId,
          username: userProfile.username,
          displayName: userProfile.displayName,
          photoURL: userProfile.photoURL,
        },
        text
      );
    } catch (err) {
      console.error('Failed to add comment:', err);
      setNewCommentText(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await contentApi.deleteComment(collectionName, targetId, commentId);
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center select-none">
      <div className="w-full max-w-[480px] h-[75vh] bg-[#11131a] rounded-t-3xl border-t border-[#252936] flex flex-col overflow-hidden text-white animate-in slide-in-from-bottom duration-200">
        {/* Handle Bar & Header */}
        <div className="pt-3 pb-2 px-4 border-b border-[#20232e] flex items-center justify-between">
          <div className="w-8" />
          <div className="flex flex-col items-center">
            <div className="w-10 h-1 bg-slate-700 rounded-full mb-1.5" />
            <h4 className="text-sm font-bold text-white">Comments</h4>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comment List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="py-20 text-center text-slate-500">
              <p className="text-xs">No comments yet. Start the conversation!</p>
            </div>
          ) : (
            comments.map((comment) => {
              const isOwner = userProfile?.userId === comment.authorId;
              return (
                <div key={comment.commentId} className="flex items-start justify-between space-x-3">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <img
                      src={getAvatarUrl(comment.authorPhotoURL)}
                      alt={comment.authorUsername}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-xs font-bold text-white">
                          {comment.authorUsername}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-200 mt-0.5 leading-relaxed break-words">
                        {comment.text}
                      </p>
                    </div>
                  </div>

                  {isOwner && (
                    <button
                      onClick={() => handleDeleteComment(comment.commentId)}
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded-full transition flex-shrink-0"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleAddComment} className="p-3 bg-[#161822] border-t border-[#252936] flex items-center space-x-2">
          <img
            src={getAvatarUrl(userProfile?.photoURL)}
            alt="Your avatar"
            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-700"
          />
          <input
            type="text"
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Add a comment on VYBE..."
            className="flex-1 bg-[#1d202d] text-white text-xs rounded-full px-4 py-2.5 border border-[#2b2f3e] focus:outline-none focus:border-pink-500"
          />
          <button
            type="submit"
            disabled={!newCommentText.trim() || isSubmitting}
            className="p-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full disabled:opacity-40 transition"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
