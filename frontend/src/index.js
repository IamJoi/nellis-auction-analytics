import React from 'react';
import ReactDOM from 'react-dom';
import App from './App.jsx';

document.body.style.margin = '0';
document.body.style.background = '#1a1a2e';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
