import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Hero from '../components/Hero';
import AuctionsSection from '../components/AuctionsSection';
import About from '../components/About';
import MobileApp from '../components/MobileApp';
import Features from '../components/Features';
import Pricing from '../components/Pricing';
import Clients from '../components/Clients';
import Contact from '../components/Contact';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Header />
      <main>
        <Hero />
        <AuctionsSection />
        <About />
        <MobileApp />
        <Features />
        <Pricing />
        <Clients />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
