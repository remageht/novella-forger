let speaking = false;
let stateListener: ((speaking: boolean) => void) | null = null;

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function splitIntoChunks(text: string, maxLength: number): string[] {
  const sentences = text.split(/(?<=[.!?…])\s+/);
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + ' ' + sentence).trim().length > maxLength && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = (current ? current + ' ' : '') + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export function speakText(markdown: string, onStateChange?: (speaking: boolean) => void): void {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  stateListener = onStateChange || null;
  speaking = true;
  stateListener?.(true);

  const chunks = splitIntoChunks(stripMarkdown(markdown), 1200);
  let index = 0;

  const speakNext = () => {
    if (!speaking) return;
    if (index >= chunks.length) {
      speaking = false;
      stateListener?.(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(chunks[index++]);
    utterance.lang = 'ru-RU';
    utterance.rate = 1;
    utterance.onend = speakNext;
    utterance.onerror = speakNext;
    window.speechSynthesis.speak(utterance);
  };

  speakNext();
}

export function stopSpeaking(): void {
  if (!isSpeechSupported()) return;
  speaking = false;
  window.speechSynthesis.cancel();
  stateListener?.(false);
}

export function isSpeaking(): boolean {
  return speaking;
}
