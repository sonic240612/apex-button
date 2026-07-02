'use client';

import { useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import { motion, AnimatePresence } from 'framer-motion';

type GameState = 'cooldown' | 'active' | 'decision';

interface Winner {
  name: string;
  country: string;
  reactionTime: number;
  timestamp: string;
}

export default function Home() {
  const [profile, setProfile] = useState<{ name: string; country: string } | null>(null);
  const [form, setForm] = useState({ name: '', country: '' });
  const [state, setState] = useState<GameState>('cooldown');
  const [timer, setTimer] = useState<number>(0);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [history, setHistory] = useState<Winner[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    socket.connect();

    socket.on('init_data', ({ state, timer, winners, currentWinner }) => {
      setState(state as GameState);
      setTimer(parseInt(timer));
      setHistory(winners);
      setWinner(currentWinner);
    });

    socket.on('tick', ({ state, timer }) => {
      setState(state as GameState);
      setTimer(parseInt(timer));
    });

    socket.on('state_change', ({ state, timer }) => {
      setState(state as GameState);
      if (timer) setTimer(timer);
    });

    socket.on('winner_decided', ({ winner }) => {
      setWinner(winner);
      setHistory(prev => [winner, ...prev].slice(0, 10));
      setState('decision');
    });

    socket.on('click_failed', (msg) => {
      setError(msg);
      setTimeout(() => setError(''), 2000);
    });

    socket.on('error', (msg) => {
      setError(msg);
      setTimeout(() => setError(''), 2000);
    });

    return () => {
      socket.off('init_data');
      socket.off('tick');
      socket.off('state_change');
      socket.off('winner_decided');
      socket.off('click_failed');
      socket.off('error');
      socket.disconnect();
    };
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Date unknown';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleString('ko-KR', {
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.country) return;
    
    setProfile(form);
    socket.emit('join', form);
  };

  const handleClick = () => {
    socket.emit('click');
  };

  return (
    <main className="flex min-h-screen relative overflow-hidden bg-zinc-950 text-white font-sans">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-800/20 via-zinc-950 to-zinc-950 pointer-events-none" />

      {!profile && (
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md p-8 bg-zinc-900/90 rounded-3xl border border-zinc-800 shadow-2xl"
            >
              <h1 className="text-4xl font-black mb-2 text-center bg-gradient-to-r from-yellow-400 to-amber-600 bg-clip-text text-transparent">APEX BUTTON</h1>
              <p className="text-zinc-400 text-center text-sm mb-8">전 세계 단 하나의 권한을 얻기 위해 프로필을 입력하세요.</p>
              
              <div className="mb-6 space-y-4">
                {state === 'cooldown' && (
                  <div className="text-center bg-black/40 border border-zinc-800 p-4 rounded-2xl">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-1">Next Button in</span>
                    <span className="text-4xl font-black font-mono text-yellow-500 tabular-nums">
                      {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}
                {state === 'active' && (
                  <div className="text-center bg-red-950/30 border border-red-900/50 p-4 rounded-2xl animate-pulse">
                    <span className="text-xs font-bold text-red-500 block">🚨 버튼 활성화 상태 🚨</span>
                    <span className="text-xs text-zinc-400 block mt-1">지금 입장하면 즉시 버튼을 누를 수 있습니다!</span>
                  </div>
                )}
              </div>

              <form onSubmit={handleJoin} className="space-y-4">
                <input 
                  type="text" 
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-4 bg-zinc-950 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none text-white transition-all"
                  placeholder="Nickname"
                  required
                />
                <input 
                  type="text" 
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full p-4 bg-zinc-950 border border-zinc-700 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none text-white transition-all"
                  placeholder="Country"
                  required
                />
                <button 
                  type="submit" 
                  className="w-full py-4 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-black font-black rounded-xl transition-all shadow-lg shadow-yellow-900/20"
                >
                  ENTER ARENA
                </button>
              </form>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      {error && (
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-10 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-red-900/50"
        >
          {error}
        </motion.div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center p-4 z-10">
        <AnimatePresence mode="wait">
          {state === 'cooldown' && (
            <motion.div key="cooldown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-4">
              <h2 className="text-zinc-500 text-sm uppercase tracking-widest font-bold">Next Apex Arrival</h2>
              <div className="text-9xl font-black font-mono tabular-nums text-yellow-500/90 tracking-tighter drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
              </div>
              <p className="text-zinc-600 font-medium">숨죽이고 기다리십시오.</p>
            </motion.div>
          )}

          {state === 'active' && (
            <motion.div key="active" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="text-center space-y-12">
              <h2 className="text-red-500 text-5xl font-black animate-pulse drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">THE BUTTON IS ACTIVE!</h2>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClick}
                className="w-72 h-72 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 text-black text-5xl font-black shadow-[0_0_80px_rgba(217,119,6,0.5)] transition-transform border-4 border-yellow-300"
              >
                CLICK!!
              </motion.button>
            </motion.div>
          )}

          {state === 'decision' && winner && (
            <motion.div key="decision" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center space-y-6">
              <h2 className="text-yellow-500 text-7xl font-black drop-shadow-[0_0_30px_rgba(234,179,8,0.4)]">NEW SOVEREIGN</h2>
              <div className="p-10 bg-zinc-900/50 backdrop-blur border border-yellow-500/30 rounded-3xl shadow-2xl">
                <div className="text-6xl font-bold mb-2">{winner.name}</div>
                <div className="text-3xl text-zinc-400 mb-4">{winner.country}</div>
                <div className="text-2xl text-yellow-500 font-mono mb-2">{winner.reactionTime}ms</div>
                <div className="text-sm text-zinc-600 font-mono">{formatDate(winner.timestamp)}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <aside className="w-96 bg-zinc-900/30 border-l border-zinc-800/50 p-8 flex flex-col backdrop-blur-2xl z-20 shadow-[-20px_0_40px_rgba(0,0,0,0.3)]">
        <h3 className="text-yellow-500 text-sm font-black mb-8 uppercase tracking-widest">Hall of Fame</h3>
        
        {winner ? (
          <div className="mb-10 p-5 bg-gradient-to-br from-zinc-800 to-zinc-900 border border-yellow-500/20 rounded-2xl">
            <span className="text-[10px] text-yellow-500 font-bold uppercase block mb-2 tracking-widest">Current Sovereign</span>
            <div className="text-2xl font-bold">{winner.name}</div>
            <div className="text-sm text-zinc-400">{winner.country} • {winner.reactionTime}ms</div>
            <div className="text-xs text-zinc-600 mt-2 font-mono">{formatDate(winner.timestamp)}</div>
          </div>
        ) : (
          <div className="mb-10 p-5 bg-zinc-900/50 rounded-2xl text-zinc-500 text-sm text-center border border-zinc-800">
            아직 지배자가 없습니다.
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
          <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-4 tracking-widest">Recent Legends</span>
          {history.map((w, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between p-4 bg-zinc-900/40 rounded-xl border border-zinc-800/50">
              <div className="flex flex-col">
                <span className="font-semibold text-sm">{w.name}</span>
                <span className="text-[10px] text-zinc-500">{w.country} • {formatDate(w.timestamp)}</span>
              </div>
              <div className="text-sm font-mono text-yellow-500/90">{w.reactionTime}ms</div>
            </motion.div>
          ))}
        </div>

        <button 
          onClick={() => setProfile(null)}
          className="mt-6 w-full py-3 text-xs font-bold text-zinc-500 hover:text-white bg-zinc-800/50 rounded-xl transition-all hover:bg-zinc-700"
        >
          EDIT PROFILE
        </button>
      </aside>
    </main>
  );
}
