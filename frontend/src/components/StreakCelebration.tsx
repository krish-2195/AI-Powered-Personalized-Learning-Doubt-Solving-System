import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useStreak } from '../hooks/useStreak';
import { Flame } from 'lucide-react';

export default function StreakCelebration() {
  const { currentStreak, hasCelebratedToday, markCelebrated } = useStreak();
  const [isVisible, setIsVisible] = useState(false);
  const [displayCount, setDisplayCount] = useState(Math.max(0, currentStreak - 1));

  useEffect(() => {
    if (!hasCelebratedToday && currentStreak > 0) {
      setIsVisible(true);
      
      // Fire confetti
      const duration = 2500;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#fbbf24', '#f59e0b', '#d97706']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#fbbf24', '#f59e0b', '#d97706']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      
      // Delay confetti slightly for the modal to appear
      setTimeout(() => requestAnimationFrame(frame), 300);

      // Animate counting up
      setTimeout(() => {
        setDisplayCount(currentStreak);
      }, 800);

      // Hide and mark after delay
      const hideTimer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => markCelebrated(), 500); // wait for exit animation
      }, 4000);

      return () => clearTimeout(hideTimer);
    }
  }, [hasCelebratedToday, currentStreak, markCelebrated]);

  if (hasCelebratedToday) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="bg-slate-900 border border-amber-500/30 shadow-[0_0_50px_rgba(245,158,11,0.2)] rounded-3xl p-8 flex flex-col items-center max-w-sm w-full mx-4 relative overflow-hidden"
          >
            {/* Inner glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/10 to-transparent pointer-events-none" />

            <motion.div
              initial={{ scale: 0.5, rotate: -15, opacity: 0 }}
              animate={{ scale: [0.5, 1.2, 1], rotate: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
            >
              <Flame size={80} className="text-amber-500 drop-shadow-[0_0_20px_rgba(245,158,11,1)]" fill="currentColor" />
            </motion.div>

            <motion.div 
              className="mt-6 flex items-baseline gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <motion.span 
                key={displayCount}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-6xl font-black text-white"
              >
                {displayCount}
              </motion.span>
              <span className="text-xl font-bold text-amber-400 uppercase tracking-widest">Day Streak</span>
            </motion.div>

            <motion.p 
              className="mt-4 text-center text-slate-300 font-medium leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              You're on fire! 🔥<br/>Keep learning today to protect your streak.
            </motion.p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
