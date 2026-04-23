import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', maxWidth: 480, margin: '4rem auto' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Something went wrong</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
