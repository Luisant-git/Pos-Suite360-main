import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const UpiRedirect = () => {
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const pa = params.get('pa') || '';
  const pn = params.get('pn') || '';
  const tr = params.get('tr') || '';
  const am = params.get('am') || '';
  const cu = params.get('cu') || 'INR';

  const upiUrl = `upi://pay?pa=${pa.trim()}&pn=${encodeURIComponent(pn)}${tr ? `&tr=${encodeURIComponent(tr)}` : ''}&am=${am}&cu=${cu}`;

  useEffect(() => {
    if (pa) {
      // Give a slight delay so the UI renders before the browser intercept occurs
      setTimeout(() => {
        window.location.href = upiUrl;
      }, 500);
    }
  }, [pa, upiUrl]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-[320px] w-full border border-gray-100 flex flex-col items-center">
        <div className="mb-4 bg-green-50 w-16 h-16 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        
        <h2 className="text-lg font-bold text-gray-800 mb-6">Opening UPI Payment...</h2>
        
        <div className="w-full bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm font-medium">Amount:</span>
            <span className="text-xl font-black text-gray-900">
              {cu === 'INR' ? '₹' : (cu + ' ')}{am}
            </span>
          </div>
          <div className="h-px w-full bg-gray-200"></div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm font-medium">To:</span>
            <span className="text-sm font-bold text-gray-800 text-right truncate max-w-[150px]" title={pn}>
              {pn}
            </span>
          </div>
        </div>

        <a 
          href={upiUrl}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
          Tap to Pay
        </a>
      </div>
    </div>
  );
};

export default UpiRedirect;
