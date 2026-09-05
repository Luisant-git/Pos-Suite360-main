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
          <div className="flex items-center justify-center -space-x-3">
            {/* GPay */}
            <div className="flex items-center justify-center bg-white border border-gray-100 shadow-md rounded-full w-12 h-12 p-2 overflow-hidden hover:shadow-lg transition-shadow hover:z-10 z-0">
              <img src="/icons/gpay.png" alt="GPay" className="w-full h-full object-contain" />
            </div>
            {/* PhonePe */}
            <div className="flex items-center justify-center bg-white border border-gray-100 shadow-md rounded-full w-12 h-12 p-1.5 overflow-hidden hover:shadow-lg transition-shadow hover:z-10 z-[1]">
              <img src="/icons/phonepe.png" alt="PhonePe" className="w-full h-full object-contain" />
            </div>
            {/* Paytm */}
            <div className="flex items-center justify-center bg-white border border-gray-100 shadow-md rounded-full w-12 h-12 p-2 overflow-hidden hover:shadow-lg transition-shadow hover:z-10 z-[2]">
              <img src="/icons/paytm.png" alt="Paytm" className="w-full h-full object-contain" />
            </div>
            {/* UPI */}
            <div className="flex items-center justify-center bg-white border border-gray-100 shadow-md rounded-full w-12 h-12 p-2 overflow-hidden hover:shadow-lg transition-shadow hover:z-10 z-[3]">
              <img src="/icons/upi.png" alt="UPI" className="w-full h-full object-contain" />
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
