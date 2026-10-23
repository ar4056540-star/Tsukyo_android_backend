import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const ROOT = process.cwd();
// Set DATA_DIR to a persistent mounted directory in production hosting.
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'backend', 'data'));
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const PORT = Number(process.env.PORT || 3000);
const DEFAULT_MAX_UPLOAD_MB = 512;
const configuredMaxUploadMb = Number.parseFloat(process.env.TSUKYO_MAX_UPLOAD_MB || '');
const MAX_UPLOAD_MB = Number.isFinite(configuredMaxUploadMb) && configuredMaxUploadMb > 0 ? configuredMaxUploadMb : DEFAULT_MAX_UPLOAD_MB;
const MAX_UPLOAD_BYTES = Math.floor(MAX_UPLOAD_MB * 1024 * 1024);
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me-in-production';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

if (IS_PRODUCTION && SESSION_SECRET === 'change-me-in-production') {
  throw new Error('SESSION_SECRET must be set in production.');
}

for (const dir of [DATA_DIR, MEDIA_DIR]) fs.mkdirSync(dir, { recursive: true });

const files = {
  users: path.join(DATA_DIR, 'users.json'),
  posts: path.join(DATA_DIR, 'posts.json'),
  reels: path.join(DATA_DIR, 'reels.json'),
  stories: path.join(DATA_DIR, 'stories.json'),
  comments: path.join(DATA_DIR, 'comments.json'),
  conversations: path.join(DATA_DIR, 'conversations.json'),
  messages: path.join(DATA_DIR, 'messages.json'),
  notifications: path.join(DATA_DIR, 'notifications.json'),
  follows: path.join(DATA_DIR, 'follows.json'),
  favorites: path.join(DATA_DIR, 'favorites.json'),
  appLocks: path.join(DATA_DIR, 'app-locks.json'),
  sessions: path.join(DATA_DIR, 'sessions.json'),
  media: path.join(DATA_DIR, 'media.json'),
  reactions: path.join(DATA_DIR, 'reactions.json'),
} as const;

type Store = Record<string, any[]>;
const stores: Store = {};
for (const [key, file] of Object.entries(files)) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    stores[key] = Array.isArray(parsed) ? parsed : [];
  } catch {
    stores[key] = [];
    fs.writeFileSync(file, '[]');
  }
}

const writeQueue = new Map<string, Promise<void>>();
async function persist(key: keyof typeof files) {
  const previous = writeQueue.get(key) || Promise.resolve();
  const next = previous.then(async () => {
    const file = files[key];
    const temp = `${file}.tmp`;
    await fs.promises.writeFile(temp, JSON.stringify(stores[key], null, 2), 'utf8');
    await fs.promises.rename(temp, file);
  });
  writeQueue.set(key, next.catch(() => {}));
  return next;
}

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}
function now() { return new Date().toISOString(); }
function normalizeEmail(email: string) { return String(email || '').trim().toLowerCase(); }
function sanitizeUsername(value: string) { return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_.]/g, '').slice(0, 30); }
function publicUser(user: any) {
  if (!user) return null;
  const { passwordHash, passwordSalt, appLockHash, ...safe } = user;
  return safe;
}
function passwordHash(password: string, salt?: string) {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return { hash, salt: usedSalt };
}
function safeEqualHex(a: string, b: string) {
  const aa = Buffer.from(a, 'hex'); const bb = Buffer.from(b, 'hex');
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function sessionDigest(token: string) { return crypto.createHmac('sha256', SESSION_SECRET).update(token).digest('hex'); }
function createSession(userId: string) {
  const token = crypto.randomBytes(48).toString('base64url');
  stores.sessions = stores.sessions.filter(s => new Date(s.expiresAt).getTime() > Date.now());
  stores.sessions.push({ tokenHash: sessionDigest(token), userId, createdAt: now(), expiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString() });
  void persist('sessions');
  return token;
}
function getToken(req: Request) {
  const header = req.header('authorization');
  return header?.startsWith('Bearer ') ? header.slice(7) : '';
}
function userFromRequest(req: Request) {
  const token = getToken(req);
  if (!token) return null;
  const session = stores.sessions.find(s => s.tokenHash === sessionDigest(token) && new Date(s.expiresAt).getTime() > Date.now());
  return session ? stores.users.find(u => u.userId === session.userId) || null : null;
}
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = userFromRequest(req);
  if (!user) return res.status(401).json({ error: 'Authentication required.' });
  (req as any).user = user;
  next();
}
function validateString(value: any, max: number) { return typeof value === 'string' && value.trim().length <= max; }
function clampCount(n: any) { return Math.max(0, Number(n) || 0); }

