import React from 'react';
import { mockExperts } from '../../data/mockData';
import { ExpertCard } from './ExpertCard';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function FeaturedExperts() {
  return (
    <section className="py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm uppercase tracking-widest mb-3">
            <Sparkles size={18} />
            Global Reach
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
            Featured <span className="text-emerald-600">Visiting Experts</span>
          </h2>
        </div>
        <p className="text-slate-500 max-w-md text-lg leading-relaxed">
          Learn from world-renowned practitioners visiting our center this month.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {mockExperts.map((expert, index) => (
          <motion.div
            key={expert.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
          >
            <ExpertCard expert={expert} />
          </motion.div>
        ))}
      </div>
    </section>
  );
};

