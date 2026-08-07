import React, { useState } from 'react';
import { ArrowRight, Play, Phone, Star, X } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { stats } from '../mock';

export default function Hero() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
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
            <Button
              size="lg"
              variant="outline"
              onClick={() => setDemoOpen(true)}
              className="h-12 px-8 border-white/20 text-white hover:bg-white/5 hover:text-orange-400 hover:border-orange-400 bg-transparent"
            >
              <Play className="mr-2 w-4 h-4 text-orange-400" fill="currentColor"/> Watch Demo
            </Button>
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
          <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl aspect-[4/5] lg:aspect-square group">
            <img
              src="https://images.unsplash.com/photo-1512719994953-eabf50895df7?w=900&h=900&fit=crop"
              alt="Cricket stadium"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent"/>
            
            {/* Center Play Button Overlay */}
            <button
              onClick={() => setDemoOpen(true)}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 hover:bg-black/20 transition-all group-hover:scale-105"
            >
              <div className="w-16 h-16 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-2xl shadow-orange-500/50">
                <Play className="w-8 h-8 ml-1" fill="currentColor" />
              </div>
              <span className="text-white text-xs font-bold uppercase tracking-widest mt-3 bg-black/60 px-3 py-1 rounded-full backdrop-blur">
                Click to Watch Interactive Demo
              </span>
            </button>

            {/* Live Indicator Card */}
            <div className="absolute top-4 left-4 right-4 bg-black/60 backdrop-blur-lg border border-white/10 rounded-2xl p-4 flex items-center justify-between pointer-events-none">
              <div>
                <div className="text-white/60 text-xs uppercase tracking-wider">Live Now</div>
                <div className="text-white font-semibold text-sm">Premier League Auction</div>
              </div>
              <div className="flex items-center gap-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-3 py-1 text-xs font-semibold">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> LIVE
              </div>
            </div>

            {/* Glassmorphic Consultation Card inside hero image */}
            <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between shadow-2xl">
              <div>
                <div className="flex items-center gap-1.5 text-orange-400 text-[11px] font-bold uppercase tracking-widest">
                  <Phone className="w-3.5 h-3.5"/> Speak to an expert
                </div>
                <div className="text-white text-xs text-white/70 mt-0.5">Free 15-min consultation</div>
              </div>
              <a href="#contact" className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl transition shadow">
                Book Call
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Interactive Video Demo Modal ── */}
      {demoOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-orange-400" fill="currentColor"/>
                <span className="font-display text-xl text-white">AUCTIONPRO LIVE DEMO WALKTHROUGH</span>
              </div>
              <button
                onClick={() => setDemoOpen(false)}
                className="text-white/60 hover:text-white p-2 rounded-xl hover:bg-white/10"
              >
                <X className="w-6 h-6"/>
              </button>
            </div>
            <div className="aspect-video w-full bg-black flex items-center justify-center relative">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                title="AuctionPro Platform Demo"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