const sseClients = new Set<Response>();
function broadcast(topic: string, payload: any = {}) {
  const data = `event: update\ndata: ${JSON.stringify({ topic, ...payload })}\n\n`;
  for (const res of sseClients) {
    try { res.write(data); } catch { sseClients.delete(res); }
  }
}
function touchTopics(...topics: string[]) { for (const topic of topics) broadcast(topic); }

function ownerIdOfContent(type: 'posts' | 'reels', contentId: string) {
  const item = stores[type].find(x => x[type === 'posts' ? 'postId' : 'reelId'] === contentId);
  return item?.ownerId || item?.userId || null;
}
function addNotification(userId: string, sender: any, type: 'like'|'comment'|'follow', message: string, targetId?: string) {
  if (!userId || !sender || userId === sender.userId) return;
  stores.notifications.push({
    notificationId: id('notification'), userId, senderId: sender.userId,
    senderUsername: sender.username, senderPhotoURL: sender.photoURL || '', type,
    message, targetId, read: false, createdAt: now(),
  });
  void persist('notifications');
  touchTopics(`notifications:${userId}`);
}

async function saveAll() {
  await Promise.all((Object.keys(files) as (keyof typeof files)[]).map(k => persist(k)));
}

const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  const origin = process.env.CORS_ORIGIN || req.headers.origin || '';
  if (!IS_PRODUCTION || origin === process.env.CORS_ORIGIN) {
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (process.env.CORS_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN);
  }
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '8mb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: now(), backend: 'custom' }));

// Authentication
app.post('/api/auth/register', async (req, res) => {
  const { email, password, username, displayName } = req.body || {};
  const normalizedEmail = normalizeEmail(email);
  const cleanUsername = sanitizeUsername(username);
  if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (!cleanUsername || cleanUsername.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters.' });
  if (!validateString(displayName, 80)) return res.status(400).json({ error: 'Display name is invalid.' });
  if (stores.users.some(u => u.email === normalizedEmail)) return res.status(409).json({ error: 'An account with this email already exists.' });
  if (stores.users.some(u => u.username === cleanUsername)) return res.status(409).json({ error: 'That username is already taken.' });
  const { hash, salt } = passwordHash(password);
  const userId = id('user');
  const profile = {
    userId, email: normalizedEmail, displayName: String(displayName).trim(), username: cleanUsername,
    photoURL: '', bio: '✨ Living the VYBE lifestyle.', isVerified: true, theme: 'gray_white',
    appLockHash: '', appLockEnabled: false, followerCount: 0, followingCount: 0, postCount: 0, reelCount: 0,
    createdAt: now(), passwordHash: hash, passwordSalt: salt,
  };
  stores.users.push(profile);
  await persist('users');
  const token = createSession(userId);
  return res.status(201).json({ token, user: publicUser(profile) });
});

app.post('/api/auth/login', async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  const user = stores.users.find(u => u.email === email);
  if (!user || typeof password !== 'string' || !user.passwordHash || !user.passwordSalt) return res.status(401).json({ error: 'Invalid email or password.' });
  const { hash } = passwordHash(password, user.passwordSalt);
  if (!safeEqualHex(hash, user.passwordHash)) return res.status(401).json({ error: 'Invalid email or password.' });
  const token = createSession(user.userId);
  return res.json({ token, user: publicUser(user) });
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  const token = getToken(req);
  stores.sessions = stores.sessions.filter(s => s.tokenHash !== sessionDigest(token));
  await persist('sessions');
  res.json({ ok: true });
});
app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser((req as any).user) }));
app.post('/api/auth/reset-password', async (_req, res) => {
  // No mail provider is configured. Do not reveal whether an account exists.
  res.json({ ok: true, message: 'If that email belongs to an account, password reset instructions can be issued by the account administrator.' });
});

