import React from 'react';
import type { Event } from '../../data/mockData';
import { motion } from 'framer-motion';
import { MapPin, Clock, User2, Bell, CheckCircle2 } from 'lucide-react';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  return (
    <motion.div 
      layout
      className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-100/30 flex flex-col md:flex-row gap-6 items-start md:items-center relative overflow-hidden group"
    >
      {/* Category Indicator */}
      <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 rounded-full" />
      
      <div className="flex-grow">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
            {event.category}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1">
            <Clock size={10} />
            {event.recurring}
          </span>
        </div>
        
        <h3 className="text-xl font-black text-slate-900 mb-3 group-hover:text-emerald-700 transition-colors">
          {event.title}
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm text-slate-500 mb-4">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-slate-400" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <User2 size={16} className="text-slate-400" />
            <span>Led by <span className="font-bold text-slate-700">{event.speaker}</span></span>
          </div>
        </div>
        
        <p className="text-slate-600 text-sm leading-relaxed max-w-2xl">
          {event.detail}
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto shrink-0 self-stretch justify-center">
        <button 
          className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-slate-200"
          onClick={() => alert(`RSVP successful for: ${event.title}`)}
        >
          <CheckCircle2 size={18} />
          RSVP Now
        </button>
        <button 
          className="bg-white text-slate-700 px-8 py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 border-2 border-slate-100 hover:bg-slate-50 active:scale-95 transition-all"
          onClick={() => alert(`Reminder set for: ${event.title}`)}
        >
          <Bell size={18} />
          Remind Me
        </button>
      </div>
    </motion.div>
  );
};

