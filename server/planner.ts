import { GoogleGenAI, Type } from '@google/genai';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadReferences } from './references.js';
import { getNovellaByFilename, NameMapItem } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.basename(__dirname) === 'dist'
  ? path.resolve(__dirname, '..', '..')
  : path.resolve(__dirname, '..');

const planSystemPromptPath = path.join(projectRoot, 'prompts', 'plan-system.md');
const writeSystemPromptPath = path.join(projectRoot, 'prompts', 'write-system.md');

export interface PlanChapter {
  title: string;
  summary: string;
}

export interface NovellaPlan {
  title: string;
  genreUsed: string;
  events: string[];
  emotion: string;
  moral: string;
  nameMap: NameMapItem[];
  chapters: PlanChapter[];
}

export const DEFAULT_CHAPTER_TITLES = [
  'Пролог: Врата',
  'Глава 1',
  'Глава 2',
  'Глава 3: Трибуляция',
  'Глава 4: Цена',
  'Эпилог: Отголосок'
];

export const CHAPTER_WORD_TARGETS = [500, 1000, 1000, 1200, 900, 400];

export function hasApiKey(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== 'your_gemini_api_key_here');
}

function requireApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'your_gemini_api_key_here') {
    throw new Error('Ключ GEMINI_API_KEY не задан. Укажите ваш ключ в файле .env (получить ключ можно на https://aistudio.google.com/)');
  }
  return key;
}

function normalizeChapters(raw: any): PlanChapter[] {
  const chapters: PlanChapter[] = Array.isArray(raw)
    ? raw
        .filter((c: any) => c && typeof c.title === 'string')
        .map((c: any) => ({
          title: c.title.trim() || 'Без названия',
          summary: typeof c.summary === 'string' ? c.summary.trim() : ''
        }))
        .slice(0, DEFAULT_CHAPTER_TITLES.length)
    : [];
  while (chapters.length < DEFAULT_CHAPTER_TITLES.length) {
    chapters.push({ title: DEFAULT_CHAPTER_TITLES[chapters.length], summary: '' });
  }
  return chapters;
}

