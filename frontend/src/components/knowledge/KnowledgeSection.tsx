import React from 'react';
import { mockCapsules, dailyWellnessTip } from '../../data/mockData';
import { KnowledgeCapsule } from './KnowledgeCapsule';
import { motion } from 'framer-motion';
import { Lightbulb, BookOpenCheck } from 'lucide-react';

export function KnowledgeSection() {
  return (
    <section className="py-16">
      <div className="flex flex-col md:flex-row gap-12 items-start">
        <div className="md:w-1/3 sticky top-8">
          <div className="flex items-center gap-2 text-amber-500 font-bold text-sm uppercase tracking-widest mb-4">
            <BookOpenCheck size={18} />
            Quick Wisdom
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-6">
            Knowledge <span className="text-amber-500">Capsules</span>
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed mb-8">
            Bite-sized insights, expert tips, and quick tutorials to elevate your daily routine.
          </p>
          
          <div className="bg-amber-50 rounded-[2.5rem] p-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 text-amber-200/50 group-hover:scale-110 transition-transform">
              <Lightbulb size={120} />
            </div>
            <div className="relative z-10">
              <span className="bg-amber-500 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 inline-block">
                Daily Wellness Tip
              </span>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">{dailyWellnessTip.title}</h3>
              <p className="text-amber-900/70 text-lg italic mb-6 leading-relaxed">
                "{dailyWellnessTip.content}"
              </p>
              <div className="text-sm font-bold text-amber-600">— {dailyWellnessTip.author}</div>
            </div>
          </div>
        </div>
        
        <div className="md:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {mockCapsules.map((capsule, index) => (
            <motion.div
              key={capsule.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <KnowledgeCapsule capsule={capsule} />
            </motion.div>
          ))}
          {/* Add a placeholder for more/subscription */}
          <div className="bg-slate-50 rounded-3xl p-8 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200">
             <BookOpenCheck size={32} className="text-slate-300 mb-4" />
             <h4 className="font-bold text-slate-400 mb-2">Want more wisdom?</h4>
             <button className="text-emerald-600 font-bold hover:underline">Subscribe to Newsletter</button>
          </div>
        </div>
      </div>
    </section>
  );
};

