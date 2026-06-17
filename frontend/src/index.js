import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

document.body.style.margin = '0';
document.body.style.background = '#F5F5F5';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
