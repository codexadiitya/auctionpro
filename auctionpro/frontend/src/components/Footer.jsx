import React from 'react';
import { Phone, Mail, MapPin, Zap, Youtube, Instagram, Facebook, Twitter } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-[#050508] border-t border-white/5 pt-16 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" fill="white" />
            </div>
            <div className="font-display text-2xl text-white">AUCTION<span className="brand-gradient-text">PRO</span></div>
          </div>
          <p className="text-white/60 text-sm leading-relaxed">The modern player auction platform for cricket, kabaddi, football and every sport imaginable. Trusted by 2,500+ leagues.</p>
          <div className="flex gap-3 mt-5">
            {[Facebook, Instagram, Youtube, Twitter].map((Icon, i) => (
              <a key={i} href="#" className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/70 hover:text-orange-400 hover:border-orange-400 transition-colors">
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4 tracking-wide">Quick Links</h4>
          <ul className="space-y-2 text-sm text-white/60">
            <li><a href="#auctions" className="hover:text-orange-400">Today's Auctions</a></li>
            <li><a href="#features" className="hover:text-orange-400">Advanced Features</a></li>
            <li><a href="#pricing" className="hover:text-orange-400">Pricing</a></li>
            <li><a href="#about" className="hover:text-orange-400">About Us</a></li>
            <li><a href="#contact" className="hover:text-orange-400">Contact</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4 tracking-wide">Products</h4>
          <ul className="space-y-2 text-sm text-white/60">
            <li><a href="#" className="hover:text-orange-400">AuctionPro Software</a></li>
            <li><a href="#" className="hover:text-orange-400">Mobile App (Android/iOS)</a></li>
            <li><a href="#" className="hover:text-orange-400">Live Streaming Suite</a></li>
            <li><a href="#" className="hover:text-orange-400">ScorePro</a></li>
            <li><a href="#" className="hover:text-orange-400">Auto Social Post</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-white font-semibold mb-4 tracking-wide">Get in Touch</h4>
          <ul className="space-y-3 text-sm text-white/60">
            <li className="flex items-start gap-2"><Phone className="w-4 h-4 text-orange-400 mt-0.5"/> +91-99999-11123</li>
            <li className="flex items-start gap-2"><Phone className="w-4 h-4 text-orange-400 mt-0.5"/> +91-88888-11123</li>
            <li className="flex items-start gap-2"><Mail className="w-4 h-4 text-orange-400 mt-0.5"/> hello@auctionpro.demo</li>
            <li className="flex items-start gap-2"><MapPin className="w-4 h-4 text-orange-400 mt-0.5"/> Bengaluru, India</li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 mt-12 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-xs text-white/40">
        <div>© {new Date().getFullYear()} AuctionPro. All rights reserved.</div>
        <div className="flex gap-6 mt-3 md:mt-0">
          <a href="#" className="hover:text-orange-400">Privacy Policy</a>
          <a href="#" className="hover:text-orange-400">Terms of Service</a>
          <a href="#" className="hover:text-orange-400">Refund Policy</a>
        </div>
      </div>
    </footer>
  );
}