// Profile / users
app.get('/api/users/search', requireAuth, (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const list = stores.users.filter(u => !q || u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)).map(publicUser);
  res.json({ users: list });
});
app.get('/api/users/:userId', requireAuth, (req, res) => {
  const user = stores.users.find(u => u.userId === req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: publicUser(user) });
});
app.patch('/api/users/:userId', requireAuth, async (req, res) => {
  const actor = (req as any).user;
  if (actor.userId !== req.params.userId) return res.status(403).json({ error: 'You can only edit your own profile.' });
  const user = stores.users.find(u => u.userId === actor.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const allowed = ['displayName', 'username', 'bio', 'photoURL', 'theme'];
  for (const key of allowed) if (req.body?.[key] !== undefined) {
    if (key === 'username') {
      const username = sanitizeUsername(req.body[key]);
      if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters.' });
      const duplicate = stores.users.find(u => u.username === username && u.userId !== user.userId);
      if (duplicate) return res.status(409).json({ error: 'That username is already taken.' });
      user.username = username;
    } else if (typeof req.body[key] === 'string' && req.body[key].length <= (key === 'bio' ? 500 : 5000)) {
      user[key] = req.body[key];
    }
  }
  user.updatedAt = now();
  await persist('users');
  res.json({ user: publicUser(user) });
  touchTopics(`profile:${user.userId}`, 'feed', 'reels');
});

// App lock
app.get('/api/users/:userId/app-lock', requireAuth, (req, res) => {
  if ((req as any).user.userId !== req.params.userId) return res.status(403).json({ error: 'Forbidden.' });
  const item = stores.appLocks.find(x => x.userId === req.params.userId);
  res.json({ enabled: Boolean(item?.enabled), configured: Boolean(item?.enabled && item?.pinHash) });
});
app.put('/api/users/:userId/app-lock', requireAuth, async (req, res) => {
  const actor = (req as any).user;
  if (actor.userId !== req.params.userId) return res.status(403).json({ error: 'Forbidden.' });
  const pin = String(req.body?.pin || '');
  if (!/^\d{4,12}$/.test(pin)) return res.status(400).json({ error: 'PIN must contain 4 to 12 digits.' });
  const { hash, salt } = passwordHash(pin);
  const existing = stores.appLocks.find(x => x.userId === actor.userId);
  const record = { userId: actor.userId, enabled: true, pinHash: hash, pinSalt: salt, updatedAt: now() };
  if (existing) Object.assign(existing, record); else stores.appLocks.push(record);
  const profile = stores.users.find(u => u.userId === actor.userId);
  if (profile) { profile.appLockEnabled = true; profile.appLockHash = 'server-managed'; await persist('users'); }
  await persist('appLocks');
  res.json({ configured: true });
});
app.post('/api/users/:userId/app-lock/verify', requireAuth, (req, res) => {
  const actor = (req as any).user;
  if (actor.userId !== req.params.userId) return res.status(403).json({ error: 'Forbidden.' });
  const record = stores.appLocks.find(x => x.userId === actor.userId && x.enabled);
  if (!record) return res.json({ ok: true, configured: false });
  const { hash } = passwordHash(String(req.body?.pin || ''), record.pinSalt);
  res.json({ ok: safeEqualHex(hash, record.pinHash), configured: true });
});
app.delete('/api/users/:userId/app-lock', requireAuth, async (req, res) => {
  const actor = (req as any).user;
  if (actor.userId !== req.params.userId) return res.status(403).json({ error: 'Forbidden.' });
  const record = stores.appLocks.find(x => x.userId === actor.userId && x.enabled);
  if (record && req.body?.pin) {
    const { hash } = passwordHash(String(req.body.pin), record.pinSalt);
    if (!safeEqualHex(hash, record.pinHash)) return res.status(403).json({ error: 'Incorrect PIN.' });
  }
  stores.appLocks = stores.appLocks.filter(x => x.userId !== actor.userId);
  const profile = stores.users.find(u => u.userId === actor.userId);
  if (profile) { profile.appLockEnabled = false; profile.appLockHash = ''; await persist('users'); }
  await persist('appLocks');
  res.json({ configured: false });
});

// Feed/content
app.get('/api/feed', requireAuth, (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const posts = [...stores.posts].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit).map(x => ({ ...x, isLiked: stores.reactions.some((r:any) => r.userId === (req as any).user.userId && r.contentId === x.postId && r.contentType === 'post') }));
  res.json({ posts });
});
app.get('/api/stories', requireAuth, (_req, res) => {
  const current = Date.now();
  const stories = stores.stories.filter(s => !s.expiresAt || new Date(s.expiresAt).getTime() > current).sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
  res.json({ stories });
});
app.get('/api/users/:userId/posts', requireAuth, (req, res) => res.json({ posts: stores.posts.filter(p => p.ownerId === req.params.userId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)) }));
app.get('/api/users/:userId/reels', requireAuth, (req, res) => res.json({ reels: stores.reels.filter(r => r.ownerId === req.params.userId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)) }));

