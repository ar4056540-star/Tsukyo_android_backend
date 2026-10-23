import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/authContext';
import { ThemeProvider, useTheme } from './lib/themeContext';
import { AppLockProvider, useAppLock } from './lib/appLockContext';
import { Header } from './components/Header';
import { BottomNav, MainTab } from './components/BottomNav';
import { Feed } from './components/Feed';
import { ReelsView } from './components/ReelsView';
import { UserProfileView } from './components/UserProfileView';
import { SearchModal } from './components/SearchModal';
import { DirectMessages } from './components/DirectMessages';
import { NotificationsDrawer } from './components/NotificationsDrawer';
import { CommentsDrawer } from './components/CommentsDrawer';
import { OtherUserProfileModal } from './components/OtherUserProfileModal';
import { FollowersListModal } from './components/FollowersListModal';
import { CreatePostModal } from './components/CreatePostModal';
import { EditProfileModal } from './components/EditProfileModal';
import { AppLockSetupModal } from './components/AppLockSetupModal';
import { AppLockPinScreen } from './components/AppLockPinScreen';
import { AuthModal } from './components/AuthModal';
import { VybeLogo } from './components/VybeLogo';
import { Post, Reel, UserProfile } from './types';
import { notifyNativeModalState } from './lib/nativeBridge';

