import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
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
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleClearCacheAndReset = () => {
    localStorage.clear();
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-red-900/10 text-red-500 p-4 text-center">
          <AlertCircle size={48} className="mb-4" />
          <h1 className="text-2xl font-bold mb-2">应用程序崩溃了！</h1>
          <p className="text-sm mb-4 max-w-md">
            抱歉，StreamHub 遇到了一个意外错误。这可能是由于本地缓存数据损坏或代码问题。
          </p>
          {this.state.error && (
            <pre className="bg-red-900/20 p-3 rounded-lg text-xs text-left max-w-lg overflow-x-auto mb-4">
              <code>{this.state.error.message}</code>
            </pre>
          )}
          <button
            onClick={this.handleClearCacheAndReset}
            className="px-6 py-3 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} /> 清除缓存并重置
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

