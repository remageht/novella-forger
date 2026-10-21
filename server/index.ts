import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateNovella } from './gemini.js';
import { createPlan, writeChapter, buildDemoPlan, splitChapters, hasApiKey, NovellaPlan } from './planner.js';
import {
  INTERVIEW_MIN_ANSWERS,
  INTERVIEW_MAX_QUESTIONS,
  demoQuestion,
  demoCompose,
  generateQuestion,
  generateStory,
  InterviewSession,
  InterviewTurn
} from './interview.js';
import { saveNovella, getNovellasList, getNovellaByFilename } from './storage.js';
import { commitNovella } from './git.js';

// Setup environment variables (look in server/ and project root)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.basename(__dirname) === 'dist'
  ? path.resolve(__dirname, '..', '..')
  : path.resolve(__dirname, '..');

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(projectRoot, '.env') });

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Behind a reverse proxy (nginx/render/fly) trust X-Forwarded-For so the rate
// limiter sees real client IPs. Off by default to prevent IP spoofing.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : Number(process.env.TRUST_PROXY) || 1);
}

// CORS only when explicitly configured (comma-separated origins).
// Default deploy is same-origin: the server serves the frontend itself.
const corsOrigin = process.env.CORS_ORIGIN?.trim();
if (corsOrigin) {
  app.use(cors({ origin: corsOrigin.split(',').map(o => o.trim()) }));
}

app.use(express.json({ limit: '1mb' }));

const MAX_STORY_LENGTH = 30000;

// Anti-abuse: generation burns Gemini quota, max 10/hour per IP
const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Слишком много генераций. Лимит 10 в час с одного IP, попробуйте позже.' }
});

const planLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 12,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Слишком много планов. Лимит 12 в час с одного IP, попробуйте позже.' }
});

const writeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Слишком много запросов записи. Попробуйте позже.' }
});

const interviewStartLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Слишком много интервью. Лимит 20 в час с одного IP, попробуйте позже.' }
});

const interviewAnswerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Слишком много ответов. Попробуйте позже.' }
});

// Two-phase sessions: plan -> review (правки карты имен) -> write
interface PlanSession {
  story: string;
  genre: string;
  plan: NovellaPlan;
  createdAt: number;
}

const planSessions = new Map<string, PlanSession>();
const PLAN_TTL_MS = 30 * 60 * 1000;

const interviewSessions = new Map<string, InterviewSession>();
const INTERVIEW_TTL_MS = 30 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of planSessions) {
    if (now - session.createdAt > PLAN_TTL_MS) planSessions.delete(id);
  }
  for (const [id, session] of interviewSessions) {
    if (now - session.createdAt > INTERVIEW_TTL_MS) interviewSessions.delete(id);
  }
}, 5 * 60 * 1000).unref();

function validateStory(story: unknown): string | null {
  if (!story || typeof story !== 'string' || story.trim().length < 20) {
    return 'Пожалуйста, вставьте реальную историю (хотя бы несколько предложений).';
  }
  if (story.length > MAX_STORY_LENGTH) {
    return `История слишком длинная (максимум ${MAX_STORY_LENGTH} символов).`;
  }
  return null;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size));
  return chunks;
}

let demoSectionsCache: string[] | null = null;
async function getDemoSections(): Promise<string[]> {
  if (demoSectionsCache) return demoSectionsCache;
  const example = await getNovellaByFilename('example.md');
  demoSectionsCache = example
    ? splitChapters(example.novellaMarkdown).map(s => `## ${s.title}\n\n${s.body}`)
    : [];
  return demoSectionsCache;
}

// Health check and config status
app.get('/api/health', (req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
  res.json({
    status: 'ok',
    hasApiKey: hasKey,
    demoMode: !hasKey,
    model: 'gemini-2.5-flash',
    serverTime: new Date().toISOString()
  });
});

