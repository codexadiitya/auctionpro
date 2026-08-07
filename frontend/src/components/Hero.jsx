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

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <div>
          <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/30 mb-4 hover:bg-orange-500/20 text-xs py-1 px-3">
            <Star className="w-3 h-3 mr-1.5" fill="currentColor" /> Rated #1 by 2,500+ Sports Leagues
          </Badge>
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl xl:text-8xl leading-[0.98] text-white tracking-wide">
            RUN A <span className="brand-gradient-text">WORLD-CLASS</span><br />
            PLAYER AUCTION
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-white/70 max-w-xl leading-relaxed">
            AuctionPro is the modern live player-auction platform trusted by tournament coordinators across cricket, kabaddi, hockey, volleyball and more. Broadcast in HD, bid remotely, and hand out drama-filled SOLDs in one click.
          </p>

          <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 sm:gap-4">
            <a href="#pricing" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold px-8 h-12 rounded-xl shadow-xl shadow-orange-500/30">
                Start Your Auction <ArrowRight className="ml-2 w-4 h-4"/>
              </Button>
            </a>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setDemoOpen(true)}
              className="w-full sm:w-auto h-12 px-8 border-white/20 text-white hover:bg-white/10 hover:text-orange-400 hover:border-orange-400 bg-transparent rounded-xl font-semibold"
            >
              <Play className="mr-2 w-4 h-4 text-orange-400" fill="currentColor"/> Watch Demo
            </Button>
          </div>

          <div className="mt-6 flex items-center gap-3 text-white/60">
            <div className="relative flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75"></div>
            </div>
            <span className="text-xs sm:text-sm font-medium">Live auction helpline: <span className="text-white font-semibold">+91-99999-11123</span></span>
          </div>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-2xl p-3.5 backdrop-blur-md">
                <div className="font-display text-2xl sm:text-3xl text-orange-400">{s.value}</div>
                <div className="text-[10px] sm:text-xs uppercase tracking-wider text-white/50 font-medium mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-4 lg:mt-0">
          <div className="relative rounded-3xl overflow-hidden border border-white/15 shadow-2xl h-[380px] sm:h-[450px] lg:h-[500px] w-full group">
            <img
              src="https://images.unsplash.com/photo-1512719994953-eabf50895df7?w=900&h=900&fit=crop"
              alt="Cricket stadium"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent opacity-90"/>
            
            {/* Center Play Button Overlay */}
            <button
              onClick={() => setDemoOpen(true)}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 hover:bg-black/20 transition-all group-hover:scale-105"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-2xl shadow-orange-500/50">
                <Play className="w-6 h-6 sm:w-8 sm:h-8 ml-1" fill="currentColor" />
              </div>
              <span className="text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-3 bg-black/70 px-3 py-1.5 rounded-full backdrop-blur border border-white/10">
                Click to Watch Interactive Demo
              </span>
            </button>

            {/* Live Indicator Card */}
            <div className="absolute top-4 left-4 right-4 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 flex items-center justify-between pointer-events-none">
              <div>
                <div className="text-white/60 text-[10px] sm:text-xs uppercase tracking-wider font-semibold">Live Now</div>
                <div className="text-white font-bold text-xs sm:text-sm">Premier League Auction</div>
              </div>
              <div className="flex items-center gap-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-3 py-1 text-[11px] font-bold">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> LIVE
              </div>
            </div>

            {/* Glassmorphic Consultation Card inside hero image */}
            <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 flex items-center justify-between shadow-2xl">
              <div>
                <div className="flex items-center gap-1.5 text-orange-400 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest">
                  <Phone className="w-3.5 h-3.5"/> Speak to an expert
                </div>
                <div className="text-white text-[11px] sm:text-xs text-white/70 mt-0.5">Free 15-min consultation</div>
              </div>
              <a href="#contact" className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl transition shadow shadow-orange-500/30">
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
