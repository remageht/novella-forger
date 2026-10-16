import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-stone-900 border border-rose-500/30 rounded-2xl p-8 text-center shadow-2xl">
            <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-stone-100 mb-2 font-cinzel">
              Что-то пошло не так
            </h1>
            <p className="text-sm text-stone-400 mb-6 break-words">
              {this.state.error.message || 'Непредвиденная ошибка интерфейса'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-all shadow-md shadow-amber-900/30"
            >
              Перезагрузить страницу
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
