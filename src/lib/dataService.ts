import { Post, Reel, Story, CommentItem, Conversation, ChatMessage, UserProfile } from '../types';
import { getAvatarUrl } from './constants';
import { ensureSafeDataUrl } from './imageCompressor';
import { contentApi, usersApi, favoritesApi, chatApi } from './api';

export const KNOWN_BOT_USER_IDS = ['creator_elena', 'creator_marcus', 'creator_kai', 'test_user_1', 'test_user_2', 'bot_1', 'bot_2'];
export const KNOWN_BOT_POST_IDS = ['post_seed_1', 'post_seed_2', 'post_seed_3'];
export const KNOWN_BOT_STORY_IDS = ['story_seed_1', 'story_seed_2', 'story_seed_3'];
export const KNOWN_BOT_REEL_IDS = ['reel_seed_1', 'reel_seed_2', 'reel_seed_3'];
export const INITIAL_CREATORS: UserProfile[] = [];
export const INITIAL_POSTS: Post[] = [];
export const INITIAL_STORIES: Story[] = [];
export const INITIAL_REELS: Reel[] = [];

export async function cleanupBotUsersAndPosts(): Promise<void> { return; }
export async function seedInitialContentIfEmpty(): Promise<void> { return; }

export async function createPost(postData: Omit<Post, 'postId' | 'likeCount' | 'commentCount' | 'createdAt'>): Promise<Post> {
  const safeMediaURL = await ensureSafeDataUrl(postData.mediaURL, 1200, 1200);
  return (await contentApi.createPost({ ...postData, mediaURL: safeMediaURL, ownerPhotoURL: getAvatarUrl(postData.ownerPhotoURL) })).post;
}
export async function deletePost(postId: string, _ownerId: string): Promise<void> { await contentApi.deletePost(postId); }
export async function toggleLikePost(postId: string, _userId: string): Promise<boolean> { return (await contentApi.togglePostLike(postId)).liked; }
export async function checkIsPostLiked(postId: string, _userId: string): Promise<boolean> { try { return (await contentApi.feed()).posts.find(p=>p.postId===postId)?.isLiked || false; } catch { return false; } }

export async function createStory(storyData: Omit<Story, 'storyId' | 'createdAt' | 'expiresAt'>): Promise<Story> {
  const safeMediaURL = await ensureSafeDataUrl(storyData.mediaURL, 1080, 1920);
  return (await contentApi.createStory({ ...storyData, mediaURL: safeMediaURL, ownerPhotoURL: getAvatarUrl(storyData.ownerPhotoURL) })).story;
}
export async function deleteStory(storyId: string, _ownerId?: string): Promise<void> { await contentApi.deleteStory(storyId); }

export async function createReel(reelData: Omit<Reel, 'reelId' | 'likeCount' | 'commentCount' | 'createdAt'>): Promise<Reel> {
  if (!reelData.mediaURL || reelData.mediaURL.startsWith('/uploads/') || reelData.mediaURL.includes('localhost:') || reelData.mediaURL.includes('127.0.0.1:')) throw new Error('Invalid Reel media URL.');
  const safeMediaURL = reelData.mediaURL.startsWith('data:image/') ? await ensureSafeDataUrl(reelData.mediaURL, 1080, 1920) : reelData.mediaURL;
  return (await contentApi.createReel({ ...reelData, mediaURL: safeMediaURL, ownerPhotoURL: getAvatarUrl(reelData.ownerPhotoURL) })).reel;
}
export async function deleteReel(reelId: string, _ownerId?: string): Promise<void> { await contentApi.deleteReel(reelId); }
export async function toggleLikeReel(reelId: string, _userId: string): Promise<boolean> { return (await contentApi.toggleReelLike(reelId)).liked; }
export async function checkIsReelLiked(reelId: string, _userId: string): Promise<boolean> { try { return (await contentApi.reels()).reels.find(r=>r.reelId===reelId)?.isLiked || false; } catch { return false; } }

export async function followUser(_currentUserId: string, targetUserId: string): Promise<void> { await usersApi.follow(targetUserId); }
export async function unfollowUser(_currentUserId: string, targetUserId: string): Promise<void> { await usersApi.unfollow(targetUserId); }
export async function checkIsFollowing(currentUserId: string, targetUserId: string): Promise<boolean> { return (await usersApi.isFollowing(currentUserId,targetUserId)).following; }
export async function getFollowers(userId: string): Promise<string[]> { return (await usersApi.followers(userId)).userIds.filter(id=>!KNOWN_BOT_USER_IDS.includes(id)); }
export async function getFollowing(userId: string): Promise<string[]> { return (await usersApi.following(userId)).userIds.filter(id=>!KNOWN_BOT_USER_IDS.includes(id)); }

export async function toggleFavorite(userId: string, contentId: string, contentType: 'post'|'reel', contentData: Post|Reel): Promise<boolean> { return (await favoritesApi.toggle(contentId,contentType,contentData)).favorited; }
export async function checkIsFavorited(_userId: string, contentId: string): Promise<boolean> { return (await favoritesApi.check(contentId)).favorited; }
export async function getFavorites(_userId: string): Promise<Array<{contentId:string;contentType:'post'|'reel';contentData:any}>> { return (await favoritesApi.list()).favorites; }

export async function searchUsers(searchTerm: string): Promise<UserProfile[]> { return (await usersApi.search(searchTerm)).users.filter(u=>!KNOWN_BOT_USER_IDS.includes(u.userId)); }
export async function getUserProfileById(userId: string): Promise<UserProfile|null> { try { return (await usersApi.get(userId)).user; } catch { return null; } }

export async function getComments(targetType:'posts'|'reels',targetId:string):Promise<CommentItem[]> { return (await contentApi.comments(targetType,targetId)).comments; }
export async function addComment(targetType:'posts'|'reels',targetId:string,author:{userId:string;username:string;displayName?:string;photoURL:string},text:string):Promise<CommentItem> { return (await contentApi.addComment(targetType,targetId,text)).comment; }

export async function getOrCreateConversation(currentUser:UserProfile,otherUser:UserProfile):Promise<string> { return (await chatApi.createConversation(otherUser.userId)).conversation.conversationId; }
export async function sendChatMessage(conversationId:string,sender:UserProfile,text:string,mediaURL?:string):Promise<ChatMessage> { return (await chatApi.send(conversationId,{text,mediaURL})).message; }
export async function shareReelToConversation(conversationId:string,sender:UserProfile,reel:Reel,customMessage?:string):Promise<ChatMessage> { return (await chatApi.send(conversationId,{text:customMessage||'',messageType:'reel_share',reelId:reel.reelId,reelData:{reelId:reel.reelId,mediaURL:reel.mediaURL,caption:reel.caption||'',ownerUsername:reel.ownerUsername,ownerDisplayName:reel.ownerDisplayName||reel.ownerUsername,ownerPhotoURL:getAvatarUrl(reel.ownerPhotoURL)}})).message; }
export async function shareReelToMultipleFriends(sender:UserProfile,reel:Reel,recipientProfiles:UserProfile[],customMessage?:string):Promise<void> { for(const recipient of recipientProfiles){const id=await getOrCreateConversation(sender,recipient);await shareReelToConversation(id,sender,reel,customMessage);} }
export async function getReelById(reelId:string):Promise<Reel|null>{try{return (await contentApi.getReel(reelId)).reel}catch{return null}}
export async function markMessagesAsSeen(conversationId:string,_currentUserId:string):Promise<void>{await chatApi.seen(conversationId)}

export { contentApi, usersApi, favoritesApi, chatApi };
