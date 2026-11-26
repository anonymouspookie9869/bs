import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Portfolio ErrorBoundary caught an error:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0B0D] text-[#F4F2EC] flex items-center justify-center p-6">
          <div className="max-w-md w-full border border-white/10 bg-[#141418] rounded-2xl p-8">
            <div className="flex items-center gap-3 text-[#E53935] mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" aria-hidden="true" />
              <h1 className="text-xl font-semibold tracking-tight text-[#F4F2EC]">
                Something went wrong
              </h1>
            </div>
            <p className="text-sm text-[#A6A4AE] leading-relaxed mb-6">
              The portfolio hit an unexpected display error. Reloading restores the full experience cleanly.
            </p>
            <div className="text-xs font-mono text-[#8C8A94] bg-[#0B0B0D] border border-white/8 rounded-lg p-3 mb-6 break-words">
              {this.state.errorMessage}
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#E53935] hover:bg-[#D32F2F] text-white text-sm font-medium transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Reload Portfolio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
