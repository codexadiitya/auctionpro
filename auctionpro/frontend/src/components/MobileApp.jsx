import React from 'react';
import { Card } from './ui/card';
import { Smartphone, Radio, Users, BellRing, Zap, Download } from 'lucide-react';
import { Button } from './ui/button';

const bullets = [
  { icon: Radio, text: 'Live player data with cinematic overlays' },
  { icon: Users, text: 'Team points update instantly for all owners' },
  { icon: BellRing, text: 'SOLD! screens with fireworks & sound FX' },
  { icon: Zap, text: 'Help & tooltips available inside every screen' },
  { icon: Radio, text: 'Live-stream your tournament to the world' },
  { icon: Users, text: 'Auto-recorded unsold player data for retention' },
];

export default function MobileApp() {
  return (
    <section className="relative py-20 lg:py-28 border-y border-white/5">
      <div className="absolute inset-0 stripe-bg opacity-40"/>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="text-orange-400 text-xs uppercase tracking-[0.3em] font-semibold mb-2">In your pocket</div>
          <h2 className="font-display text-4xl md:text-5xl text-white leading-tight">THE <span className="brand-gradient-text">AUCTIONPRO</span><br/>MOBILE APP</h2>
          <p className="mt-5 text-white/70 leading-relaxed">
            Available on Android and iOS. The easiest player-auction companion in any sport — whether it's Cricket, Kabaddi, Volleyball or Badminton. Team owners, managers and players all get exactly the info they need.
          </p>
          <ul className="mt-6 grid sm:grid-cols-2 gap-3">
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-white/80 text-sm">
                <span className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
                  <b.icon className="w-4 h-4"/>
                </span>
                {b.text}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#" className="inline-flex items-center gap-3 bg-black text-white border border-white/15 rounded-xl px-5 py-3 hover:border-orange-400 transition">
              <Download className="w-6 h-6 text-orange-400"/>
              <span><div className="text-[10px] uppercase tracking-widest text-white/60">Get it on</div><div className="font-semibold">Google Play</div></span>
            </a>
            <a href="#" className="inline-flex items-center gap-3 bg-black text-white border border-white/15 rounded-xl px-5 py-3 hover:border-orange-400 transition">
              <Smartphone className="w-6 h-6 text-orange-400"/>
              <span><div className="text-[10px] uppercase tracking-widest text-white/60">Download on</div><div className="font-semibold">App Store</div></span>
            </a>
          </div>
        </div>

        <div className="relative flex justify-center">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-72 h-72 bg-gradient-to-br from-orange-500 to-amber-500 rounded-full blur-3xl opacity-30"/>
          </div>
          <Card className="relative w-72 h-[560px] bg-[#0f0f14] border border-white/10 rounded-[2.5rem] p-3 shadow-2xl">
            <div className="w-full h-full rounded-[2rem] overflow-hidden relative bg-gradient-to-b from-orange-500 to-amber-600">
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full"/>
              <div className="p-5 pt-10 text-white">
                <div className="text-xs uppercase tracking-widest opacity-80">Live Auction</div>
                <div className="font-display text-3xl leading-tight mt-1">SIDDHIVINAYAK LEAGUE</div>
                <div className="mt-4 bg-black/30 backdrop-blur rounded-2xl p-4">
                  <div className="text-xs opacity-80">Current Bidder</div>
                  <div className="text-lg font-bold">R. Malhotra • All-Rounder</div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <div className="text-xs opacity-80">Current Bid</div>
                      <div className="font-display text-4xl">₹12L</div>
                    </div>
                    <div className="bg-white text-orange-600 font-bold text-xs uppercase px-3 py-1.5 rounded-full">SOLD</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {['Bombay XI', 'Delhi Kings', 'Royal 11', 'Warriors'].map((t) => (
                    <div key={t} className="bg-black/30 backdrop-blur rounded-xl p-2 text-xs">
                      <div className="font-semibold">{t}</div>
                      <div className="opacity-70">₹80L left</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