app.post('/api/posts', requireAuth, async (req, res) => {
  const user = (req as any).user;
  const body = req.body || {};
  if (!validateString(body.caption || '', 2200) || !validateString(body.mediaURL || '', 20000000)) return res.status(400).json({ error: 'Invalid post data.' });
  const post = {
    postId: id('post'), ownerId: user.userId, ownerUsername: user.username, ownerDisplayName: user.displayName,
    ownerPhotoURL: user.photoURL || '', caption: String(body.caption || ''), mediaURL: String(body.mediaURL || ''),
    mediaType: body.mediaType === 'video' ? 'video' : 'image', isVerified: Boolean(user.isVerified), likeCount: 0,
    commentCount: 0, createdAt: now(),
  };
  stores.posts.push(post); user.postCount = clampCount(user.postCount) + 1;
  await Promise.all([persist('posts'), persist('users')]);
  touchTopics('feed', `profile:${user.userId}`);
  res.status(201).json({ post });
});
app.delete('/api/posts/:postId', requireAuth, async (req, res) => {
  const user = (req as any).user; const idx = stores.posts.findIndex(p => p.postId === req.params.postId);
  if (idx < 0) return res.status(404).json({ error: 'Post not found.' });
  if (stores.posts[idx].ownerId !== user.userId) return res.status(403).json({ error: 'Only the owner can delete this post.' });
  stores.posts.splice(idx,1); user.postCount = clampCount(user.postCount) - (user.postCount > 0 ? 1 : 0);
  stores.comments = stores.comments.filter(c => !(c.targetType === 'posts' && c.targetId === req.params.postId));
  await Promise.all([persist('posts'), persist('comments'), persist('users')]); touchTopics('feed', `profile:${user.userId}`); res.json({ ok:true });
});
app.post('/api/posts/:postId/like', requireAuth, async (req, res) => toggleLike(req, res, 'posts', req.params.postId));

app.post('/api/stories', requireAuth, async (req, res) => {
  const user = (req as any).user; const body = req.body || {};
  if (!validateString(body.mediaURL || '', 20000000)) return res.status(400).json({ error: 'Invalid story media.' });
  const created = Date.now(); const story = {
    storyId:id('story'), ownerId:user.userId, ownerUsername:user.username, ownerDisplayName:user.displayName,
    ownerPhotoURL:user.photoURL || '', mediaURL:String(body.mediaURL), caption:String(body.caption || ''), isVerified:Boolean(user.isVerified),
    createdAt:new Date(created).toISOString(), expiresAt:new Date(created + 86400000).toISOString(),
  };
  stores.stories.push(story); await persist('stories'); touchTopics('stories','feed'); res.status(201).json({ story });
});
app.delete('/api/stories/:storyId', requireAuth, async (req,res) => {
  const user=(req as any).user; const item=stores.stories.find(s=>s.storyId===req.params.storyId);
  if(!item) return res.status(404).json({error:'Story not found.'}); if(item.ownerId!==user.userId) return res.status(403).json({error:'Only the owner can delete this story.'});
  stores.stories=stores.stories.filter(s=>s.storyId!==req.params.storyId); await persist('stories'); touchTopics('stories','feed'); res.json({ok:true});
});

app.get('/api/reels', requireAuth, (req,res)=>{
  const limit=Math.min(100,Math.max(1,Number(req.query.limit)||50));
  const reels=stores.reels.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,limit).map(r=>({...r,isLiked:stores.reactions?.some?.((x:any)=>x.userId===(req as any).user.userId&&x.contentId===r.reelId&&x.contentType==='reel')||false,isFavorited:stores.favorites.some(f=>f.userId===(req as any).user.userId&&f.contentId===r.reelId)}));
  res.json({reels});
});

