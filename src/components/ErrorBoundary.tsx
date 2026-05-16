import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="center-screen">
          <h1 className="error-title">ЧТО-ТО ПОШЛО НЕ ТАК</h1>
          <pre>{this.state.error.message}</pre>
          <button
            className="btn-pixel"
            onClick={() => this.setState({ error: null })}
          >ПОВТОРИТЬ</button>
        </div>
      );
    }
    return this.props.children;
  }
}
