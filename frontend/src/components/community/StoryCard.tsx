import React from 'react';
import type { Story } from '../../data/mockData';
import { motion } from 'framer-motion';
import { Calendar, User } from 'lucide-react';

interface StoryCardProps {
  story: Story;
  variant?: 'large' | 'compact';
}

export function StoryCard({ story, variant = 'compact' }: StoryCardProps) {
  if (variant === 'large') {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative group h-[500px] rounded-[2.5rem] overflow-hidden shadow-2xl"
      >
        <img 
          src={story.image_url} 
          alt={story.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
        
        <div className="absolute bottom-0 p-8 md:p-12 w-full">
          <span className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6 inline-block">
            Story of the Week
          </span>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight max-w-2xl">
            {story.title}
          </h2>
          <p className="text-slate-300 text-lg mb-8 max-w-xl">
            {story.detail}
          </p>
          <div className="flex items-center gap-6 text-slate-400 text-sm">
            <div className="flex items-center gap-2">
              <User size={16} />
              <span>{story.author}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>{new Date(story.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="flex gap-4 p-4 rounded-3xl transition-colors hover:bg-slate-50 group"
    >
      <div className="w-24 h-24 flex-shrink-0 rounded-2xl overflow-hidden shadow-lg shadow-slate-200">
        <img 
          src={story.image_url} 
          alt={story.title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </div>
      <div className="flex flex-col justify-center">
        <h4 className="font-bold text-slate-900 line-clamp-1 mb-1 group-hover:text-emerald-600 transition-colors">
          {story.title}
        </h4>
        <p className="text-slate-500 text-xs line-clamp-2 mb-2 leading-relaxed">
          {story.detail}
        </p>
        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
          <span>{story.author}</span>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <span>{new Date(story.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </motion.div>
  );
};