async function toggleLike(req:Request,res:Response,type:'posts'|'reels',contentId:string) {
  const user=(req as any).user; const key=`${type}:${contentId}:${user.userId}`;
  if (!stores.reactions) stores.reactions=[];
  const idx=stores.reactions.findIndex((x:any)=>x.key===key);
  const item=stores[type].find(x=>x[type==='posts'?'postId':'reelId']===contentId);
  if(!item) return res.status(404).json({error:'Content not found.'});
  if(idx>=0){stores.reactions.splice(idx,1); item.likeCount=clampCount(item.likeCount)-1; await persist('reactions' as any); await persist(type); touchTopics(type==='posts'?'feed':'reels'); return res.json({liked:false,likeCount:item.likeCount});}
  stores.reactions.push({key,userId:user.userId,contentId,contentType:type==='posts'?'post':'reel',createdAt:now()}); item.likeCount=clampCount(item.likeCount)+1;
  await persist('reactions' as any); await persist(type); const owner=ownerIdOfContent(type,contentId); addNotification(owner,user,'like',`@${user.username} liked your ${type==='posts'?'post':'Reel'}.`,contentId); touchTopics(type==='posts'?'feed':'reels'); res.json({liked:true,likeCount:item.likeCount});
}
app.post('/api/reels/:reelId/like', requireAuth, async (req,res)=>toggleLike(req,res,'reels',req.params.reelId));
app.post('/api/reels', requireAuth, async (req,res)=>{
  const user=(req as any).user; const body=req.body||{}; const mediaURL=String(body.mediaURL||'');
  if(!mediaURL || mediaURL.startsWith('/uploads/') || mediaURL.includes('localhost:') || mediaURL.includes('127.0.0.1:')) return res.status(400).json({error:'Invalid reel media URL.'});
  const reel={reelId:id('reel'),ownerId:user.userId,ownerUsername:user.username,ownerDisplayName:user.displayName,ownerPhotoURL:user.photoURL||'',caption:String(body.caption||''),mediaURL,audioTitle:String(body.audioTitle||'Original Sound — VYBE'),isVerified:Boolean(user.isVerified),likeCount:0,commentCount:0,createdAt:now()};
  stores.reels.push(reel); user.reelCount=clampCount(user.reelCount)+1; await Promise.all([persist('reels'),persist('users')]); touchTopics('reels',`profile:${user.userId}`); res.status(201).json({reel});
});
app.delete('/api/reels/:reelId', requireAuth, async(req,res)=>{const user=(req as any).user;const idx=stores.reels.findIndex(r=>r.reelId===req.params.reelId);if(idx<0)return res.status(404).json({error:'Reel not found.'});if(stores.reels[idx].ownerId!==user.userId)return res.status(403).json({error:'Only the owner can delete this Reel.'});stores.reels.splice(idx,1);user.reelCount=Math.max(0,clampCount(user.reelCount)-1);await Promise.all([persist('reels'),persist('users')]);touchTopics('reels',`profile:${user.userId}`);res.json({ok:true});});
app.get('/api/reels/:reelId', requireAuth,(req,res)=>{const reel=stores.reels.find(r=>r.reelId===req.params.reelId);reel?res.json({reel}):res.status(404).json({error:'Reel not found.'});});

// Social graph
app.get('/api/users/:userId/followers', requireAuth,(req,res)=>{const ids=stores.follows.filter(f=>f.targetUserId===req.params.userId).map(f=>f.userId);res.json({userIds:ids});});
app.get('/api/users/:userId/following', requireAuth,(req,res)=>{const ids=stores.follows.filter(f=>f.userId===req.params.userId).map(f=>f.targetUserId);res.json({userIds:ids});});
app.get('/api/users/:userId/following/:targetUserId', requireAuth,(req,res)=>res.json({following:stores.follows.some(f=>f.userId===req.params.userId&&f.targetUserId===req.params.targetUserId)}));
app.post('/api/users/:targetUserId/follow', requireAuth, async(req,res)=>{const user=(req as any).user;const target=stores.users.find(u=>u.userId===req.params.targetUserId);if(!target)return res.status(404).json({error:'User not found.'});if(target.userId===user.userId)return res.status(400).json({error:'You cannot follow yourself.'});if(!stores.follows.some(f=>f.userId===user.userId&&f.targetUserId===target.userId)){stores.follows.push({userId:user.userId,targetUserId:target.userId,createdAt:now()});user.followingCount=clampCount(user.followingCount)+1;target.followerCount=clampCount(target.followerCount)+1;await Promise.all([persist('follows'),persist('users')]);addNotification(target.userId,user,'follow',`@${user.username} started following you.`);touchTopics(`profile:${user.userId}`,`profile:${target.userId}`);}res.json({following:true});});
app.delete('/api/users/:targetUserId/follow', requireAuth, async(req,res)=>{const user=(req as any).user;const target=stores.users.find(u=>u.userId===req.params.targetUserId);if(!target)return res.status(404).json({error:'User not found.'});const idx=stores.follows.findIndex(f=>f.userId===user.userId&&f.targetUserId===target.userId);if(idx>=0){stores.follows.splice(idx,1);user.followingCount=Math.max(0,clampCount(user.followingCount)-1);target.followerCount=Math.max(0,clampCount(target.followerCount)-1);await Promise.all([persist('follows'),persist('users')]);touchTopics(`profile:${user.userId}`,`profile:${target.userId}`);}res.json({following:false});});

