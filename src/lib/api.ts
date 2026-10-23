import type { UserProfile, Post, Reel, Story, CommentItem, Conversation, ChatMessage, AppNotification } from '../types';

export interface SessionUser extends UserProfile { email?: string }

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const TOKEN_KEY = 'vybe_session_token';

export function getToken() { return localStorage.getItem(TOKEN_KEY) || ''; }
export function setToken(token: string) { localStorage.setItem(TOKEN_KEY, token); }
export function clearToken() { localStorage.removeItem(TOKEN_KEY); }

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await response.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text || 'Request failed.' }; }
  if (!response.ok) {
    if (response.status === 401) clearToken();
    throw new Error(data?.error || `Request failed (${response.status}).`);
  }
  return data as T;
}

export function subscribeToEvents(onEvent: (event: { topic: string }) => void): () => void {
  const controller = new AbortController();
  const token = getToken();
  if (!token) return () => controller.abort();
  (async () => {
    try {
      const response = await fetch(`${API_BASE}/api/events`, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
      if (!response.ok || !response.body) throw new Error('Realtime connection failed.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (!controller.signal.aborted) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n'); buffer = blocks.pop() || '';
        for (const block of blocks) {
          const line = block.split('\n').find(l => l.startsWith('data:'));
          if (!line) continue;
          try { onEvent(JSON.parse(line.slice(5).trim())); } catch { /* ignore malformed events */ }
        }
      }
    } catch (error: any) {
      if (!controller.signal.aborted) console.warn('Realtime connection closed:', error?.message || error);
    }
  })();
  return () => controller.abort();
}

