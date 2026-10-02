import React, { useState, useMemo } from 'react';
import { Copy, Check, Download, GitCommit, Tag, Calendar, Layers, BookOpen, FileText, FlaskConical } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { NameMapItem } from '../types';
import { NameMapCard } from './NameMapCard';

interface NovellaViewerProps {
  title: string;
  genreUsed: string;
  date?: string;
  nameMap: NameMapItem[];
  novellaMarkdown: string;
  filename?: string;
  demo?: boolean;
  gitCommit?: {
    success: boolean;
    message: string;
  };
  onBack?: () => void;
}

interface Chapter {
  id: number;
  title: string;
  content: string;
}

export const NovellaViewer: React.FC<NovellaViewerProps> = ({
  title,
  genreUsed,
  date,
  nameMap,
  novellaMarkdown,
  filename,
  demo,
  gitCommit,
  onBack
}) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'all' | 'chapters'>('chapters');
  const [selectedChapterIndex, setSelectedChapterIndex] = useState(0);

  // Parse markdown into distinct chapters based on '## ' headers
  const chapters: Chapter[] = useMemo(() => {
    if (!novellaMarkdown) return [];

    const lines = novellaMarkdown.split('\n');
    const result: Chapter[] = [];
    let currentTitle = 'Начало';
    let currentContent: string[] = [];
    let chapterCount = 0;

    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (currentContent.length > 0 || chapterCount > 0) {
          result.push({
            id: chapterCount,
            title: currentTitle,
            content: currentContent.join('\n').trim()
          });
          chapterCount++;
        }
        currentTitle = line.replace('## ', '').trim();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    if (currentContent.length > 0) {
      result.push({
        id: chapterCount,
        title: currentTitle,
        content: currentContent.join('\n').trim()
      });
    }

    return result;
  }, [novellaMarkdown]);

  // Copy full markdown or text
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(novellaMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  // Download .md file
  const handleDownload = () => {
    const fullDownloadContent = [
      `# ${title}`,
      '',
      `**Жанр:** ${genreUsed}  `,
      date ? `**Дата:** ${date}  ` : '',
      '',
      '### Карта имен',
      nameMap.map(m => `- ${m.originalRole} → **${m.novelName}**${m.significance ? ` (${m.significance})` : ''}`).join('\n'),
      '',
      '---',
      '',
      novellaMarkdown
    ].join('\n');

    const blob = new Blob([fullDownloadContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `${title.replace(/[\s/\\?%*:|"<>]/g, '_')}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Top Banner / Actions */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-2xl backdrop-blur relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800/80 pb-6 mb-6">
          <div>
            {onBack && (
              <button
                onClick={onBack}
                className="text-xs text-stone-400 hover:text-amber-400 mb-2 inline-flex items-center space-x-1 transition-colors"
              >
                <span>← Вернуться к списку</span>
              </button>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-100 font-cinzel tracking-wide mb-2">
              {title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400">
                <span className="flex items-center text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 font-medium">
                  <Tag className="w-3 h-3 mr-1" />
                  {genreUsed}
                </span>
                {demo && (
                  <span className="flex items-center text-sky-300 bg-sky-500/10 px-2.5 py-1 rounded-full border border-sky-500/30 font-medium" title="Ключ Gemini не задан — показана пример-новелла. Конвейер (сейв + коммит) отработал по-настоящему.">
                    <FlaskConical className="w-3 h-3 mr-1" />
                    Демо-режим
                  </span>
                )}
              {date && (
                <span className="flex items-center text-stone-400 bg-stone-800/80 px-2.5 py-1 rounded-full border border-stone-700/50">
                  <Calendar className="w-3 h-3 mr-1 text-stone-400" />
                  {date}
                </span>
              )}
              {filename && (
                <span className="flex items-center text-stone-400 bg-stone-800/80 px-2.5 py-1 rounded-full border border-stone-700/50 font-mono">
                  <FileText className="w-3 h-3 mr-1 text-stone-400" />
                  {filename}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700/80 text-stone-200 border border-stone-700 text-sm font-medium transition-all shadow-sm active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Скопировано!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-400" />
                  <span>Копировать .md</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-all shadow-md shadow-amber-900/30 active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Скачать .md</span>
            </button>
          </div>
        </div>

        {/* Git commit notice if available */}
        {gitCommit && (
          <div className="mb-4 px-3.5 py-2 rounded-xl bg-stone-950/70 border border-stone-800 flex items-center text-xs text-stone-400">
            <GitCommit className="w-3.5 h-3.5 text-amber-400 mr-2 shrink-0" />
            <span className="text-stone-300 mr-1.5 font-medium">Автосейв в репозиторий:</span>
            <span className="text-stone-400 truncate">{gitCommit.message}</span>
            <span className="ml-auto text-stone-500 text-[11px]">(push вручную)</span>
          </div>
        )}

        {/* Name Map Block */}
        <NameMapCard nameMap={nameMap} />

        {/* Chapter view mode tabs */}
        <div className="flex items-center justify-between border-t border-stone-800/80 pt-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('chapters')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'chapters'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-stone-400 hover:text-stone-200 bg-stone-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>По главам ({chapters.length})</span>
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                viewMode === 'all'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-stone-400 hover:text-stone-200 bg-stone-800/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Вся новелла</span>
            </button>
          </div>
        </div>
      </div>

      {/* Chapters Navigation Tabs when in chapters mode */}
      {viewMode === 'chapters' && chapters.length > 1 && (
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-thin">
          {chapters.map((ch, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedChapterIndex(idx)}
              className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all border ${
                selectedChapterIndex === idx
                  ? 'bg-amber-600/20 text-amber-300 border-amber-500/50 shadow-md'
                  : 'bg-stone-900/60 text-stone-400 border-stone-800 hover:border-stone-700 hover:text-stone-200'
              }`}
            >
              {ch.title}
            </button>
          ))}
        </div>
      )}

      {/* Novel Body / Reader Canvas */}
      <div className="bg-[#14110e] border border-amber-950/40 rounded-2xl p-6 sm:p-10 shadow-2xl relative">
        <div className="font-serif-novel text-stone-200 prose-novella text-base leading-relaxed">
          {viewMode === 'chapters' && chapters.length > 0 ? (
            <div>
              <h2 className="text-xl sm:text-2xl font-cinzel text-amber-400 mb-6 pb-2 border-b border-amber-500/20">
                {chapters[selectedChapterIndex]?.title}
              </h2>
              <div className="whitespace-pre-line text-stone-300 leading-loose text-lg">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {chapters[selectedChapterIndex]?.content || ''}
                </ReactMarkdown>
              </div>

              {/* Prev / Next chapter navigation */}
              <div className="flex items-center justify-between border-t border-stone-800/80 pt-8 mt-12">
                <button
                  disabled={selectedChapterIndex === 0}
                  onClick={() => setSelectedChapterIndex(prev => Math.max(0, prev - 1))}
                  className="px-4 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-stone-800 transition-colors"
                >
                  ← Предыдущая глава
                </button>
                <span className="text-xs text-stone-500 font-cinzel">
                  Глава {selectedChapterIndex + 1} из {chapters.length}
                </span>
                <button
                  disabled={selectedChapterIndex === chapters.length - 1}
                  onClick={() => setSelectedChapterIndex(prev => Math.min(chapters.length - 1, prev + 1))}
                  className="px-4 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-300 disabled:opacity-30 disabled:pointer-events-none hover:bg-stone-800 transition-colors"
                >
                  Следующая глава →
                </button>
              </div>
            </div>
          ) : (
            <div className="whitespace-pre-line text-stone-300 leading-loose text-lg">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {novellaMarkdown}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
