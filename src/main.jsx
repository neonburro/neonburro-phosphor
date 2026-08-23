// src/main.jsx
//
// Entry. Fonts, the theme, the app. Latin subsets only, same reasoning as the
// studio's main.jsx, the bare 400.css files register every subset fontsource
// ships and the build emits woff files nobody asks for. Japanese and the other
// scripts arrive with the language work and get their own face then.
//
// No oxford commas, no em dashes.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import '@fontsource/geist-sans/latin-400.css';
import '@fontsource/geist-sans/latin-500.css';
import '@fontsource/geist-sans/latin-600.css';
import '@fontsource/geist-mono/latin-400.css';
import '@fontsource/geist-mono/latin-500.css';
import theme from './theme';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ColorModeScript initialColorMode="dark" />
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </React.StrictMode>,
);
