import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminPanel } from './components/AdminPanel';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminPanel />
  </StrictMode>
);
