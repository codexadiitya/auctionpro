import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, BACKEND } from '../lib/api';
import { getSocket } from '../lib/socket';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Zap, Users } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function LiveSpectator() {
  const { id } = useParams();
  const [auction, setAuction] = useState(null);
  const [teams, setTeams] = useState([]);
  const [player, setPlayer] = useState(null);
  const [bid, setBid] = useState(0);
  const [team, setTeam] = useState(null);
  const [soldModal, setSoldModal] = useState(null);

  useEffect(() => {
    api.get(`/auctions/${id}`).then(r=>setAuction(r.data)).catch(()=>{});
    api.get(`/teams?auction_id=${id}`).then(r=>setTeams(r.data));
  }, [id]);

  useEffect(() => {
    const s = getSocket();
    s.emit('join_auction', { auction_id: id });
    s.on('bid', ({ bid, team }) => { setBid(bid.amount); setTeam(team); });
    s.on('next_player', ({ player, base_price }) => { setPlayer(player); setBid(base_price); setTeam(null); });
    s.on('sold', ({ player, team, price }) => {
      setSoldModal({ player, team, price });
      confetti({ particleCount: 120, spread: 90 });
      setTimeout(()=>setSoldModal(null), 4000);
      api.get(`/teams?auction_id=${id}`).then(r=>setTeams(r.data));
    });
    return () => s.emit('leave_auction', { auction_id: id });
  }, [id]);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 py-4 backdrop-blur sticky top-0 bg-black/60 z-30">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center"><Zap className="w-5 h-5 text-white" fill="white"/></div>
            <div className="font-display text-xl">AUCTION<span className="brand-gradient-text">PRO</span></div>
          </div>
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"/> SPECTATOR LIVE</Badge>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6">
        <div className="font-display text-4xl">{auction?.name}</div>
        <div className="text-white/50 uppercase tracking-widest text-xs">{auction?.sport} • {auction?.date}</div>

        <Card className="mt-6 bg-gradient-to-b from-orange-500/10 to-transparent border-orange-500/30 p-8 rounded-3xl min-h-[280px] flex items-center justify-center">
          {player ? (
            <div className="text-center">
              <div className="text-orange-400 text-xs uppercase tracking-[0.3em]">On the block</div>
              <div className="font-display text-6xl mt-2">{player.name}</div>
              <div className="text-white/60">{player.role}</div>
              <div className="mt-6 font-display text-5xl brand-gradient-text">₹{Number(bid).toLocaleString('en-IN')}</div>
              {team && <div className="mt-2 text-orange-300">Leading: {team.name}</div>}
            </div>
          ) : <div className="text-center text-white/50 font-display text-3xl">WAITING FOR NEXT PLAYER...</div>}
        </Card>

        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {teams.map(t => (
            <Card key={t.id} className="bg-white/[0.03] border border-white/10 p-4 rounded-xl">
              <div className="w-2 h-6 rounded-full mb-2" style={{background:t.color}}/>
              <div className="text-white font-semibold">{t.name}</div>
              <div className="text-orange-400 text-sm mt-1">₹{Number(t.purse).toLocaleString('en-IN')}</div>
              <div className="text-xs text-white/50 flex items-center gap-1 mt-1"><Users className="w-3 h-3"/> {t.squad_count||0}</div>
            </Card>
          ))}
        </div>
      </main>
      {soldModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur flex items-center justify-center z-50">
          <div className="text-center">
            <div className="font-display text-8xl brand-gradient-text">SOLD!</div>
            <div className="mt-4 font-display text-4xl text-white">{soldModal.player.name}</div>
            <div className="mt-2 text-2xl text-orange-300">→ {soldModal.team.name}</div>
            <div className="mt-4 font-display text-5xl text-white">₹{Number(soldModal.price).toLocaleString('en-IN')}</div>
          </div>
        </div>
      )}
    </div>
  );
}
