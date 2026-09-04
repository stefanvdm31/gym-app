import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const wortel = document.getElementById('root')
if (wortel === null) {
  document.body.innerHTML =
    '<p style="padding:24px;font-family:sans-serif">De app kon niet starten: het startpunt ontbreekt.</p>'
} else {
  createRoot(wortel).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
