import React, { useState, useEffect } from 'react';
import { Sparkles, Compass, AlertCircle, FileText, Loader2, Wand2 } from 'lucide-react';
import { GENRE_OPTIONS, GenreType } from '../types';

interface GeneratorFormProps {
  onGenerate: (story: string, genre: GenreType) => Promise<void>;
  isLoading: boolean;
}

const SAMPLE_STORY = `Я пять лет работал старшим аналитиком в гигантской корпорации, задерживаясь до полуночи и отдавая все силы проектам. В какой-то момент от переутомления и бесконечного стресса я начал терять здоровье и интерес к жизни. Мой непосредственный руководитель забрал себе авторство ключевой архитектурной реформы, над которой я корпел полгода, и получил повышение, оставив меня ни с чем. В самый тяжелый момент коллега по отделу помогла мне не опустить руки и тайно поддержала меня нужными контактами. Я решился, написал заявление об увольнении в никуда, собрал последние сбережения и открыл собственную столярную мастерскую. Теперь я работаю руками, создаю мебель и впервые за много лет чувствую себя по-настоящему живым человеком.`;

const GENRE_DESCRIPTIONS: Record<GenreType, string> = {
  'авто': 'Хронист сам подберет главный жанр-доминант и подслой по ключевым событиям истории',
  'культивация': 'Рост, преодоление трудностей, наставник / предательство, долгий тернистый путь',
  'исекай/трансмиграция/переселение душ': 'Переезд, развод, смена профессии, начало жизни с чистого листа',
  'постапокалипсис': 'Тяжелая потеря, болезнь, разрушение привычного дома или семьи',
  'маго-индустриализация': 'Корпорация, офис, завод, эмоциональное выгорание, гнет системы',
  'магия': 'Любовь, верная дружба, детские воспоминания, чудо и открытие тайны'
};

const CHRONICLER_PHASES = [
  'ШАГ 1: Разбор хронологии и ролей участников...',
  'ШАГ 2: Определение жанра-доминанта и законов мира...',
  'ШАГ 3: Переплавка реальных событий в метафоры мира...',
  'ШАГ 4: Ковка имен по формуле [Суть поступка + ранг]...',
  'ШАГ 5: Сборка глав (Пролог-Врата, Завязка, Трибуляция, Цена, Эпилог)...',
  'ШАГ 6: Автосейв и фиксация в скрижалях...'
];

export const GeneratorForm: React.FC<GeneratorFormProps> = ({ onGenerate, isLoading }) => {
  const [story, setStory] = useState('');
  const [genre, setGenre] = useState<GenreType>('авто');
  const [phaseIndex, setPhaseIndex] = useState(0);

  // Cycle chronicler loading phases
  useEffect(() => {
    if (!isLoading) {
      setPhaseIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setPhaseIndex(prev => (prev + 1) % CHRONICLER_PHASES.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [isLoading]);

  // Count sentences
  const sentenceCount = story
    .trim()
    .split(/[.!?]+/)
    .filter(s => s.trim().length > 3).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!story.trim() || isLoading) return;
    onGenerate(story, genre);
  };

  const handleInsertSample = () => {
    setStory(SAMPLE_STORY);
    setGenre('маго-индустриализация');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="mb-6">
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
            <Wand2 className="w-4 h-4" />
            <span>Мастерская Хрониста</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-100 font-cinzel">
            Переплавка были в фантастику
          </h2>
          <p className="text-sm text-stone-400 mt-1">
            Правило №1: события всегда становятся метафорами мира, имена всегда даются по поступкам.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="story-input" className="text-sm font-medium text-stone-200 flex items-center space-x-1.5">
                <span>Вставь историю 5+ предложений</span>
                <span className="text-amber-500">*</span>
              </label>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={handleInsertSample}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors inline-flex items-center space-x-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Вставить пример</span>
                </button>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                    sentenceCount >= 5
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-stone-800 text-stone-400 border border-stone-700'
                  }`}
                >
                  {sentenceCount} / 5 предл.
                </span>
              </div>
            </div>

            <textarea
              id="story-input"
              rows={8}
              value={story}
              onChange={e => setStory(e.target.value)}
              placeholder="Расскажи реальную историю из жизни: что произошло, кто участвовал, какой был переломный момент и чем всё завершилось..."
              className="w-full bg-stone-950/80 border border-stone-800 rounded-2xl p-4 text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 text-sm leading-relaxed transition-all resize-y"
              disabled={isLoading}
              required
            />
          </div>

          {/* Genre select */}
          <div>
            <label htmlFor="genre-select" className="block text-sm font-medium text-stone-200 mb-2 flex items-center space-x-1.5">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Жанр-доминант мира</span>
            </label>

            <select
              id="genre-select"
              value={genre}
              onChange={e => setGenre(e.target.value as GenreType)}
              className="w-full bg-stone-950/80 border border-stone-800 rounded-2xl p-3.5 text-stone-200 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40 text-sm transition-all"
              disabled={isLoading}
            >
              {GENRE_OPTIONS.map(opt => (
                <option key={opt} value={opt} className="bg-stone-900 text-stone-200">
                  {opt === 'авто' ? '✨ авто (Хронист определит сам)' : opt}
                </option>
              ))}
            </select>

            <p className="text-xs text-stone-400 mt-2 italic px-1">
              {GENRE_DESCRIPTIONS[genre]}
            </p>
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={isLoading || !story.trim()}
              className="w-full relative group overflow-hidden rounded-2xl p-4 font-semibold text-white shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 active:scale-[0.99] border border-amber-400/30"
            >
              <div className="flex items-center justify-center space-x-2.5">
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-amber-200" />
                    <span className="font-cinzel tracking-wider text-base">
                      Ковка новеллы...
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-amber-200" />
                    <span className="font-cinzel tracking-wider text-base">
                      Сгенерировать новеллу
                    </span>
                  </>
                )}
              </div>
            </button>
          </div>

          {/* Loading status phases */}
          {isLoading && (
            <div className="p-4 rounded-2xl bg-stone-950/90 border border-amber-500/30 text-center animate-pulse">
              <div className="flex items-center justify-center space-x-2 text-xs font-mono text-amber-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{CHRONICLER_PHASES[phaseIndex]}</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Генерация объема 3000-7000 слов и структурирование глав занимает около 15-30 секунд
              </p>
            </div>
          )}

          {/* Validation tip */}
          {!isLoading && story.trim().length > 0 && sentenceCount < 5 && (
            <div className="flex items-center space-x-2 text-xs text-amber-400/90 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Рекомендуется история от 5 предложений, чтобы Хронист мог выстроить полноценную структуру глав (Врата, Завязка, Трибуляция, Цена, Эпилог).
              </span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
