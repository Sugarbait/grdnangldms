
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Intercept Microsoft OAuth redirect before HashRouter processes the hash.
// Microsoft returns: http://localhost:3000/#id_token=xxx&token_type=bearer...
// We rewrite it to: http://localhost:3000/#/login?ms_token=xxx
// so HashRouter routes to Login and the token is accessible.
const hash = window.location.hash;
if (hash && hash.includes('id_token=') && !hash.startsWith('#/')) {
  const params = new URLSearchParams(hash.substring(1)); // remove leading #
  const idToken = params.get('id_token');
  if (idToken) {
    window.history.replaceState(null, '', window.location.pathname + `#/login?ms_token=${encodeURIComponent(idToken)}`);
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
