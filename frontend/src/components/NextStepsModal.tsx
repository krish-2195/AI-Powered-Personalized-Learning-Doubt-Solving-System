import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, PlayCircle, BookOpen, Brain, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface NextStep {
  topic: string;
  action: string;
  title: string;
  rationale: string;
  estimated_time_minutes: number;
}

interface NextStepsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | number;
}

export default function NextStepsModal({ isOpen, onClose, userId }: NextStepsModalProps) {
  const [steps, setSteps] = useState<NextStep[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.get(`/api/learning/next-steps/${userId}`)
        .then((res: any) => {
          setSteps(res.data.data || []);
        })
        .catch((err: any) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [isOpen, userId]);

  const handleAction = (step: NextStep) => {
    onClose();
    if (step.action === 'Watch Video') {
      navigate('/learning');
    } else if (step.action === 'Take Quiz') {
      navigate('/chat');
    } else {
      navigate('/chat');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-surface-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-white/5 bg-gradient-to-r from-primary-500/10 to-accent-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary-500/20 text-primary-400 rounded-xl">
                    <Sparkles size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">What's Next?</h2>
                    <p className="text-sm text-slate-400">AI-powered learning recommendations</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-400">Analyzing your performance...</p>
                </div>
              ) : steps.length > 0 ? (
                steps.map((step, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => handleAction(step)}
                    className="group relative p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-primary-500/30 transition-all cursor-pointer flex gap-4 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500/0 via-primary-500/0 to-primary-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="mt-1 shrink-0">
                      {step.action === 'Watch Video' ? <PlayCircle className="text-blue-400" size={24} /> :
                       step.action === 'Take Quiz' ? <Brain className="text-purple-400" size={24} /> :
                       <BookOpen className="text-emerald-400" size={24} />}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-semibold text-slate-200 group-hover:text-primary-300 transition-colors">
                          {step.title}
                        </h3>
                        <span className="flex items-center gap-1 text-xs text-slate-500 bg-white/5 px-2 py-1 rounded-md">
                          <Clock size={12} /> {step.estimated_time_minutes}m
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">{step.rationale}</p>
                      <span className="text-xs font-bold uppercase tracking-wider text-primary-500/70 group-hover:text-primary-400 transition-colors">
                        {step.action} &rarr;
                      </span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400">
                  No recommendations right now. Great job keeping up!
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