// Favorites
app.get('/api/favorites', requireAuth,(req,res)=>res.json({favorites:stores.favorites.filter(f=>f.userId===(req as any).user.userId)}));
app.get('/api/favorites/:contentId', requireAuth,(req,res)=>res.json({favorited:stores.favorites.some(f=>f.userId===(req as any).user.userId&&f.contentId===req.params.contentId)}));
app.post('/api/favorites/:contentId', requireAuth, async(req,res)=>{const user=(req as any).user;const {contentType,contentData}=req.body||{};const idx=stores.favorites.findIndex(f=>f.userId===user.userId&&f.contentId===req.params.contentId);if(idx>=0){stores.favorites.splice(idx,1);await persist('favorites');return res.json({favorited:false});}if(!['post','reel'].includes(contentType)||!contentData)return res.status(400).json({error:'Invalid favorite data.'});stores.favorites.push({userId:user.userId,contentId:req.params.contentId,contentType,contentData,savedAt:now()});await persist('favorites');res.json({favorited:true});});

// Comments
app.get('/api/:targetType/:targetId/comments', requireAuth,(req,res)=>{if(!['posts','reels'].includes(req.params.targetType))return res.status(400).json({error:'Invalid target.'});res.json({comments:stores.comments.filter(c=>c.targetType===req.params.targetType&&c.targetId===req.params.targetId).sort((a,b)=>a.createdAt.localeCompare(b.createdAt))});});
app.post('/api/:targetType/:targetId/comments', requireAuth, async(req,res)=>{const targetType=req.params.targetType as 'posts'|'reels';if(!['posts','reels'].includes(targetType))return res.status(400).json({error:'Invalid target.'});const user=(req as any).user;const text=String(req.body?.text||'').trim();if(!text||text.length>2000)return res.status(400).json({error:'Comment is invalid.'});const key=targetType==='posts'?'postId':'reelId';const target=stores[targetType].find(x=>x[key]===req.params.targetId);if(!target)return res.status(404).json({error:'Content not found.'});const comment={commentId:id('comment'),targetId:req.params.targetId,targetType,authorId:user.userId,authorUsername:user.username,authorDisplayName:user.displayName,authorPhotoURL:user.photoURL||'',isVerified:Boolean(user.isVerified),text,createdAt:now()};stores.comments.push(comment);target.commentCount=clampCount(target.commentCount)+1;await Promise.all([persist('comments'),persist(targetType)]);const owner=target.ownerId;addNotification(owner,user,'comment',`@${user.username} commented on your ${targetType==='posts'?'post':'Reel'}.`,req.params.targetId);touchTopics(`comments:${targetType}:${req.params.targetId}`,targetType==='posts'?'feed':'reels');res.status(201).json({comment});});
app.delete('/api/:targetType/:targetId/comments/:commentId', requireAuth, async(req,res)=>{const user=(req as any).user;const idx=stores.comments.findIndex(c=>c.commentId===req.params.commentId&&c.targetId===req.params.targetId);if(idx<0)return res.status(404).json({error:'Comment not found.'});if(stores.comments[idx].authorId!==user.userId)return res.status(403).json({error:'Only the comment author can delete this comment.'});const type=req.params.targetType==='posts'?'posts':'reels';const target=stores[type].find(x=>x[type==='posts'?'postId':'reelId']===req.params.targetId);if(target)target.commentCount=Math.max(0,clampCount(target.commentCount)-1);stores.comments.splice(idx,1);await Promise.all([persist('comments'),persist(type as any)]);touchTopics(`comments:${req.params.targetType}:${req.params.targetId}`);res.json({ok:true});});