// ФАЗА 1: разбор истории + жанр + карта имен + структура. Текст новеллы не пишется.
export async function createPlan(story: string, genre: string): Promise<NovellaPlan> {
  const apiKey = requireApiKey();
  const systemPrompt = await fs.readFile(planSystemPromptPath, 'utf-8');
  const references = await loadReferences(genre);

  const ai = new GoogleGenAI({ apiKey });

  let userPrompt = `РЕАЛЬНАЯ ИСТОРИЯ ЧЕЛОВЕКА:\n"""\n${story.trim()}\n"""\n\n`;
  if (genre && genre !== 'авто') {
    userPrompt += `ПОЖЕЛАНИЕ ПО ЖАНРУ: "${genre}". Используй этот жанр как основной доминант мира.\n`;
  } else {
    userPrompt += `ЖАНР: Выбери наилучший жанр-доминант + подслой автоматически согласно правилам Хрониста.\n`;
  }
  if (references) {
    userPrompt += `\nСПРАВОЧНЫЕ МАТЕРИАЛЫ ХРОНИСТА (терминология, тропы, стиль имен — вдохновляйся, не цитируй дословно):\n${references}\n`;
  }
  userPrompt += `\nПострой план новеллы строго по JSON-схеме.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      responseJsonSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Рабочее название новеллы' },
          genreUsed: { type: Type.STRING, description: 'Жанр-доминант и подслой' },
          events: { type: Type.ARRAY, items: { type: Type.STRING }, description: '3-7 ключевых событий в хронологии' },
          emotion: { type: Type.STRING, description: 'Главная эмоция истории' },
          moral: { type: Type.STRING, description: 'Мораль истории' },
          nameMap: {
            type: Type.ARRAY,
            description: 'Карта имен: роль в реальной истории -> имя в новелле',
            items: {
              type: Type.OBJECT,
              properties: {
                originalRole: { type: Type.STRING },
                novelName: { type: Type.STRING },
                significance: { type: Type.STRING }
              },
              required: ['originalRole', 'novelName']
            }
          },
          chapters: {
            type: Type.ARRAY,
            description: 'Ровно 6 частей: Пролог, Главы 1-2, Трибуляция, Цена, Эпилог',
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING }
              },
              required: ['title', 'summary']
            }
          }
        },
        required: ['title', 'genreUsed', 'events', 'emotion', 'moral', 'nameMap', 'chapters']
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini вернул пустой план');
  }

  const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    title: parsed.title || 'Безымянная хроника',
    genreUsed: parsed.genreUsed || genre || 'Хроника мира',
    events: Array.isArray(parsed.events) ? parsed.events.filter((e: any) => typeof e === 'string') : [],
    emotion: parsed.emotion || '',
    moral: parsed.moral || '',
    nameMap: Array.isArray(parsed.nameMap) ? parsed.nameMap : [],
    chapters: normalizeChapters(parsed.chapters)
  };
}

// ФАЗА 2: написание одной главы по утвержденному плану (потоково).
export async function* writeChapter(
  plan: NovellaPlan,
  chapterIndex: number,
  story: string,
  previousText: string,
  abortSignal?: AbortSignal
): AsyncGenerator<string> {
  const apiKey = requireApiKey();
  const systemPrompt = await fs.readFile(writeSystemPromptPath, 'utf-8');

  const ai = new GoogleGenAI({ apiKey });
  const chapter = plan.chapters[chapterIndex];
  const target = CHAPTER_WORD_TARGETS[chapterIndex] ?? 800;

  const planJson = JSON.stringify(
    {
      title: plan.title,
      genreUsed: plan.genreUsed,
      emotion: plan.emotion,
      moral: plan.moral,
      nameMap: plan.nameMap,
      chapters: plan.chapters
    },
    null,
    2
  );

  const userPrompt = [
    `РЕАЛЬНАЯ ИСТОРИЯ:\n"""\n${story.trim()}\n"""`,
    `ПЛАН НОВЕЛЛЫ (JSON):\n${planJson}`,
    previousText
      ? `УЖЕ НАПИСАНО (только для консистентности, НЕ повторяй):\n${previousText.slice(-8000)}`
      : `УЖЕ НАПИСАНО: —`,
    `ЗАДАНИЕ: напиши главу ${chapterIndex + 1} из ${plan.chapters.length} — "${chapter.title}". Суть: ${chapter.summary || 'см. план'}. Объем ~${target} слов. Начни с "## ${chapter.title}".`
  ].join('\n\n');

  const stream = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      abortSignal
    }
  });

  for await (const chunk of stream) {
    if (abortSignal?.aborted) return;
    const delta = chunk.text;
    if (delta) yield delta;
  }
}

// --- Демо-режим (без API-ключа) ---

export interface MarkdownSection {
  title: string;
  body: string;
}

export function splitChapters(markdown: string): MarkdownSection[] {
  const lines = markdown.split('\n');
  const sections: { title: string; body: string[] }[] = [];
  let current: { title: string; body: string[] } | null = null;

  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      if (current) sections.push(current);
      current = { title: m[1].trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);

  if (sections.length === 0) {
    return [{ title: 'Новелла', body: markdown.trim() }];
  }
  return sections.map(s => ({ title: s.title, body: s.body.join('\n').trim() }));
}

export async function buildDemoPlan(): Promise<NovellaPlan | null> {
  const example = await getNovellaByFilename('example.md');
  if (!example) return null;

  const sections = splitChapters(example.novellaMarkdown);
  const chapters = normalizeChapters(
    sections.map(s => ({
      title: s.title,
      summary: s.body.replace(/\s+/g, ' ').slice(0, 140) + '…'
    }))
  );

  return {
    title: example.title,
    genreUsed: example.genreUsed,
    events: [
      'Демо-режим: GEMINI_API_KEY не задан, поэтому разбор истории не выполняется.',
      'Показан пример готового плана на основе stories/output/example.md.',
      'Задайте ключ в .env — и Хронист начнет строить настоящие планы.'
    ],
    emotion: '— демо —',
    moral: 'Задайте GEMINI_API_KEY, чтобы Хронист разобрал вашу историю.',
    nameMap: example.nameMap,
    chapters
  };
}
