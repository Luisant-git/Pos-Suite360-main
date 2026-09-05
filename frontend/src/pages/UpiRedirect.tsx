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
        <div className="mb-8 relative w-20 h-20 mx-auto" style={{ perspective: '1000px' }}>
          <div className="w-full h-full rounded-full shadow-xl flex items-center justify-center" 
               style={{ 
                 background: 'linear-gradient(135deg, #fbbf24 0%, #fef3c7 40%, #f59e0b 100%)',
                 border: '4px solid #fde68a',
                 boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.5), inset 0 -4px 8px rgba(180, 83, 9, 0.5)',
                 animation: 'coin-spin 2s linear infinite',
                 transformStyle: 'preserve-3d'
               }}>
            <div className="absolute inset-0 rounded-full border-[2px] border-[#d97706] border-dashed opacity-40 m-[4px]"></div>
            <span className="text-4xl text-[#92400e] font-black tracking-tighter shadow-sm" style={{ transform: 'translateZ(1px)' }}>₹</span>
          </div>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Redirecting to Payment...</h2>
        <p className="text-gray-600 mb-6 text-sm">Please complete the payment in your UPI app (GPay, PhonePe, Paytm, etc).</p>
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
          @keyframes coin-spin {
            0% { transform: rotateY(0deg); }
            100% { transform: rotateY(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default UpiRedirect;
