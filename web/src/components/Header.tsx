import React from 'react';
import { ScrollText, Sparkles, BookOpen, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

interface HeaderProps {
  activeTab: 'create' | 'feed';
  setActiveTab: (tab: 'create' | 'feed') => void;
  feedCount: number;
  hasApiKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  feedCount,
  hasApiKey
}) => {
  return (
    <header className="border-b border-stone-800 bg-stone-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo & title */}
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/20 via-orange-600/30 to-amber-700/20 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-950/40">
              <ScrollText className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold tracking-tight text-stone-100 font-cinzel">
                  NOVELLA FORGER
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">
                  Хронист v1.0
                </span>
              </div>
              <p className="text-xs text-stone-400 hidden sm:block">
                Перевод реальных историй в фантастические новеллы через метафоры мира
              </p>
            </div>
          </div>

          {/* Navigation & Status */}
          <div className="flex items-center space-x-4">
            {/* Status Indicator */}
            <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-stone-900 border border-stone-800 text-xs">
              <KeyRound className="w-3.5 h-3.5 text-stone-400" />
              <span className="text-stone-400">Gemini 2.5 Flash:</span>
              {hasApiKey ? (
                <span className="flex items-center text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Готов
                </span>
              ) : (
                <span className="flex items-center text-amber-400 font-medium" title="Укажите GEMINI_API_KEY в файле .env">
                  <AlertCircle className="w-3 h-3 mr-1" /> Требуется ключ
                </span>
              )}
            </div>

            {/* Tabs */}
            <div className="flex bg-stone-900 p-1 rounded-xl border border-stone-800">
              <button
                onClick={() => setActiveTab('create')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'create'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Создать</span>
              </button>
              <button
                onClick={() => setActiveTab('feed')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'feed'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-900/30'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Лента</span>
                {feedCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-xs bg-stone-800 text-stone-300 border border-stone-700">
                    {feedCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
