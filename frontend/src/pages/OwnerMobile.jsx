import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, BACKEND } from '../lib/api';
import { getSocket } from '../lib/socket';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { DollarSign, Zap, Users } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

export default function OwnerMobile() {
  const { auctionId } = useParams();
  const { toast } = useToast();
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [player, setPlayer] = useState(null);
  const [bid, setBid] = useState(0);
  const [team, setTeam] = useState(null);

  useEffect(() => { api.get(`/teams?auction_id=${auctionId}`).then(r=>{ setTeams(r.data); if(r.data[0]) setSelectedTeamId(r.data[0].id); }); }, [auctionId]);

  useEffect(() => {
    const s = getSocket();
    s.emit('join_auction', { auction_id: auctionId });
    s.on('bid', ({bid, team}) => { setBid(bid.amount); setTeam(team); });
    s.on('next_player', ({player, base_price}) => { setPlayer(player); setBid(base_price); setTeam(null); });
    s.on('sold', () => { setPlayer(null); api.get(`/teams?auction_id=${auctionId}`).then(r=>setTeams(r.data)); });
    return () => s.emit('leave_auction', { auction_id: auctionId });
  }, [auctionId]);

  const remoteBid = () => {
    if (!player || !selectedTeamId) return;
    const s = getSocket();
    s.emit('remote_bid', { auction_id: auctionId, team_id: selectedTeamId, amount: bid + 50000 });
    toast({ title: 'Bid sent!', description: 'Coordinator has been notified.' });
  };

  const my = teams.find(t=>t.id===selectedTeamId);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col max-w-md mx-auto">
      <header className="border-b border-white/10 p-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center"><Zap className="w-4 h-4 text-white" fill="white"/></div>
          <div className="font-display text-lg">OWNER VIEW</div>
        </Link>
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs"><span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1 animate-pulse"/> LIVE</Badge>
      </header>
      <main className="flex-1 p-4 space-y-4 overflow-auto">
        <Card className="bg-white/[0.03] border border-white/10 p-3 rounded-xl">
          <label className="text-xs uppercase text-white/50 tracking-widest">Playing as</label>
          <select value={selectedTeamId} onChange={e=>setSelectedTeamId(e.target.value)} className="mt-1 w-full h-10 rounded bg-white/5 border border-white/10 text-white px-3">
            {teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {my && (
            <div className="mt-3 flex justify-between text-sm">
              <span className="text-white/60">Purse</span>
              <span className="text-orange-400 font-semibold">₹{Number(my.purse).toLocaleString('en-IN')}</span>
            </div>
          )}
        </Card>

        <Card className="bg-gradient-to-b from-orange-500/10 to-transparent border-orange-500/30 p-5 rounded-2xl text-center">
          {player ? (
            <>
              <div className="text-xs uppercase tracking-widest text-orange-400">Incoming</div>
              <div className="font-display text-3xl mt-1">{player.name}</div>
              <div className="text-white/60 text-sm">{player.role}</div>
              <div className="mt-4 font-display text-4xl brand-gradient-text">₹{Number(bid).toLocaleString('en-IN')}</div>
              {team && <div className="text-xs text-orange-300 mt-1">Leading: {team.name}</div>}
            </>
          ) : <div className="text-white/50 font-display text-xl">WAITING FOR PLAYER...</div>}
        </Card>

        <div>
          <div className="text-xs uppercase text-white/50 tracking-widest mb-2 flex items-center gap-1"><Users className="w-3 h-3"/> My Squad ({my?.squad_count || 0})</div>
          <Card className="bg-white/[0.03] border border-white/10 p-4 text-center text-white/50 text-sm">Squad list will appear here as you win players.</Card>
        </div>
      </main>
      <footer className="p-4 border-t border-white/10 bg-black/60 backdrop-blur">
        <Button data-testid="remote-bid-btn" onClick={remoteBid} disabled={!player} className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white">
          <DollarSign className="w-5 h-5 mr-2"/> BID +₹50K
        </Button>
      </footer>
    </div>
  );
}
