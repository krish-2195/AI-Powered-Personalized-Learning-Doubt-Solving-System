import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useStreak } from '../hooks/useStreak';
import { Flame, Calendar, Trophy, Zap, X } from 'lucide-react';

export default function StreakWidget() {
  const { user } = useAuth();
  const { currentStreak, longestStreak, nextMilestone, tier } = useStreak();
  const [isOpen, setIsOpen] = useState(false);
  const [displayStreak, setDisplayStreak] = useState(currentStreak);
  const [showPlusOne, setShowPlusOne] = useState(false);

  useEffect(() => {
    if (!user) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const lastSeen = localStorage.getItem(`hasSeenStreakCounter_${user.user_id}`);
    
    if (lastSeen !== todayStr) {
      setIsOpen(true);
      setDisplayStreak(Math.max(0, currentStreak - 1));
      
      // Trigger the +1 animation after the modal opens
      setTimeout(() => {
        setShowPlusOne(true);
        setDisplayStreak(currentStreak);
      }, 800);
      
      // Hide the +1 text after a bit
      setTimeout(() => {
        setShowPlusOne(false);
      }, 2000);

      localStorage.setItem(`hasSeenStreakCounter_${user.user_id}`, todayStr);
    } else {
      setDisplayStreak(currentStreak);
    }
  }, [user, currentStreak]);

  // Determine flame colors based on tier
  const getFlameColors = () => {
    switch (tier) {
      case 'legendary': return 'text-fuchsia-500 drop-shadow-[0_0_15px_rgba(217,70,239,0.8)]';
      case 'blue': return 'text-blue-500 drop-shadow-[0_0_12px_rgba(59,130,246,0.8)]';
      case 'large': return 'text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.8)]';
      default: return 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]';
    }
  };

  const flameClasses = getFlameColors();

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full relative group"
        aria-label="View streak details"
      >
        <div className="pill w-full justify-center transition-all duration-300 hover:bg-white/[0.08] cursor-pointer hover:border-white/20">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              rotate: [-2, 2, -2]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            <Flame size={18} className={flameClasses} fill="currentColor" />
          </motion.div>
          <span className="font-bold text-white tracking-wide">{currentStreak}</span>
        </div>
      </button>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm"
            />
            <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 shadow-2xl p-6 overflow-hidden pointer-events-auto relative"
              >
                {/* Decorative background glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-gradient-to-b from-amber-500/20 to-transparent blur-2xl pointer-events-none" />

              <button 
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center mt-4 mb-8 relative z-10">
                <div className="relative">
                  <motion.div
                    animate={{ 
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    <Flame size={64} className={flameClasses} fill="currentColor" />
                  </motion.div>
                  <AnimatePresence>
                    {showPlusOne && (
                      <motion.div
                        initial={{ opacity: 0, y: 0, scale: 0.5 }}
                        animate={{ opacity: 1, y: -30, scale: 1.2 }}
                        exit={{ opacity: 0, y: -50 }}
                        className="absolute -right-4 top-0 text-xl font-black text-green-400 drop-shadow-md z-20"
                      >
                        +1
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <h2 className="text-3xl font-black text-white mt-4 flex items-center justify-center overflow-hidden h-10">
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={displayStreak}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -20, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="inline-block"
                    >
                      {displayStreak}
                    </motion.span>
                  </AnimatePresence>
                </h2>
                <p className="text-amber-400 font-semibold uppercase tracking-widest text-xs mt-1">Day Streak</p>
              </div>

              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400">
                      <Trophy size={18} />
                    </div>
                    <span className="text-slate-300 font-medium">Longest Streak</span>
                  </div>
                  <span className="text-white font-bold">{longestStreak} days</span>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
                      <Zap size={18} />
                    </div>
                    <span className="text-slate-300 font-medium">Next Milestone</span>
                  </div>
                  <span className="text-white font-bold">{nextMilestone} days</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/10 rounded-xl text-green-400">
                      <Calendar size={18} />
                    </div>
                    <span className="text-slate-300 font-medium">Last Check-in</span>
                  </div>
                  <span className="text-white font-bold">Today</span>
                </div>
              </div>

              <button 
                onClick={() => setIsOpen(false)}
                className="w-full mt-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold transition-colors"
              >
                Continue Learning
              </button>
              </motion.div>
            </div>
          </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