// GET /api/novellas — list of files from stories/output/
app.get('/api/novellas', async (req: Request, res: Response) => {
  try {
    const novellas = await getNovellasList();
    res.json({ novellas });
  } catch (error: any) {
    console.error('Error fetching novellas:', error);
    res.status(500).json({ error: error.message || 'Ошибка чтения списка новелл' });
  }
});

// GET /api/novellas/:filename — read single novella
app.get('/api/novellas/:filename', async (req: Request, res: Response) => {
  try {
    const novella = await getNovellaByFilename(req.params.filename);
    if (!novella) {
      return res.status(404).json({ error: 'Новелла не найдена' });
    }
    res.json({ novella });
  } catch (error: any) {
    console.error('Error reading novella:', error);
    res.status(500).json({ error: error.message || 'Ошибка чтения новеллы' });
  }
});

// POST /api/generate { story, genre }
app.post('/api/generate', generateLimiter, async (req: Request, res: Response) => {
  const { story, genre = 'авто' } = req.body;

  const storyError = validateStory(story);
  if (storyError) {
    return res.status(400).json({ error: storyError });
  }

  try {
    console.log(`[Generate] Received request, genre: ${genre}, story length: ${story.length}`);

    // Demo mode: no API key -> serve the bundled example novella,
    // but still run the real save + git commit pipeline
    const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
    let result;
    let demo = false;
    if (!hasKey) {
      const example = await getNovellaByFilename('example.md');
      if (!example) {
        return res.status(503).json({ error: 'Демо-режим: файл stories/output/example.md не найден, а ключ GEMINI_API_KEY не задан.' });
      }
      console.log('[Generate] Demo mode (no API key), serving example novella');
      result = {
        title: `[Демо] ${example.title}`,
        genreUsed: example.genreUsed,
        nameMap: example.nameMap,
        novellaMarkdown: example.novellaMarkdown
      };
      demo = true;
    } else {
      // 1. Call Gemini with system prompt from prompts/novella-system.md
      result = await generateNovella(story, genre);
      console.log(`[Generate] Generated: "${result.title}" (${result.genreUsed})`);
    }

    // 2. Autosave to stories/output/YYYY-MM-DD-slug.md
    const saved = await saveNovella({
      title: result.title,
      genreUsed: result.genreUsed,
      nameMap: result.nameMap,
      novellaMarkdown: result.novellaMarkdown,
      originalStory: story
    });
    console.log(`[Generate] Saved to: ${saved.filename}`);

    // 3. Git add + commit (push manual)
    const gitResult = await commitNovella(saved.fullPath, result.title);
    console.log(`[Generate] Git commit status:`, gitResult);

    // 4. Return result to frontend
    res.json({
      title: result.title,
      genreUsed: result.genreUsed,
      nameMap: result.nameMap,
      novellaMarkdown: result.novellaMarkdown,
      filename: saved.filename,
      gitCommit: gitResult,
      demo
    });
  } catch (error: any) {
    console.error('[Generate Error]:', error);
    res.status(500).json({
      error: error.message || 'Ошибка генерации новеллы'
    });
  }
});

// POST /api/plan { story, genre } — фаза 1: разбор + жанр + карта имен + структура
app.post('/api/plan', planLimiter, async (req: Request, res: Response) => {
  const { story, genre = 'авто' } = req.body;

  const storyError = validateStory(story);
  if (storyError) {
    return res.status(400).json({ error: storyError });
  }

  try {
    let plan: NovellaPlan;
    let demo = false;
    if (!hasApiKey()) {
      const demoPlan = await buildDemoPlan();
      if (!demoPlan) {
        return res.status(503).json({ error: 'Демо-режим: файл stories/output/example.md не найден, а ключ GEMINI_API_KEY не задан.' });
      }
      plan = demoPlan;
      demo = true;
    } else {
      plan = await createPlan(story, genre);
      console.log(`[Plan] Built: "${plan.title}" (${plan.genreUsed})`);
    }

    const planId = crypto.randomUUID();
    planSessions.set(planId, { story, genre, plan, createdAt: Date.now() });
    res.json({ planId, plan, demo });
  } catch (error: any) {
    console.error('[Plan Error]:', error);
    res.status(500).json({ error: error.message || 'Ошибка построения плана' });
  }
});

