import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Flare es dark-only: la variante `dark:` de Tailwind v4 es por clase
// (@custom-variant dark en index.css). Se fija aquí además de en index.html
// por si algo reescribe el atributo.
document.documentElement.classList.add('dark')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
