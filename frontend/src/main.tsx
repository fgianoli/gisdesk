import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AppSettingsProvider } from './context/AppSettingsContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AppSettingsProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </AppSettingsProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
