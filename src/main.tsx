import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { GoogleMapsProvider } from './context/GoogleMapsContext';
import './index.css';

console.log("App starting...");

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");

try {
  createRoot(rootElement).render(
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            <GoogleMapsProvider>
              <App />
            </GoogleMapsProvider>
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
  console.log("App mounted successfully");
} catch (error) {
  console.error("Critical mounting error:", error);
}
// main.tsx
const kakaoKey = import.meta.env.VITE_KAKAO_JS_KEY;
if (kakaoKey && (window as any).Kakao && !(window as any).Kakao.isInitialized()) {
  (window as any).Kakao.init(kakaoKey);
}
