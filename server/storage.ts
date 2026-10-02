import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.basename(__dirname) === 'dist'
  ? path.resolve(__dirname, '..', '..')
  : path.resolve(__dirname, '..');
const outputDir = path.join(projectRoot, 'stories', 'output');

export interface NameMapItem {
  originalRole: string;
  novelName: string;
  significance?: string;
}

export interface NovellaData {
  title: string;
  genreUsed: string;
  nameMap: NameMapItem[];
  novellaMarkdown: string;
  originalStory: string;
}

export interface NovellaItem {
  filename: string;
  title: string;
  genreUsed: string;
  date: string;
  nameMap: NameMapItem[];
  snippet: string;
  novellaMarkdown: string;
  fullContent: string;
}

// Simple Cyrillic transliteration for clean slugs
const cyrillicMap: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
  'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
  'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
  'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
  'я': 'ya'
};

export function createSlug(text: string): string {
  const lower = text.toLowerCase();
  let result = '';
  for (const char of lower) {
    if (cyrillicMap[char] !== undefined) {
      result += cyrillicMap[char];
    } else if (/[a-z0-9]/.test(char)) {
      result += char;
    } else if (char === ' ' || char === '-' || char === '_') {
      result += '-';
    }
  }
  return result.replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'novella';
}

export async function saveNovella(data: NovellaData): Promise<{ filename: string; fullPath: string; fullContent: string }> {
  await fs.mkdir(outputDir, { recursive: true });

  const today = new Date().toISOString().slice(0, 10);
  const slug = createSlug(data.title);
  let filename = `${today}-${slug}.md`;
  let fullPath = path.join(outputDir, filename);

  // If file already exists with same name today, add numeric suffix
  let counter = 1;
  while (fsSync.existsSync(fullPath)) {
    filename = `${today}-${slug}-${counter}.md`;
    fullPath = path.join(outputDir, filename);
    counter++;
  }

  // Format name map
  const nameMapLines = (data.nameMap || []).map(item => {
    const orig = item.originalRole || 'Образ';
    const novel = item.novelName || 'Неизвестный';
    const sig = item.significance ? ` (${item.significance})` : '';
    return `- ${orig} → **${novel}**${sig}`;
  }).join('\n');

  // Format short original summary (first 2-3 lines of story)
  const shortStory = data.originalStory
    .split('\n')
    .filter(l => l.trim().length > 0)
    .slice(0, 3)
    .join(' ');

  const fullContent = [
    `# ${data.title}`,
    '',
    `**Жанр:** ${data.genreUsed}  `,
    `**Дата создания:** ${today}  `,
    '',
    '### Карта имен',
    nameMapLines || '- Нет отображения имен',
    '',
    '### Исходная суть',
    `> ${shortStory}`,
    '',
    '---',
    '',
    data.novellaMarkdown.trim()
  ].join('\n');

  await fs.writeFile(fullPath, fullContent, 'utf-8');

  return { filename, fullPath, fullContent };
}

export async function getNovellasList(): Promise<NovellaItem[]> {
  await fs.mkdir(outputDir, { recursive: true });
  const entries = await fs.readdir(outputDir);
  const mdFiles = entries.filter(f => f.endsWith('.md'));

  const novellas: NovellaItem[] = [];

  for (const filename of mdFiles) {
    const fullPath = path.join(outputDir, filename);
    const content = await fs.readFile(fullPath, 'utf-8');

    // Parse header and content
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : filename.replace(/\.md$/, '');

    const genreMatch = content.match(/\*\*Жанр:\*\*\s*(.+?)(\s{2}|$|\n)/);
    const genreUsed = genreMatch ? genreMatch[1].trim() : 'Не указан';

    const dateMatch = content.match(/\*\*Дата создания:\*\*\s*(.+?)(\s{2}|$|\n)/);
    const date = dateMatch ? dateMatch[1].trim() : filename.slice(0, 10);

    // Parse nameMap
    const nameMap: NameMapItem[] = [];
    const nameMapSection = content.match(/### Карта имен\n([\s\S]*?)(?=### Исходная суть|---|$)/);
    if (nameMapSection) {
      const lines = nameMapSection[1].split('\n');
      for (const line of lines) {
        const itemMatch = line.match(/^-\s*(.+?)\s*→\s*\*\*(.+?)\*\*(?:\s*\((.*?)\))?/);
        if (itemMatch) {
          nameMap.push({
            originalRole: itemMatch[1].trim(),
            novelName: itemMatch[2].trim(),
            significance: itemMatch[3] ? itemMatch[3].trim() : undefined
          });
        }
      }
    }

    // Split markdown at '---' delimiter to separate header from novella body
    const parts = content.split(/\n---\n/);
    const novellaMarkdown = parts.length > 1 ? parts.slice(1).join('\n---\n').trim() : content;

    // First paragraph as snippet
    const snippetMatch = novellaMarkdown.match(/(?:##\s+[^\n]+\n+)?([^#\n][^\n]+)/);
    const snippet = snippetMatch ? snippetMatch[1].slice(0, 200) + '...' : 'Текст новеллы...';

    novellas.push({
      filename,
      title,
      genreUsed,
      date,
      nameMap,
      snippet,
      novellaMarkdown,
      fullContent: content
    });
  }

  // Sort by date / filename descending (newest first)
  novellas.sort((a, b) => b.filename.localeCompare(a.filename));

  return novellas;
}

export async function getNovellaByFilename(filename: string): Promise<NovellaItem | null> {
  const safeFilename = path.basename(filename);
  const fullPath = path.join(outputDir, safeFilename);

  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : safeFilename.replace(/\.md$/, '');

    const genreMatch = content.match(/\*\*Жанр:\*\*\s*(.+?)(\s{2}|$|\n)/);
    const genreUsed = genreMatch ? genreMatch[1].trim() : 'Не указан';

    const dateMatch = content.match(/\*\*Дата создания:\*\*\s*(.+?)(\s{2}|$|\n)/);
    const date = dateMatch ? dateMatch[1].trim() : safeFilename.slice(0, 10);

    const nameMap: NameMapItem[] = [];
    const nameMapSection = content.match(/### Карта имен\n([\s\S]*?)(?=### Исходная суть|---|$)/);
    if (nameMapSection) {
      const lines = nameMapSection[1].split('\n');
      for (const line of lines) {
        const itemMatch = line.match(/^-\s*(.+?)\s*→\s*\*\*(.+?)\*\*(?:\s*\((.*?)\))?/);
        if (itemMatch) {
          nameMap.push({
            originalRole: itemMatch[1].trim(),
            novelName: itemMatch[2].trim(),
            significance: itemMatch[3] ? itemMatch[3].trim() : undefined
          });
        }
      }
    }

    const parts = content.split(/\n---\n/);
    const novellaMarkdown = parts.length > 1 ? parts.slice(1).join('\n---\n').trim() : content;
    const snippetMatch = novellaMarkdown.match(/(?:##\s+[^\n]+\n+)?([^#\n][^\n]+)/);
    const snippet = snippetMatch ? snippetMatch[1].slice(0, 200) + '...' : '';

    return {
      filename: safeFilename,
      title,
      genreUsed,
      date,
      nameMap,
      snippet,
      novellaMarkdown,
      fullContent: content
    };
  } catch {
    return null;
  }
}
