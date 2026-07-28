import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import { ScrollToTop } from './components/ScrollToTop'
import { appBasePath } from './config/paths'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={appBasePath()}>
      <ScrollToTop />
      <App />
    </BrowserRouter>
  </StrictMode>,
)
