import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.tsx'

const queryClient = new QueryClient();

// Prevent mouse scroll from changing number input values globally
document.addEventListener("wheel", function() {
  if (document.activeElement instanceof HTMLInputElement && document.activeElement.type === "number") {
      document.activeElement.blur();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
