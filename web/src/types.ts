export interface NameMapItem {
  originalRole: string;
  novelName: string;
  significance?: string;
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
  gitCommit?: {
    success: boolean;
    message: string;
  };
}

export interface GenerateResponse {
  title: string;
  genreUsed: string;
  nameMap: NameMapItem[];
  novellaMarkdown: string;
  filename: string;
  demo?: boolean;
  gitCommit?: {
    success: boolean;
    message: string;
  };
}

export const GENRE_OPTIONS = [
  'авто',
  'культивация',
  'исекай/трансмиграция/переселение душ',
  'постапокалипсис',
  'маго-индустриализация',
  'магия'
] as const;

export type GenreType = typeof GENRE_OPTIONS[number];

export interface PlanChapter {
  title: string;
  summary: string;
}

export interface NovellaPlan {
  title: string;
  genreUsed: string;
  events: string[];
  emotion: string;
  moral: string;
  nameMap: NameMapItem[];
  chapters: PlanChapter[];
}

export interface PlanResponse {
  planId: string;
  plan: NovellaPlan;
  demo?: boolean;
}

export type WriteEvent =
  | { type: 'chapter_start'; index: number; title: string }
  | { type: 'chapter_delta'; index: number; text: string }
  | { type: 'chapter_done'; index: number }
  | {
      type: 'done';
      title: string;
      genreUsed: string;
      nameMap: NameMapItem[];
      novellaMarkdown: string;
      filename: string;
      gitCommit?: { success: boolean; message: string };
      demo: boolean;
    }
  | { type: 'error'; message: string };

export type WriteDoneEvent = Extract<WriteEvent, { type: 'done' }>;

export interface InterviewTurn {
  question: string;
  answer: string;
}

export interface InterviewStartResponse {
  sessionId: string;
  question: string;
  questionIndex: number;
  maxQuestions: number;
  minAnswers: number;
  demo: boolean;
}

export type InterviewAnswerResponse =
  | { done: false; question: string; questionIndex: number; maxQuestions: number; demo: boolean }
  | { done: true; story: string; answersCount: number; demo: boolean };
