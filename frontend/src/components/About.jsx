import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Button } from './ui/button';

const points = [
  'Handles cricket, kabaddi, hockey, volleyball & every sport imaginable',
  '6 years of proven experience with 2,500+ successful auctions',
  'Live-view team owner mobile companion',
  'Auto-recorded auction data including unsold players',
];

export default function About() {
  return (
    <section id="about" className="relative py-20 lg:py-28 border-y border-white/5 bg-white/[0.015]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <div className="relative">
          <div className="absolute -top-6 -left-6 w-32 h-32 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 blur-2xl opacity-40"></div>
          <img src="https://images.unsplash.com/photo-1674986778924-7a33c1531443?w=800&h=900&fit=crop" alt="Cricket action" className="relative rounded-3xl border border-white/10 object-cover w-full h-[520px] shadow-2xl"/>
          <div className="absolute -bottom-6 -right-6 bg-[#111116] border border-white/10 rounded-2xl p-5 shadow-xl w-64">
            <div className="text-orange-400 text-xs uppercase tracking-widest font-bold">Since 2019</div>
            <div className="font-display text-4xl text-white mt-1">6+ Years</div>
            <div className="text-white/60 text-sm">Delivering flawless auctions across India & beyond.</div>
          </div>
        </div>
        <div>
          <div className="text-orange-400 text-xs uppercase tracking-[0.3em] font-semibold mb-2">About AuctionPro</div>
          <h2 className="font-display text-4xl md:text-5xl text-white leading-tight">TOURNAMENTS DESERVE A <span className="brand-gradient-text">PRO EXPERIENCE</span></h2>
          <p className="mt-6 text-white/70 leading-relaxed">
            Every tournament coordinator knows how painful it is to wrangle entry forms, draws, and matches. AuctionPro was built to make it effortless — giving you unmatched precision and professional broadcast‑grade tools.
          </p>
          <p className="mt-4 text-white/70 leading-relaxed">
            Whether you're running Cricket, Kabaddi, Hockey, Volleyball or Football — AuctionPro adapts to your sport and your rules. If you can dream of an auction, we can make it happen.
          </p>
          <ul className="mt-6 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-white/80"><CheckCircle2 className="w-5 h-5 text-orange-400 mt-0.5 shrink-0"/> <span>{p}</span></li>
            ))}
          </ul>
          <div className="mt-8 flex gap-3">
            <a href="#features"><Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white">Explore Features</Button></a>
            <a href="#demo"><Button variant="outline" className="border-white/20 text-white hover:bg-white/5 hover:text-orange-400 hover:border-orange-400 bg-transparent">Get Free Demo</Button></a>
          </div>
        </div>
      </div>
    </section>
  );
}
