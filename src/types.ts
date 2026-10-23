export type AppTheme = 'gray_white' | 'vybe_colorful';

export interface UserProfile {
  userId: string;
  email?: string;
  displayName: string;
  username: string;
  photoURL: string;
  bio: string;
  isVerified?: boolean;
  theme?: AppTheme;
  appLockHash?: string;
  appLockEnabled?: boolean;
  followerCount: number;
  followingCount: number;
  postCount: number;
  reelCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Post {
  postId: string;
  ownerId: string;
  ownerUsername: string;
  ownerDisplayName: string;
  ownerPhotoURL: string;
  caption: string;
  mediaURL: string;
  mediaType?: 'image' | 'video';
  isVerified?: boolean;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  isLiked?: boolean;
  isFavorited?: boolean;
}

export interface Story {
  storyId: string;
  ownerId: string;
  ownerUsername: string;
  ownerDisplayName: string;
  ownerPhotoURL: string;
  mediaURL: string;
  caption?: string;
  isVerified?: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface Reel {
  reelId: string;
  ownerId: string;
  ownerUsername: string;
  ownerDisplayName: string;
  ownerPhotoURL: string;
  caption: string;
  mediaURL: string;
  audioTitle: string;
  isVerified?: boolean;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  isLiked?: boolean;
  isFavorited?: boolean;
}

export interface CommentItem {
  commentId: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName?: string;
  authorPhotoURL: string;
  isVerified?: boolean;
  text: string;
  createdAt: string;
}

export interface Conversation {
  conversationId: string;
  participantIds: string[];
  participantDetails: {
    [userId: string]: {
      displayName: string;
      username: string;
      photoURL: string;
      isVerified?: boolean;
    };
  };
  lastMessage?: string;
  lastMessageSenderId?: string;
  lastReadTimestamps?: {
    [userId: string]: string;
  };
  updatedAt: string;
}

export interface ChatMessage {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  senderPhotoURL: string;
  text: string;
  mediaURL?: string;
  messageType?: 'text' | 'image' | 'reel_share';
  reelId?: string;
  reelData?: {
    reelId: string;
    mediaURL: string;
    caption?: string;
    ownerUsername: string;
    ownerDisplayName?: string;
    ownerPhotoURL?: string;
  };
  isRead?: boolean;
  readAt?: string;
  createdAt: string;
}

export interface AppNotification {
  notificationId: string;
  userId: string;
  senderId: string;
  senderUsername: string;
  senderPhotoURL: string;
  type: 'like' | 'comment' | 'follow';
  message: string;
  targetId?: string;
  read: boolean;
  createdAt: string;
}
