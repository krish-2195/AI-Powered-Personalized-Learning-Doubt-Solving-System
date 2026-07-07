import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

export function useStreak() {
  const { user } = useAuth();
  const [hasCelebratedToday, setHasCelebratedToday] = useState(true); // Default true to prevent flash
  const currentStreak = user?.streak_count || 0;

  useEffect(() => {
    if (!user) return;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const lastCelebration = localStorage.getItem(`streak_celebration_${user.user_id}`);
    const isMilestone = currentStreak === 1 || (currentStreak > 0 && currentStreak % 10 === 0);

    if (lastCelebration !== todayStr && isMilestone) {
      setHasCelebratedToday(false);
    } else {
      setHasCelebratedToday(true);
    }
  }, [user, currentStreak]);

  const markCelebrated = () => {
    if (!user) return;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    localStorage.setItem(`streak_celebration_${user.user_id}`, todayStr);
    setHasCelebratedToday(true);
  };

  // Mocked extended stats for the UI
  const longestStreak = Math.max(currentStreak, currentStreak + (currentStreak % 5 === 0 ? 0 : 5 - (currentStreak % 5)));
  const nextMilestone = Math.ceil((currentStreak + 1) / 10) * 10;
  
  let tier = 'small';
  if (currentStreak >= 7) tier = 'large';
  if (currentStreak >= 30) tier = 'blue';
  if (currentStreak >= 100) tier = 'legendary';

  return {
    currentStreak,
    longestStreak,
    nextMilestone,
    hasCelebratedToday,
    markCelebrated,
    tier
  };
}