export const authApi = {
  async login(email: string, password: string) { const r = await apiFetch<{token:string,user:SessionUser}>('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})}); setToken(r.token); return r.user; },
  async register(email:string,password:string,username:string,displayName:string) { const r=await apiFetch<{token:string,user:SessionUser}>('/api/auth/register',{method:'POST',body:JSON.stringify({email,password,username,displayName})}); setToken(r.token); return r.user; },
  async me() { return (await apiFetch<{user:SessionUser}>('/api/auth/me')).user; },
  async logout() { try { await apiFetch('/api/auth/logout',{method:'POST'}); } finally { clearToken(); } },
  async resetPassword(email:string) { return apiFetch<{message:string}>('/api/auth/reset-password',{method:'POST',body:JSON.stringify({email})}); },
};

export async function uploadMedia(file: File, folder: 'reels'|'posts'|'stories'|'avatars'|'messages'='reels', onProgress?: (percentage:number, loaded:number, total:number)=>void) {
  const token=getToken(); if(!token) throw new Error('You must be signed in to upload media.');
  const contentType=file.type||'application/octet-stream';
  const endpoint=`${API_BASE}/api/media/upload?folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(contentType)}`;
  return new Promise<{mediaId:string,url:string,size:number,contentType:string}>((resolve,reject)=>{
    const xhr=new XMLHttpRequest(); xhr.open('POST',endpoint,true); xhr.setRequestHeader('Authorization',`Bearer ${token}`); xhr.setRequestHeader('Content-Type',contentType);
    xhr.upload.onprogress=e=>{if(e.lengthComputable) onProgress?.(Math.floor(e.loaded/e.total*100),e.loaded,e.total)};
    xhr.onload=()=>{try{const data=JSON.parse(xhr.responseText);if(xhr.status>=200&&xhr.status<300){onProgress?.(100,file.size,file.size);resolve(data)}else if(xhr.status===413){reject(new Error(data?.error||'File exceeds the maximum allowed upload size.'))}else reject(new Error(data?.error||`Upload failed (${xhr.status}).`))}catch{reject(new Error('Invalid upload response.'))}};
    xhr.onerror=()=>reject(new Error('Network error during upload.')); xhr.onabort=()=>reject(new Error('Upload was cancelled.')); xhr.send(file);
  });
}

export const contentApi = {
  feed: () => apiFetch<{posts:Post[]}>('/api/feed?limit=50'),
  stories: () => apiFetch<{stories:Story[]}>('/api/stories'),
  reels: () => apiFetch<{reels:Reel[]}>('/api/reels?limit=50'),
  userPosts: (id:string) => apiFetch<{posts:Post[]}>(`/api/users/${encodeURIComponent(id)}/posts`),
  userReels: (id:string) => apiFetch<{reels:Reel[]}>(`/api/users/${encodeURIComponent(id)}/reels`),
  createPost: (data:any) => apiFetch<{post:Post}>('/api/posts',{method:'POST',body:JSON.stringify(data)}),
  deletePost: (id:string) => apiFetch(`/api/posts/${encodeURIComponent(id)}`,{method:'DELETE'}),
  createStory: (data:any) => apiFetch<{story:Story}>('/api/stories',{method:'POST',body:JSON.stringify(data)}),
  deleteStory: (id:string) => apiFetch(`/api/stories/${encodeURIComponent(id)}`,{method:'DELETE'}),
  createReel: (data:any) => apiFetch<{reel:Reel}>('/api/reels',{method:'POST',body:JSON.stringify(data)}),
  deleteReel: (id:string) => apiFetch(`/api/reels/${encodeURIComponent(id)}`,{method:'DELETE'}),
  getReel: (id:string) => apiFetch<{reel:Reel}>(`/api/reels/${encodeURIComponent(id)}`),
  togglePostLike: (id:string) => apiFetch<{liked:boolean,likeCount:number}>(`/api/posts/${encodeURIComponent(id)}/like`,{method:'POST'}),
  toggleReelLike: (id:string) => apiFetch<{liked:boolean,likeCount:number}>(`/api/reels/${encodeURIComponent(id)}/like`,{method:'POST'}),
  comments: (type:'posts'|'reels',id:string) => apiFetch<{comments:CommentItem[]}>(`/api/${type}/${encodeURIComponent(id)}/comments`),
  addComment: (type:'posts'|'reels',id:string,text:string) => apiFetch<{comment:CommentItem}>(`/api/${type}/${encodeURIComponent(id)}/comments`,{method:'POST',body:JSON.stringify({text})}),
  deleteComment: (type:'posts'|'reels',id:string,commentId:string) => apiFetch(`/api/${type}/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}`,{method:'DELETE'}),
};

export const usersApi = {
  search: (q:string) => apiFetch<{users:UserProfile[]}>(`/api/users/search?q=${encodeURIComponent(q)}`),
  get: (id:string) => apiFetch<{user:UserProfile}>(`/api/users/${encodeURIComponent(id)}`),
  update: (id:string,data:Partial<UserProfile>) => apiFetch<{user:UserProfile}>(`/api/users/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(data)}),
  followers: (id:string) => apiFetch<{userIds:string[]}>(`/api/users/${encodeURIComponent(id)}/followers`),
  following: (id:string) => apiFetch<{userIds:string[]}>(`/api/users/${encodeURIComponent(id)}/following`),
  isFollowing: (id:string,target:string) => apiFetch<{following:boolean}>(`/api/users/${encodeURIComponent(id)}/following/${encodeURIComponent(target)}`),
  follow: (target:string) => apiFetch(`/api/users/${encodeURIComponent(target)}/follow`,{method:'POST'}),
  unfollow: (target:string) => apiFetch(`/api/users/${encodeURIComponent(target)}/follow`,{method:'DELETE'}),
};

export const favoritesApi = {
  list: () => apiFetch<{favorites:Array<{contentId:string;contentType:'post'|'reel';contentData:any}>}>('/api/favorites'),
  check: (id:string) => apiFetch<{favorited:boolean}>(`/api/favorites/${encodeURIComponent(id)}`),
  toggle: (id:string,contentType:'post'|'reel',contentData:any) => apiFetch<{favorited:boolean}>(`/api/favorites/${encodeURIComponent(id)}`,{method:'POST',body:JSON.stringify({contentType,contentData})}),
};

export const chatApi = {
  conversations: () => apiFetch<{conversations:Conversation[]}>('/api/conversations'),
  createConversation: (otherUserId:string) => apiFetch<{conversation:Conversation}>('/api/conversations',{method:'POST',body:JSON.stringify({otherUserId})}),
  messages: (id:string) => apiFetch<{messages:ChatMessage[]}>(`/api/conversations/${encodeURIComponent(id)}/messages`),
  send: (id:string,data:any) => apiFetch<{message:ChatMessage}>(`/api/conversations/${encodeURIComponent(id)}/messages`,{method:'POST',body:JSON.stringify(data)}),
  seen: (id:string) => apiFetch(`/api/conversations/${encodeURIComponent(id)}/seen`,{method:'POST'}),
};

export const notificationsApi = {
  list: () => apiFetch<{notifications:AppNotification[]}>('/api/notifications'),
  read: (id:string) => apiFetch(`/api/notifications/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({read:true})}),
};

export const appLockApi = {
  status: (id:string) => apiFetch<{enabled:boolean,configured:boolean}>(`/api/users/${encodeURIComponent(id)}/app-lock`),
  setup: (id:string,pin:string) => apiFetch(`/api/users/${encodeURIComponent(id)}/app-lock`,{method:'PUT',body:JSON.stringify({pin})}),
  verify: (id:string,pin:string) => apiFetch<{ok:boolean,configured:boolean}>(`/api/users/${encodeURIComponent(id)}/app-lock/verify`,{method:'POST',body:JSON.stringify({pin})}),
  disable: (id:string,pin?:string) => apiFetch(`/api/users/${encodeURIComponent(id)}/app-lock`,{method:'DELETE',body:JSON.stringify({pin})}),
};
