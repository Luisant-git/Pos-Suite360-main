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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#064e3b] p-4 font-sans relative overflow-hidden">
      
      {/* Decorative background glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-[#047857] rounded-full mix-blend-screen filter blur-[100px] opacity-40"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-[#10b981] rounded-full mix-blend-screen filter blur-[100px] opacity-20"></div>

      <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full relative z-10 border-t-4 border-t-yellow-400">
        
        {/* Golden Coin Spinner */}
        <div className="mb-8 flex justify-center perspective-[1000px]">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-100 via-yellow-400 to-yellow-600 border-[4px] border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.4)] flex items-center justify-center animate-[flip_2s_ease-in-out_infinite]" style={{ transformStyle: 'preserve-3d' }}>
            <div className="text-yellow-800 text-4xl font-black" style={{ transform: 'translateZ(1px)' }}>₹</div>
            {/* Inner ring for coin detail */}
            <div className="absolute w-[80%] h-[80%] rounded-full border-2 border-yellow-200/60 border-dashed" style={{ transform: 'translateZ(1px)' }}></div>
          </div>
        </div>

        <h1 className="text-2xl font-black text-[#064e3b] mb-2 tracking-tight">Connecting to UPI</h1>
        
        <p className="text-sm text-slate-500 mb-6 font-medium">
          Authorizing payment for <span className="font-bold text-[#047857]">{shopName}</span>
        </p>

        {amount && (
          <div className="bg-gradient-to-br from-[#ecfdf5] to-[#d1fae5] rounded-xl p-5 mb-4 border border-[#34d399]/40 shadow-inner">
            <p className="text-[10px] text-[#047857] uppercase tracking-[0.15em] font-bold mb-1">Total Amount</p>
            <p className="text-4xl font-black text-[#064e3b] drop-shadow-sm">₹{Number(amount).toFixed(2)}</p>
          </div>
        )}

        {/* Loading Dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
        </div>
        <p className="text-xs text-slate-400 mt-3 font-medium">Please wait, do not close this window.</p>
        
        <style>{`
          @keyframes flip {
            0% { transform: rotateY(0deg); }
            50% { transform: rotateY(180deg); }
            100% { transform: rotateY(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default UpiRedirect;
