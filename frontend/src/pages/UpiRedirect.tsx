import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

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
      
      // Give a slight delay so the user can see the premium UI before the app intercept occurs
      setTimeout(() => {
        window.location.href = upiUrl;
      }, 1500); 
    }
  }, [location]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4 font-sans">
      <div className="bg-white rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] overflow-hidden max-w-sm w-full border border-slate-200">
        
        {/* Header (Razorpay Style Deep Blue) */}
        <div className="bg-[#0f172a] p-8 text-center text-white relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-400 to-blue-500"></div>
          
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white"><path d="M6 3h12l4 6-10 13L2 9Z"/></svg>
            </div>
          </div>

          <h1 className="text-lg font-bold tracking-tight mb-1 truncate">{shopName}</h1>
          
          {amount && (
            <div className="mt-4">
              <p className="text-slate-400 text-[10px] uppercase tracking-[0.2em] font-semibold mb-1">Amount Payable</p>
              <div className="text-3xl font-black flex justify-center items-start gap-1">
                <span className="text-lg mt-1 text-slate-300">₹</span>
                {Number(amount).toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-8 text-center flex flex-col items-center bg-white">
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-slate-100 rounded-full"></div>
            <div className="w-16 h-16 border-4 border-[#3366FF] rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6 text-[#3366FF]">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-lg font-bold text-slate-800 mb-2">Connecting to UPI App...</h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6 px-2">
            Please approve the payment request inside your UPI app (GPay, PhonePe, Paytm).
          </p>
          
          <div className="w-full bg-blue-50 text-blue-700 text-[11px] font-semibold py-2.5 px-4 rounded-lg border border-blue-100 flex items-center justify-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Waiting for confirmation...
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-3.5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 font-semibold">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>100% SECURE PAYMENT BY POS SUITE 360</span>
        </div>

      </div>
    </div>
  );
};

export default UpiRedirect;
