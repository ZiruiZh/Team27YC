import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/base.css'
import './styles/app.css'
import App from './App.tsx'
import { KitchenProvider } from './state/kitchen.tsx'
import { ConversationProvider } from '@elevenlabs/react'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KitchenProvider>
      <ConversationProvider>
        <App />
      </ConversationProvider>
    </KitchenProvider>
  </StrictMode>,
)
