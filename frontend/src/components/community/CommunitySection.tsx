import React from 'react';
import { mockStories } from '../../data/mockData';
import { StoryCard } from './StoryCard';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

export function CommunityHighlights() {
  const storyOfTheWeek = mockStories.find(s => s.isWeekly);
  const recentStories = mockStories.filter(s => !s.isWeekly);

  return (
    <section className="py-16">
      <div className="flex items-center gap-2 text-rose-500 font-bold text-sm uppercase tracking-widest mb-4">
        <Heart size={18} fill="currentColor" />
        Shared Experiences
      </div>
      <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-12">
        Community <span className="text-rose-500">Highlights</span>
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
          {storyOfTheWeek && <StoryCard story={storyOfTheWeek} variant="large" />}
        </div>
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white mb-4">
            <h3 className="text-2xl font-bold mb-3">Your voice matters.</h3>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Share your wellness journey with the community and inspire others.
            </p>
            <button className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 py-3 rounded-xl font-bold transition-colors">
              Submit Your Story
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-black uppercase text-slate-400 tracking-widest px-4 mb-2">Recent Stories</h4>
            {recentStories.map((story) => (
              <StoryCard key={story.id} story={story} variant="compact" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

