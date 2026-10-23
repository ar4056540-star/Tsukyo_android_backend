import React, { useState, useEffect } from 'react';

import { Reel, UserProfile } from '../types';
import { useAuth } from '../lib/authContext';
import {
  shareReelToMultipleFriends,
  searchUsers,
  KNOWN_BOT_USER_IDS,
} from '../lib/dataService';
import { getAvatarUrl } from '../lib/constants';
import { VerifiedBadge } from './VerifiedBadge';
import {
  X,
  Search,
  Send,
  Check,
  Share2,
  Copy,
  Users,
  Film,
  Loader2,
} from 'lucide-react';

interface ShareReelModalProps {
  reel: Reel;
  onClose: () => void;
  onShareSuccess?: () => void;
}

export const ShareReelModal: React.FC<ShareReelModalProps> = ({
  reel,
  onClose,
  onShareSuccess,
}) => {
  const { userProfile } = useAuth();
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<{ [userId: string]: UserProfile }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load real VYBE friends (excluding bots and self)
  useEffect(() => {
    const loadEligibleFriends = async () => {
      if (!userProfile) return;
      setLoadingFriends(true);

      try {
        const allUsers = await searchUsers('');
        // Filter out current user and any bots
        const eligible = allUsers.filter(
          (u) =>
            u.userId !== userProfile.userId &&
            !KNOWN_BOT_USER_IDS.includes(u.userId) &&
            !u.userId.startsWith('creator_') &&
            !u.userId.startsWith('bot_') &&
            !u.userId.startsWith('test_')
        );

        setFriends(eligible);
      } catch (err) {
        console.error('Failed to load friends for sharing:', err);
      } finally {
        setLoadingFriends(false);
      }
    };

    loadEligibleFriends();
  }, [userProfile]);

  const filteredFriends = friends.filter((friend) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      friend.username.toLowerCase().includes(q) ||
      friend.displayName.toLowerCase().includes(q)
    );
  });

  const toggleSelectUser = (friend: UserProfile) => {
    setSelectedUsers((prev) => {
      const next = { ...prev };
      if (next[friend.userId]) {
        delete next[friend.userId];
      } else {
        next[friend.userId] = friend;
      }
      return next;
    });
  };

  const selectedCount = Object.keys(selectedUsers).length;

  const handleSend = async () => {
    if (!userProfile || selectedCount === 0 || isSending) return;

    setIsSending(true);
    setErrorMessage(null);

    try {
      const recipients: UserProfile[] = Object.values(selectedUsers);
      await shareReelToMultipleFriends(userProfile, reel, recipients, customMessage.trim());

      if (onShareSuccess) onShareSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to share reel to friends:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send Reel.');
      setIsSending(false);
    }
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/?reel=${reel.reelId}`;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleExternalShare = async () => {
    const shareUrl = `${window.location.origin}/?reel=${reel.reelId}`;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'VYBE Reel',
          text: `Check out @${reel.ownerUsername}'s Reel on VYBE!`,
          url: shareUrl,
        });
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
      <div className="w-full max-w-[440px] max-h-[85vh] bg-[#12141c] border border-[#232736] rounded-t-3xl sm:rounded-2xl flex flex-col overflow-hidden text-white shadow-2xl animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 border-b border-[#202330] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Share2 className="w-4 h-4 text-pink-500" />
            <h3 className="text-sm font-bold text-white">Share to VYBE Friends</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reel Preview Mini Card */}
        <div className="p-3 bg-[#171924] border-b border-[#202330] flex items-center space-x-3 flex-shrink-0">
          <div className="w-10 h-14 bg-black rounded-lg overflow-hidden flex-shrink-0 relative border border-white/10">
            <video src={reel.mediaURL} className="w-full h-full object-cover" muted />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Film className="w-4 h-4 text-white/80" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1.5 mb-0.5">
              <img
                src={getAvatarUrl(reel.ownerPhotoURL)}
                alt={reel.ownerUsername}
                className="w-4 h-4 rounded-full object-cover"
              />
              <span className="text-xs font-bold text-white truncate">
                @{reel.ownerUsername}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 truncate">
              {reel.caption || 'Watch this Reel on VYBE'}
            </p>
          </div>
        </div>

        {/* Search Friends Input */}
        <div className="p-3 border-b border-[#202330] flex-shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search friends..."
              className="w-full bg-[#1b1e2b] text-white text-xs rounded-xl pl-9 pr-3 py-2 border border-[#2b2f40] focus:outline-none focus:border-pink-500 placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Friends Selection List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-[160px] max-h-[260px]">
          {loadingFriends ? (
            <div className="h-32 flex flex-col items-center justify-center space-y-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
              <span className="text-xs">Loading friends...</span>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center space-y-2 text-slate-400 text-center px-4">
              <Users className="w-6 h-6 text-slate-500" />
              <p className="text-xs text-slate-300">
                {searchQuery ? 'No matching friends found' : 'No friends to share with yet.'}
              </p>
              <p className="text-[10px] text-slate-500">
                Connect with users on VYBE to send reels directly to their chat.
              </p>
            </div>
          ) : (
            filteredFriends.map((friend) => {
              const isSelected = !!selectedUsers[friend.userId];
              return (
                <div
                  key={friend.userId}
                  onClick={() => toggleSelectUser(friend)}
                  className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition ${
                    isSelected ? 'bg-pink-500/10 border border-pink-500/30' : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <img
                      src={getAvatarUrl(friend.photoURL)}
                      alt={friend.username}
                      className="w-9 h-9 rounded-full object-cover"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-1">
                        <span className="text-xs font-semibold text-white truncate">
                          {friend.displayName}
                        </span>
                        {friend.isVerified && <VerifiedBadge size="sm" />}
                      </div>
                      <span className="text-[11px] text-slate-400 block truncate">
                        @{friend.username}
                      </span>
                    </div>
                  </div>

                  {/* Selection Checkmark */}
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${
                      isSelected
                        ? 'bg-pink-500 border-pink-500 text-white'
                        : 'border-slate-600 bg-transparent'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Optional Custom Message / Caption */}
        {selectedCount > 0 && (
          <div className="p-3 border-t border-[#202330] bg-[#151722] flex-shrink-0 animate-in fade-in duration-150">
            <input
              type="text"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a message..."
              className="w-full bg-[#1d202e] text-white text-xs rounded-xl px-3 py-2 border border-[#2b2f40] focus:outline-none focus:border-pink-500"
            />
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="px-4 py-2 bg-red-500/10 text-red-400 text-xs border-t border-red-500/20">
            {errorMessage}
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-3 border-t border-[#202330] bg-[#10121a] flex items-center justify-between space-x-2 flex-shrink-0">
          {/* Secondary External & Copy Options */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-xl bg-[#1b1e2a] hover:bg-[#25293a] text-slate-300 hover:text-white transition flex items-center space-x-1 text-xs"
              title="Copy Link"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-pink-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="text-[11px] hidden sm:inline">{copiedLink ? 'Copied' : 'Link'}</span>
            </button>
            <button
              onClick={handleExternalShare}
              className="p-2 rounded-xl bg-[#1b1e2a] hover:bg-[#25293a] text-slate-300 hover:text-white transition flex items-center space-x-1 text-xs"
              title="Share externally"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="text-[11px] hidden sm:inline">More</span>
            </button>
          </div>

          {/* Primary Send Button */}
          <button
            onClick={handleSend}
            disabled={selectedCount === 0 || isSending}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:brightness-110 disabled:opacity-40 text-xs font-bold text-white shadow-lg transition flex items-center justify-center space-x-1.5"
          >
            {isSending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>{selectedCount > 0 ? `Send to ${selectedCount}` : 'Select Friends'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
