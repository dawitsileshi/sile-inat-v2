import React from 'react';
import { mockExperts, mockStories, mockEvents, mockCapsules } from '../../data/mockData';
import { ExpertCard } from '../experts/ExpertCard';
import { StoryCard } from '../community/StoryCard';
import { EventCard } from '../events/EventCard';
import { KnowledgeCapsule } from '../knowledge/KnowledgeCapsule';
import { motion } from 'framer-motion';
import { LayoutGrid } from 'lucide-react';

export function DiscoveryFeed() {
  // Combine all items into a single feed and shuffle them (or sort by a mocked 'relevance' score)
  const feedItems = [
    { type: 'expert', data: mockExperts[0] },
    { type: 'story', data: mockStories[1] },
    { type: 'event', data: mockEvents[1] },
    { type: 'capsule', data: mockCapsules[0] },
    { type: 'expert', data: mockExperts[1] },
    { type: 'story', data: mockStories[2] },
    { type: 'event', data: mockEvents[2] },
    { type: 'capsule', data: mockCapsules[1] },
  ];

  return (
    <section className="py-16">
      <div className="flex items-center gap-2 text-slate-500 font-bold text-sm uppercase tracking-widest mb-4">
        <LayoutGrid size={18} />
        Curated for You
      </div>
      <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-12">
        Discovery <span className="text-slate-500">Feed</span>
      </h2>

      <div className="columns-1 md:columns-2 lg:columns-3 gap-8 space-y-8">
        {feedItems.map((item, index) => (
          <motion.div
            key={`${item.type}-${(item.data as any).id}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="break-inside-avoid"
          >
            {item.type === 'expert' && <ExpertCard expert={item.data as any} />}
            {item.type === 'story' && <StoryCard story={item.data as any} variant="compact" />}
            {item.type === 'event' && <EventCard event={item.data as any} />}
            {item.type === 'capsule' && <KnowledgeCapsule capsule={item.data as any} />}
          </motion.div>
        ))}
      </div>
    </section>
  );
};

