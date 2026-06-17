import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

document.body.style.margin = '0';
document.body.style.background = '#1a1a2e';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
