import React from 'react';
import { mockEvents } from '../../data/mockData';
import { EventCard } from './EventCard';
import { motion } from 'framer-motion';
import { CalendarDays, Filter } from 'lucide-react';

export function InteractiveCalendar() {
  return (
    <section className="py-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-widest mb-3">
            <CalendarDays size={18} />
            Live at the Center
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            Interactive <span className="text-indigo-600">Events</span>
          </h2>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {['All', 'Fitness', 'Relaxation', 'Nutrition', 'Mindset'].map((cat) => (
            <button 
              key={cat}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all shrink-0 ${
                cat === 'All' 
                ? 'bg-slate-900 text-white shadow-lg' 
                : 'bg-white text-slate-500 border border-slate-100 hover:border-indigo-200'
              }`}
            >
              {cat}
            </button>
          ))}
          <button className="p-2.5 rounded-full bg-white border border-slate-100 text-slate-400">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {mockEvents.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
          >
            <EventCard event={event} />
          </motion.div>
        ))}
      </div>
      
      <div className="mt-12 flex justify-center">
        <button className="text-slate-900 font-bold flex items-center gap-2 border-b-2 border-slate-900 pb-1 hover:text-indigo-600 hover:border-indigo-600 transition-all">
          View Full Calendar
        </button>
      </div>
    </section>
  );
};

