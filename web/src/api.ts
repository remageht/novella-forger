import { GenerateResponse, NovellaItem } from './types';

const GENERATE_TIMEOUT_MS = 10 * 60 * 1000;

export async function generateNovellaApi(story: string, genre: string): Promise<GenerateResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GENERATE_TIMEOUT_MS);

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ story, genre }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Ошибка сервера (${response.status})`);
    }

    return response.json();
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('Превышено время ожидания генерации (10 минут). Попробуйте ещё раз.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchNovellasApi(): Promise<NovellaItem[]> {
  const response = await fetch('/api/novellas');
  if (!response.ok) {
    throw new Error('Не удалось загрузить список новелл');
  }
  const data = await response.json();
  return data.novellas || [];
}

export async function fetchNovellaApi(filename: string): Promise<NovellaItem> {
  const response = await fetch(`/api/novellas/${encodeURIComponent(filename)}`);
  if (!response.ok) {
    throw new Error('Не удалось загрузить новеллу');
  }
  const data = await response.json();
  return data.novella;
}

export async function checkHealthApi(): Promise<{ status: string; hasApiKey: boolean; model: string }> {
  try {
    const response = await fetch('/api/health');
    if (!response.ok) {
      return { status: 'error', hasApiKey: false, model: 'gemini-2.5-flash' };
    }
    return response.json();
  } catch {
    return { status: 'error', hasApiKey: false, model: 'gemini-2.5-flash' };
  }
}
