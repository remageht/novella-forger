import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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

// Health check and config status
app.get('/api/health', (req: Request, res: Response) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here');
  res.json({
    status: 'ok',
    hasApiKey: hasKey,
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
app.post('/api/generate', async (req: Request, res: Response) => {
  const { story, genre = 'авто' } = req.body;

  if (!story || typeof story !== 'string' || story.trim().length < 20) {
    return res.status(400).json({
      error: 'Пожалуйста, вставьте реальную историю (хотя бы несколько предложений).'
    });
  }

  try {
    console.log(`[Generate] Received request, genre: ${genre}, story length: ${story.length}`);
    
    // 1. Call Gemini with system prompt from prompts/novella-system.md
    const result = await generateNovella(story, genre);
    console.log(`[Generate] Generated: "${result.title}" (${result.genreUsed})`);

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
      gitCommit: gitResult
    });
  } catch (error: any) {
    console.error('[Generate Error]:', error);
    res.status(500).json({
      error: error.message || 'Ошибка генерации новеллы'
    });
  }
});

app.listen(PORT, () => {
  console.log(`[Novella-Forger Server] Running on http://localhost:${PORT}`);
  console.log(`[Novella-Forger Server] API key configured: ${Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here')}`);
});
