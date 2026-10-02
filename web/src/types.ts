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