// POST /api/write { planId, nameMap? } — фаза 2: потоковая запись глав (NDJSON)
app.post('/api/write', writeLimiter, async (req: Request, res: Response) => {
  const { planId, nameMap } = req.body;

  const session = planId ? planSessions.get(String(planId)) : undefined;
  if (!session) {
    return res.status(404).json({ error: 'План не найден или устарел (сессии живут 30 минут). Постройте план заново.' });
  }

  // Правки карты имен от пользователя (меняются только имя и пояснение)
  if (Array.isArray(nameMap)) {
    session.plan.nameMap = session.plan.nameMap.map((item, i) => {
      const edited = nameMap[i];
      if (edited && typeof edited.novelName === 'string' && edited.novelName.trim()) {
        return {
          ...item,
          novelName: edited.novelName.trim().slice(0, 120),
          significance: typeof edited.significance === 'string' ? edited.significance : item.significance
        };
      }
      return item;
    });
  }

  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (event: Record<string, unknown>) => {
    try {
      res.write(JSON.stringify(event) + '\n');
    } catch {
      // клиент отключился
    }
  };

  const abort = new AbortController();
  req.on('close', () => abort.abort());

  const demo = !hasApiKey();

  try {
    const parts: string[] = [];
    const total = session.plan.chapters.length;

    for (let i = 0; i < total; i++) {
      if (abort.signal.aborted) return;
      send({ type: 'chapter_start', index: i, title: session.plan.chapters[i].title });

      let chapterText = '';
      if (demo) {
        const sections = await getDemoSections();
        const section = sections[Math.min(i, sections.length - 1)] || '';
        for (const piece of chunkText(section, 300)) {
          if (abort.signal.aborted) return;
          send({ type: 'chapter_delta', index: i, text: piece });
          await sleep(40);
        }
        chapterText = section;
      } else {
        for await (const delta of writeChapter(session.plan, i, session.story, parts.join('\n\n'), abort.signal)) {
          send({ type: 'chapter_delta', index: i, text: delta });
          chapterText += delta;
        }
      }

      if (!chapterText.trim()) {
        throw new Error(`Модель вернула пустую главу ${i + 1}`);
      }
      if (!/^##\s/m.test(chapterText.trimStart())) {
        chapterText = `## ${session.plan.chapters[i].title}\n\n${chapterText}`;
      }
      parts.push(chapterText.trim());
      send({ type: 'chapter_done', index: i });
    }

    const novellaMarkdown = parts.join('\n\n');
    const saved = await saveNovella({
      title: session.plan.title,
      genreUsed: session.plan.genreUsed,
      nameMap: session.plan.nameMap,
      novellaMarkdown,
      originalStory: session.story
    });
    const gitResult = await commitNovella(saved.fullPath, session.plan.title);
    planSessions.delete(String(planId));

    send({
      type: 'done',
      title: session.plan.title,
      genreUsed: session.plan.genreUsed,
      nameMap: session.plan.nameMap,
      novellaMarkdown,
      filename: saved.filename,
      gitCommit: gitResult,
      demo
    });
    res.end();
  } catch (error: any) {
    console.error('[Write Error]:', error);
    if (!abort.signal.aborted) {
      send({ type: 'error', message: error.message || 'Ошибка записи новеллы' });
    }
    res.end();
  }
});

