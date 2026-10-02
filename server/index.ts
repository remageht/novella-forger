import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateNovella } from './gemini.js';
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

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Anti-abuse: generation burns Gemini quota, max 10/hour per IP
const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Слишком много генераций. Лимит 10 в час с одного IP, попробуйте позже.' }
});

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

  if (!story || typeof story !== 'string' || story.trim().length < 20) {
    return res.status(400).json({
      error: 'Пожалуйста, вставьте реальную историю (хотя бы несколько предложений).'
    });
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

// Serve production frontend build (single-container deploy).
// In dev (tsx) web/dist may be absent — static middleware then just passes through.
app.use(express.static(path.join(projectRoot, 'web', 'dist')));

app.listen(PORT, () => {
  console.log(`[Novella-Forger Server] Running on http://localhost:${PORT}`);
  console.log(`[Novella-Forger Server] API key configured: ${Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here')}`);
});
