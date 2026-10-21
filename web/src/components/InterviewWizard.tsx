import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollText,
  Send,
  RotateCcw,
  ArrowLeft,
  Loader2,
  Sparkles,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { InterviewTurn } from '../types';
import { startInterviewApi, answerInterviewApi } from '../api';

interface InterviewWizardProps {
  onComplete: (story: string) => void;
  onCancel: () => void;
}

export const InterviewWizard: React.FC<InterviewWizardProps> = ({ onComplete, onCancel }) => {
  const [sessionId, setSessionId] = useState('');
  const [question, setQuestion] = useState('');
  const [questionIndex, setQuestionIndex] = useState(1);
  const [maxQuestions, setMaxQuestions] = useState(6);
  const [minAnswers, setMinAnswers] = useState(3);
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const initInterview = async () => {
    setLoading(true);
    setError(null);
    setSessionId('');
    setQuestion('');
    setTurns([]);
    setDraft('');
    try {
      const res = await startInterviewApi();
      setSessionId(res.sessionId);
      setQuestion(res.question);
      setQuestionIndex(res.questionIndex);
      setMaxQuestions(res.maxQuestions);
      setMinAnswers(res.minAnswers);
      setDemo(res.demo);
    } catch (err: any) {
      setError(err.message || 'Ошибка запуска интервью');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initInterview();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, question, loading, finishing]);

  useEffect(() => {
    if (!loading && !finishing) {
      textareaRef.current?.focus();
    }
  }, [loading, finishing]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || loading || finishing || !sessionId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await answerInterviewApi(sessionId, text, false);
      if (res.done) {
        onComplete(res.story);
      } else {
        setTurns(prev => [...prev, { question, answer: text }]);
        setQuestion(res.question);
        setQuestionIndex(res.questionIndex);
        setDemo(res.demo);
        setDraft('');
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка отправки ответа');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    if (loading || finishing || !sessionId) return;

    setFinishing(true);
    setError(null);
    try {
      const res = await answerInterviewApi(sessionId, draft.trim(), true);
      if (res.done) {
        onComplete(res.story);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка сборки истории');
    } finally {
      setFinishing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-4">
      {/* Top bar with progress and actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-800">
        <div className="flex items-center space-x-3">
          <span className="text-xs font-cinzel text-amber-400 font-semibold tracking-wider">
            Вопрос {Math.min(questionIndex, maxQuestions)} из {maxQuestions}
          </span>
          <div className="flex items-center space-x-1">
            {Array.from({ length: maxQuestions }).map((_, idx) => (
              <span
                key={idx}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx < turns.length
                    ? 'bg-amber-400 ring-2 ring-amber-500/20'
                    : idx === turns.length
                    ? 'bg-amber-500/60 ring-1 ring-amber-500/30 animate-pulse'
                    : 'bg-stone-800'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {demo && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700">
              Демо-режим: вопросы-заготовки
            </span>
          )}
          <button
            type="button"
            onClick={initInterview}
            disabled={loading || finishing}
            className="flex items-center space-x-1 text-xs text-stone-400 hover:text-stone-200 transition-colors px-2 py-1 rounded bg-stone-900 border border-stone-800"
            title="Сбросить и начать заново"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Начать заново</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading || finishing}
            className="flex items-center space-x-1 text-xs text-stone-400 hover:text-stone-200 transition-colors px-2 py-1 rounded bg-stone-900 border border-stone-800"
            title="Вернуться к обычному вводу текста"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Вернуться к тексту</span>
          </button>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-start justify-between text-rose-200 text-xs shadow-lg backdrop-blur">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-300">Ошибка интервью</p>
              <p className="text-rose-200/90 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={initInterview}
            className="text-xs underline text-rose-300 hover:text-rose-100 ml-3"
          >
            Попробовать снова
          </button>
        </div>
      )}

      {/* Chat scroll container */}
      <div className="max-h-[380px] min-h-[220px] overflow-y-auto space-y-4 pr-1 scrollbar-thin">
        {/* Past turns */}
        {turns.map((turn, idx) => (
          <React.Fragment key={idx}>
            {/* Chronicler question */}
            <div className="flex items-start space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 text-amber-400">
                <ScrollText className="w-3.5 h-3.5" />
              </div>
              <div className="bg-stone-800/80 border border-stone-700 text-stone-200 p-3.5 rounded-2xl rounded-tl-sm max-w-[85%] text-sm leading-relaxed shadow-sm">
                {turn.question}
              </div>
            </div>

            {/* User answer */}
            <div className="flex items-start justify-end space-x-2.5">
              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-100 p-3.5 rounded-2xl rounded-tr-sm max-w-[85%] text-sm leading-relaxed shadow-sm">
                {turn.answer}
              </div>
              <div className="w-7 h-7 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center shrink-0 mt-0.5 text-stone-300">
                <MessageSquare className="w-3.5 h-3.5" />
              </div>
            </div>
          </React.Fragment>
        ))}

        {/* Current active question */}
        {!finishing && question && (
          <div className="flex items-start space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5 text-amber-400">
              <ScrollText className="w-3.5 h-3.5" />
            </div>
            <div className="bg-stone-800/80 border border-stone-700 text-stone-200 p-3.5 rounded-2xl rounded-tl-sm max-w-[85%] text-sm leading-relaxed shadow-sm">
              {question}
            </div>
          </div>
        )}

        {/* Loading / Thinking bubble */}
        {(loading || finishing) && (
          <div className="flex items-center space-x-2.5 text-amber-400/90 text-xs py-1 pl-1">
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
            <span className="font-cinzel tracking-wider">
              {finishing ? 'Хронист собирает историю...' : 'Хронист размышляет...'}
            </span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="space-y-2 pt-2 border-t border-stone-800">
        <textarea
          ref={textareaRef}
          rows={3}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ваш ответ... (Enter — отправить, Shift+Enter — перенос строки)"
          className="w-full bg-stone-950/80 border border-stone-800 rounded-2xl p-3.5 text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 text-sm leading-relaxed transition-all resize-none"
          disabled={loading || finishing || !sessionId}
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            {turns.length >= minAnswers && (
              <button
                type="button"
                onClick={handleFinish}
                disabled={loading || finishing}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-semibold font-cinzel tracking-wide transition-all active:scale-[0.98] disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Хватит — собрать историю</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSend}
            disabled={!draft.trim() || loading || finishing || !sessionId}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold font-cinzel tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-amber-900/20"
          >
            <span>Ответить</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
