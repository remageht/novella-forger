import { GoogleGenAI, Type } from '@google/genai';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NameMapItem } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const systemPromptPath = path.join(projectRoot, 'prompts', 'novella-system.md');

export interface GenerateResult {
  title: string;
  genreUsed: string;
  nameMap: NameMapItem[];
  novellaMarkdown: string;
}

export async function generateNovella(story: string, genre: string): Promise<GenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('Ключ GEMINI_API_KEY не задан. Укажите ваш ключ в файле .env (получить ключ можно на https://aistudio.google.com/)');
  }

  // Load system prompt from prompts/novella-system.md
  const systemPrompt = await fs.readFile(systemPromptPath, 'utf-8');

  const ai = new GoogleGenAI({ apiKey });

  let userPrompt = `РЕАЛЬНАЯ ИСТОРИЯ ЧЕЛОВЕКА:\n"""\n${story.trim()}\n"""\n\n`;
  if (genre && genre !== 'авто') {
    userPrompt += `ПОЖЕЛАНИЕ ПО ЖАНРУ: "${genre}". Используй этот жанр как основной доминант мира.\n`;
  } else {
    userPrompt += `ЖАНР: Выбери наилучший жанр-доминант + подслой автоматически согласно правилам Хрониста.\n`;
  }
  userPrompt += `\nСледуй строго всем 6 шагам Хрониста. Напиши масштабную новеллу со всеми частями (Пролог: Врата, Глава 1, Глава 2, Глава 3: Трибуляция, Глава 4: Цена, Эпилог: Отголосок) и верни результат строго в JSON.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      responseJsonSchema: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: 'Художественное название новеллы'
          },
          genreUsed: {
            type: Type.STRING,
            description: 'Использованный жанр и подслой'
          },
          nameMap: {
            type: Type.ARRAY,
            description: 'Карта имен: реальная роль -> имя в новелле [Суть поступка + ранг]',
            items: {
              type: Type.OBJECT,
              properties: {
                originalRole: { type: Type.STRING, description: 'Человек или роль в реальной истории' },
                novelName: { type: Type.STRING, description: 'Имя в новелле по формуле [Суть поступка + ранг]' },
                significance: { type: Type.STRING, description: 'За какой поступок или роль дано имя' }
              },
              required: ['originalRole', 'novelName']
            }
          },
          novellaMarkdown: {
            type: Type.STRING,
            description: 'Полный текст новеллы с главами и метафорами мира'
          }
        },
        required: ['title', 'genreUsed', 'nameMap', 'novellaMarkdown']
      }
    }
  });

  const text = response.text;
  if (!text) {
    throw new Error('Gemini вернул пустой ответ');
  }

  try {
    // Clean possible markdown code fences if any
    const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    return {
      title: parsed.title || 'Безымянная хроника',
      genreUsed: parsed.genreUsed || genre || 'Хроника мира',
      nameMap: Array.isArray(parsed.nameMap) ? parsed.nameMap : [],
      novellaMarkdown: parsed.novellaMarkdown || ''
    };
  } catch (parseError: any) {
    console.error('JSON Parse error:', parseError, 'Raw response:', text);
    throw new Error(`Ошибка обработки ответа модели в JSON: ${parseError.message}`);
  }
}