const MainApp: React.FC = () => {
  const { currentUser, userProfile, loading } = useAuth();
  const { isLocked } = useAppLock();

  // Navigation State
  const [activeTab, setActiveTab] = useState<MainTab>('feed');
  const [selectedReelId, setSelectedReelId] = useState<string | null>(null);

  // Modal / Drawer States
  const [showSearch, setShowSearch] = useState(false);
  const [showDirectMessages, setShowDirectMessages] = useState(false);
  const [dmRecipientId, setDmRecipientId] = useState<string | undefined>(undefined);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createInitialType, setCreateInitialType] = useState<'post' | 'story' | 'reel'>('post');
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showAppLockSetup, setShowAppLockSetup] = useState(false);
  const [showSwitchAccount, setShowSwitchAccount] = useState(false);

  // Detail Modal States
  const [activeOtherUserId, setActiveOtherUserId] = useState<string | null>(null);
  const [activeCommentsTarget, setActiveCommentsTarget] = useState<{ target: Post | Reel; type: 'post' | 'reel' } | null>(null);
  const [activeFollowersModal, setActiveFollowersModal] = useState<{ userId: string; tab: 'followers' | 'following' } | null>(null);

  const isAnyModalOpen = Boolean(
    showSearch ||
    showDirectMessages ||
    showNotifications ||
    showCreate ||
    showEditProfile ||
    showAppLockSetup ||
    showSwitchAccount ||
    activeOtherUserId ||
    activeCommentsTarget ||
    activeFollowersModal
  );

  // Sync modal state with Android Native Container
  useEffect(() => {
    notifyNativeModalState(isAnyModalOpen || activeTab !== 'feed');
  }, [isAnyModalOpen, activeTab]);

  // Android Native Hardware Back Button Handler
  useEffect(() => {
    const handleAndroidBack = (e: Event) => {
      if (showSearch) {
        setShowSearch(false);
        e.preventDefault();
      } else if (showDirectMessages) {
        setShowDirectMessages(false);
        e.preventDefault();
      } else if (showNotifications) {
        setShowNotifications(false);
        e.preventDefault();
      } else if (showCreate) {
        setShowCreate(false);
        e.preventDefault();
      } else if (showEditProfile) {
        setShowEditProfile(false);
        e.preventDefault();
      } else if (showAppLockSetup) {
        setShowAppLockSetup(false);
        e.preventDefault();
      } else if (showSwitchAccount) {
        setShowSwitchAccount(false);
        e.preventDefault();
      } else if (activeOtherUserId) {
        setActiveOtherUserId(null);
        e.preventDefault();
      } else if (activeCommentsTarget) {
        setActiveCommentsTarget(null);
        e.preventDefault();
      } else if (activeFollowersModal) {
        setActiveFollowersModal(null);
        e.preventDefault();
      } else if (activeTab !== 'feed') {
        setActiveTab('feed');
        e.preventDefault();
      }
    };

    window.addEventListener('vybe:android-back', handleAndroidBack);
    return () => window.removeEventListener('vybe:android-back', handleAndroidBack);
  }, [
    showSearch,
    showDirectMessages,
    showNotifications,
    showCreate,
    showEditProfile,
    showAppLockSetup,
    showSwitchAccount,
    activeOtherUserId,
    activeCommentsTarget,
    activeFollowersModal,
    activeTab,
  ]);

  // Deep-link / query param support (?reel=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const reelParam = params.get('reel');
      if (reelParam) {
        setSelectedReelId(reelParam);
        setActiveTab('reels');
      }
    } catch (e) {
      // Ignore
    }
  }, []);

  // AppLock Enforcement
  if (isLocked) {
    return <AppLockPinScreen />;
  }

  // Auth Guard
  if (loading) {
    return (
      <div className="w-full h-screen bg-[#0b0c0e] flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
        <VybeLogo className="h-8 w-auto" />
      </div>
    );
  }

  if (!currentUser) {
    return <AuthModal />;
  }

  return (
    <div className="min-h-screen bg-black flex justify-center selection:bg-pink-500 selection:text-white">
      {/* Mobile-first viewport container (Max 480px) */}
      <div className="w-full max-w-[480px] min-h-screen bg-[#0b0c0e] flex flex-col border-x border-[#1a1c24] relative shadow-2xl overflow-x-hidden">
        {/* Top Header */}
        <Header
          onOpenSearch={() => setShowSearch(true)}
          onOpenDirectMessages={() => {
            setDmRecipientId(undefined);
            setShowDirectMessages(true);
          }}
          onOpenNotifications={() => setShowNotifications(true)}
          onOpenProfile={() => setActiveTab('profile')}
          onOpenAppLock={() => setShowAppLockSetup(true)}
          onSwitchAccount={() => setShowSwitchAccount(true)}
        />

        {/* Main Tab Views */}
        <main className="flex-1 w-full overflow-y-auto">
          {activeTab === 'feed' && (
            <Feed
              onOpenComments={(post) => setActiveCommentsTarget({ target: post, type: 'post' })}
              onOpenUserProfile={(userId) => {
                if (userId === userProfile?.userId) {
                  setActiveTab('profile');
                } else {
                  setActiveOtherUserId(userId);
                }
              }}
              onAddStory={() => {
                setCreateInitialType('story');
                setShowCreate(true);
              }}
            />
          )}

          {activeTab === 'search' && (
            <div className="p-4">
              <SearchModal
                onClose={() => setActiveTab('feed')}
                onOpenUserProfile={(userId) => {
                  if (userId === userProfile?.userId) {
                    setActiveTab('profile');
                  } else {
                    setActiveOtherUserId(userId);
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'reels' && (
            <ReelsView
              initialReelId={selectedReelId}
              onOpenComments={(reel) => setActiveCommentsTarget({ target: reel, type: 'reel' })}
              onOpenUserProfile={(userId) => {
                if (userId === userProfile?.userId) {
                  setActiveTab('profile');
                } else {
                  setActiveOtherUserId(userId);
                }
              }}
              onOpenCreateReel={() => {
                setCreateInitialType('reel');
                setShowCreate(true);
              }}
            />
          )}

          {activeTab === 'profile' && (
            <UserProfileView
              onOpenEditProfile={() => setShowEditProfile(true)}
              onOpenFollowers={(userId, initialTab) => setActiveFollowersModal({ userId, tab: initialTab })}
              onOpenPost={(post) => setActiveCommentsTarget({ target: post, type: 'post' })}
              onOpenReel={(reel) => {
                setSelectedReelId(reel.reelId);
                setActiveTab('reels');
              }}
              onOpenAppLockSetup={() => setShowAppLockSetup(true)}
            />
          )}
        </main>

        <div className="absolute right-2 bottom-[4.5rem] z-30 pointer-events-none select-none text-[9px] font-semibold tracking-[0.28em] text-white/25">VORVIA</div>

        {/* Bottom Navigation */}
        <BottomNav
          activeTab={activeTab}
          onChangeTab={(tab) => {
            if (tab === 'search') {
              setShowSearch(true);
            } else {
              setActiveTab(tab);
            }
          }}
          onOpenCreate={() => {
            setCreateInitialType('post');
            setShowCreate(true);
          }}
        />

        {/* ====================================================
            MODALS & DRAWERS
            ==================================================== */}

        {/* Search Modal */}
        {showSearch && (
          <SearchModal
            onClose={() => setShowSearch(false)}
            onOpenUserProfile={(userId) => {
              if (userId === userProfile?.userId) {
                setActiveTab('profile');
              } else {
                setActiveOtherUserId(userId);
              }
            }}
          />
        )}

        {/* Direct Messages */}
        {showDirectMessages && (
          <DirectMessages
            onClose={() => setShowDirectMessages(false)}
            initialRecipientId={dmRecipientId}
            onOpenReel={(reel) => {
              setSelectedReelId(reel.reelId);
              setActiveTab('reels');
              setShowDirectMessages(false);
            }}
          />
        )}

        {/* Notifications Drawer */}
        {showNotifications && (
          <NotificationsDrawer
            onClose={() => setShowNotifications(false)}
            onOpenUserProfile={(userId) => {
              if (userId === userProfile?.userId) {
                setActiveTab('profile');
              } else {
                setActiveOtherUserId(userId);
              }
            }}
          />
        )}

        {/* Create Post / Story / Reel Modal */}
        {showCreate && (
          <CreatePostModal
            initialType={createInitialType}
            onClose={() => setShowCreate(false)}
            onSuccess={() => {
              if (createInitialType === 'reel') {
                setActiveTab('reels');
              } else {
                setActiveTab('feed');
              }
            }}
          />
        )}

        {/* Edit Profile Modal */}
        {showEditProfile && (
          <EditProfileModal onClose={() => setShowEditProfile(false)} />
        )}

        {/* AppLock Setup Modal */}
        {showAppLockSetup && (
          <AppLockSetupModal onClose={() => setShowAppLockSetup(false)} />
        )}

        {/* Switch Account Modal */}
        {showSwitchAccount && (
          <AuthModal onClose={() => setShowSwitchAccount(false)} />
        )}

        {/* Other User Profile Modal */}
        {activeOtherUserId && (
          <OtherUserProfileModal
            userId={activeOtherUserId}
            onClose={() => setActiveOtherUserId(null)}
            onOpenPost={(post) => setActiveCommentsTarget({ target: post, type: 'post' })}
            onOpenReel={(reel) => {
              setSelectedReelId(reel.reelId);
              setActiveTab('reels');
              setActiveOtherUserId(null);
            }}
            onStartMessage={(targetUser) => {
              setDmRecipientId(targetUser.userId);
              setShowDirectMessages(true);
            }}
            onOpenFollowers={(userId, tab) => setActiveFollowersModal({ userId, tab })}
          />
        )}

        {/* Comments Drawer */}
        {activeCommentsTarget && (
          <CommentsDrawer
            target={activeCommentsTarget.target}
            type={activeCommentsTarget.type}
            onClose={() => setActiveCommentsTarget(null)}
          />
        )}

        {/* Followers / Following List Modal */}
        {activeFollowersModal && (
          <FollowersListModal
            userId={activeFollowersModal.userId}
            initialTab={activeFollowersModal.tab}
            onClose={() => setActiveFollowersModal(null)}
            onSelectUser={(uid) => {
              setActiveFollowersModal(null);
              if (uid === userProfile?.userId) {
                setActiveTab('profile');
              } else {
                setActiveOtherUserId(uid);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppLockProvider>
          <MainApp />
        </AppLockProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
