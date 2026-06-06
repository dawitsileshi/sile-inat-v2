import React from 'react';
import type { KnowledgeCapsule as KnowledgeCapsuleType } from '../../data/mockData';
import { motion } from 'framer-motion';
import { BookOpen, Video, Zap, ArrowRight } from 'lucide-react';

interface KnowledgeCapsuleProps {
  capsule: KnowledgeCapsuleType;
}

export function KnowledgeCapsule({ capsule }: KnowledgeCapsuleProps) {
  const Icon = capsule.type === 'video' ? Video : capsule.type === 'article' ? BookOpen : Zap;
  const colorClass = capsule.type === 'video' ? 'text-blue-500 bg-blue-50' : capsule.type === 'article' ? 'text-purple-500 bg-purple-50' : 'text-amber-500 bg-amber-50';

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="bg-white p-6 rounded-3xl border border-slate-100 shadow-lg shadow-slate-100/30 flex flex-col h-full group"
    >
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${colorClass}`}>
        <Icon size={24} />
      </div>
      
      <div className="flex-grow">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 block">
          {capsule.type}
        </span>
        <h4 className="text-lg font-bold text-slate-900 mb-3 group-hover:text-amber-600 transition-colors">
          {capsule.title}
        </h4>
        <p className="text-slate-500 text-sm leading-relaxed mb-6">
          {capsule.summary}
        </p>
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <span className="text-xs font-medium text-slate-400">By {capsule.author}</span>
        <a 
          href={capsule.content_url} 
          className="text-slate-900 group-hover:text-emerald-600 transition-colors flex items-center gap-1 text-sm font-bold"
        >
          Explore
          <ArrowRight size={16} />
        </a>
      </div>
    </motion.div>
  );
};

