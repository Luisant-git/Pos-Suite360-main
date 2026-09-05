import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { Toaster } from 'react-hot-toast';
import { SettingsProvider } from './contexts/SettingsContext';

import UpiRedirect from './pages/UpiRedirect';

function App() {
  const isPayRoute = window.location.search.includes('pa=') && window.location.search.includes('pn=');
  
  if (isPayRoute) {
    return (
      <BrowserRouter>
        <UpiRedirect />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" containerClassName="print:hidden" />
      <SettingsProvider>
        <AppRoutes />
      </SettingsProvider>
    </BrowserRouter>
  );
}

export default App;
