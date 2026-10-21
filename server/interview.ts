import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasApiKey } from './planner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.basename(__dirname) === 'dist'
  ? path.resolve(__dirname, '..', '..')
  : path.resolve(__dirname, '..');

const interviewSystemPromptPath = path.join(projectRoot, 'prompts', 'interview-system.md');

function requireApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'your_gemini_api_key_here') {
    throw new Error('Ключ GEMINI_API_KEY не задан. Укажите ваш ключ в файле .env (получить ключ можно на https://aistudio.google.com/)');
  }
  return key;
}

export interface InterviewTurn {
  question: string;
  answer: string;
}

export interface InterviewSession {
  hint: string;
  currentQuestion: string;
  turns: InterviewTurn[];
  createdAt: number;
}

export const INTERVIEW_MIN_ANSWERS = 3;
export const INTERVIEW_MAX_QUESTIONS = 6;

const DEMO_QUESTIONS = [
  'Расскажи коротко о себе: чем ты занимался до того, как всё изменилось?',
  'Что именно случилось? Опиши главное событие или конфликт.',
  'Кто был рядом в этот момент и как он повёл себя?',
  'Какой момент оказался самым тяжёлым?',
  'Чем тебе пришлось заплатить за этот опыт и что ты понял?',
  'Чем всё закончилось? Где ты сейчас?'
];

export function demoQuestion(index: number): string {
  const i = Math.max(0, Math.min(index, DEMO_QUESTIONS.length - 1));
  return DEMO_QUESTIONS[i];
}

export function demoCompose(turns: InterviewTurn[]): string {
  return turns
    .map(t => t.answer.trim())
    .filter(a => a.length > 0)
    .map(a => (/[.!?]$/.test(a) ? a : `${a}.`))
    .join(' ');
}

export async function generateQuestion(hint: string, turns: InterviewTurn[]): Promise<string> {
  const apiKey = requireApiKey();
  const systemPrompt = await fs.readFile(interviewSystemPromptPath, 'utf-8');

  const ai = new GoogleGenAI({ apiKey });

  const turnsText = turns.length > 0
    ? turns.map(t => `В: ${t.question}\nО: ${t.answer}`).join('\n\n')
    : '—';

  const userPrompt = [
    'КОНТЕКСТ ИНТЕРВЬЮ',
    `ПОДСКАЗКА ПОЛЬЗОВАТЕЛЯ: ${hint.trim() || '—'}`,
    'УЖЕ РАССКАЗАНО:',
    turnsText,
    'ЗАДАЙ СЛЕДУЮЩИЙ ВОПРОС (только текст вопроса, без нумерации и вступлений).'
  ].join('\n\n');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 200
    }
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error('Хронист не смог задать вопрос');
  }
  return text;
}

export async function generateStory(hint: string, turns: InterviewTurn[]): Promise<string> {
  const apiKey = requireApiKey();
  const systemPrompt = await fs.readFile(interviewSystemPromptPath, 'utf-8');

  const ai = new GoogleGenAI({ apiKey });

  const turnsText = turns.length > 0
    ? turns.map(t => `В: ${t.question}\nО: ${t.answer}`).join('\n\n')
    : '—';

  const userPrompt = [
    'СОБЕРИ ИСТОРИЮ',
    `ПОДСКАЗКА ПОЛЬЗОВАТЕЛЯ: ${hint.trim() || '—'}`,
    'ОТВЕТЫ:',
    turnsText,
    'Выведи только текст истории (5–8 предложений).'
  ].join('\n\n');

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 1200
    }
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error('Хронист не смог собрать историю');
  }
  return text;
}