// POST /api/interview/start (interviewStartLimiter), body { hint? }
app.post('/api/interview/start', interviewStartLimiter, async (req: Request, res: Response) => {
  const { hint } = req.body || {};
  const cleanHint = typeof hint === 'string' ? hint.trim().slice(0, 500) : '';

  try {
    const demo = !hasApiKey();
    const question = hasApiKey()
      ? await generateQuestion(cleanHint, [])
      : demoQuestion(0);

    const sessionId = crypto.randomUUID();
    interviewSessions.set(sessionId, {
      hint: cleanHint,
      currentQuestion: question,
      turns: [],
      createdAt: Date.now()
    });

    console.log('[Interview] start');
    res.json({
      sessionId,
      question,
      questionIndex: 1,
      maxQuestions: INTERVIEW_MAX_QUESTIONS,
      minAnswers: INTERVIEW_MIN_ANSWERS,
      demo
    });
  } catch (error: any) {
    console.error('[Interview Start Error]:', error);
    res.status(500).json({ error: error.message || 'Ошибка запуска интервью' });
  }
});

// POST /api/interview/answer (interviewAnswerLimiter), body { sessionId, answer?, finish? }
app.post('/api/interview/answer', interviewAnswerLimiter, async (req: Request, res: Response) => {
  const { sessionId, answer, finish } = req.body || {};

  const session = sessionId ? interviewSessions.get(String(sessionId)) : undefined;
  if (!session) {
    return res.status(404).json({ error: 'Интервью не найдено или устарело (сессии живут 30 минут).' });
  }

  const answerText = typeof answer === 'string' ? answer.trim() : '';
  if (answerText.length > 2000) {
    return res.status(400).json({ error: 'Ответ слишком длинный (максимум 2000 символов).' });
  }
  if (!finish && !answerText) {
    return res.status(400).json({ error: 'Напишите ответ.' });
  }

  if (answerText) {
    session.turns.push({ question: session.currentQuestion, answer: answerText });
  }

  const shouldFinish = finish === true || session.turns.length >= INTERVIEW_MAX_QUESTIONS;

  if (shouldFinish) {
    if (session.turns.length < INTERVIEW_MIN_ANSWERS) {
      return res.status(400).json({ error: 'Ответьте хотя бы на 3 вопроса, чтобы собрать историю.' });
    }

    try {
      const demo = !hasApiKey();
      const story = hasApiKey()
        ? await generateStory(session.hint, session.turns)
        : demoCompose(session.turns);

      interviewSessions.delete(String(sessionId));
      console.log('[Interview] composed');
      return res.json({
        done: true,
        story,
        answersCount: session.turns.length,
        demo
      });
    } catch (error: any) {
      console.error('[Interview Compose Error]:', error);
      return res.status(500).json({ error: error.message || 'Ошибка сборки истории' });
    }
  }

  try {
    const demo = !hasApiKey();
    const next = hasApiKey()
      ? await generateQuestion(session.hint, session.turns)
      : demoQuestion(session.turns.length);

    session.currentQuestion = next;
    console.log(`[Interview] answer ${session.turns.length}/${INTERVIEW_MAX_QUESTIONS}`);
    return res.json({
      done: false,
      question: next,
      questionIndex: session.turns.length + 1,
      maxQuestions: INTERVIEW_MAX_QUESTIONS,
      demo
    });
  } catch (error: any) {
    console.error('[Interview Question Error]:', error);
    return res.status(500).json({ error: error.message || 'Ошибка генерации вопроса' });
  }
});

// Unknown API routes -> JSON 404
app.use('/api', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Метод API не найден' });
});

// Serve production frontend build (single-container deploy).
// In dev (tsx) web/dist may be absent — static middleware then just passes through.
const webDist = path.join(projectRoot, 'web', 'dist');
app.use(express.static(webDist));

// SPA fallback: any non-API GET goes to index.html
app.get(/^\/(?!api\/).*/, (req: Request, res: Response, next) => {
  const indexPath = path.join(webDist, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    next();
  }
});

const server = app.listen(PORT, () => {
  console.log(`[Novella-Forger Server] Running on http://localhost:${PORT}`);
  console.log(`[Novella-Forger Server] API key configured: ${Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here')}`);
});

// Long generations (up to 7000 words) can exceed default request timeouts
server.requestTimeout = 10 * 60 * 1000;

// Graceful shutdown for docker / paas platforms
const shutdown = (signal: string) => {
  console.log(`[Novella-Forger Server] ${signal} received, shutting down...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
