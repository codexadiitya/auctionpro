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
  const [bidding, setBidding] = useState(false);

  const loadTeams = () => {
    api.get(`/teams?auction_id=${auctionId}`).then(r => {
      if (Array.isArray(r.data)) {
        setTeams(r.data);
        if (r.data[0] && !selectedTeamId) setSelectedTeamId(r.data[0].id);
      }
    });
  };

  useEffect(() => { loadTeams(); }, [auctionId]);

  useEffect(() => {
    const s = getSocket();
    s.emit('join_auction', { auction_id: auctionId });
    s.on('bid', ({ bid: newBid, team: leadingTeam }) => {
      setBid(newBid.amount);
      setTeam(leadingTeam);
    });
    s.on('next_player', ({ player: activePlayer, base_price }) => {
      setPlayer(activePlayer);
      setBid(base_price);
      setTeam(null);
    });
    s.on('sold', () => {
      setPlayer(null);
      loadTeams();
    });
    s.on('unsold', () => {
      setPlayer(null);
    });
    return () => s.emit('leave_auction', { auction_id: auctionId });
  }, [auctionId]);

  const placeBid = async () => {
    if (!player || !selectedTeamId) return;
    const myTeam = teams.find(t => t.id === selectedTeamId);
    if (!myTeam) return;

    const nextAmount = bid === 0 ? (player.base_price || 100000) : bid + 50000;
    const remainingPurse = myTeam.purse - myTeam.spent;

    if (nextAmount > remainingPurse) {
      toast({ title: 'Insufficient Purse', description: `Your remaining purse is ₹${remainingPurse.toLocaleString('en-IN')}`, variant: 'destructive' });
      return;
    }

    setBidding(true);
    try {
      await api.post('/bids', {
        auction_id: auctionId,
        player_id: player.id,
        team_id: selectedTeamId,
        amount: nextAmount
      });
      toast({ title: 'Bid Placed!', description: `Bid of ₹${nextAmount.toLocaleString('en-IN')} submitted.` });
    } catch (err) {
      toast({ title: 'Bid Rejected', description: err.userMessage || 'Could not place bid.', variant: 'destructive' });
    } finally {
      setBidding(false);
    }
  };

  const my = teams.find(t => t.id === selectedTeamId);

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
              <span className="text-white/60">Purse Remaining</span>
              <span className="text-orange-400 font-semibold">₹{(my.purse - (my.spent || 0)).toLocaleString('en-IN')}</span>
            </div>
          )}
        </Card>

        <Card className="bg-gradient-to-b from-orange-500/10 to-transparent border-orange-500/30 p-5 rounded-2xl text-center">
          {player ? (
            <>
              <div className="text-xs uppercase tracking-widest text-orange-400">Current Player</div>
              <div className="font-display text-3xl mt-1">{player.name}</div>
              <div className="text-white/60 text-sm">{player.role}</div>
              <div className="mt-4 font-display text-4xl brand-gradient-text">₹{Number(bid).toLocaleString('en-IN')}</div>
              {team && <div className="text-xs text-orange-300 mt-1">Highest Bidder: {team.name}</div>}
            </>
          ) : <div className="text-white/50 font-display text-xl">WAITING FOR NEXT PLAYER...</div>}
        </Card>
      </main>
      <footer className="p-4 border-t border-white/10 bg-black/60 backdrop-blur">
        <Button data-testid="remote-bid-btn" onClick={placeBid} disabled={!player || bidding} className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white">
          <DollarSign className="w-5 h-5 mr-2"/> {bidding ? 'Placing Bid...' : 'BID +₹50K'}
        </Button>
      </footer>
    </div>
  );
}