// Conversations / chat
app.get('/api/conversations', requireAuth,(req,res)=>{const uid=(req as any).user.userId;res.json({conversations:stores.conversations.filter(c=>c.participantIds.includes(uid)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))});});
app.post('/api/conversations', requireAuth, async(req,res)=>{const user=(req as any).user;const other=stores.users.find(u=>u.userId===req.body?.otherUserId);if(!other)return res.status(404).json({error:'User not found.'});const conversationId=[user.userId,other.userId].sort().join('_');let conv=stores.conversations.find(c=>c.conversationId===conversationId);if(!conv){conv={conversationId,participantIds:[user.userId,other.userId],participantDetails:{[user.userId]:{displayName:user.displayName,username:user.username,photoURL:user.photoURL||'',isVerified:user.isVerified},[other.userId]:{displayName:other.displayName,username:other.username,photoURL:other.photoURL||'',isVerified:other.isVerified}},lastMessage:'Started a new conversation',lastMessageSenderId:user.userId,updatedAt:now()};stores.conversations.push(conv);await persist('conversations');touchTopics(`conversations:${user.userId}`,`conversations:${other.userId}`);}res.json({conversation:conv});});
app.get('/api/conversations/:conversationId/messages', requireAuth,(req,res)=>{const uid=(req as any).user.userId;const conv=stores.conversations.find(c=>c.conversationId===req.params.conversationId);if(!conv||!conv.participantIds.includes(uid))return res.status(403).json({error:'Forbidden.'});res.json({messages:stores.messages.filter(m=>m.conversationId===conv.conversationId).sort((a,b)=>a.createdAt.localeCompare(b.createdAt))});});
app.post('/api/conversations/:conversationId/messages', requireAuth, async(req,res)=>{const user=(req as any).user;const conv=stores.conversations.find(c=>c.conversationId===req.params.conversationId);if(!conv||!conv.participantIds.includes(user.userId))return res.status(403).json({error:'Forbidden.'});const text=String(req.body?.text||'');const mediaURL=req.body?.mediaURL?String(req.body.mediaURL):undefined;const messageType=req.body?.messageType==='reel_share'?'reel_share':mediaURL?'image':'text';const message={messageId:id('msg'),conversationId:conv.conversationId,senderId:user.userId,senderUsername:user.username,senderPhotoURL:user.photoURL||'',text,messageType,isRead:false,createdAt:now(),...(mediaURL?{mediaURL}:{}),...(req.body?.reelId?{reelId:String(req.body.reelId),reelData:req.body.reelData}: {})};stores.messages.push(message);conv.lastMessage=messageType==='reel_share'?'🎬 Shared a Reel':text||(mediaURL?'Sent an attachment':'Message');conv.lastMessageSenderId=user.userId;conv.updatedAt=message.createdAt;await Promise.all([persist('messages'),persist('conversations')]);for(const uid of conv.participantIds)touchTopics(`conversations:${uid}`,`messages:${conv.conversationId}`);res.status(201).json({message});});
app.post('/api/conversations/:conversationId/seen', requireAuth, async(req,res)=>{const uid=(req as any).user.userId;let changed=false;for(const m of stores.messages.filter(m=>m.conversationId===req.params.conversationId&&m.senderId!==uid&&!m.isRead)){m.isRead=true;m.readAt=now();changed=true;}if(changed)await persist('messages');res.json({ok:true});});

// Notifications
app.get('/api/notifications', requireAuth,(req,res)=>{const uid=(req as any).user.userId;res.json({notifications:stores.notifications.filter(n=>n.userId===uid).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))});});
app.patch('/api/notifications/:notificationId', requireAuth, async(req,res)=>{const n=stores.notifications.find(n=>n.notificationId===req.params.notificationId&&n.userId===(req as any).user.userId);if(!n)return res.status(404).json({error:'Notification not found.'});n.read=true;await persist('notifications');touchTopics(`notifications:${n.userId}`);res.json({ok:true});});

// Media upload/stream. Files live under backend/data and are never static-served.
function isAllowedMediaType(folder: string, contentType: string, filename: string) {
  const type = contentType.toLowerCase().split(';')[0].trim();
  const ext = path.extname(filename).toLowerCase();
  const imageTypes = new Set(['image/jpeg','image/png','image/webp','image/gif','image/heic','image/heif']);
  const videoExtensions = new Set(['.mp4','.mov','.webm','.m4v','.avi','.mkv','.3gp','.ogv']);
  if (folder === 'reels') return type.startsWith('video/') || videoExtensions.has(ext);
  return imageTypes.has(type) || type === 'image/*';
}

