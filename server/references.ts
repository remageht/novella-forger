import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.basename(__dirname) === 'dist'
  ? path.resolve(__dirname, '..', '..')
  : path.resolve(__dirname, '..');

const referencesDir = path.join(projectRoot, 'references');

const SHARED_REF_FILES = ['metafora-katalog.md', 'imena.md'];
const ALL_GENRE_REF_FILES = ['kultivacia.md', 'isekai.md', 'postapokalipsis.md', 'mago-industria.md', 'magiya.md'];

export function genreRefFiles(genre: string): string[] {
  const g = (genre || '').toLowerCase();
  const files: string[] = [];
  if (g.includes('культивац')) files.push('kultivacia.md');
  if (g.includes('исекай') || g.includes('трансмиграц') || g.includes('переселен')) files.push('isekai.md');
  if (g.includes('постап')) files.push('postapokalipsis.md');
  if (g.includes('индустриал')) files.push('mago-industria.md');
  if (g.includes('магия') || g.includes('магичес')) files.push('magiya.md');
  return files.length > 0 ? files : ALL_GENRE_REF_FILES;
}

// Genre reference materials are read fresh on every request:
// editing files under references/ applies without a server restart.
export async function loadReferences(genre: string): Promise<string> {
  const files = [...SHARED_REF_FILES, ...genreRefFiles(genre)];
  const parts: string[] = [];
  for (const file of files) {
    try {
      const content = await fs.readFile(path.join(referencesDir, file), 'utf-8');
      parts.push(`#### ${file}\n${content.trim()}`);
    } catch {
      // Missing reference file — generation continues without it
    }
  }
  return parts.join('\n\n');
}
