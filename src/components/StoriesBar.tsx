import React from 'react';
import { Plus } from 'lucide-react';
import { Story, UserProfile } from '../types';
import { useAuth } from '../lib/authContext';
import { getAvatarUrl } from '../lib/constants';

interface StoriesBarProps {
  stories: Story[];
  onOpenStory: (story: Story, index: number) => void;
  onAddStory: () => void;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({
  stories,
  onOpenStory,
  onAddStory,
}) => {
  const { userProfile } = useAuth();

  // Group stories by owner
  const uniqueStoryUsers = stories.reduce((acc: Story[], curr: Story) => {
    if (!acc.some(s => s.ownerId === curr.ownerId)) {
      acc.push(curr);
    }
    return acc;
  }, [] as Story[]);

  const userHasStory = stories.some(s => s.ownerId === userProfile?.userId);

  return (
    <div className="w-full border-b border-[#20232d] py-3.5 px-4 overflow-x-auto no-scrollbar flex items-center space-x-3.5 bg-[#0b0c0e]">
      {/* Current User Story / Add Story */}
      <div className="flex flex-col items-center flex-shrink-0 cursor-pointer group" onClick={userHasStory ? () => onOpenStory(stories.find(s => s.ownerId === userProfile?.userId)!, 0) : onAddStory}>
        <div className="relative">
          <div className={`p-0.5 rounded-full ${userHasStory ? 'vybe-story-ring' : 'ring-1 ring-slate-700'}`}>
            <img
              src={getAvatarUrl(userProfile?.photoURL)}
              alt="Your story"
              className="w-14 h-14 rounded-full object-cover p-0.5 bg-[#0b0c0e]"
            />
          </div>
          {!userHasStory && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddStory();
              }}
              className="absolute bottom-0 right-0 bg-pink-500 hover:bg-pink-400 text-white rounded-full p-1 ring-2 ring-[#0b0c0e] shadow-md transition transform group-hover:scale-110"
              title="Add Story"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <span className="text-[11px] text-slate-300 mt-1.5 font-medium max-w-[64px] truncate">
          Your Story
        </span>
      </div>

      {/* Other users' stories */}
      {uniqueStoryUsers
        .filter(s => s.ownerId !== userProfile?.userId)
        .map((story, idx) => (
          <div
            key={story.storyId}
            onClick={() => onOpenStory(story, idx)}
            className="flex flex-col items-center flex-shrink-0 cursor-pointer group transition transform active:scale-95"
          >
            <div className="p-0.5 rounded-full vybe-story-ring group-hover:scale-105 transition">
              <img
                src={getAvatarUrl(story.ownerPhotoURL)}
                alt={story.ownerUsername}
                className="w-14 h-14 rounded-full object-cover p-0.5 bg-[#0b0c0e]"
              />
            </div>
            <span className="text-[11px] text-slate-300 mt-1.5 font-medium max-w-[64px] truncate">
              {story.ownerUsername}
            </span>
          </div>
        ))}
    </div>
  );
};
