import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 rounded-2xl bg-neu-surface border border-rose-500/30 text-rose-800 dark:text-rose-200 shadow-neu-raised my-4 space-y-3">
          <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-bold">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{this.props.fallbackTitle || 'Component Error'}</span>
          </div>
          <p className="text-xs text-rose-700 dark:text-rose-300 font-mono bg-neu-sunken p-3 rounded-xl border border-rose-500/20 shadow-neu-inset-sm">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3.5 py-2 rounded-xl bg-neu-surface hover:bg-neu-hover border border-rose-500/40 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center space-x-1.5 shadow-neu-raised-sm hover:shadow-neu-raised transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
