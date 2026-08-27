import React from "react";
import ReactDOM from "react-dom/client";
import "../src/styles.css";
import RutinaTracker from "../App.jsx";
// Register service worker for PWA support
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({ onNeedRefresh() {}, onOfflineReady() {} });

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111214', color: '#f5f5f5', fontFamily: 'sans-serif', padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <h2 style={{ fontSize: 24, marginBottom: 12 }}>Algo salió mal, recargá la página</h2>
            {import.meta.env.DEV && this.state.error && (
              <pre style={{ whiteSpace: 'pre-wrap', color: '#fca5a5', fontSize: 12, textAlign: 'left', background: '#1f1f23', padding: 12, borderRadius: 8 }}>
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RutinaTracker />
    </ErrorBoundary>
  </React.StrictMode>
);