app.post('/api/media/upload', requireAuth, (req,res)=>{
  const user=(req as any).user;
  const folder=String(req.query.folder||'posts');
  if(!['posts','stories','reels','avatars','messages'].includes(folder)) return res.status(400).json({error:'Invalid media folder.'});
  const filename=String(req.query.filename||'upload.bin').replace(/[^a-zA-Z0-9._-]/g,'_').slice(0,120) || 'upload.bin';
  const contentType=String(req.header('content-type')||req.query.contentType||'application/octet-stream').toLowerCase().split(';')[0].trim();
  if (!isAllowedMediaType(folder, contentType, filename)) return res.status(415).json({error:'Unsupported media type.'});

  const contentLength=Number(req.header('content-length')||0);
  if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES) {
    req.resume();
    return res.status(413).json({error:'File exceeds the maximum allowed upload size.'});
  }

  let size=0;
  let exceeded=false;
  let responded=false;
  const mediaId=id('media');
  const finalName=`${mediaId}_${filename}`;
  const finalPath=path.join(MEDIA_DIR,finalName);
  const tempPath=`${finalPath}.part`;
  const stream=fs.createWriteStream(tempPath,{flags:'wx'});
  const cleanup=()=>fs.promises.rm(tempPath,{force:true}).catch(()=>{});

  req.on('data',(chunk:Buffer)=>{
    if (exceeded) return;
    size += chunk.length;
    if (size > MAX_UPLOAD_BYTES) {
      exceeded=true;
      stream.destroy();
      void cleanup();
      if (!res.headersSent) { responded=true; res.status(413).json({error:'File exceeds the maximum allowed upload size.'}); }
      req.resume();
    }
  });
  req.on('error',()=>{
    if (responded) return;
    stream.destroy();
    void cleanup();
    if(!res.headersSent) { responded=true; res.status(400).json({error:'Upload failed.'}); }
  });
  stream.on('error',()=>{
    if (responded || exceeded) return;
    void cleanup();
    if(!res.headersSent) { responded=true; res.status(500).json({error:'Upload failed.'}); }
  });
  stream.on('finish',async()=>{
    if (exceeded || responded) return;
    if(size<=0) { await cleanup(); return res.status(400).json({error:'Upload cannot be empty.'}); }
    try {
      await fs.promises.rename(tempPath,finalPath);
      stores.media.push({mediaId,ownerId:user.userId,folder,filename,storedName:finalName,contentType,size,createdAt:now()});
      await persist('media');
      res.status(201).json({mediaId,url:`/api/media/${mediaId}`,mediaStreamUrl:`/api/media/${mediaId}`,size,contentType});
    } catch {
      await cleanup();
      if(!res.headersSent) res.status(500).json({error:'Upload failed.'});
    }
  });
  req.pipe(stream);
});
app.get('/api/media/:mediaId', async(req,res)=>{
  const media=stores.media.find(m=>m.mediaId===req.params.mediaId); if(!media)return res.status(404).send('Media not found.'); const filePath=path.join(MEDIA_DIR,media.storedName); if(!fs.existsSync(filePath))return res.status(404).send('Media not found.');
  const stat=await fs.promises.stat(filePath); const range=req.headers.range; res.setHeader('Accept-Ranges','bytes');res.setHeader('Content-Type',media.contentType||'application/octet-stream');res.setHeader('Cache-Control','public, max-age=31536000, immutable');
  if(range){const match=/bytes=(\d*)-(\d*)/.exec(range);if(!match)return res.status(416).end();let start=match[1]?Number(match[1]):0;let end=match[2]?Number(match[2]):stat.size-1;if(start>=stat.size||start>end){res.setHeader('Content-Range',`bytes */${stat.size}`);return res.status(416).end();}end=Math.min(end,stat.size-1);res.status(206);res.setHeader('Content-Range',`bytes ${start}-${end}/${stat.size}`);res.setHeader('Content-Length',end-start+1);return fs.createReadStream(filePath,{start,end}).pipe(res);}res.setHeader('Content-Length',stat.size);fs.createReadStream(filePath).pipe(res);
});
app.delete('/api/media/:mediaId', requireAuth, async(req,res)=>{const user=(req as any).user;const idx=stores.media.findIndex(m=>m.mediaId===req.params.mediaId);if(idx<0)return res.status(404).json({error:'Media not found.'});if(stores.media[idx].ownerId!==user.userId)return res.status(403).json({error:'Forbidden.'});const item=stores.media[idx];stores.media.splice(idx,1);await fs.promises.rm(path.join(MEDIA_DIR,item.storedName),{force:true});await persist('media');res.json({ok:true});});

// Server-sent events for app-level realtime updates.
app.get('/api/events', requireAuth,(req,res)=>{res.setHeader('Content-Type','text/event-stream');res.setHeader('Cache-Control','no-cache, no-transform');res.setHeader('Connection','keep-alive');res.flushHeaders?.();res.write(`event: ready\ndata: {}\n\n`);sseClients.add(res);const heartbeat=setInterval(()=>{try{res.write(': heartbeat\n\n')}catch{clearInterval(heartbeat);sseClients.delete(res)}},15000);req.on('close',()=>{clearInterval(heartbeat);sseClients.delete(res);});});

// Clean expired stories and expired sessions on startup.
stores.stories=stores.stories.filter(s=>!s.expiresAt||new Date(s.expiresAt).getTime()>Date.now());
stores.sessions=stores.sessions.filter(s=>new Date(s.expiresAt).getTime()>Date.now());
void persist('stories'); void persist('sessions');

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const distPath=path.join(ROOT,'dist'); app.use(express.static(distPath)); app.get('*all',(_req,res)=>res.sendFile(path.join(distPath,'index.html')));
  }
  app.listen(PORT,'0.0.0.0',()=>console.log(`VYBE custom backend listening on http://0.0.0.0:${PORT}`));
}
start().catch(err=>{console.error('Failed to start VYBE server:',err);process.exit(1)});
