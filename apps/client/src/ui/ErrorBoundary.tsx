import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '../i18n';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

/** Catches render/runtime errors (including WebGL failures) and offers a safe way back. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[SkyForce] Unhandled error', error, info.componentStack);
  }

  override render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const webgl = /webgl|context/i.test(error.message);
    return (
      <div className="screen" role="alert">
        <div className="bg-gradient" />
        <div className="panel center-box">
          <div style={{ fontSize: 40 }}>⚠️</div>
          <h2 style={{ fontFamily: 'var(--font-display)' }}>{t('app.error.title')}</h2>
          <p style={{ lineHeight: 1.6 }}>{webgl ? t('app.error.webgl') : t('app.error.body')}</p>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              this.setState({ error: null });
              this.props.onReset?.();
            }}
          >
            {t('app.error.back')}
          </button>
        </div>
      </div>
    );
  }
}
