import React, { PropsWithChildren } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { GoogleMapsProvider } from './context/GoogleMapsContext';
import { BrandProvider } from './context/BrandContext';
import './index.css';

// Kakao initialization
const kakaoKey = import.meta.env.VITE_KAKAO_JS_KEY;
if (kakaoKey && (window as any).Kakao && !(window as any).Kakao.isInitialized()) {
  (window as any).Kakao.init(kakaoKey);
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, {hasError: boolean}> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) { console.error("App crash:", error); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{padding: 40, textAlign: 'center'}}>
          <p>앱 로딩 중 문제가 발생했습니다. 새로고침 해주세요.</p>
          <button onClick={() => window.location.reload()}>새로고침</button>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");

try {
  createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <ThemeProvider>
              <LanguageProvider>
                <BrandProvider>
                  <GoogleMapsProvider>
                    <App />
                  </GoogleMapsProvider>
                </BrandProvider>
              </LanguageProvider>
            </ThemeProvider>
          </AuthProvider>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log("App mounted successfully");
} catch (error) {
  console.error("Critical mounting error:", error);
}
