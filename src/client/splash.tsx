import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Launchpad } from './components/Launchpad';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Launchpad />
  </StrictMode>
);
