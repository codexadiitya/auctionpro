import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, BACKEND } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Zap, Sparkles, DollarSign, X, ChevronRight, Users, Trophy, Timer, Volume2, VolumeX, Shield, Award } from 'lucide-react';
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
  const [soldStatusOverlay, setSoldStatusOverlay] = useState(null); // 'sold' | 'unsold'
  const [activeTab, setActiveTab] = useState('teams'); // 'teams' | 'players'
  const [soundEnabled, setSoundEnabled] = useState(true);
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
    s.on('bid', ({ bid, team }) => {
      setCurrentBid(bid.amount);
      setCurrentTeam(team);
      setTimer(15);
      setSoldStatusOverlay(null);
    });
    s.on('next_player', ({ player, base_price }) => {
      setCurrentPlayer(player);
      setCurrentBid(base_price);
      setCurrentTeam(null);
      setSoldStatusOverlay(null);
      setTimer(15);
    });
    s.on('sold', ({ player, team, price }) => {
      setSoldStatusOverlay('sold');
      fireworks();
      toast({ title: `🎉 ${player.name} SOLD!`, description: `Bought by ${team.name} for ₹${price.toLocaleString('en-IN')}` });
      load();
    });
    s.on('unsold', () => {
      setSoldStatusOverlay('unsold');
      toast({ title: 'Player Unsold', description: 'Moved to unsold pool.', variant: 'destructive' });
      load();
    });
    return () => s.emit('leave_auction', { auction_id: id });
  }, [id]);

  // Timer countdown
  useEffect(() => {
    if (!currentPlayer || soldStatusOverlay) return;
    timerRef.current = setInterval(() => {
      setTimer(t => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentPlayer, soldStatusOverlay]);

  const registeredPlayers = useMemo(() => players.filter(p=>p.status==='registered'), [players]);
  const soldPlayers = useMemo(() => players.filter(p=>p.status==='sold'), [players]);
  const unsoldPlayers = useMemo(() => players.filter(p=>p.status==='unsold'), [players]);

  const setNext = async (p) => {
    try {
      await api.post('/auction/next', { auction_id: id, player_id: p.id });
    } catch (err) {
      toast({ title: 'Failed to select player', description: err?.response?.data?.detail || 'Try again', variant: 'destructive' });
    }
  };

  const placeBid = async (teamId, amt) => {
    try {
      await api.post('/bids', { auction_id: id, player_id: currentPlayer.id, team_id: teamId, amount: amt });
    } catch (err) {
      toast({ title: 'Bid rejected', description: err?.response?.data?.detail || 'Could not place bid', variant: 'destructive' });
    }
  };

  const sold = async () => {
    if (!currentTeam || !currentPlayer) return;
    try {
      await api.post('/auction/sold', { auction_id: id, player_id: currentPlayer.id, team_id: currentTeam.id, price: currentBid });
    } catch (err) {
      toast({ title: 'Action failed', description: err?.response?.data?.detail, variant: 'destructive' });
    }
  };

  const unsold = async () => {
    if (!currentPlayer) return;
    try {
      await api.post('/auction/unsold', { auction_id: id, player_id: currentPlayer.id });
    } catch (err) {
      toast({ title: 'Action failed', description: err?.response?.data?.detail, variant: 'destructive' });
    }
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
    <div className="min-h-screen bg-[#060812] text-white select-none">
      {/* ── Top TV Broadcast Header Bar ── */}
      <header className="border-b border-white/10 bg-[#0a0f24] backdrop-blur sticky top-0 z-30">
        <div className="max-w-[1700px] mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Trophy className="w-5 h-5 text-white"/>
            </div>
            <div>
              <div className="font-display text-2xl tracking-wider text-white leading-tight uppercase">{auction.name}</div>
              <div className="text-[11px] text-orange-400 font-semibold tracking-widest uppercase">{auction.sport} LEAGUE AUCTION</div>
            </div>
          </div>

          {/* Center Broadcast Counters: SOLD, UNSOLD, AVAILABLE */}
          <div className="flex items-center gap-2">
            <div className="bg-emerald-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow">
              <span>SOLD :</span> <span className="text-sm font-black">{soldPlayers.length}</span>
            </div>
            <div className="bg-rose-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow">
              <span>UNSOLD :</span> <span className="text-sm font-black">{unsoldPlayers.length}</span>
            </div>
            <div className="bg-amber-500/90 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow">
              <span>AVL :</span> <span className="text-sm font-black">{registeredPlayers.length}</span>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="ml-2 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/80 transition"
              title="Toggle Audio"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
            </button>
          </div>

          {/* Right Action / Tabs */}
          <div className="flex items-center gap-2">
            <div className="bg-white/10 p-1 rounded-xl flex gap-1">
              <button
                onClick={() => setActiveTab('teams')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition uppercase tracking-wider ${activeTab === 'teams' ? 'bg-amber-400 text-slate-950 shadow' : 'text-white/70 hover:text-white'}`}
              >
                TEAMS ({teams.length})
              </button>
              <button
                onClick={() => setActiveTab('players')}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition uppercase tracking-wider ${activeTab === 'players' ? 'bg-amber-400 text-slate-950 shadow' : 'text-white/70 hover:text-white'}`}
              >
                PLAYERS ({players.length})
              </button>
            </div>
            <Link to={`/auction/${id}/live`} target="_blank" className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow ml-2">
              <span className="w-2 h-2 rounded-full bg-white animate-ping"/> LIVE TV VIEW
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main Auction Arena Layout ── */}
      <main className="max-w-[1700px] mx-auto p-4 lg:p-6 grid lg:grid-cols-[1fr_420px] gap-6">

        {/* ── Left Column: Live Player on Block ── */}
        <section className="space-y-4">
          <Card className="relative bg-[#0d142d] border border-blue-900/40 p-6 rounded-3xl overflow-hidden shadow-2xl">
            {currentPlayer ? (
              <div className="relative">
                {/* Lot / Sequence Number Badge (Yellow Square at top-left) */}
                <div className="absolute -top-2 -left-2 bg-amber-400 text-slate-950 font-black text-2xl w-12 h-12 flex items-center justify-center rounded-xl shadow-lg z-20 border-2 border-slate-950">
                  {currentPlayer.lot_number || 1}
                </div>

                <div className="grid md:grid-cols-[240px_1fr] gap-6 items-center pt-3">
                  {/* Player Photo with Frame */}
                  <div className="relative w-56 h-56 mx-auto rounded-2xl overflow-hidden border-4 border-amber-400/80 bg-slate-900 shadow-2xl">
                    {currentPlayer.photo_url ? (
                      <img src={`${BACKEND}${currentPlayer.photo_url}`} alt={currentPlayer.name} className="w-full h-full object-cover"/>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-display text-8xl text-amber-400 bg-gradient-to-t from-slate-950 to-slate-800">
                        {currentPlayer.name?.[0]}
                      </div>
                    )}
                  </div>

                  {/* Player Specifications */}
                  <div className="space-y-2">
                    <div className="text-amber-400 text-xs uppercase tracking-[0.3em] font-extrabold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/> ON THE AUCTION BLOCK
                    </div>
                    <h1 className="font-display text-5xl text-white tracking-wide uppercase leading-tight">
                      {currentPlayer.name}
                    </h1>

                    <div className="space-y-1 text-xs text-slate-300 font-semibold tracking-wider uppercase">
                      <div><span className="text-slate-400">ROLE:</span> <span className="text-white font-bold">{currentPlayer.role || 'ALL ROUNDER'}</span></div>
                      <div><span className="text-slate-400">BAT:</span> <span className="text-white font-bold">{currentPlayer.batting_style || 'RIGHT HAND BATSMAN'}</span></div>
                      <div><span className="text-slate-400">BOWL:</span> <span className="text-white font-bold">{currentPlayer.bowling_style || 'RIGHT ARM MEDIUM'}</span></div>
                      <div><span className="text-slate-400">AGE:</span> <span className="text-white font-bold">{currentPlayer.age || 21} YRS</span></div>
                    </div>

                    {/* Price & Timer Grid */}
                    <div className="grid grid-cols-3 gap-3 pt-3">
                      <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-3">
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Base Price</div>
                        <div className="font-display text-2xl text-white mt-0.5">₹{Number(currentPlayer.base_price).toLocaleString('en-IN')}</div>
                      </div>
                      <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/50 rounded-2xl p-3">
                        <div className="text-[10px] text-amber-300 uppercase tracking-widest font-bold">Current Bid</div>
                        <div className="font-display text-2xl text-amber-300 mt-0.5">₹{Number(currentBid).toLocaleString('en-IN')}</div>
                      </div>
                      <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-3">
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold flex items-center gap-1"><Timer className="w-3 h-3 text-amber-400"/> Clock</div>
                        <div className="font-display text-2xl text-white mt-0.5">{timer}s</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Leading Bid Team Banner at Bottom ── */}
                <div className="mt-6 bg-gradient-to-r from-red-700 via-rose-600 to-red-700 rounded-2xl p-3 flex items-center justify-between border border-red-500/40 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-bold text-lg text-white border border-white/30">
                      {currentTeam ? currentTeam.name[0] : '—'}
                    </div>
                    <div>
                      <div className="text-[10px] text-red-200 uppercase tracking-widest font-extrabold">CURRENT LEADING BIDDER</div>
                      <div className="text-xl font-black text-white uppercase tracking-wider">{currentTeam ? currentTeam.name : 'NO BIDS YET'}</div>
                    </div>
                  </div>
                  <div className="font-display text-3xl font-black text-amber-300 px-4">
                    ₹{Number(currentBid).toLocaleString('en-IN')}
                  </div>
                </div>

                {/* ── RUBBER STAMP OVERLAYS (SOLD / UNSOLD) ── */}
                {soldStatusOverlay === 'sold' && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-3xl flex items-center justify-center z-30 animate-in zoom-in-75 duration-200">
                    <div className="border-8 border-emerald-500 text-emerald-400 text-6xl md:text-8xl font-black px-8 py-4 uppercase tracking-wider rounded-3xl transform -rotate-12 shadow-2xl bg-emerald-950/80 backdrop-blur">
                      SOLD!
                      <div className="text-2xl text-white font-bold text-center mt-2 font-sans tracking-normal">{currentTeam?.name} • ₹{currentBid.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                )}
                {soldStatusOverlay === 'unsold' && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-3xl flex items-center justify-center z-30 animate-in zoom-in-75 duration-200">
                    <div className="border-8 border-rose-600 text-rose-500 text-5xl md:text-7xl font-black px-8 py-4 uppercase tracking-wider rounded-3xl transform -rotate-12 shadow-2xl bg-rose-950/80 backdrop-blur text-center">
                      REMAINS<br/>UNSOLD
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                <Trophy className="w-16 h-16 mx-auto text-amber-400 mb-4 animate-bounce"/>
                <div className="font-display text-4xl text-white">SELECT A PLAYER TO START</div>
                <p className="text-slate-400 mt-2 text-sm">Pick a registered player from the pool list below to place on the auction block.</p>
              </div>
            )}
          </Card>

          {/* Coordinator Action Buttons */}
          {isCoordinator && currentPlayer && (
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl flex flex-wrap gap-3 items-center justify-between">
              <div className="text-xs text-slate-400 font-semibold">COORDINATOR CONTROLS</div>
              <div className="flex gap-2">
                <Button data-testid="mark-sold-btn" onClick={sold} disabled={!currentTeam} className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6">
                  <Sparkles className="w-4 h-4 mr-2"/> MARK SOLD
                </Button>
                <Button data-testid="mark-unsold-btn" onClick={unsold} variant="outline" className="border-rose-600/60 text-rose-400 hover:bg-rose-950/50">
                  MARK UNSOLD
                </Button>
              </div>
            </div>
          )}

          {/* Quick Bid Increments (for testing or manual push) */}
          {isCoordinator && currentPlayer && teams.length > 0 && (
            <Card className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
              <div className="text-xs text-amber-400 font-bold uppercase tracking-wider mb-2">QUICK BID INCREMENTS FOR TEAMS:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {teams.slice(0, 4).map(t => (
                  <Button
                    key={t.id}
                    size="sm"
                    onClick={() => placeBid(t.id, currentBid + 50000)}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs border border-slate-700 truncate"
                  >
                    +50k ({t.name})
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {/* Player Pool Table / Grid */}
          <Card className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl">
            <h3 className="font-display text-2xl text-white mb-4">REGISTERED PLAYERS POOL ({registeredPlayers.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
              {registeredPlayers.map(p => (
                <div
                  key={p.id}
                  onClick={() => isCoordinator && setNext(p)}
                  className="bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/50 p-3 rounded-xl cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <div className="text-white font-bold text-sm">{p.name}</div>
                    <div className="text-slate-400 text-xs">{p.role} • ₹{Number(p.base_price).toLocaleString('en-IN')}</div>
                  </div>
                  {isCoordinator && (
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs">
                      Auction
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ── Right Column: Teams Grid & Budget Breakdown ── */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl text-white">TEAMS & PURSES</h3>
            <Badge className="bg-amber-400/10 text-amber-300 border-amber-400/20">{teams.length} TEAMS</Badge>
          </div>

          <div className="space-y-3 max-h-[800px] overflow-y-auto pr-1">
            {teams.map((t) => {
              const maxBid = Math.max(0, t.purse - 5500);
              const reserve = 5500;
              const isLeading = currentTeam?.id === t.id;

              return (
                <Card
                  key={t.id}
                  className={`p-4 rounded-2xl border transition-all ${isLeading ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/10 border-amber-400 shadow-xl' : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'}`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-700 flex items-center justify-center font-bold text-amber-400 text-lg shadow">
                        {t.name[0]}
                      </div>
                      <div>
                        <div className="font-bold text-white text-base leading-tight">{t.name}</div>
                        <div className="text-xs text-slate-400">Owner: {t.owner_name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display text-2xl text-amber-300">₹{Number(t.purse).toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Remaining Purse</div>
                    </div>
                  </div>

                  {/* Team Stats Grid (Max Bid, Reserve, Squad) */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Players</div>
                      <div className="font-bold text-white text-sm mt-0.5">{t.squad_count || 0}</div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Max Bid</div>
                      <div className="font-bold text-white text-sm mt-0.5">₹{maxBid.toLocaleString('en-IN')}</div>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-emerald-400 font-bold uppercase">Res</div>
                      <div className="font-bold text-emerald-400 text-sm mt-0.5">₹{reserve.toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  {/* Bid Button for Coordinator */}
                  {isCoordinator && currentPlayer && (
                    <Button
                      onClick={() => placeBid(t.id, currentBid + 50000)}
                      disabled={t.purse < currentBid + 50000}
                      className="w-full mt-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl"
                    >
                      Bid +₹50k for {t.name}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
