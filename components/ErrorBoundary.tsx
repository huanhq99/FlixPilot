import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900 p-4 font-sans">
          <div className="max-w-md w-full bg-white dark:bg-zinc-800 rounded-2xl shadow-xl p-6 border border-red-100 dark:border-red-900/30">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-500 mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h2 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
              应用遇到了一些问题
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
              我们检测到了一个意料之外的错误导致页面崩溃。
            </p>
            
            <div className="bg-gray-100 dark:bg-black/30 p-4 rounded-lg mb-6 overflow-auto max-h-40">
              <code className="text-xs text-red-600 dark:text-red-400 font-mono break-all">
                {this.state.error?.message || 'Unknown Error'}
              </code>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors"
              >
                清除缓存并重置
              </button>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

