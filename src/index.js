import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import App from './App';

// Create a root
const root = createRoot(document.getElementById('root'));

// Render your app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);