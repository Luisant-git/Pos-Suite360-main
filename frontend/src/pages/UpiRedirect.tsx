import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const UpiRedirect = () => {
  const location = useLocation();
  const [shopName, setShopName] = useState('Payment');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pa = params.get('pa');
    
    if (pa) {
      const pn = params.get('pn') || 'Shop';
      const tr = params.get('tr') || '';
      const am = params.get('am') || '';
      const cu = params.get('cu') || 'INR';
      
      setShopName(decodeURIComponent(pn));
      setAmount(am);

      const upiUrl = `upi://pay?pa=${pa}&pn=${encodeURIComponent(pn)}&tr=${tr}&am=${am}&cu=${cu}`;
      
      // Delay so the user sees the page before app interception
      setTimeout(() => {
        window.location.href = upiUrl;
      }, 1500); 
    }
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="bg-white rounded-lg shadow-sm p-8 text-center max-w-sm w-full border border-gray-100">
        
        {/* Simple Spinner */}
        <div className="mb-6 flex justify-center">
          <svg className="animate-spin h-10 w-10 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-gray-800 mb-2">Redirecting to Payment...</h1>
        
        <p className="text-sm text-gray-500 mb-6">
          Opening your UPI app to pay <strong className="text-gray-800">{shopName}</strong>.
        </p>

        {amount && (
          <div className="bg-gray-50 rounded p-4 mb-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Amount</p>
            <p className="text-2xl font-bold text-gray-900">₹{Number(amount).toFixed(2)}</p>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4">
          Please do not press back or close this window.
        </p>
      </div>
    </div>
  );
};

export default UpiRedirect;
