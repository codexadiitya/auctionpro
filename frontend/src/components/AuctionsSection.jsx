import React from 'react';
import { Card } from './ui/card';
import { Calendar, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { todaysAuctions, upcomingAuctions } from '../mock';

function AuctionCard({ item, live }) {
  return (
    <Card className="group bg-white/[0.03] border border-white/10 hover-lift p-4 flex items-center gap-4 rounded-2xl">
      <div className="relative shrink-0">
        <img src={item.logo} alt={item.name} className="w-16 h-16 object-cover rounded-xl border border-white/10" />
        {live && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 ring-2 ring-[#0a0a0f] animate-pulse"/>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-white font-semibold truncate group-hover:text-orange-400 transition-colors">{item.name}</div>
        <div className="flex items-center gap-1 text-xs text-white/50 mt-1">
          <Calendar className="w-3 h-3"/> {item.date}
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-white/40 group-hover:text-orange-400 group-hover:translate-x-1 transition-transform"/>
    </Card>
  );
}

export default function AuctionsSection() {
  return (
    <section id="auctions" className="relative py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="text-orange-400 text-xs uppercase tracking-[0.3em] font-semibold mb-2">Happening today</div>
            <h2 className="font-display text-4xl md:text-5xl text-white">TODAY'S <span className="brand-gradient-text">AUCTIONS</span></h2>
          </div>
          <Button variant="outline" className="border-orange-500/40 text-orange-400 hover:bg-orange-500/10 hover:text-orange-400 bg-transparent">View All</Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {todaysAuctions.map((a) => <AuctionCard key={a.id} item={a} live />)}
        </div>

        <div className="mt-24 flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="text-orange-400 text-xs uppercase tracking-[0.3em] font-semibold mb-2">Coming Up</div>
            <h2 className="font-display text-4xl md:text-5xl text-white">UPCOMING <span className="brand-gradient-text">AUCTIONS</span></h2>
          </div>
          <Button variant="outline" className="border-orange-500/40 text-orange-400 hover:bg-orange-500/10 hover:text-orange-400 bg-transparent">View All</Button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {upcomingAuctions.map((a) => <AuctionCard key={a.id} item={a} />)}
        </div>
      </div>
    </section>
  );
}
