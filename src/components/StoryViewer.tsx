import React, { useState, useEffect } from 'react';
import { X, Trash2, ChevronLeft, ChevronRight, Heart, Send } from 'lucide-react';
import { Story } from '../types';
import { useAuth } from '../lib/authContext';
import { deleteStory } from '../lib/dataService';
import { getAvatarUrl } from '../lib/constants';

interface StoryViewerProps {
  stories: Story[];
  initialIndex: number;
  onClose: () => void;
  onStoryDeleted?: (storyId: string) => void;
}

export const StoryViewer: React.FC<StoryViewerProps> = ({
  stories,
  initialIndex,
  onClose,
  onStoryDeleted,
}) => {
  const { userProfile } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const currentStory = stories[currentIndex];
  const isOwner = currentStory?.ownerId === userProfile?.userId;

  useEffect(() => {
    if (!currentStory || isPaused || showDeleteConfirm) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(i => i + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 2; // 5 seconds duration
      });
    }, 100);

    return () => clearInterval(interval);
  }, [currentIndex, isPaused, showDeleteConfirm, stories.length, onClose, currentStory]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(i => i + 1);
      setProgress(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
      setProgress(0);
    }
  };

  const handleConfirmDeleteStory = async () => {
    if (!currentStory || !isOwner || isDeleting) return;

    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteStory(currentStory.storyId, currentStory.ownerId);
      setShowDeleteConfirm(false);
      if (onStoryDeleted) {
        onStoryDeleted(currentStory.storyId);
      }
      if (stories.length <= 1) {
        onClose();
      } else {
        handleNext();
      }
    } catch (err) {
      console.error('Failed to delete story:', err);
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none">
      {/* Container simulating mobile story */}
      <div
        className="relative w-full max-w-[480px] h-full bg-[#101010] flex flex-col justify-between overflow-hidden"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Top Progress Bars */}
        <div className="absolute top-3 left-3 right-3 z-30 flex space-x-1.5">
          {stories.map((s, idx) => (
            <div key={s.storyId} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
                style={{
                  width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Top Header */}
        <div className="absolute top-7 left-3 right-3 z-30 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <img
              src={getAvatarUrl(currentStory.ownerPhotoURL)}
              alt={currentStory.ownerUsername}
              className="w-9 h-9 rounded-full object-cover ring-2 ring-white/50"
            />
            <div>
              <p className="text-sm font-semibold text-white leading-tight">
                {currentStory.ownerUsername}
              </p>
              <p className="text-[10px] text-white/70">
                {new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Delete button for story owner */}
            {isOwner && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteError(null);
                  setShowDeleteConfirm(true);
                }}
                disabled={isDeleting}
                className="p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-full transition backdrop-blur-md"
                title="Delete your story"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 bg-black/40 hover:bg-black/70 text-white rounded-full transition backdrop-blur-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal for Story */}
        {showDeleteConfirm && (
          <div
            className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#181a24] border border-[#2c3040] rounded-2xl p-5 max-w-xs w-full shadow-2xl text-center animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">Delete Story?</h4>
              <p className="text-xs text-slate-400 mb-4">
                Are you sure you want to delete this story? It will be removed immediately.
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
                  onClick={handleConfirmDeleteStory}
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

        {/* Story Media */}
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <img
            src={currentStory.mediaURL}
            alt="Story media"
            className="w-full h-full object-cover"
          />

          {/* Left & Right Tap Overlays for navigation */}
          <div className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer" onClick={handlePrev} />
          <div className="absolute inset-y-0 right-0 w-2/3 z-20 cursor-pointer" onClick={handleNext} />

          {/* Caption Overlay if present */}
          {currentStory.caption && (
            <div className="absolute bottom-20 left-4 right-4 z-20 bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 text-white text-sm">
              {currentStory.caption}
            </div>
          )}
        </div>

        {/* Bottom Quick Reply Bar */}
        <div className="absolute bottom-4 left-3 right-3 z-30 flex items-center space-x-2">
          <input
            type="text"
            placeholder={`Reply to ${currentStory.ownerUsername}...`}
            className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2.5 text-sm text-white placeholder-white/60 focus:outline-none focus:border-white/50"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              alert('Reaction sent to ' + currentStory.ownerUsername);
            }}
            className="p-2.5 bg-white/10 backdrop-blur-md hover:bg-white/20 rounded-full text-white transition"
          >
            <Heart className="w-5 h-5 text-pink-500 fill-pink-500" />
          </button>
        </div>
      </div>
    </div>
  );
};
