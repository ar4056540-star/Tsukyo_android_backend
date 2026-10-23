import React, { useState, useEffect } from 'react';
import { notificationsApi, subscribeToEvents } from '../lib/api';
import { AppNotification } from '../types';
import { useAuth } from '../lib/authContext';
import { getAvatarUrl } from '../lib/constants';
import { X, Heart, MessageCircle, UserPlus, Sparkles, CheckCheck } from 'lucide-react';

interface NotificationsDrawerProps {
  onClose: () => void;
  onOpenUserProfile: (userId: string) => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  onClose,
  onOpenUserProfile,
}) => {
  const { userProfile } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) return;
    let active = true;
    const load = async () => { try { const result = await notificationsApi.list(); if (active) setNotifications(result.notifications); } catch (err) { console.error('Notifications load error:', err); } finally { if (active) setLoading(false); } };
    void load();
    const unsubscribe = subscribeToEvents(event => { if (event.topic === `notifications:${userProfile.userId}`) void load(); });
    return () => { active = false; unsubscribe(); };
  }, [userProfile]);

  const markAllRead = async () => {
    if (!userProfile) return;
    for (const notif of notifications.filter(n => !n.read)) {
      try { await notificationsApi.read(notif.notificationId); }
      catch (err) { console.error('Failed to mark read:', err); }
    }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500" />;
      case 'comment':
        return <MessageCircle className="w-3.5 h-3.5 text-indigo-400" />;
      case 'follow':
        return <UserPlus className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center select-none">
      <div className="w-full max-w-[480px] h-[75vh] bg-[#0b0c0e] rounded-t-3xl sm:rounded-3xl border border-[#222634] flex flex-col overflow-hidden text-white animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 bg-[#11131a] border-b border-[#20232e] flex items-center justify-between">
          <h4 className="text-base font-bold text-white">Activity & Notifications</h4>
          <div className="flex items-center space-x-2">
            {notifications.some(n => !n.read) && (
              <button
                onClick={markAllRead}
                className="text-xs text-pink-400 hover:text-pink-300 font-semibold px-2 py-1"
              >
                Mark all read
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-24 text-slate-500">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50 text-pink-400" />
              <p className="text-xs">No notifications yet. You're all caught up!</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.notificationId}
                onClick={() => {
                  onClose();
                  onOpenUserProfile(notif.actorId);
                }}
                className={`flex items-center space-x-3 p-3 rounded-2xl border transition cursor-pointer ${
                  notif.read
                    ? 'bg-[#12141c] border-[#1e2230] opacity-80'
                    : 'bg-[#181b26] border-pink-500/30 shadow-sm'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={getAvatarUrl(notif.actorPhotoURL)}
                    alt={notif.actorUsername}
                    className="w-11 h-11 rounded-full object-cover ring-1 ring-slate-700"
                  />
                  <div className="absolute -bottom-1 -right-1 p-1 bg-[#11131a] rounded-full ring-1 ring-slate-700">
                    {getIcon(notif.type)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-200">
                    <span className="font-bold text-white mr-1">@{notif.actorUsername}</span>
                    {notif.type === 'like' && 'liked your post.'}
                    {notif.type === 'comment' && 'commented on your post.'}
                    {notif.type === 'follow' && 'started following you.'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
