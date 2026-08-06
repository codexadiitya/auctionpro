import React from 'react';
import { ArrowRight, Play, Phone, Star } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { stats } from '../mock';

export default function Hero() {
  return (
    <section className="relative overflow-hidden pt-16 pb-24 lg:pt-24 lg:pb-32">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-orange-600/20 blur-[120px]" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-amber-600/20 blur-[120px]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/30 mb-5 hover:bg-orange-500/20">
            <Star className="w-3 h-3 mr-1" fill="currentColor" /> Rated #1 by 2,500+ Sports Leagues
          </Badge>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[0.95] text-white">
            RUN A <span className="brand-gradient-text">WORLD-CLASS</span><br />
            PLAYER AUCTION
          </h1>
          <p className="mt-6 text-lg text-white/70 max-w-xl leading-relaxed">
            AuctionPro is the modern live player-auction platform trusted by tournament coordinators across cricket, kabaddi, hockey, volleyball and more. Broadcast in HD, bid remotely, and hand out drama-filled SOLDs in one click.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <a href="#pricing">
              <Button size="lg" className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-8 h-12 shadow-xl shadow-orange-500/30">
                Start Your Auction <ArrowRight className="ml-2 w-4 h-4"/>
              </Button>
            </a>
            <a href="#demo">
              <Button size="lg" variant="outline" className="h-12 px-8 border-white/20 text-white hover:bg-white/5 hover:text-orange-400 hover:border-orange-400 bg-transparent">
                <Play className="mr-2 w-4 h-4"/> Watch Demo
              </Button>
            </a>
          </div>

          <div className="mt-8 flex items-center gap-3 text-white/60">
            <div className="relative">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div className="absolute inset-0 rounded-full bg-green-500 animate-ping"></div>
            </div>
            <span className="text-sm">Live auction helpline: <span className="text-white font-semibold">+91-99999-11123</span></span>
          </div>

          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="font-display text-3xl text-orange-400">{s.value}</div>
                <div className="text-xs uppercase tracking-wider text-white/50 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl aspect-[4/5] lg:aspect-square">
            <img
              src="https://images.unsplash.com/photo-1512719994953-eabf50895df7?w=900&h=900&fit=crop"
              alt="Cricket stadium"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent"/>
            <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-lg border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white/60 text-xs uppercase tracking-wider">Live Now</div>
                  <div className="text-white font-semibold">Siddhivinayak League Auction</div>
                </div>
                <div className="flex items-center gap-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-3 py-1 text-xs font-semibold">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> LIVE
                </div>
              </div>
            </div>
            <div className="absolute top-4 right-4 bg-orange-500 text-white text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg">Sold ₹12L</div>
          </div>

          <div className="absolute -bottom-6 -left-6 hidden sm:block bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl p-5 shadow-2xl w-56">
            <div className="flex items-center gap-2 text-white/90 text-xs uppercase font-bold tracking-widest"><Phone className="w-3 h-3"/> Book a Call</div>
            <div className="text-white text-lg font-semibold mt-1">Speak to an expert</div>
            <div className="text-white/90 text-sm mt-1">Free 15-min consultation</div>
          </div>
        </div>
      </div>
    </section>
  );
}
