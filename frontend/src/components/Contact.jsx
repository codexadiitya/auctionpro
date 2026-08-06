import React, { useState } from 'react';
import axios from 'axios';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Phone, Mail, Headphones, Loader2, Send } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = `${BACKEND_URL}/api`;

export default function Contact() {
  const { toast } = useToast();
  const [demoData, setDemoData] = useState({ name: '', email: '', phone: '', organization: '', sport: '' });
  const [contactData, setContactData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [demoLoad, setDemoLoad] = useState(false);
  const [contactLoad, setContactLoad] = useState(false);

  const submitDemo = async (e) => {
    e.preventDefault();
    setDemoLoad(true);
    try {
      const { data } = await axios.post(`${API}/demo`, demoData);
      toast({ title: 'Demo booked!', description: data.message });
      setDemoData({ name: '', email: '', phone: '', organization: '', sport: '' });
    } catch (err) {
      toast({ title: 'Failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setDemoLoad(false);
    }
  };

  const submitContact = async (e) => {
    e.preventDefault();
    setContactLoad(true);
    try {
      await axios.post(`${API}/contact`, contactData);
      toast({ title: 'Message sent!', description: "We'll get back within 24 hours." });
      setContactData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      toast({ title: 'Failed', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setContactLoad(false);
    }
  };

  return (
    <section id="contact" className="relative py-20 lg:py-28 border-t border-white/5">
      <div id="demo" className="absolute -top-24"/>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="text-orange-400 text-xs uppercase tracking-[0.3em] font-semibold mb-2">Let's connect</div>
          <h2 className="font-display text-4xl md:text-5xl text-white">GET IN <span className="brand-gradient-text">TOUCH</span></h2>
          <p className="text-white/60 mt-4 max-w-xl mx-auto">Book a free 15-minute demo or shoot us a message — we'll show you exactly how AuctionPro transforms your next tournament.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Demo form */}
          <Card className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 lg:p-8">
            <div className="flex items-center gap-2 text-orange-400 text-xs uppercase font-bold tracking-widest"><Headphones className="w-4 h-4"/> Book a Free Demo</div>
            <h3 className="text-white text-2xl font-semibold mt-2">Schedule a live walkthrough</h3>
            <form onSubmit={submitDemo} className="mt-6 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/70 text-sm">Full Name</Label>
                  <Input required value={demoData.name} onChange={(e)=>setDemoData({...demoData, name:e.target.value})}
                         placeholder="Rohit Sharma" className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500" />
                </div>
                <div>
                  <Label className="text-white/70 text-sm">Phone</Label>
                  <Input required value={demoData.phone} onChange={(e)=>setDemoData({...demoData, phone:e.target.value})}
                         placeholder="+91-98765-43210" className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500" />
                </div>
              </div>
              <div>
                <Label className="text-white/70 text-sm">Email</Label>
                <Input required type="email" value={demoData.email} onChange={(e)=>setDemoData({...demoData, email:e.target.value})}
                       placeholder="you@league.com" className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-white/70 text-sm">Organization</Label>
                  <Input value={demoData.organization} onChange={(e)=>setDemoData({...demoData, organization:e.target.value})}
                         placeholder="Your League" className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500" />
                </div>
                <div>
                  <Label className="text-white/70 text-sm">Sport</Label>
                  <Input value={demoData.sport} onChange={(e)=>setDemoData({...demoData, sport:e.target.value})}
                         placeholder="Cricket / Kabaddi / ..." className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500" />
                </div>
              </div>
              <Button type="submit" disabled={demoLoad} className="w-full h-11 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold">
                {demoLoad ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Booking...</> : <>Book Demo <Send className="ml-2 w-4 h-4"/></>}
              </Button>
            </form>
          </Card>

          {/* Contact info + form */}
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-orange-500/15 to-amber-500/5 border border-orange-500/30 rounded-2xl p-5">
                <div className="w-11 h-11 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400"><Phone className="w-5 h-5"/></div>
                <div className="mt-3 text-white/60 text-xs uppercase tracking-widest">Phone Number</div>
                <div className="mt-1 text-white font-semibold">+91-99999-11123</div>
                <div className="text-white font-semibold">+91-88888-11123</div>
              </Card>
              <Card className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                <div className="w-11 h-11 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400"><Mail className="w-5 h-5"/></div>
                <div className="mt-3 text-white/60 text-xs uppercase tracking-widest">Email Us</div>
                <div className="mt-1 text-white font-semibold text-sm">hello@auctionpro.demo</div>
                <div className="text-white/60 text-sm">support@auctionpro.demo</div>
              </Card>
            </div>

            <Card className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
              <h3 className="text-white text-xl font-semibold">Send us a message</h3>
              <form onSubmit={submitContact} className="mt-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input required placeholder="Name" value={contactData.name} onChange={(e)=>setContactData({...contactData, name:e.target.value})} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500"/>
                  <Input required type="email" placeholder="Email" value={contactData.email} onChange={(e)=>setContactData({...contactData, email:e.target.value})} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500"/>
                </div>
                <Input placeholder="Subject" value={contactData.subject} onChange={(e)=>setContactData({...contactData, subject:e.target.value})} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500"/>
                <Textarea required placeholder="How can we help?" rows={4} value={contactData.message} onChange={(e)=>setContactData({...contactData, message:e.target.value})} className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-orange-500"/>
                <Button type="submit" disabled={contactLoad} className="w-full h-11 bg-white/10 hover:bg-white/15 text-white border border-white/10">
                  {contactLoad ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Sending...</> : 'Send Message'}
                </Button>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
