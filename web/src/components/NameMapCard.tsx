import React from 'react';
import { Users, Shield, ArrowRight } from 'lucide-react';
import { NameMapItem } from '../types';

interface NameMapCardProps {
  nameMap: NameMapItem[];
}

export const NameMapCard: React.FC<NameMapCardProps> = ({ nameMap }) => {
  if (!nameMap || nameMap.length === 0) {
    return null;
  }

  return (
    <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 mb-8 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-800/80">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-stone-100 font-cinzel">
              Карта Имен Хрониста
            </h3>
            <p className="text-xs text-stone-400">
              Формула: [Суть поступка + ранг жанра]. Без реальных имен.
            </p>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full bg-stone-800 text-stone-300 border border-stone-700/60 flex items-center">
          <Shield className="w-3 h-3 mr-1 text-amber-400" />
          {nameMap.length} {nameMap.length === 1 ? 'образ' : nameMap.length < 5 ? 'образа' : 'образов'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {nameMap.map((item, idx) => (
          <div
            key={idx}
            className="p-3.5 rounded-xl bg-stone-950/60 border border-stone-800/90 hover:border-amber-500/30 transition-colors flex flex-col justify-between"
          >
            <div className="flex items-center space-x-2 text-xs mb-1.5">
              <span className="text-stone-400 font-medium">
                {item.originalRole || 'Человек / Роль'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-stone-600 shrink-0" />
              <span className="text-amber-300 font-semibold tracking-wide bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {item.novelName}
              </span>
            </div>
            {item.significance && (
              <p className="text-xs text-stone-400 italic pl-1 border-l-2 border-stone-700/50 mt-1">
                {item.significance}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
