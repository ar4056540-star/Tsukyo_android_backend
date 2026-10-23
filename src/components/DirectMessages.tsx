import React, { useState, useEffect, useRef } from 'react';
import { chatApi, subscribeToEvents, uploadMedia } from '../lib/api';
import { Conversation, ChatMessage, UserProfile, Reel } from '../types';
import { useAuth } from '../lib/authContext';
import {
  sendChatMessage,
  getOrCreateConversation,
  searchUsers,
  markMessagesAsSeen,
  getReelById,
} from '../lib/dataService';
import { getAvatarUrl } from '../lib/constants';
import { compressImageFile } from '../lib/imageCompressor';
import { VerifiedBadge } from './VerifiedBadge';
import {
  ChevronLeft,
  Send,
  Image as ImageIcon,
  Search,
  Check,
  CheckCheck,
  Plus,
  X,
  Loader2,
  Film,
  Play,
  AlertCircle,
} from 'lucide-react';

interface DirectMessagesProps {
  onClose: () => void;
  initialRecipientId?: string;
  onOpenReel?: (reel: Reel) => void;
}

const SharedReelChatCard: React.FC<{
  reelId: string;
  reelData?: ChatMessage['reelData'];
  onOpenReel?: (reel: Reel) => void;
}> = ({ reelId, reelData, onOpenReel }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const handleClick = async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      const reel = await getReelById(reelId);
      if (reel) {
        if (onOpenReel) {
          onOpenReel(reel);
        }
      } else {
        setIsDeleted(true);
      }
    } catch {
      setIsDeleted(true);
    } finally {
      setIsChecking(false);
    }
  };

  if (isDeleted) {
    return (
      <div className="w-52 p-3 bg-[#171924] border border-[#2b2f3e] rounded-xl flex flex-col items-center justify-center text-center space-y-1.5 my-1">
        <Film className="w-6 h-6 text-slate-500" />
        <span className="text-xs font-semibold text-slate-300">Reel no longer available</span>
        <span className="text-[10px] text-slate-500">This Reel may have been deleted by the owner.</span>
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      className="w-52 rounded-2xl overflow-hidden bg-[#13151f] border border-[#2c3040] hover:border-pink-500/50 transition cursor-pointer shadow-lg my-1 group text-left"
    >
      <div className="relative w-full h-32 bg-black overflow-hidden flex items-center justify-center">
        {reelData?.mediaURL ? (
          <video src={reelData.mediaURL} className="w-full h-full object-cover" muted playsInline />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1c1f2b] to-[#12141d] flex items-center justify-center">
            <Film className="w-8 h-8 text-pink-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
          <div className="flex items-center space-x-1.5">
            <img
              src={getAvatarUrl(reelData?.ownerPhotoURL)}
              alt="Owner"
              className="w-5 h-5 rounded-full object-cover border border-white/40"
            />
            <span className="text-[11px] font-bold text-white truncate max-w-[120px]">
              @{reelData?.ownerUsername || 'creator'}
            </span>
          </div>
        </div>
        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md p-1.5 rounded-full text-white group-hover:scale-110 transition">
          <Play className="w-3.5 h-3.5 fill-white text-white" />
        </div>
      </div>
      <div className="p-2.5 bg-[#171a26]">
        {reelData?.caption && (
          <p className="text-[11px] text-slate-300 line-clamp-2 mb-2 font-normal leading-relaxed">
            {reelData.caption}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-pink-400 flex items-center space-x-1">
            <Film className="w-3 h-3" />
            <span>Watch Reel</span>
          </span>
          {isChecking && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
        </div>
      </div>
    </div>
  );
};

export const DirectMessages: React.FC<DirectMessagesProps> = ({
  onClose,
  initialRecipientId,
  onOpenReel,
}) => {
  const { userProfile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loadingConv, setLoadingConv] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [searchCreatorQuery, setSearchCreatorQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Listen to conversations through the custom realtime backend
  useEffect(() => {
    if (!userProfile) return;
    let active = true;
    const load = async () => {
      try {
        const result = await chatApi.conversations(); if (!active) return;
        setConversations(result.conversations); setLoadingConv(false);
        if (initialRecipientId && !activeConversation) { const match = result.conversations.find(c => c.participantIds.includes(initialRecipientId)); if (match) setActiveConversation(match); }
      } catch (err) { console.error('Conversations load error:', err); if (active) setLoadingConv(false); }
    };
    void load();
    const unsubscribe = subscribeToEvents(event => { if (event.topic === `conversations:${userProfile.userId}`) void load(); });
    return () => { active = false; unsubscribe(); };
  }, [userProfile, initialRecipientId]);

  // Listen to messages for the active conversation
  useEffect(() => {
    if (!activeConversation || !userProfile) { setMessages([]); return; }
    let active = true;
    const load = async () => {
      try { const result = await chatApi.messages(activeConversation.conversationId); if (!active) return; setMessages(result.messages); await chatApi.seen(activeConversation.conversationId); setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); }
      catch (err) { console.error('Messages load error:', err); }
    };
    void load();
    const unsubscribe = subscribeToEvents(event => { if (event.topic === `messages:${activeConversation.conversationId}` || event.topic === `conversations:${userProfile.userId}`) void load(); });
    return () => { active = false; unsubscribe(); };
  }, [activeConversation, userProfile]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !attachmentUrl) || !activeConversation || !userProfile || isSending || isUploadingAttachment) return;

    const textToSend = inputText.trim();
    const mediaToSend = attachmentUrl || undefined;

    setInputText('');
    setAttachmentUrl(null);
    setIsSending(true);

    try {
      await sendChatMessage(
        activeConversation.conversationId,
        userProfile,
        textToSend,
        mediaToSend
      );
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleStartConversationWithUser = async (targetUser: UserProfile) => {
    if (!userProfile) return;
    try {
      const convId = await getOrCreateConversation(userProfile, targetUser);
      setShowNewChatModal(false);
      const match = conversations.find((c) => c.conversationId === convId);
      if (match) {
        setActiveConversation(match);
      } else {
        setActiveConversation({
          conversationId: convId,
          participantIds: [userProfile.userId, targetUser.userId],
          participantDetails: {
            [userProfile.userId]: {
              displayName: userProfile.displayName,
              username: userProfile.username,
              photoURL: userProfile.photoURL,
            },
            [targetUser.userId]: {
              displayName: targetUser.displayName,
              username: targetUser.username,
              photoURL: targetUser.photoURL,
              isVerified: targetUser.isVerified,
            },
          },
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Failed to start conversation:', err);
    }
  };

  const handleSearchCreators = async (queryStr: string) => {
    setSearchCreatorQuery(queryStr);
    if (!queryStr.trim()) {
      setSearchResults([]);
      return;
    }
    const results = await searchUsers(queryStr);
    setSearchResults(results.filter((u) => u.userId !== userProfile?.userId));
  };

  const getOtherParticipant = (conv: Conversation) => {
    const otherId = conv.participantIds.find((id) => id !== userProfile?.userId) || '';
    const details = conv.participantDetails?.[otherId] || {
      displayName: 'VYBE User',
      username: 'user',
      photoURL: '',
    };
    return {
      userId: otherId,
      ...details,
      photoURL: getAvatarUrl(details.photoURL),
    };
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-0 select-none">
      <div className="relative w-full max-w-[480px] h-full bg-[#0b0c0e] flex flex-col overflow-hidden text-white">
        {activeConversation ? (
          /* ====================================================
             VIEW 1: ACTIVE CHAT SCREEN
             ==================================================== */
          <div className="w-full h-full flex flex-col bg-[#0b0c0e]">
            {/* Active Conversation Top Bar */}
            <div className="px-4 py-3 bg-[#11131a] border-b border-[#20232e] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setActiveConversation(null)}
                  className="p-1.5 -ml-1 text-slate-300 hover:text-white rounded-full transition"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <div className="flex items-center space-x-2.5">
                  <div className="relative">
                    <img
                      src={getOtherParticipant(activeConversation).photoURL}
                      alt="Avatar"
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-700"
                    />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#11131a]" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-1">
                      <h4 className="text-sm font-semibold text-white leading-tight">
                        {getOtherParticipant(activeConversation).displayName}
                      </h4>
                      <VerifiedBadge className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-[11px] text-emerald-400 font-medium">Active now</p>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="text-xs font-semibold text-slate-400 hover:text-white p-1"
              >
                Close
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b0c0e]">
              {messages.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-xs text-slate-500">Say hello and start the conversation! ✨</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === userProfile?.userId;
                  const isReelShare = msg.messageType === 'reel_share' || !!msg.reelId;

                  return (
                    <div
                      key={msg.messageId}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl text-sm leading-relaxed ${
                          isReelShare
                            ? isMine
                              ? 'bg-transparent text-white'
                              : 'bg-transparent text-slate-200'
                            : isMine
                            ? 'px-4 py-2.5 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-br-sm shadow-md'
                            : 'px-4 py-2.5 bg-[#181a24] text-slate-200 border border-[#2b2f3e] rounded-bl-sm'
                        }`}
                      >
                        {/* Reel Share Card */}
                        {isReelShare && msg.reelId && (
                          <SharedReelChatCard
                            reelId={msg.reelId}
                            reelData={msg.reelData}
                            onOpenReel={onOpenReel}
                          />
                        )}

                        {/* Standard Image Attachment */}
                        {!isReelShare && msg.mediaURL && (
                          <img
                            src={msg.mediaURL}
                            alt="Attachment"
                            className="rounded-xl mb-2 max-h-60 w-full object-cover"
                          />
                        )}

                        {/* Text Message */}
                        {msg.text && (
                          <p
                            className={`break-words ${
                              isReelShare
                                ? isMine
                                  ? 'bg-[#181a24] px-3.5 py-2 rounded-xl text-xs text-white border border-[#2b2f3e] mt-1'
                                  : 'bg-[#181a24] px-3.5 py-2 rounded-xl text-xs text-slate-200 border border-[#2b2f3e] mt-1'
                                : ''
                            }`}
                          >
                            {msg.text}
                          </p>
                        )}
                      </div>

                      {/* Timestamp & Read Receipt Indicator */}
                      <div className="flex items-center space-x-1 mt-1 px-1 text-[10px] text-slate-500">
                        <span>
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isMine && (
                          <div className="flex items-center space-x-0.5 ml-1">
                            {msg.isRead ? (
                              <span
                                className="flex items-center space-x-0.5 text-sky-400 font-medium"
                                title={
                                  msg.readAt
                                    ? `Seen at ${new Date(msg.readAt).toLocaleTimeString()}`
                                    : 'Seen'
                                }
                              >
                                <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                                <span>Seen</span>
                              </span>
                            ) : (
                              <span className="flex items-center space-x-0.5 text-slate-400">
                                <Check className="w-3.5 h-3.5" />
                                <span>Sent</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Attachment preview if selected */}
            {attachmentError && (
              <div className="px-4 py-2 bg-[#12141c] border-t border-[#232734] text-xs text-red-400">{attachmentError}</div>
            )}
            {attachmentUrl && (
              <div className="px-4 py-2 bg-[#12141c] border-t border-[#232734] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <img src={attachmentUrl} alt="Preview" className="w-12 h-12 rounded object-cover" />
                  <span className="text-xs text-slate-400">Photo attached</span>
                </div>
                <button
                  onClick={() => { setAttachmentUrl(null); setAttachmentError(null); }}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Message Input Box */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 bg-[#11131a] border-t border-[#20232e] flex items-center space-x-2 flex-shrink-0"
            >
              <label
                className="p-2.5 text-slate-400 hover:text-pink-400 rounded-full transition cursor-pointer"
                title="Attach photo"
              >
                <ImageIcon className="w-5 h-5" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    if (!file.type.startsWith('image/')) {
                      setAttachmentError('Please choose an image file.');
                      return;
                    }
                    setAttachmentError(null);
                    setIsUploadingAttachment(true);
                    try {
                      const uploaded = await uploadMedia(file, 'messages');
                      setAttachmentUrl(uploaded.url);
                    } catch (err) {
                      setAttachmentError(err instanceof Error ? err.message : 'Failed to upload image.');
                    } finally {
                      setIsUploadingAttachment(false);
                    }
                  }}
                  className="hidden"
                />
              </label>

              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Message..."
                className="flex-1 bg-[#181a24] text-white text-sm rounded-full px-4 py-2.5 border border-[#2b2f3e] focus:outline-none focus:border-pink-500"
              />

              <button
                type="submit"
                disabled={(!inputText.trim() && !attachmentUrl) || isSending || isUploadingAttachment}
                className="p-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-full disabled:opacity-40 transition transform active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          /* ====================================================
             VIEW 2: CONVERSATIONS LIST
             ==================================================== */
          <div className="w-full h-full flex flex-col bg-[#0b0c0e]">
            {/* Header */}
            <div className="px-4 py-3.5 bg-[#11131a] border-b border-[#20232e] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-3">
                <button
                  onClick={onClose}
                  className="p-1.5 -ml-1 text-slate-300 hover:text-white rounded-full transition"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <h3 className="text-lg font-bold text-white">Direct Messages</h3>
              </div>

              <button
                onClick={() => setShowNewChatModal(true)}
                className="p-2 bg-pink-500 hover:bg-pink-600 text-white rounded-full transition shadow"
                title="New Message"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
              {loadingConv ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-2">
                  <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-500">Loading chats...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="text-center py-24 px-6">
                  <div className="w-16 h-16 rounded-full bg-[#181a24] border border-[#2b2f3d] flex items-center justify-center mx-auto mb-4 text-pink-400">
                    <Send className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-bold text-white mb-1">No Messages Yet</h4>
                  <p className="text-xs text-slate-400 mb-6">
                    Connect directly with friends and creators on VYBE.
                  </p>
                  <button
                    onClick={() => setShowNewChatModal(true)}
                    className="px-5 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-semibold"
                  >
                    Start a New Chat
                  </button>
                </div>
              ) : (
                conversations.map((conv) => {
                  const other = getOtherParticipant(conv);
                  return (
                    <div
                      key={conv.conversationId}
                      onClick={() => setActiveConversation(conv)}
                      className="flex items-center space-x-3.5 p-3 rounded-2xl hover:bg-[#151720] transition cursor-pointer border border-transparent hover:border-[#222533]"
                    >
                      <div className="relative flex-shrink-0">
                        <img
                          src={other.photoURL}
                          alt={other.username}
                          className="w-13 h-13 rounded-full object-cover ring-1 ring-slate-700"
                        />
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full ring-2 ring-[#0b0c0e]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <div className="flex items-center space-x-1 truncate mr-2">
                            <h4 className="text-sm font-semibold text-white truncate">
                              {other.displayName}
                            </h4>
                            <VerifiedBadge className="w-3.5 h-3.5 flex-shrink-0" />
                          </div>
                          <span className="text-[10px] text-slate-500 flex-shrink-0">
                            {new Date(conv.updatedAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate">
                          {conv.lastMessage || 'Sent an attachment'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* New Chat Modal / Search Creator */}
        {showNewChatModal && (
          <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#151722] border border-[#2b2f3e] rounded-2xl p-4 text-white shadow-2xl flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between pb-3 border-b border-[#232734]">
                <h4 className="text-sm font-bold">New Direct Message</h4>
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative my-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={searchCreatorQuery}
                  onChange={(e) => handleSearchCreators(e.target.value)}
                  placeholder="Search by username or name..."
                  className="w-full bg-[#1b1e2c] text-xs text-white rounded-xl pl-9 pr-3 py-2 border border-[#2b2f3e] focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 min-h-[150px]">
                {searchResults.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">
                    {searchCreatorQuery
                      ? 'No creators found'
                      : 'Type a name or username to search.'}
                  </p>
                ) : (
                  searchResults.map((user) => (
                    <div
                      key={user.userId}
                      onClick={() => handleStartConversationWithUser(user)}
                      className="flex items-center space-x-3 p-2 rounded-xl hover:bg-[#202332] cursor-pointer transition"
                    >
                      <img
                        src={getAvatarUrl(user.photoURL)}
                        alt={user.username}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-1">
                          <span className="text-xs font-semibold text-white truncate">
                            {user.displayName}
                          </span>
                          {user.isVerified && <VerifiedBadge size="sm" />}
                        </div>
                        <span className="text-[11px] text-slate-400 truncate block">
                          @{user.username}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
