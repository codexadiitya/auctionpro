import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle2, Loader2, XCircle, ArrowLeft, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get('session_id');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!sessionId) { setError('Missing session id'); return; }
    let cancelled = false;
    let count = 0;
    const poll = async () => {
      if (cancelled) return;
      try {
        const { data } = await axios.get(`${API}/payments/status/${sessionId}`);
        setStatus(data);
        if (data.payment_status === 'paid') return;
        if (data.payment_status === 'failed' || data.payment_status === 'expired') { setError('Payment did not succeed.'); return; }
        count += 1;
        setAttempts(count);
        if (count >= 20) { setError('Timeout waiting for payment confirmation.'); return; }
        setTimeout(poll, 2000);
      } catch (e) {
        setError('Could not fetch payment status.');
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [sessionId]);

  const paid = status?.payment_status === 'paid';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white grid-bg flex items-center justify-center px-4">
      <Card className="relative bg-white/[0.04] border border-white/10 rounded-3xl p-8 md:p-12 max-w-lg w-full text-center overflow-hidden">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/30 blur-3xl rounded-full"/>
        <div className="relative">
          {error ? (
            <>
              <XCircle className="w-16 h-16 mx-auto text-red-400 mb-4"/>
              <h1 className="font-display text-3xl md:text-4xl text-white">SOMETHING WENT WRONG</h1>
              <p className="text-white/60 mt-3">{error}</p>
            </>
          ) : paid ? (
            <>
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center glow-orange mb-4">
                <CheckCircle2 className="w-10 h-10 text-white" strokeWidth={2.5}/>
              </div>
              <div className="flex items-center justify-center gap-2 text-orange-400 text-xs uppercase tracking-widest font-bold">
                <Sparkles className="w-4 h-4"/> Payment successful
              </div>
              <h1 className="font-display text-4xl md:text-5xl text-white mt-2">WELCOME TO <span className="brand-gradient-text">AUCTIONPRO</span></h1>
              <p className="text-white/70 mt-4">You have successfully purchased the <span className="text-orange-400 font-semibold">{status.package_name}</span> plan for <span className="text-white font-semibold">₹{Number(status.amount).toLocaleString('en-IN')}</span>.</p>
              <p className="text-white/50 text-sm mt-2">A confirmation email will arrive shortly. Our team will call you within 24 hours to set up your first auction.</p>
            </>
          ) : (
            <>
              <Loader2 className="w-14 h-14 mx-auto text-orange-400 animate-spin mb-4"/>
              <h1 className="font-display text-3xl text-white">CONFIRMING YOUR PAYMENT</h1>
              <p className="text-white/60 mt-2">Please don't close this tab — attempt {attempts}/20</p>
            </>
          )}
          <Link to="/" className="inline-block mt-8">
            <Button className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold px-8"><ArrowLeft className="w-4 h-4 mr-2"/> Back to Home</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
