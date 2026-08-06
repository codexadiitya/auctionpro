import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, BACKEND } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Zap, Sparkles, DollarSign, X, ChevronRight, Users, Trophy, Timer } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import confetti from 'canvas-confetti';

const BID_INCREMENTS = [50000, 100000, 200000, 500000];

function fireworks() {
  const dur = 2500, end = Date.now() + dur;
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#FF6B00','#FFB800','#ffffff'] });
    confetti({ particleCount: 6, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#FF6B00','#FFB800','#ffffff'] });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export default function AuctionRoom() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [auction, setAuction] = useState(null);
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [currentBid, setCurrentBid] = useState(0);
  const [currentTeam, setCurrentTeam] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [soldModal, setSoldModal] = useState(null);
  const [wheelOpen, setWheelOpen] = useState(false);
  const [wheelResult, setWheelResult] = useState(null);
  const [timer, setTimer] = useState(15);
  const timerRef = useRef(null);
  const isCoordinator = user?.role === 'coordinator';

  const load = async () => {
    try {
      const a = await api.get(`/auctions/${id}`).then(r=>r.data);
      setAuction(a);
      const [t, p] = await Promise.all([
        api.get(`/teams?auction_id=${id}`).then(r=>r.data),
        api.get(`/players?auction_id=${id}`).then(r=>r.data),
      ]);
      setTeams(t); setPlayers(p);
      if (a.current_player_id) {
        const cp = p.find(x=>x.id===a.current_player_id);
        if (cp) { setCurrentPlayer(cp); setCurrentBid(a.current_bid || cp.base_price); }
        if (a.current_team_id) setCurrentTeam(t.find(x=>x.id===a.current_team_id));
      }
    } catch (err) {
      setLoadError(true);
      toast({ title: 'Failed to load auction', description: 'Check your connection or try refreshing.', variant: 'destructive' });
    }
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    const s = getSocket();
    s.emit('join_auction', { auction_id: id });
    const onBid = ({ bid, team }) => { setCurrentBid(bid.amount); setCurrentTeam(team); resetTimer(); };
    const onSold = ({ player, team, price }) => { setSoldModal({ player, team, price }); fireworks(); load(); setTimeout(()=>setSoldModal(null), 4500); };
    const onUnsold = () => { toast({ title:'Player unsold' }); load(); };
    const onNext = ({ player, base_price }) => { setCurrentPlayer(player); setCurrentBid(base_price); setCurrentTeam(null); resetTimer(); };
    s.on('bid', onBid); s.on('sold', onSold); s.on('unsold', onUnsold); s.on('next_player', onNext);
    return () => { s.emit('leave_auction', { auction_id: id }); s.off('bid', onBid); s.off('sold', onSold); s.off('unsold', onUnsold); s.off('next_player', onNext); };
  }, [id]);

  const resetTimer = () => { setTimer(15); if (timerRef.current) clearInterval(timerRef.current); if (!currentPlayer) return; timerRef.current = setInterval(()=>setTimer(t=>Math.max(0,t-1)), 1000); };

  useEffect(() => { if (currentPlayer) resetTimer(); return ()=>timerRef.current && clearInterval(timerRef.current); }, [currentPlayer]);

  const registeredPlayers = useMemo(() => players.filter(p => p.status === 'registered'), [players]);

  const pickPlayer = async (p) => {
    if (!isCoordinator) return;
    await api.post('/auction/next', { auction_id: id, player_id: p.id });
  };

  // placeBid removed — coordinators must use the per-team Bid button in the sidebar
  // to avoid accidentally assigning bids to the wrong team.

  const bidForTeam = async (team) => {
    if (!currentPlayer || !isCoordinator) return;
    const amount = currentBid + BID_INCREMENTS[0];
    if (team.purse < amount) { toast({ title: 'Purse insufficient', variant: 'destructive' }); return; }
    await api.post('/bids', { auction_id: id, player_id: currentPlayer.id, team_id: team.id, amount });
  };

  const sold = async () => {
    if (!currentPlayer || !currentTeam || !isCoordinator) return;
    await api.post('/auction/sold', { auction_id: id, player_id: currentPlayer.id, team_id: currentTeam.id, price: currentBid });
  };

  const unsold = async () => {
    if (!currentPlayer || !isCoordinator) return;
    await api.post('/auction/unsold', { auction_id: id, player_id: currentPlayer.id });
    setCurrentPlayer(null); setCurrentTeam(null); setCurrentBid(0);
  };

  const spinWheel = () => {
    setWheelOpen(true);
    setWheelResult(null);
    setTimeout(() => { const t = teams[Math.floor(Math.random()*teams.length)]; setWheelResult(t); confetti({ particleCount:80, spread:60 }); }, 1600);
  };

  if (loadError) return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center gap-4">
      <div className="text-red-400 text-xl font-semibold">Failed to load auction</div>
      <p className="text-white/50">The auction may not exist or you may not have access.</p>
      <Button onClick={()=>{ setLoadError(false); load(); }} className="bg-orange-500 hover:bg-orange-600 text-white">Retry</Button>
    </div>
  );
  if (!auction) return <div className="min-h-screen bg-[#0a0a0f] text-white/60 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full mr-3"/>Loading auction...</div>;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <header className="border-b border-white/10 sticky top-0 bg-black/60 backdrop-blur z-30">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center"><Zap className="w-5 h-5 text-white" fill="white"/></div>
            <div className="font-display text-xl">AUCTION<span className="brand-gradient-text">PRO</span></div>
          </Link>
          <div className="text-center flex-1">
            <div className="font-display text-2xl tracking-wider text-white">{auction.name}</div>
            <div className="text-xs text-white/50 uppercase tracking-widest">{auction.sport} • {auction.date}</div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"/> LIVE ROOM</Badge>
            <Link to={`/auction/${id}/live`} className="text-xs text-orange-400 hover:underline">Spectator View</Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 lg:p-6 grid lg:grid-cols-[1fr_360px] gap-6">
        <section>
          <Card className="bg-gradient-to-b from-orange-500/10 to-transparent border-orange-500/30 p-6 rounded-3xl">
            {currentPlayer ? (
              <div className="grid md:grid-cols-[220px_1fr] gap-6 items-center">
                <div className="w-52 h-52 rounded-2xl overflow-hidden border-2 border-orange-500/50 bg-white/5">
                  {currentPlayer.photo_url ? <img src={`${BACKEND}${currentPlayer.photo_url}`} alt={currentPlayer.name} className="w-full h-full object-cover"/> :
                   <div className="w-full h-full flex items-center justify-center font-display text-7xl text-orange-400">{currentPlayer.name?.[0]}</div>}
                </div>
                <div>
                  <div className="text-orange-400 text-xs uppercase tracking-[0.3em] font-bold">On the block</div>
                  <div className="font-display text-5xl mt-1">{currentPlayer.name}</div>
                  <div className="text-white/60 text-sm">{currentPlayer.role} • {currentPlayer.sport} • {currentPlayer.city || '—'}</div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3"><div className="text-xs text-white/50 uppercase tracking-widest">Base</div><div className="font-display text-2xl text-white">₹{Number(currentPlayer.base_price).toLocaleString('en-IN')}</div></div>
                    <div className="bg-orange-500/15 border border-orange-500/40 rounded-xl p-3"><div className="text-xs text-orange-300 uppercase tracking-widest">Current Bid</div><div className="font-display text-2xl text-white">₹{Number(currentBid).toLocaleString('en-IN')}</div></div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3"><div className="text-xs text-white/50 uppercase tracking-widest flex items-center gap-1"><Timer className="w-3 h-3"/> Timer</div><div className="font-display text-2xl text-white">{timer}s</div></div>
                  </div>
                  {currentTeam && <div className="mt-3 text-sm text-white/70">Leading bid by <span className="text-orange-400 font-semibold">{currentTeam.name}</span></div>}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Trophy className="w-12 h-12 mx-auto text-orange-400 mb-3"/>
                <div className="font-display text-3xl text-white">SELECT A PLAYER TO START</div>
                <p className="text-white/60 mt-1">Pick a registered player from the list below.</p>
              </div>
            )}
          </Card>

          {isCoordinator && currentPlayer && (
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <span className="text-xs text-white/40 mr-1">Use team Bid buttons →</span>
              <Button data-testid="mark-sold-btn" onClick={sold} disabled={!currentTeam} className="bg-green-500 hover:bg-green-600 text-white font-bold ml-auto"><Sparkles className="w-4 h-4 mr-1"/> SOLD!</Button>
              <Button data-testid="mark-unsold-btn" onClick={unsold} variant="outline" className="border-red-500/40 text-red-400 bg-transparent">Unsold</Button>
              <Button onClick={spinWheel} variant="outline" className="border-orange-500/40 text-orange-300 bg-transparent"><Sparkles className="w-4 h-4 mr-1"/> Fortune Wheel</Button>
            </div>
          )}

          <h3 className="mt-8 mb-3 font-display text-2xl text-white">POOL <span className="brand-gradient-text">({registeredPlayers.length})</span></h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {registeredPlayers.map(p => (
              <Card key={p.id} data-testid={`pool-player-${p.id}`} onClick={()=>pickPlayer(p)}
                className={`bg-white/[0.03] border border-white/10 p-3 rounded-xl flex items-center gap-3 ${isCoordinator?'cursor-pointer hover:border-orange-500/40':''}`}>
                <div className="w-12 h-12 rounded-lg bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                  {p.photo_url ? <img src={`${BACKEND}${p.photo_url}`} alt="" className="w-full h-full object-cover"/> : <span className="font-display text-lg text-orange-400">{p.name?.[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold text-sm truncate">{p.name}</div>
                  <div className="text-xs text-white/50">{p.role} • ₹{Number(p.base_price).toLocaleString('en-IN')}</div>
                </div>
                {isCoordinator && <ChevronRight className="w-4 h-4 text-white/40"/>}
              </Card>
            ))}
          </div>
        </section>

        <aside className="space-y-3">
          <div className="text-xs uppercase tracking-widest text-white/50 mb-2 flex items-center gap-2"><Users className="w-4 h-4"/> Teams ({teams.length})</div>
          {teams.map(t => (
            <Card key={t.id} className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-10 rounded-full" style={{background:t.color}}/>
                <div className="flex-1 min-w-0">
                  <div className="text-white font-semibold truncate">{t.name}</div>
                  <div className="text-xs text-white/50">{t.owner_name}</div>
                </div>
                {isCoordinator && currentPlayer && <Button size="sm" onClick={()=>bidForTeam(t)} className="bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30"><DollarSign className="w-3 h-3 mr-1"/> Bid</Button>}
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-white/60">Purse</span>
                <span className="text-orange-400 font-semibold">₹{Number(t.purse).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-white/50 mt-1"><span>Squad</span><span>{t.squad_count || 0} players</span></div>
            </Card>
          ))}
          {teams.length === 0 && <Card className="bg-white/[0.03] border border-white/10 p-4 text-center text-white/50 text-sm">No teams yet. Add teams in Dashboard → Teams.</Card>}
        </aside>
      </main>

      {soldModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur flex items-center justify-center z-50 animate-in fade-in">
          <div className="text-center">
            <div className="font-display text-8xl brand-gradient-text drop-shadow-2xl">SOLD!</div>
            <div className="mt-4 font-display text-4xl text-white">{soldModal.player.name}</div>
            <div className="mt-2 text-2xl text-orange-300">→ {soldModal.team.name}</div>
            <div className="mt-6 font-display text-5xl text-white">₹{Number(soldModal.price).toLocaleString('en-IN')}</div>
          </div>
        </div>
      )}

      {wheelOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur flex items-center justify-center z-50" onClick={()=>setWheelOpen(false)}>
          <Card className="bg-[#0f0f14] border-orange-500/30 p-8 rounded-3xl text-center max-w-md" onClick={e=>e.stopPropagation()}>
            <div className="font-display text-3xl text-white">FORTUNE <span className="brand-gradient-text">WHEEL</span></div>
            <div className="relative mt-6 w-64 h-64 mx-auto rounded-full border-4 border-orange-500/50 overflow-hidden" style={{background:'conic-gradient(#FF6B00, #FFB800, #FF6B00, #FFB800, #FF6B00, #FFB800)'}}>
              <div className={`w-full h-full rounded-full flex items-center justify-center transition-transform duration-[1500ms] ease-out`} style={{transform: wheelResult ? 'rotate(720deg)' : 'rotate(0deg)'}}>
                <div className="text-white font-display text-2xl bg-black/60 px-4 py-2 rounded-full">{wheelResult?.name || 'Spinning...'}</div>
              </div>
            </div>
            <Button onClick={()=>setWheelOpen(false)} className="mt-6 bg-white/10 text-white hover:bg-white/20"><X className="w-4 h-4 mr-1"/> Close</Button>
          </Card>
        </div>
      )}
    </div>
  );
}
