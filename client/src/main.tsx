import '@skbkontur/react-ui/';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { LIGHT_THEME, ThemeContext } from '@skbkontur/react-ui';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeContext.Provider value={LIGHT_THEME}>
      <App />
    </ThemeContext.Provider>
  </React.StrictMode>,
);
