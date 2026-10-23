import React, { useState, useEffect, useRef, useCallback } from 'react';
import { contentApi, subscribeToEvents } from '../lib/api';
import { Reel } from '../types';
import { useAuth } from '../lib/authContext';
import {
  toggleLikeReel,
  checkIsReelLiked,
  toggleFavorite,
  checkIsFavorited,
  deleteReel,
  checkIsFollowing,
  followUser,
  unfollowUser,
  KNOWN_BOT_REEL_IDS,
  KNOWN_BOT_USER_IDS,
} from '../lib/dataService';
import { getAvatarUrl } from '../lib/constants';
import { ShareReelModal } from './ShareReelModal';
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Volume2,
  VolumeX,
  Music2,
  Trash2,
  Plus,
  Film,
  Check,
  Sparkles,
} from 'lucide-react';

interface ReelsViewProps {
  initialReelId?: string | null;
  onOpenComments: (reel: Reel) => void;
  onOpenUserProfile: (userId: string) => void;
  onOpenCreateReel: () => void;
}

export const ReelsView: React.FC<ReelsViewProps> = ({
  initialReelId,
  onOpenComments,
  onOpenUserProfile,
  onOpenCreateReel,
}) => {
  const { userProfile } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [likedReels, setLikedReels] = useState<{ [reelId: string]: boolean }>({});
  const [likeCounts, setLikeCounts] = useState<{ [reelId: string]: number }>({});
  const [savedReels, setSavedReels] = useState<{ [reelId: string]: boolean }>({});
  const [followingCreators, setFollowingCreators] = useState<{ [creatorId: string]: boolean }>({});
  const [showHeartAnimation, setShowHeartAnimation] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeShareReel, setActiveShareReel] = useState<Reel | null>(null);

  // Deletion modal states
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [videoErrors, setVideoErrors] = useState<{ [reelId: string]: boolean }>({});

  // Video element refs mapped by index
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});

  // Touch gesture & transition locking refs
  const touchStartY = useRef<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const isTransitioningRef = useRef<boolean>(false);
  const lastWheelTimeRef = useRef<number>(0);

  // Load Reels through the custom backend with server-sent realtime updates
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await contentApi.reels();
        if (!active) return;
        const list = result.reels.filter(r => !KNOWN_BOT_REEL_IDS.includes(r.reelId) && !KNOWN_BOT_USER_IDS.includes(r.ownerId));
        setReels(list);
        setLoading(false);
        const counts: { [id: string]: number } = {}; list.forEach(r => { counts[r.reelId] = r.likeCount || 0; }); setLikeCounts(counts);
        if (initialReelId && list.length) { const idx = list.findIndex(r => r.reelId === initialReelId); if (idx >= 0) setCurrentIndex(idx); }
      } catch (err) { console.error('Reels load error:', err); if (active) setLoading(false); }
    };
    void load();
    const unsubscribe = subscribeToEvents(event => { if (event.topic === 'reels') void load(); });
    return () => { active = false; unsubscribe(); };
  }, [initialReelId]);

  const currentReel = reels[currentIndex];

  // Video Lifecycle: Play active video and immediately pause/silence all others
  useEffect(() => {
    if (reels.length === 0) return;

    Object.keys(videoRefs.current).forEach((idxKey) => {
      const idx = Number(idxKey);
      const video = videoRefs.current[idx];
      if (video) {
        if (idx === currentIndex) {
          video.currentTime = 0;
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch((err) => {
              // If unmuted autoplay was rejected by browser policy on mobile, retry muted
              if (err?.name === 'NotAllowedError' && !video.muted) {
                video.muted = true;
                setIsMuted(true);
                video.play().catch(() => {});
              }
            });
          }
        } else {
          video.pause();
          video.currentTime = 0;
        }
      }
    });

    if (currentReel && userProfile) {
      checkIsReelLiked(currentReel.reelId, userProfile.userId).then((isLiked) => {
        setLikedReels((prev) => ({ ...prev, [currentReel.reelId]: isLiked }));
      });
      checkIsFavorited(userProfile.userId, currentReel.reelId).then((isFav) => {
        setSavedReels((prev) => ({ ...prev, [currentReel.reelId]: isFav }));
      });
      if (currentReel.ownerId !== userProfile.userId) {
        checkIsFollowing(userProfile.userId, currentReel.ownerId).then((isFoll) => {
          setFollowingCreators((prev) => ({ ...prev, [currentReel.ownerId]: isFoll }));
        });
      }
    }
  }, [currentIndex, currentReel, userProfile, reels.length]);

  // Navigate to Next Reel (Swipe Up)
  const goToNextReel = useCallback(() => {
    if (isTransitioningRef.current) return;
    if (currentIndex < reels.length - 1) {
      isTransitioningRef.current = true;
      setCurrentIndex((prev) => prev + 1);
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 350);
    }
  }, [currentIndex, reels.length]);

  // Navigate to Previous Reel (Swipe Down)
  const goToPrevReel = useCallback(() => {
    if (isTransitioningRef.current) return;
    if (currentIndex > 0) {
      isTransitioningRef.current = true;
      setCurrentIndex((prev) => prev - 1);
      setTimeout(() => {
        isTransitioningRef.current = false;
      }, 350);
    }
  }, [currentIndex]);

  // Touch Gesture Event Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTransitioningRef.current) return;
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null || touchStartX.current === null) return;
    if (isTransitioningRef.current) return;

    const endY = e.changedTouches[0].clientY;
    const endX = e.changedTouches[0].clientX;
    const deltaY = endY - touchStartY.current;
    const deltaX = endX - touchStartX.current;

    // Reset touch coordinates
    touchStartY.current = null;
    touchStartX.current = null;

    // Check if vertical swipe is dominant
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 40) {
      if (deltaY < 0) {
        // Swiped UP -> Next Reel
        goToNextReel();
      } else {
        // Swiped DOWN -> Previous Reel
        goToPrevReel();
      }
    }
  };

  // Mouse Wheel / Trackpad Vertical Scroll Handler (for desktop support)
  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheelTimeRef.current < 400 || isTransitioningRef.current) return;

    if (Math.abs(e.deltaY) > 30) {
      lastWheelTimeRef.current = now;
      if (e.deltaY > 0) {
        goToNextReel();
      } else {
        goToPrevReel();
      }
    }
  };

  const handleLikeToggle = async (reel: Reel) => {
    if (!userProfile) return;
    const isCurrentlyLiked = likedReels[reel.reelId] || false;
    const currentCount = likeCounts[reel.reelId] || 0;

    const nextLiked = !isCurrentlyLiked;
    const nextCount = nextLiked ? currentCount + 1 : Math.max(0, currentCount - 1);

    setLikedReels((prev) => ({ ...prev, [reel.reelId]: nextLiked }));
    setLikeCounts((prev) => ({ ...prev, [reel.reelId]: nextCount }));

    try {
      const isLiked = await toggleLikeReel(reel.reelId, userProfile.userId);
      setLikedReels((prev) => ({ ...prev, [reel.reelId]: isLiked }));
    } catch (err) {
      setLikedReels((prev) => ({ ...prev, [reel.reelId]: isCurrentlyLiked }));
      setLikeCounts((prev) => ({ ...prev, [reel.reelId]: currentCount }));
    }
  };

  const handleDoubleTap = (reel: Reel) => {
    setShowHeartAnimation(true);
    setTimeout(() => setShowHeartAnimation(false), 800);
    if (!likedReels[reel.reelId]) {
      handleLikeToggle(reel);
    }
  };

  const handleFavoriteToggle = async (reel: Reel) => {
    if (!userProfile) return;
    const next = !savedReels[reel.reelId];
    setSavedReels((prev) => ({ ...prev, [reel.reelId]: next }));
    try {
      await toggleFavorite(userProfile.userId, reel.reelId, 'reel', reel);
    } catch (err) {
      setSavedReels((prev) => ({ ...prev, [reel.reelId]: !next }));
    }
  };

  const handleFollowToggle = async (creatorId: string) => {
    if (!userProfile) return;
    const next = !followingCreators[creatorId];
    setFollowingCreators((prev) => ({ ...prev, [creatorId]: next }));
    try {
      if (next) {
        await followUser(userProfile.userId, creatorId);
      } else {
        await unfollowUser(userProfile.userId, creatorId);
      }
    } catch (err) {
      setFollowingCreators((prev) => ({ ...prev, [creatorId]: !next }));
    }
  };

  // Open VYBE Share Sheet
  const handleShareReel = (reel: Reel) => {
    setActiveShareReel(reel);
  };

  const handleConfirmDeleteReel = async () => {
    if (!currentReel || userProfile?.userId !== currentReel.ownerId || isDeleting) return;

    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteReel(currentReel.reelId, currentReel.ownerId);
      setShowDeleteConfirm(false);
      setReels((prev) => prev.filter((r) => r.reelId !== currentReel.reelId));
      if (currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    } catch (err) {
      console.error('Reel deletion failed:', err);
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-120px)] flex flex-col items-center justify-center space-y-3 bg-black text-white">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-400">Loading Reels...</p>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="w-full h-[calc(100vh-120px)] flex flex-col items-center justify-center p-6 text-center bg-black text-white select-none">
        <div className="w-16 h-16 rounded-full bg-[#181a24] border border-[#2b2f3d] flex items-center justify-center mb-4 text-pink-400">
          <Film className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">No Reels Yet</h3>
        <p className="text-xs text-slate-400 max-w-xs mb-6">
          Capture high-energy short video clips and share your vibe with everyone.
        </p>
        <button
          onClick={onOpenCreateReel}
          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-semibold shadow-lg hover:brightness-110 transition flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Reel</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-[calc(100vh-120px)] bg-black overflow-hidden select-none flex items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* Toast Notification for Link Copy */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-[#1e2230]/95 backdrop-blur-md text-white px-4 py-2 rounded-full border border-pink-500/40 shadow-2xl flex items-center space-x-2 text-xs font-semibold animate-in fade-in zoom-in-95 duration-200">
          <Check className="w-4 h-4 text-pink-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Vertical Slider Track */}
      <div className="relative w-full max-w-[480px] h-full overflow-hidden bg-[#0a0b0e]">
        <div
          className="w-full h-full flex flex-col transition-transform duration-300 ease-out"
          style={{
            transform: `translateY(-${currentIndex * 100}%)`,
          }}
        >
          {reels.map((reel, idx) => {
            const isCurrent = idx === currentIndex;
            return (
              <div
                key={reel.reelId}
                className="relative w-full h-full flex-shrink-0 bg-[#0a0b0e] overflow-hidden"
              >
                {/* Active Reel Video */}
                <div
                  className="relative w-full h-full cursor-pointer flex items-center justify-center"
                  onDoubleClick={() => handleDoubleTap(reel)}
                >
                  {reel.mediaURL.startsWith('/uploads/reels/') ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center space-y-2 text-slate-400">
                      <Film className="w-12 h-12 text-slate-600 animate-pulse" />
                      <p className="text-sm font-semibold text-slate-300">Legacy Media Format</p>
                      <p className="text-xs text-slate-500 max-w-[220px]">
                        This Reel was published with a local container path and is unavailable on the production cloud.
                      </p>
                    </div>
                  ) : videoErrors[reel.reelId] ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center space-y-2 text-slate-400">
                      <Film className="w-12 h-12 text-rose-500/70" />
                      <p className="text-sm font-semibold text-slate-300">Video Unavailable</p>
                      <p className="text-xs text-slate-500 max-w-[220px]">
                        The media stream could not be loaded from storage.
                      </p>
                    </div>
                  ) : (
                    <video
                      ref={(el) => {
                        videoRefs.current[idx] = el;
                      }}
                      src={reel.mediaURL}
                      className="w-full h-full object-cover"
                      loop
                      playsInline
                      muted={isMuted}
                      autoPlay={isCurrent}
                      preload={Math.abs(idx - currentIndex) <= 1 ? 'auto' : 'none'}
                      onError={() => {
                        console.warn(`[ReelsView] Video playback failed for reel ${reel.reelId}:`, reel.mediaURL);
                        setVideoErrors((prev) => ({ ...prev, [reel.reelId]: true }));
                      }}
                    />
                  )}

                  {/* Double Tap Heart Animation */}
                  {isCurrent && showHeartAnimation && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 animate-in zoom-in-50 duration-200">
                      <Heart className="w-28 h-28 text-pink-500 fill-pink-500 drop-shadow-[0_0_20px_rgba(255,20,147,0.8)] animate-bounce" />
                    </div>
                  )}
                </div>

                {/* Sound Toggle (Top Left) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  className="absolute top-4 left-4 z-30 p-2.5 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition shadow-md"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                {/* Right Action Bar */}
                <div className="absolute right-3 bottom-16 z-30 flex flex-col items-center space-y-4">
                  {/* Creator Avatar with Quick Follow Badge */}
                  <div className="relative flex flex-col items-center">
                    <div
                      className="p-0.5 rounded-full ring-2 ring-white/80 cursor-pointer shadow-lg"
                      onClick={() => onOpenUserProfile(reel.ownerId)}
                    >
                      <img
                        src={getAvatarUrl(reel.ownerPhotoURL)}
                        alt={reel.ownerUsername}
                        className="w-11 h-11 rounded-full object-cover"
                      />
                    </div>
                    {userProfile?.userId !== reel.ownerId && (
                      <button
                        onClick={() => handleFollowToggle(reel.ownerId)}
                        className={`absolute -bottom-2 text-white rounded-full p-0.5 shadow-lg border-2 border-black transition ${
                          followingCreators[reel.ownerId] ? 'bg-slate-700' : 'bg-pink-500'
                        }`}
                        title={followingCreators[reel.ownerId] ? 'Following' : 'Follow'}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Like Button */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => handleLikeToggle(reel)}
                      className="p-2 text-white hover:text-pink-500 transition transform active:scale-125"
                    >
                      <Heart
                        className={`w-7 h-7 drop-shadow ${
                          likedReels[reel.reelId] ? 'text-pink-500 fill-pink-500' : 'text-white'
                        }`}
                      />
                    </button>
                    <span className="text-xs text-white font-medium drop-shadow">
                      {(likeCounts[reel.reelId] || 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Comments Button */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => onOpenComments(reel)}
                      className="p-2 text-white hover:text-slate-300 transition transform active:scale-125"
                    >
                      <MessageCircle className="w-7 h-7 drop-shadow" />
                    </button>
                    <span className="text-xs text-white font-medium drop-shadow">
                      {reel.commentCount || 0}
                    </span>
                  </div>

                  {/* Share Button (Between Comment & Save) */}
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => handleShareReel(reel)}
                      className="p-2 text-white hover:text-pink-400 transition transform active:scale-125"
                      title="Share Reel"
                    >
                      <Share2 className="w-7 h-7 drop-shadow" />
                    </button>
                    <span className="text-xs text-white font-medium drop-shadow">
                      Share
                    </span>
                  </div>

                  {/* Save/Favorite Button */}
                  <button
                    onClick={() => handleFavoriteToggle(reel)}
                    className="p-2 text-white hover:text-amber-400 transition transform active:scale-125"
                    title={savedReels[reel.reelId] ? 'Saved' : 'Save'}
                  >
                    <Bookmark
                      className={`w-7 h-7 drop-shadow ${
                        savedReels[reel.reelId] ? 'text-amber-400 fill-amber-400' : 'text-white'
                      }`}
                    />
                  </button>

                  {/* Delete Option for Owner */}
                  {userProfile?.userId === reel.ownerId && (
                    <button
                      onClick={() => {
                        setDeleteError(null);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-2 text-red-400 hover:text-red-300 transition transform active:scale-110"
                      title="Delete Reel"
                    >
                      <Trash2 className="w-5 h-5 drop-shadow" />
                    </button>
                  )}
                </div>

                {/* Bottom Overlay: Creator info, caption & audio tag */}
                <div className="absolute left-0 right-16 bottom-4 z-20 px-4 py-2 pointer-events-none">
                  <div className="pointer-events-auto">
                    {/* Username & Follow Button */}
                    <div className="flex items-center space-x-2.5 mb-1.5">
                      <span
                        onClick={() => onOpenUserProfile(reel.ownerId)}
                        className="text-sm font-bold text-white drop-shadow cursor-pointer hover:underline"
                      >
                        @{reel.ownerUsername}
                      </span>
                      {userProfile?.userId !== reel.ownerId && !followingCreators[reel.ownerId] && (
                        <button
                          onClick={() => handleFollowToggle(reel.ownerId)}
                          className="px-2.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-[11px] font-semibold text-white border border-white/30 transition"
                        >
                          Follow
                        </button>
                      )}
                    </div>

                    {/* Caption */}
                    {reel.caption && (
                      <p className="text-xs text-white/90 drop-shadow line-clamp-2 mb-2 font-normal leading-relaxed">
                        {reel.caption}
                      </p>
                    )}

                    {/* Audio attribution tag */}
                    {reel.audioTitle && (
                      <div className="flex items-center space-x-1.5 text-xs text-white/80 drop-shadow bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-full w-fit">
                        <Music2 className="w-3.5 h-3.5 animate-spin" />
                        <span className="text-[11px] font-medium truncate max-w-[200px]">
                          {reel.audioTitle}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Delete Confirmation Modal for Reel */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#181a24] border border-[#2c3040] rounded-2xl p-5 max-w-xs w-full shadow-2xl text-center animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">Delete Reel?</h4>
              <p className="text-xs text-slate-400 mb-4">
                Are you sure you want to permanently delete this Reel? This action cannot be undone.
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
                  onClick={handleConfirmDeleteReel}
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

        {/* Share to VYBE Friends Modal */}
        {activeShareReel && (
          <ShareReelModal
            reel={activeShareReel}
            onClose={() => setActiveShareReel(null)}
            onShareSuccess={() => {
              setToastMessage('Reel shared to chat!');
              setTimeout(() => setToastMessage(null), 2500);
            }}
          />
        )}
      </div>
    </div>
  );
};
