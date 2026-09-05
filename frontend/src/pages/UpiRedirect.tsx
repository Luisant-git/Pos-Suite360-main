import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const UpiRedirect = () => {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pa = params.get('pa');
    
    if (pa) {
      const pn = params.get('pn') || '';
      const tr = params.get('tr') || '';
      const am = params.get('am') || '';
      const cu = params.get('cu') || 'INR';
      
      const upiUrl = `upi://pay?pa=${pa}&pn=${encodeURIComponent(pn)}&tr=${tr}&am=${am}&cu=${cu}`;
      
      // Give a slight delay so the UI renders before the browser intercept occurs
      setTimeout(() => {
        window.location.href = upiUrl;
      }, 500);
    }
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full border border-gray-100">
        <div className="mb-4">
          <svg className="w-16 h-16 text-[#059669] mx-auto animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Redirecting to Payment...</h2>
        <div className="mb-6 flex flex-col items-center">
          <p className="text-gray-600 text-sm mb-3">Please complete the payment in your UPI app:</p>
          <div className="flex items-center justify-center gap-3">
            {/* GPay */}
            <div className="flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-md w-14 h-10 px-2 py-1 relative">
              <svg viewBox="0 0 256 256" className="w-full h-full object-contain">
                <path fill="#4285F4" d="M256,130.6c0-7.8-0.7-15.4-2.1-22.6H130.8v45.1h71.6c-3.1,15.1-12,28-24.9,36.7v30.4h40.2C241.1,198.6,256,166.4,256,130.6z"/>
                <path fill="#34A853" d="M130.8,256c35.2,0,64.8-11.7,86.5-31.7l-40.2-30.4c-11.7,7.8-26.7,12.5-46.3,12.5c-35.6,0-65.7-24.1-76.5-56.4H12.7v31.4C34.4,224.5,79,256,130.8,256z"/>
                <path fill="#FBBC05" d="M54.3,149.9c-2.7-8.1-4.3-16.8-4.3-25.9c0-9.1,1.5-17.8,4.3-25.9V66.8H12.7C4.6,83,0,102.7,0,124s4.6,41,12.7,57.2L54.3,149.9z"/>
                <path fill="#EA4335" d="M130.8,49.5c19.1,0,36.3,6.6,49.8,19.5l37.4-37.4C195.5,11.7,166,0,130.8,0C79,0,34.4,31.5,12.7,74.6l41.6,31.4C65.1,73.6,95.2,49.5,130.8,49.5z"/>
              </svg>
            </div>
            {/* PhonePe */}
            <div className="flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-md w-14 h-10 px-2 py-1">
              <svg viewBox="0 0 100 100" className="w-full h-full object-contain">
                <rect width="100" height="100" rx="24" fill="#5f259f"/>
                <text x="50" y="72" fontFamily="sans-serif" fontSize="65" fontWeight="900" fill="#ffffff" textAnchor="middle">पे</text>
              </svg>
            </div>
            {/* Paytm */}
            <div className="flex items-center justify-center bg-white border border-gray-100 shadow-sm rounded-md w-14 h-10 px-2 py-1">
              <svg viewBox="0 0 200 60" className="w-full h-full object-contain">
                <text x="0" y="45" fontFamily="sans-serif" fontSize="55" fontWeight="900" fill="#002970">Pay</text>
                <text x="100" y="45" fontFamily="sans-serif" fontSize="55" fontWeight="900" fill="#00baf2">tm</text>
              </svg>
            </div>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4 overflow-hidden relative">
          <div className="bg-[#059669] h-full absolute animate-[progress_1s_ease-in-out_infinite] w-full origin-left scale-x-0" style={{ animation: 'progress-bar 1.5s ease-in-out infinite' }}></div>
        </div>
        <p className="text-xs text-gray-400">If you are not redirected, please scan the QR code manually.</p>
        <style>{`
          @keyframes progress-bar {
            0% { transform: scaleX(0); transform-origin: left; }
            50% { transform: scaleX(1); transform-origin: left; }
            51% { transform: scaleX(1); transform-origin: right; }
            100% { transform: scaleX(0); transform-origin: right; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default UpiRedirect;
