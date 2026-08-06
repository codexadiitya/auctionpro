import React from 'react';
import * as Icons from 'lucide-react';
import { Card } from './ui/card';
import { features, sports } from '../mock';

export default function Features() {
  return (
    <section id="features" className="relative py-20 lg:py-28">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-orange-600/10 blur-[120px] pointer-events-none"/>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="text-orange-400 text-xs uppercase tracking-[0.3em] font-semibold mb-2">Pro-grade toolkit</div>
          <h2 className="font-display text-4xl md:text-5xl text-white">ADVANCED <span className="brand-gradient-text">FEATURES</span></h2>
          <p className="text-white/60 mt-4 max-w-2xl mx-auto">Everything you need to run a broadcast‑worthy live auction — from remote bidding to fortune wheels and auto social posts.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => {
            const Icon = Icons[f.icon] || Icons.Sparkles;
            return (
              <Card key={f.title} className="group relative bg-white/[0.03] border border-white/10 rounded-2xl p-6 hover-lift overflow-hidden">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl group-hover:bg-orange-500/25 transition-colors"/>
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 mb-4">
                    <Icon className="w-6 h-6"/>
                  </div>
                  <h3 className="text-white text-lg font-semibold">{f.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed mt-2">{f.desc}</p>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="mt-20">
          <div className="text-center mb-8">
            <h3 className="font-display text-3xl md:text-4xl text-white">BUILT FOR <span className="brand-gradient-text">EVERY SPORT</span></h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
            {sports.map((s) => {
              const Icon = Icons[s.icon] || Icons.Trophy;
              return (
                <div key={s.name} className="group bg-white/[0.03] border border-white/10 rounded-xl p-4 text-center hover-lift">
                  <Icon className="w-8 h-8 mx-auto text-orange-400 mb-2 group-hover:scale-110 transition-transform"/>
                  <div className="text-white/80 text-sm font-medium">{s.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
