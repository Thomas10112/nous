import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { StoreProvider } from './data/store'
import './styles/global.css'
import './components/ui/ui.css'
import './pages/pages.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* HashRouter : le site fonctionne partout (Netlify, Vercel, GitHub
        Pages, un simple dossier) sans configuration serveur. */}
    <HashRouter>
      <StoreProvider>
        <App />
      </StoreProvider>
    </HashRouter>
  </StrictMode>,
)
