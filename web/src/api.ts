import { GenerateResponse, NovellaItem, NameMapItem, PlanResponse, WriteEvent, WriteDoneEvent } from './types';

const GENERATE_TIMEOUT_MS = 10 * 60 * 1000;
const PLAN_TIMEOUT_MS = 3 * 60 * 1000;

export async function createPlanApi(story: string, genre: string): Promise<PlanResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PLAN_TIMEOUT_MS);

  try {
    const response = await fetch('/api/plan', {
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
      throw new Error('Превышено время ожидания построения плана (3 минуты). Попробуйте ещё раз.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function writeNovellaApi(
  planId: string,
  nameMap: NameMapItem[],
  onEvent: (event: WriteEvent) => void
): Promise<WriteDoneEvent> {
  const response = await fetch('/api/write', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ planId, nameMap })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Ошибка сервера (${response.status})`);
  }
  if (!response.body) {
    throw new Error('Сервер не вернул поток данных');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line) continue;

      const event = JSON.parse(line) as WriteEvent;
      onEvent(event);
      if (event.type === 'done') return event;
      if (event.type === 'error') throw new Error(event.message || 'Ошибка записи новеллы');
    }
  }

  throw new Error('Поток завершился без результата');
}

// Legacy: одношаговая генерация без плана (POST /api/generate)
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
