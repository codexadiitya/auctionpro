import React from 'react';
import { clients, testimonials } from '../mock';
import { Star, Quote } from 'lucide-react';
import { Card } from './ui/card';

export default function Clients() {
  return (
    <section className="relative py-20 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="text-orange-400 text-xs uppercase tracking-[0.3em] font-semibold mb-2">Trusted by</div>
          <h2 className="font-display text-4xl md:text-5xl text-white">OUR <span className="brand-gradient-text">CLIENTS</span></h2>
        </div>

        <div className="relative overflow-hidden py-6 mask-fade">
          <div className="flex gap-8 animate-marquee whitespace-nowrap">
            {[...clients, ...clients].map((c, i) => (
              <div key={i} className="shrink-0 h-16 w-48 flex items-center justify-center bg-white/[0.03] border border-white/10 rounded-2xl px-6 hover:border-orange-400/40 transition-colors">
                <span className="text-white/80 font-semibold tracking-wide text-sm">{c}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <Card key={t.name} className="relative bg-white/[0.03] border border-white/10 p-6 rounded-2xl hover-lift">
              <Quote className="w-8 h-8 text-orange-400/40 mb-3"/>
              <p className="text-white/80 leading-relaxed">“{t.quote}”</p>
              <div className="flex text-orange-400 mt-4 gap-0.5">
                {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4" fill="currentColor"/>)}
              </div>
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-white font-semibold">{t.name}</div>
                <div className="text-white/50 text-sm">{t.role}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
