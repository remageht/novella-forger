import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.basename(__dirname) === 'dist'
  ? path.resolve(__dirname, '..', '..')
  : path.resolve(__dirname, '..');

export async function commitNovella(filePath: string, title: string): Promise<{ success: boolean; message: string }> {
  try {
    const relativePath = path.relative(projectRoot, filePath).replace(/\\/g, '/');
    const commitMsg = `novella: ${title.replace(/["\\]/g, '')}`;
    
    // Stage the specific novella output file
    await execAsync(`git add "${relativePath}"`, { cwd: projectRoot });
    
    // Commit the file (push is manual as per specification)
    const { stdout, stderr } = await execAsync(`git commit -m "${commitMsg}"`, { cwd: projectRoot });
    return {
      success: true,
      message: stdout.trim() || stderr.trim() || 'Committed successfully'
    };
  } catch (error: any) {
    console.warn(`[Git Commit Warning]:`, error.message);
    return {
      success: false,
      message: error.message || 'Git commit failed'
    };
  }
}
