import React from 'react';
import { BookOpen, Calendar, Tag, FileText, ChevronRight, RefreshCw, Users } from 'lucide-react';
import { NovellaItem } from '../types';

interface NovellaFeedProps {
  novellas: NovellaItem[];
  isLoading: boolean;
  onSelectNovella: (novella: NovellaItem) => void;
  onRefresh: () => void;
}

export const NovellaFeed: React.FC<NovellaFeedProps> = ({
  novellas,
  isLoading,
  onSelectNovella,
  onRefresh
}) => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Feed Header */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-800">
        <div>
          <h2 className="text-2xl font-bold text-stone-100 font-cinzel">
            Лента Хроник
          </h2>
          <p className="text-xs text-stone-400 mt-0.5">
            Все созданные новеллы из каталога <code className="text-amber-400/90 font-mono">stories/output/</code>
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 hover:border-stone-700 text-stone-300 text-xs font-medium transition-all active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : 'text-stone-400'}`} />
          <span>Обновить</span>
        </button>
      </div>

      {/* Feed list */}
      {novellas.length === 0 ? (
        <div className="text-center py-16 px-4 bg-stone-900/40 border border-dashed border-stone-800 rounded-3xl">
          <BookOpen className="w-12 h-12 text-stone-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-stone-300">
            В архиве пока нет новелл
          </h3>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Сгенерируйте свою первую новеллу во вкладке «Создать», и она автоматически сохранится в папку stories/output/
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {novellas.map(item => (
            <div
              key={item.filename}
              onClick={() => onSelectNovella(item)}
              className="group cursor-pointer bg-stone-900/80 hover:bg-stone-900 border border-stone-800 hover:border-amber-500/40 rounded-2xl p-5 transition-all duration-200 shadow-lg hover:shadow-amber-950/20"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <h3 className="text-lg font-bold text-stone-100 font-cinzel group-hover:text-amber-300 transition-colors">
                  {item.title}
                </h3>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="flex items-center text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    <Tag className="w-3 h-3 mr-1" />
                    {item.genreUsed}
                  </span>
                  <span className="flex items-center text-stone-400 bg-stone-800 px-2 py-0.5 rounded-full border border-stone-700/50">
                    <Calendar className="w-3 h-3 mr-1" />
                    {item.date}
                  </span>
                </div>
              </div>

              {/* Snippet */}
              <p className="text-xs sm:text-sm text-stone-400 font-serif-novel line-clamp-2 leading-relaxed mb-3">
                {item.snippet}
              </p>

              {/* Footer info & name map count */}
              <div className="flex items-center justify-between pt-3 border-t border-stone-800/60 text-xs text-stone-500">
                <div className="flex items-center space-x-4">
                  <span className="flex items-center text-stone-400 font-mono text-[11px]">
                    <FileText className="w-3 h-3 mr-1" />
                    {item.filename}
                  </span>
                  {item.nameMap && item.nameMap.length > 0 && (
                    <span className="flex items-center text-stone-400 text-[11px]">
                      <Users className="w-3 h-3 mr-1 text-amber-400" />
                      {item.nameMap.length} {item.nameMap.length === 1 ? 'образ' : 'образов'}
                    </span>
                  )}
                </div>

                <div className="flex items-center text-amber-400 font-medium group-hover:translate-x-1 transition-transform">
                  <span>Читать</span>
                  <ChevronRight className="w-4 h-4 ml-0.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
