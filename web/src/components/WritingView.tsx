import React, { useEffect, useRef } from 'react';
import { ArrowLeft, CheckCircle2, Circle, Loader2, RotateCcw, FlaskConical, Feather } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { NovellaPlan } from '../types';

interface WritingViewProps {
  plan: NovellaPlan;
  chapters: string[];
  currentIndex: number;
  error?: string | null;
  demo?: boolean;
  onRetry: () => void;
  onBack: () => void;
}

export const WritingView: React.FC<WritingViewProps> = ({
  plan,
  chapters,
  currentIndex,
  error,
  demo,
  onRetry,
  onBack
}) => {
  const text = chapters.filter(Boolean).join('\n\n');
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [text.length]);

  const displayText = text ? (error ? text : text + ' ▍') : '';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-2xl backdrop-blur relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-100 font-cinzel tracking-wide mb-2 flex items-center space-x-3">
              <Feather className="w-6 h-6 text-amber-400" />
              <span>{plan.title}</span>
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400">
              <span className="flex items-center text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 font-medium">
                {error
                  ? 'Письмо прервано'
                  : `Фаза 2 из 2 — глава ${Math.min(currentIndex + 1, plan.chapters.length)} из ${plan.chapters.length}`}
              </span>
              <span className="text-stone-500 font-mono">{wordCount} слов</span>
              {demo && (
                <span className="flex items-center text-sky-300 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/30 font-medium">
                  <FlaskConical className="w-3 h-3 mr-1" />
                  Демо-режим
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700/80 text-stone-200 border border-stone-700 text-sm font-medium transition-all active:scale-95"
              title="Вернуться к плану (написанное будет потеряно)"
            >
              <ArrowLeft className="w-4 h-4 text-stone-400" />
              <span>К плану</span>
            </button>
            {error && (
              <button
                onClick={onRetry}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-all shadow-md shadow-amber-900/30 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Писать заново</span>
              </button>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chapter progress */}
        <aside className="lg:col-span-1">
          <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-4 sticky top-24">
            <p className="text-xs text-stone-500 uppercase tracking-wider font-semibold mb-3">Прогресс</p>
            <ul className="space-y-2.5">
              {plan.chapters.map((chapter, i) => {
                const isDone = i < currentIndex || (error == null && i < currentIndex);
                const isActive = i === currentIndex && !error;
                return (
                  <li key={i} className="flex items-start space-x-2.5 text-xs">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-stone-600 shrink-0 mt-0.5" />
                    )}
                    <span className={isDone ? 'text-stone-400' : isActive ? 'text-amber-300 font-medium' : 'text-stone-600'}>
                      {chapter.title}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>

        {/* Live reader */}
        <div className="lg:col-span-3">
          <div className="bg-[#14110e] border border-amber-950/40 rounded-2xl shadow-2xl relative">
            <div
              ref={scrollRef}
              className="max-h-[70vh] overflow-y-auto p-6 sm:p-10 font-serif-novel text-stone-300 leading-loose text-lg prose-novella"
            >
              {displayText ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayText}</ReactMarkdown>
              ) : (
                <p className="text-stone-500 italic text-base">Хронист раскрывает врата и готовит первые строки…</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
