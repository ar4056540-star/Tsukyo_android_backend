import React, { useState, useEffect } from 'react';
import { contentApi, subscribeToEvents } from '../lib/api';
import { Post, Story } from '../types';
import { StoriesBar } from './StoriesBar';
import { StoryViewer } from './StoryViewer';
import { PostCard } from './PostCard';
import { Sparkles, PlusSquare } from 'lucide-react';
import { KNOWN_BOT_USER_IDS, KNOWN_BOT_POST_IDS, KNOWN_BOT_STORY_IDS } from '../lib/dataService';

interface FeedProps {
  onOpenComments: (post: Post) => void;
  onOpenUserProfile: (userId: string) => void;
  onAddStory: () => void;
}

export const Feed: React.FC<FeedProps> = ({
  onOpenComments,
  onOpenUserProfile,
  onAddStory,
}) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStory, setActiveStory] = useState<{ story: Story; index: number } | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [postResult, storyResult] = await Promise.all([contentApi.feed(), contentApi.stories()]);
        if (!active) return;
        setPosts(postResult.posts.filter(p => !KNOWN_BOT_POST_IDS.includes(p.postId) && !KNOWN_BOT_USER_IDS.includes(p.ownerId)));
        setStories(storyResult.stories.filter(s => !KNOWN_BOT_STORY_IDS.includes(s.storyId) && !KNOWN_BOT_USER_IDS.includes(s.ownerId)));
      } catch (err) { console.error('Feed load error:', err); }
      finally { if (active) setLoading(false); }
    };
    void load();
    const unsubscribe = subscribeToEvents(event => { if (event.topic === 'feed' || event.topic === 'stories') void load(); });
    return () => { active = false; unsubscribe(); };
  }, []);

  const handlePostDeleted = (deletedPostId: string) => {
    setPosts(prev => prev.filter(p => p.postId !== deletedPostId));
  };

  const handleStoryDeleted = (deletedStoryId: string) => {
    setStories(prev => prev.filter(s => s.storyId !== deletedStoryId));
  };

  return (
    <div className="w-full pb-20 select-none">
      {/* Stories Tray */}
      <StoriesBar
        stories={stories}
        onOpenStory={(story, index) => setActiveStory({ story, index })}
        onAddStory={onAddStory}
      />

      {/* Active Story Viewer Modal */}
      {activeStory && (
        <StoryViewer
          stories={stories}
          initialIndex={activeStory.index}
          onClose={() => setActiveStory(null)}
          onStoryDeleted={handleStoryDeleted}
        />
      )}

      {/* Posts List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-400">Loading VYBE feed...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-[#181a24] border border-[#2b2f3d] flex items-center justify-center mb-4 text-pink-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No Posts Yet</h3>
          <p className="text-xs text-slate-400 max-w-xs mb-6">
            Be the first to share a moment on VYBE. Post a photo or video to your feed!
          </p>
          <button
            onClick={onAddStory}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-semibold shadow-lg hover:brightness-110 transition flex items-center space-x-2"
          >
            <PlusSquare className="w-4 h-4" />
            <span>Create First Post</span>
          </button>
        </div>
      ) : (
        <div className="divide-y divide-[#20232d]">
          {posts.map((post) => (
            <PostCard
              key={post.postId}
              post={post}
              onOpenComments={onOpenComments}
              onOpenUserProfile={onOpenUserProfile}
              onPostDeleted={handlePostDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
};
