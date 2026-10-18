import React, { useState } from 'react';
import { ArrowLeft, PenLine, ScrollText, Users, ListTree, Heart, Compass, FlaskConical, Sparkles } from 'lucide-react';
import { NameMapItem, NovellaPlan } from '../types';

interface PlanReviewProps {
  plan: NovellaPlan;
  demo?: boolean;
  onBack: () => void;
  onApprove: (nameMap: NameMapItem[]) => void;
}

export const PlanReview: React.FC<PlanReviewProps> = ({ plan, demo, onBack, onApprove }) => {
  const [names, setNames] = useState<string[]>(plan.nameMap.map(item => item.novelName));

  const handleApprove = () => {
    const edited: NameMapItem[] = plan.nameMap.map((item, index) => ({
      ...item,
      novelName: (names[index] ?? item.novelName).trim() || item.novelName
    }));
    onApprove(edited);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Header */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-2xl backdrop-blur relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <button
              onClick={onBack}
              className="text-xs text-stone-400 hover:text-amber-400 mb-2 inline-flex items-center space-x-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Изменить историю</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-100 font-cinzel tracking-wide mb-2">
              {plan.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400">
              <span className="flex items-center text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 font-medium">
                <Compass className="w-3 h-3 mr-1" />
                {plan.genreUsed}
              </span>
              <span className="text-stone-500">Фаза 1 из 2 — проверьте план и карту имен</span>
              {demo && (
                <span
                  className="flex items-center text-sky-300 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/30 font-medium"
                  title="Ключ Gemini не задан — показан пример плана на основе stories/output/example.md"
                >
                  <FlaskConical className="w-3 h-3 mr-1" />
                  Демо-режим
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleApprove}
            className="flex items-center space-x-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-sm font-semibold shadow-lg shadow-amber-900/30 active:scale-[0.98] transition-all shrink-0"
          >
            <PenLine className="w-4 h-4" />
            <span>Писать новеллу</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Разбор истории */}
          <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-5">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <ScrollText className="w-4 h-4" />
              <span>Разбор истории</span>
            </div>
            <ol className="space-y-2.5">
              {plan.events.map((event, i) => (
                <li key={i} className="flex items-start space-x-3 text-sm text-stone-300">
                  <span className="mt-0.5 w-5 h-5 shrink-0 rounded-full bg-stone-800 border border-stone-700 text-[11px] text-amber-400 flex items-center justify-center font-mono">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{event}</span>
                </li>
              ))}
            </ol>
            <div className="mt-5 pt-4 border-t border-stone-800/80 space-y-2 text-sm">
              <p className="flex items-start space-x-2">
                <Heart className="w-4 h-4 text-rose-400/80 mt-0.5 shrink-0" />
                <span>
                  <span className="text-stone-500">Эмоция: </span>
                  <span className="text-stone-300">{plan.emotion || '—'}</span>
                </span>
              </p>
              <p className="flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400/80 mt-0.5 shrink-0" />
                <span>
                  <span className="text-stone-500">Мораль: </span>
                  <span className="text-stone-300">{plan.moral || '—'}</span>
                </span>
              </p>
            </div>
          </div>

          {/* Структура */}
          <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-5">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <ListTree className="w-4 h-4" />
              <span>Структура: {plan.chapters.length} частей</span>
            </div>
            <ul className="space-y-3">
              {plan.chapters.map((chapter, i) => (
                <li key={i} className="text-sm">
                  <p className="text-stone-200 font-medium">{chapter.title}</p>
                  {chapter.summary && (
                    <p className="text-stone-500 text-xs mt-0.5 leading-relaxed">{chapter.summary}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Карта имен */}
        <div className="bg-stone-900/70 border border-stone-800 rounded-2xl p-5 h-fit">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <Users className="w-4 h-4" />
              <span>Карта имен</span>
            </div>
            <span className="text-[11px] text-stone-500">имена можно поправить</span>
          </div>
          <div className="space-y-4">
            {plan.nameMap.map((item, i) => (
              <div key={i} className="p-3 rounded-xl bg-stone-950/60 border border-stone-800">
                <p className="text-xs text-stone-500 mb-1.5">{item.originalRole}</p>
                <input
                  value={names[i] ?? ''}
                  onChange={e =>
                    setNames(prev => {
                      const next = [...prev];
                      next[i] = e.target.value;
                      return next;
                    })
                  }
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-amber-200 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 transition-all"
                />
                {item.significance && (
                  <p className="text-[11px] text-stone-500 mt-1.5 italic">{item.significance}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
