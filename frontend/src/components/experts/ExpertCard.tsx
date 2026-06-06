import React from 'react';
import type { Expert } from '../../data/mockData';
import { motion } from 'framer-motion';
import { MessageCircle } from 'lucide-react';

interface ExpertCardProps {
  expert: Expert;
}

export function ExpertCard({ expert }: ExpertCardProps) {
  return (
    <motion.div 
      whileHover={{ y: -8 }}
      className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-xl shadow-slate-100/50 flex flex-col h-full"
    >
      <div className="relative h-64 overflow-hidden">
        <img 
          src={expert.image_url} 
          alt={expert.name} 
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
        />
        <div className="absolute top-4 left-4">
          <span className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold text-slate-800 shadow-sm">
            {expert.origin}
          </span>
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-grow">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-slate-900 mb-1">{expert.name}</h3>
          <p className="text-emerald-600 font-medium text-sm tracking-wide uppercase">
            {expert.specialty}
          </p>
        </div>
        
        <p className="text-slate-600 text-sm leading-relaxed mb-6 flex-grow">
          {expert.bio}
        </p>
        
        <div className="bg-slate-50 rounded-2xl p-4 mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-tighter mb-1">Next Event</p>
          <p className="text-slate-800 font-medium text-sm">{expert.next_event}</p>
        </div>
        
        <button className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all hover:bg-emerald-600 active:scale-95">
          <MessageCircle size={20} />
          Ask the Expert
        </button>
      </div>
    </motion.div>
  );
};

