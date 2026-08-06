import React from 'react';
import { Link } from 'react-router-dom';
import { XCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

export default function PaymentCancel() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white grid-bg flex items-center justify-center px-4">
      <Card className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 md:p-12 max-w-lg w-full text-center">
        <XCircle className="w-16 h-16 mx-auto text-orange-400 mb-4"/>
        <h1 className="font-display text-4xl md:text-5xl text-white">PAYMENT <span className="brand-gradient-text">CANCELLED</span></h1>
        <p className="text-white/60 mt-3">Your payment was cancelled. No amount has been charged to your account.</p>
        <div className="mt-8 flex gap-3 justify-center">
          <Link to="/#pricing"><Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold">Try Again</Button></Link>
          <Link to="/"><Button variant="outline" className="border-white/20 text-white hover:bg-white/5 bg-transparent hover:text-orange-400 hover:border-orange-400"><ArrowLeft className="w-4 h-4 mr-2"/> Home</Button></Link>
        </div>
      </Card>
    </div>
  );
}
