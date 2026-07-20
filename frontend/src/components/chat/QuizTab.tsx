import { Sparkles, CheckCircle2, XCircle, Target, BookOpen } from 'lucide-react'
import { useState, useEffect } from 'react'
import api from '../../lib/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { QuizQuestion } from '../../types/chat'

interface QuizTabProps {
  isBaseline: boolean
  isGeneratingQuiz: boolean
  quizQuestions: QuizQuestion[]
  selectedAnswers: Record<number, number>
  quizDifficulty: string
  quizCount: number
  detectedTopic: string
  quizScore: number
  quizDone: boolean
  hasSubmitted?: boolean
  isSubmittingQuiz?: boolean
  quizMLResult?: string | null
  onSelectAnswer: (qIdx: number, optIdx: number) => void
  onSetDifficulty: (d: string) => void
  onSetCount: (c: number) => void
  onGenerateQuiz: () => void
  onSubmitQuiz?: () => void
  onBackToChat: () => void
}

export default function QuizTab({
  isBaseline, isGeneratingQuiz, quizQuestions, selectedAnswers,
  quizDifficulty, quizCount, detectedTopic, quizScore, quizDone, hasSubmitted, isSubmittingQuiz, quizMLResult,
  onSelectAnswer, onSetDifficulty, onSetCount, onGenerateQuiz, onSubmitQuiz, onBackToChat,
}: QuizTabProps) {
  const [prerequisites, setPrerequisites] = useState<string[]>([])
  
  useEffect(() => {
    if (hasSubmitted && quizQuestions.length > 0) {
      const scorePercentage = quizScore / quizQuestions.length;
      if (scorePercentage < 0.6 && detectedTopic) {
        api.get(`/api/learning/topic/${encodeURIComponent(detectedTopic)}/prerequisites`)
          .then((res: any) => {
            setPrerequisites(res.data.data?.prerequisites || []);
          })
          .catch((err: any) => console.error(err));
      }
    }
  }, [hasSubmitted, quizScore, quizQuestions.length, detectedTopic]);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-8 custom-scrollbar relative">
      {!isBaseline && (
        <button
          onClick={onBackToChat}
          className="absolute top-8 left-8 text-slate-400 hover:text-white flex items-center gap-2 text-sm font-semibold transition-colors"
        >
          ← Back to Chat
        </button>
      )}

      <div className="max-w-[850px] mx-auto mt-10">
        {/* Loading state */}
        {isGeneratingQuiz ? (
          <div className="h-64 flex flex-col items-center justify-center gap-5 text-slate-400 mt-20">
            <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-medium text-slate-300">Generating personalized quiz...</p>
          </div>

        ) : quizQuestions.length === 0 ? (
          /* Empty state — quiz configurator */
          <div className="max-w-md mx-auto mt-10 p-8 rounded-[24px] bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 border border-white/[0.08] shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <Target className="text-accent-400" size={24} />
              <h2 className="text-xl font-bold text-white">No active quiz</h2>
            </div>
            <p className="text-slate-400 mb-8 text-sm">Configure and generate a personalized practice quiz based on your weak topics.</p>

            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Difficulty</label>
            <div className="flex gap-2 mb-8">
              {['Easy', 'Medium', 'Hard'].map(d => (
                <button
                  key={d}
                  onClick={() => onSetDifficulty(d)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${quizDifficulty === d
                    ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-900/20'
                    : 'bg-surface-800 border-white/[0.08] text-slate-400 hover:border-primary-500/40'}`}
                >
                  {d}
                </button>
              ))}
            </div>

            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">Questions</label>
            <div className="flex gap-2 mb-10">
              {[5, 10, 20].map(c => (
                <button
                  key={c}
                  onClick={() => onSetCount(c)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${quizCount === c
                    ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-900/20'
                    : 'bg-surface-800 border-white/[0.08] text-slate-400 hover:border-primary-500/40'}`}
                >
                  {c}
                </button>
              ))}
            </div>

            <button
              onClick={onGenerateQuiz}
              className="w-full py-4 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl shadow-lg shadow-primary-900/20 transition-all flex justify-center items-center gap-2"
            >
              <Sparkles size={18} /> Generate personalized quiz
            </button>
          </div>

        ) : (
          /* Quiz questions */
          <div className="space-y-6 pb-10">
            {/* Header bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-6 rounded-2xl border border-white/[0.08] mb-6 gap-4">
              <div className="flex-1 w-full">
                <h2 className="text-2xl font-bold text-white">Practice Quiz</h2>
                <p className="text-slate-400 mt-1">Topic: <span className="font-semibold text-slate-300">{detectedTopic}</span></p>
              </div>
              <div className="flex-1 w-full md:text-right">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Question {Object.keys(selectedAnswers).length === quizQuestions.length
                    ? quizQuestions.length
                    : Object.keys(selectedAnswers).length + 1} of {quizQuestions.length}
                </p>
                <div className="h-2 w-full md:w-48 md:ml-auto bg-surface-800 rounded-full overflow-hidden flex mb-1">
                  <div
                    className="h-full bg-primary-500 transition-all duration-500"
                    style={{ width: `${(Object.keys(selectedAnswers).length / quizQuestions.length) * 100}%` }}
                  />
                </div>
                {hasSubmitted && <p className="text-sm font-bold text-slate-300 mt-2">Score: {quizScore}/{quizQuestions.length}</p>}
              </div>
            </div>

            {/* ML Prediction Result */}
            {hasSubmitted && quizMLResult && (
              <div className={`p-4 rounded-xl border flex items-center gap-3 mb-6 ${
                quizMLResult === 'Strong' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                quizMLResult === 'Moderate' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                <Sparkles className="shrink-0" size={20} />
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider opacity-80 mb-0.5">AI Mastery Prediction</p>
                  <p className="text-base font-medium">Your current mastery level is <strong className="text-white">{quizMLResult}</strong></p>
                </div>
              </div>
            )}

            {/* Prerequisite Context on Failure */}
            {hasSubmitted && quizQuestions.length > 0 && (quizScore / quizQuestions.length) < 0.6 && prerequisites.length > 0 && (
              <div className="p-5 rounded-2xl border border-blue-500/30 bg-blue-500/10 mb-6 flex gap-4">
                <div className="shrink-0 mt-1">
                  <BookOpen className="text-blue-400" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-blue-300 mb-1">Struggling with {detectedTopic}?</h3>
                  <p className="text-sm text-blue-200/80 mb-3">
                    Our AI tutor noticed you might have gaps in the fundamental prerequisites. Before trying again, consider reviewing:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {prerequisites.map((prereq, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold">
                        {prereq}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Question cards */}
            {quizQuestions.map((item, idx) => {
              const picked = selectedAnswers[idx]
              const correct = picked === item.answer_index
              return (
                <div key={idx} className="bg-surface-850/60 backdrop-blur-xl backdrop-saturate-150 p-6 rounded-2xl border border-white/[0.08] space-y-4">
                  <div className="pb-4 border-b border-white/[0.08]/80">
                    <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mb-3">Question {idx + 1} of {quizQuestions.length}</p>
                    <p className="font-semibold text-lg text-slate-200 break-words leading-relaxed pl-4 border-l-2 border-primary-500">
                      {item.question}
                    </p>
                  </div>

                  <div className="space-y-3 mt-4">
                    {(item.options ?? []).map((opt, optIdx) => {
                      const isCorrect = optIdx === item.answer_index
                      const isPicked = optIdx === picked
                      let cls = 'text-[14px] px-5 py-3.5 rounded-xl border w-full text-left transition-all flex items-center gap-3 font-medium '
                      if (!hasSubmitted) {
                        cls += 'border-white/[0.08] hover:bg-surface-800 hover:border-white/10 cursor-pointer text-slate-300 ' + (isPicked ? 'bg-primary-500/20 border-primary-500/50' : 'bg-transparent')
                      } else if (isCorrect) {
                        cls += 'border-green-500/50 bg-green-500/10 text-green-400'
                      } else if (isPicked) {
                        cls += 'border-red-500/50 bg-red-500/10 text-red-400'
                      } else {
                        cls += 'border-white/[0.06] text-slate-600 bg-transparent cursor-default'
                      }
                      return (
                        <button
                          key={optIdx}
                          className={cls}
                          disabled={hasSubmitted}
                          onClick={() => onSelectAnswer(idx, optIdx)}
                        >
                          <span className={`w-6 h-6 rounded-full border text-[12px] flex items-center justify-center shrink-0 font-bold ${
                            !hasSubmitted ? (isPicked ? 'border-primary-500 bg-primary-500 text-white' : 'border-white/10 text-slate-500') :
                            isCorrect ? 'border-green-500 bg-green-500 text-white' :
                            isPicked ? 'border-red-500 bg-red-500 text-white' :
                            'border-white/[0.08] text-slate-700'
                          }`}>
                            {hasSubmitted && isCorrect ? <CheckCircle2 size={14} /> :
                             hasSubmitted && isPicked ? <XCircle size={14} /> :
                             String.fromCharCode(65 + optIdx)}
                          </span>
                          {opt}
                        </button>
                      )
                    })}
                  </div>

                  {hasSubmitted && (
                    <div className={`text-[14px] p-5 rounded-xl mt-4 border ${correct
                      ? 'bg-green-500/5 text-green-300 border-green-500/20'
                      : 'bg-red-500/5 text-red-300 border-red-500/20'}`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        {correct
                          ? <CheckCircle2 className="text-green-500" size={20} />
                          : <XCircle className="text-red-500" size={20} />}
                        <strong className="text-base">
                          {correct ? 'Correct!' : `Incorrect. The correct answer is Option ${String.fromCharCode(65 + item.answer_index)}.`}
                        </strong>
                      </div>
                      <div className="prose prose-invert prose-sm max-w-none opacity-90">
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {item.explanation.replace(/âœ…|â Œ/g, '').trim()}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            
            {/* Submit Button at Bottom */}
            {quizDone && !hasSubmitted && (
              <button 
                onClick={onSubmitQuiz} 
                disabled={isSubmittingQuiz}
                className="w-full py-4 mt-6 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl shadow-lg shadow-primary-900/20 transition-all flex justify-center items-center gap-2"
              >
                {isSubmittingQuiz ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Submitting Quiz...</>
                ) : (
                  <><Sparkles size={18} /> Submit Quiz for AI Evaluation</>
                )}
              </button>
            )}

            {/* Post-Submission Actions */}
            {hasSubmitted && (
              <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-white/[0.08]">
                <button
                  onClick={onBackToChat}
                  className="flex-1 py-3.5 bg-surface-800 hover:bg-surface-700 text-white font-bold rounded-xl border border-white/[0.08] transition-all flex justify-center items-center gap-2"
                >
                  Return to Chat
                </button>
                <button
                  onClick={onGenerateQuiz}
                  className="flex-1 py-3.5 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl shadow-lg shadow-primary-900/20 transition-all flex justify-center items-center gap-2"
                >
                  <Sparkles size={16} /> Practice Again
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
