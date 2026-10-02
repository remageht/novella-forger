import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { GeneratorForm } from './components/GeneratorForm';
import { NovellaViewer } from './components/NovellaViewer';
import { NovellaFeed } from './components/NovellaFeed';
import { generateNovellaApi, fetchNovellasApi, checkHealthApi } from './api';
import { GenreType, NovellaItem, GenerateResponse } from './types';
import { AlertCircle, X } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'feed'>('create');
  const [isLoading, setIsLoading] = useState(false);
  const [feedLoading, setFeedLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);
  const [novellas, setNovellas] = useState<NovellaItem[]>([]);
  const [selectedNovella, setSelectedNovella] = useState<GenerateResponse | NovellaItem | null>(null);

  // Initial load
  useEffect(() => {
    loadHealth();
    loadNovellas();
  }, []);

  const loadHealth = async () => {
    try {
      const health = await checkHealthApi();
      setHasApiKey(health.hasApiKey);
    } catch {
      setHasApiKey(false);
    }
  };

  const loadNovellas = async () => {
    try {
      setFeedLoading(true);
      const items = await fetchNovellasApi();
      setNovellas(items);
    } catch (err: any) {
      console.error('Failed to load novellas feed:', err);
    } finally {
      setFeedLoading(false);
    }
  };

  const handleGenerate = async (story: string, genre: GenreType) => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await generateNovellaApi(story, genre);
      setSelectedNovella(result);
      await loadNovellas();
    } catch (err: any) {
      setError(err.message || 'Ошибка генерации');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFromFeed = (item: NovellaItem) => {
    setSelectedNovella(item);
  };

  const handleBackToCreate = () => {
    setSelectedNovella(null);
  };

  return (
    <div className="min-h-screen bg-[#0c0a09] text-stone-200 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={tab => {
          setActiveTab(tab);
          if (tab === 'feed') {
            loadNovellas();
          }
        }}
        feedCount={novellas.length}
        hasApiKey={hasApiKey}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Error notification banner */}
        {error && (
          <div className="max-w-3xl mx-auto mb-8 p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-start justify-between text-rose-200 text-sm shadow-xl backdrop-blur">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-300">Ошибка</p>
                <p className="text-rose-200/90 text-xs sm:text-sm mt-0.5">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-200 transition-colors ml-4 p-1 rounded-lg hover:bg-rose-900/40"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* View switching logic */}
        {selectedNovella ? (
          <NovellaViewer
            title={selectedNovella.title}
            genreUsed={selectedNovella.genreUsed}
            date={'date' in selectedNovella ? selectedNovella.date : new Date().toISOString().slice(0, 10)}
            nameMap={selectedNovella.nameMap}
            novellaMarkdown={selectedNovella.novellaMarkdown}
            filename={selectedNovella.filename}
            demo={'demo' in selectedNovella ? Boolean(selectedNovella.demo) : false}
            gitCommit={selectedNovella.gitCommit}
            onBack={handleBackToCreate}
          />
        ) : activeTab === 'create' ? (
          <GeneratorForm
            onGenerate={handleGenerate}
            isLoading={isLoading}
          />
        ) : (
          <NovellaFeed
            novellas={novellas}
            isLoading={feedLoading}
            onSelectNovella={handleSelectFromFeed}
            onRefresh={loadNovellas}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-900 bg-stone-950/60 py-6 text-center text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-cinzel text-stone-400">
            Novella Forger — Ковка смыслов и метафор
          </p>
          <p className="mt-1 text-stone-600">
            Правила Хрониста • Модель Gemini 2.5 Flash • Файловый автосейв в stories/output/
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
