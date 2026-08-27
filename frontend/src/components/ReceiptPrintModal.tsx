import { Printer, X } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

const numberToWords = (num: number): string => {
  if (!num || num === 0) return "ZERO";
  const a = ["", "ONE ", "TWO ", "THREE ", "FOUR ", "FIVE ", "SIX ", "SEVEN ", "EIGHT ", "NINE ", "TEN ", "ELEVEN ", "TWELVE ", "THIRTEEN ", "FOURTEEN ", "FIFTEEN ", "SIXTEEN ", "SEVENTEEN ", "EIGHTEEN ", "NINETEEN "];
  const b = ["", "", "TWENTY ", "THIRTY ", "FORTY ", "FIFTY ", "SIXTY ", "SEVENTY ", "EIGHTY ", "NINETY "];

  const convertWhole = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? a[n % 10] : "");
    if (n < 1000) return a[Math.floor(n / 100)] + "HUNDRED " + (n % 100 !== 0 ? convertWhole(n % 100) : "");
    if (n < 1000000) return convertWhole(Math.floor(n / 1000)) + "THOUSAND " + (n % 1000 !== 0 ? convertWhole(n % 1000) : "");
    return n.toString(); // Fallback for very large numbers
  };

  const wholePart = Math.floor(Number(num));
  const cents = Math.round((Number(num) - wholePart) * 100);
  
  let res = convertWhole(wholePart) || "";
  if (cents > 0) {
    res += `AND CENTS ${convertWhole(cents) || ""}`;
  }
  return res.trim();
};

interface ReceiptPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'customer' | 'supplier';
  data: any;
  party: any;
  unpaidBills: any[];
}

export default function ReceiptPrintModal({ isOpen, onClose, type, data, party, unpaidBills }: ReceiptPrintModalProps) {
  const { settings } = useSettings();

  if (!isOpen) return null;

  const isCustomer = type === 'customer';
  
  // Extract data based on type
  const receiptNo = isCustomer ? data?.receiptNo : data?.paymentNo;
  const date = data?.date ? new Date(data.date).toISOString().split('T')[0] : '';
  const amount = Number(data?.amount || 0);
  const paymentMode = data?.paymentMode?.name || data?.paymentType?.name || 'Cash';
  const reference = data?.reference || '';
  const txnString = reference ? `${paymentMode} (Txn: ${reference})` : paymentMode;

  const title = isCustomer ? 'COLLECTION RECEIPT' : 'PAYMENT VOUCHER';
  const badgeText = isCustomer ? 'PAYMENT RECEIVED' : 'PAYMENT SENT';
  const badgeColors = isCustomer ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#E0E7FF] text-[#3730A3]';

  // Process Bills
  let remainingAmount = amount;
  const processedBills: any[] = [];
  
  if (unpaidBills && unpaidBills.length > 0) {
    unpaidBills.forEach(bill => {
      if (remainingAmount <= 0) return;
      const due = Number(bill.pending || 0);
      if (due <= 0) return;
      
      const settledNow = Math.min(due, remainingAmount);
      remainingAmount -= settledNow;
      
      processedBills.push({
        ...bill,
        due,
        settledNow,
        remaining: due - settledNow,
        status: settledNow === due ? 'PAID IN FULL' : 'PARTIAL PAID'
      });
    });
  }

  // Calculate Ledger Summary
  const totalDue = unpaidBills && unpaidBills.length > 0 
    ? unpaidBills.reduce((acc, b) => acc + Number(b.pending || 0), 0) 
    : 0;
  const totalSettled = processedBills.reduce((acc, b) => acc + b.settledNow, 0);

  // If there are no unpaid bills, the payment is an advance/on-account
  const isAdvance = !unpaidBills || unpaidBills.length === 0;

  const ReceiptContent = () => (
    <div 
      className="flex flex-col flex-1 bg-white text-slate-800 p-8 text-[12px] print:p-6 print:text-[11px] overflow-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-6 border-b border-[#1A63A8] pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#04325E] uppercase tracking-tight">{settings?.shopName || 'POS Suite 360'}</h1>
          <div className="mt-1 text-slate-600 text-[11px] leading-tight">
            <p>{settings?.shopAddress || 'Salem, Tamil Nadu, India'}</p>
            {settings?.phone && <span className="mr-2">Phone: {settings.phone}</span>}
            {settings?.email && <span>• Email: {settings.email}</span>}
            {settings?.gstin && <p className="mt-0.5">GSTIN: {settings.gstin}</p>}
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <h2 className="text-2xl font-black text-[#1A63A8] tracking-wider mb-2">{title}</h2>
          <div className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold mb-2 uppercase ${badgeColors}`}>
            {badgeText}
          </div>
          <p className="font-bold text-slate-700 text-sm">Receipt No: <span className="text-black">#{receiptNo}</span></p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Party Details */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            {isCustomer ? 'CUSTOMER / CREDIT ACCOUNT' : 'SUPPLIER / VENDOR ACCOUNT'}
          </h3>
          <p className="font-bold text-[#04325E] text-[15px] mb-1">{party?.name || 'Unknown'}</p>
          <div className="text-slate-600 text-xs space-y-1">
            {party?.address && <p>{party.address}</p>}
            <p>
              <span className="font-semibold">{isCustomer ? 'Customer' : 'Supplier'} ID:</span> {isCustomer ? 'CUST' : 'SUPP'}-{party?.id} 
              {party?.phone && <span className="ml-2">• <span className="font-semibold">Contact:</span> {party.phone}</span>}
            </p>
          </div>
        </div>

        {/* Meta Details */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-4">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            {isCustomer ? 'COLLECTION META' : 'PAYMENT META'}
          </h3>
          <div className="grid grid-cols-[110px_1fr] gap-y-2 text-xs">
            <span className="font-bold text-slate-700">Receipt Date:</span>
            <span className="text-black font-semibold">{date}</span>
            <span className="font-bold text-slate-700">Payment Mode:</span>
            <span className="text-black font-semibold">{txnString}</span>
            <span className="font-bold text-slate-700">Settlement Type:</span>
            <span className="text-black font-semibold">{isAdvance ? 'On Account / Advance' : 'FIFO Bill-by-Bill Allocation'}</span>
          </div>
        </div>
      </div>

      {/* Highlight Block */}
      <div className="bg-[#F0F5FA] border border-[#1A63A8] rounded flex justify-between items-center px-4 py-3 mb-6">
        <div>
          <p className="text-[10px] font-bold text-[#1A63A8] uppercase tracking-wider mb-1">
            {isCustomer ? 'TOTAL AMOUNT COLLECTED (THIS RECEIPT)' : 'TOTAL AMOUNT PAID (THIS VOUCHER)'}
          </p>
          <p className="text-[13px] font-bold text-[#04325E]">{numberToWords(amount)} ONLY</p>
        </div>
        <div className="text-2xl font-black text-[#04325E]">
          {settings?.currencySymbol || 'RS'} {amount.toFixed(2)}
        </div>
      </div>

      {/* FIFO Table */}
      {!isAdvance && (
        <div className="mb-6 flex-1 flex flex-col">
          <h3 className="text-[11px] font-bold text-[#04325E] uppercase tracking-widest mb-2">BILL-BY-BILL OUTSTANDING & SETTLEMENT BREAKDOWN</h3>
          <div className="border border-slate-200 overflow-hidden flex-1">
            <table className="w-full text-left">
              <thead className="bg-[#2D6AA1] text-white text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 font-bold w-[5%]">#</th>
                  <th className="py-3 px-3 font-bold w-[25%]">BILL / INVOICE NO</th>
                  <th className="py-3 px-3 font-bold w-[15%]">BILL DATE</th>
                  <th className="py-3 px-3 font-bold w-[15%] text-right">BILL DUE</th>
                  <th className="py-3 px-3 font-bold w-[15%] text-right">SETTLED NOW</th>
                  <th className="py-3 px-3 font-bold w-[10%] text-center">STATUS</th>
                  <th className="py-3 px-3 font-bold w-[15%] text-right">REMAINING</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {processedBills.map((bill, idx) => (
                  <tr key={idx} className="bg-white">
                    <td className="py-3 px-3 text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{bill.entryNo}</td>
                    <td className="py-3 px-3 text-slate-600">{new Date(bill.date).toISOString().split('T')[0]}</td>
                    <td className="py-3 px-3 text-right font-medium text-slate-600">{bill.due.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-bold text-[#059669]">{bill.settledNow.toFixed(2)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase ${bill.status === 'PAID IN FULL' ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FFEDD5] text-[#C2410C]'}`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#E11D48]">{bill.remaining.toFixed(2)}</td>
                  </tr>
                ))}
                
                {/* Unpaid items that didn't get settled */}
                {unpaidBills.slice(processedBills.length).map((bill, idx) => (
                  <tr key={`unpaid-${idx}`} className="bg-white opacity-60">
                    <td className="py-3 px-3 text-slate-500">{processedBills.length + idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{bill.entryNo}</td>
                    <td className="py-3 px-3 text-slate-600">{new Date(bill.date).toISOString().split('T')[0]}</td>
                    <td className="py-3 px-3 text-right font-medium text-slate-600">{bill.pending.toFixed(2)}</td>
                    <td className="py-3 px-3 text-right font-bold text-slate-400">0.00</td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#FEE2E2] text-[#B91C1C]">
                        UNPAID
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-[#E11D48]">{bill.pending.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Ledger Summary */}
          <div className="bg-[#F8FAFC] border-x border-b border-slate-200 px-3 py-2 flex text-[11px] font-bold">
            <div className="w-[45%] text-right text-black">Total Ledger Summary:</div>
            <div className="w-[15%] text-right text-black">{totalDue.toFixed(2)}</div>
            <div className="w-[15%] text-right text-[#059669]">{totalSettled.toFixed(2)}</div>
            <div className="w-[10%] text-center text-slate-400">-</div>
            <div className="w-[15%] text-right text-[#E11D48]">{(totalDue - totalSettled).toFixed(2)}</div>
          </div>
        </div>
      )}

      {/* Footer Area */}
      <div className="mt-auto grid grid-cols-[1.3fr_1.2fr] gap-6">
        {/* Left: Notes */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded p-4 h-full">
          <h3 className="text-[10px] font-bold text-[#1A63A8] uppercase tracking-widest mb-2">SETTLEMENT NOTES</h3>
          <ul className="text-[10px] text-slate-600 space-y-1 list-disc pl-4">
            <li>Receipt applies payments in First-In, First-Out (FIFO) chronological sequence.</li>
            {isAdvance && (
              <li>Payment received on account. Will be automatically adjusted against future bills.</li>
            )}
            {!isAdvance && processedBills.map(b => b.status === 'PARTIAL PAID' ? (
              <li key={b.entryNo}>Partial settlement on <span className="font-bold">#{b.entryNo}</span> leaves a balance of <span className="font-bold">{settings?.currencySymbol} {b.remaining.toFixed(2)}</span>.</li>
            ) : null)}
            {remainingAmount > 0.01 && (
              <li><span className="font-bold">{settings?.currencySymbol} {remainingAmount.toFixed(2)}</span> was recorded as excess advance payment.</li>
            )}
          </ul>
        </div>
        
        {/* Right: Summary */}
        <div className="bg-white border border-[#E2E8F0] rounded p-4 flex flex-col justify-center">
          <div className="space-y-3 text-[12px] whitespace-nowrap">
            <div className="flex justify-between font-bold text-slate-700 gap-4">
              <span>Total Outstanding Before Payment:</span>
              <span className="text-right">{settings?.currencySymbol} {totalDue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-[#059669] gap-4">
              <span>Amount {isCustomer ? 'Paid' : 'Settled'} (This Receipt):</span>
              <span className="text-right">- {settings?.currencySymbol} {amount.toFixed(2)}</span>
            </div>
            <div className="border-t-2 border-[#E11D48] pt-2 mt-2 flex justify-between font-black text-[13px] text-[#E11D48] gap-4">
              <span>Total Remaining Balance Due:</span>
              <span className="text-right">{settings?.currencySymbol} {Math.max(0, totalDue - amount).toFixed(2)}</span>
            </div>
            <div className="border-b-2 border-[#E11D48] pb-1 mb-1"></div>
          </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="mt-12 grid grid-cols-2 gap-8 px-8">
        <div className="text-center">
          <div className="border-t border-slate-400 pt-2 w-48 mx-auto">
            <p className="text-[11px] font-bold text-slate-700">{isCustomer ? 'Customer' : 'Supplier'} Signature / Stamp</p>
          </div>
        </div>
        <div className="text-center relative">
          {settings?.signatureImage && (
            <img 
              src={settings.signatureImage} 
              alt="Signature" 
              className="absolute bottom-6 left-1/2 -translate-x-1/2 h-12 object-contain opacity-80 mix-blend-multiply"
            />
          )}
          <div className="border-t border-slate-400 pt-2 w-48 mx-auto">
            <p className="text-[11px] font-bold text-slate-700">Authorized Signatory</p>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-[10px] font-medium text-slate-500 border-t border-slate-200 pt-3">
        <p>{settings?.shopName || 'POS Suite 360'} • Bill-by-Bill FIFO Credit Settlement Receipt | Page 1 of 1</p>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:absolute print:inset-0 print:block print:bg-transparent print:m-0 print:p-0">
      <div className="bg-white w-full max-w-[210mm] max-h-[95vh] h-full flex flex-col rounded-md shadow-2xl relative print:w-full print:max-w-none print:shadow-none print:h-auto print:min-h-0">
        
        {/* Header - Screen Only */}
        <div className="flex justify-between items-center bg-[#111827] text-white p-3 rounded-t-md print:hidden shrink-0">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Printer size={16} />
            <span>Print Receipt - {receiptNo}</span>
          </div>
          <button type="button" onClick={onClose} className="hover:text-red-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Printable Area */}
        <div className="flex-1 min-h-0 overflow-auto bg-gray-200 p-8 print:p-0 print:bg-white flex justify-center print:overflow-visible">
          {/* A4 Paper wrapper for screen view */}
          <div className="bg-white shadow-sm w-full max-w-[210mm] min-h-[297mm] print:w-full print:max-w-none print:shadow-none print:min-h-[100vh] flex flex-col">
            <ReceiptContent />
          </div>
        </div>

        {/* Footer - Screen Only */}
        <div className="bg-gray-100 p-4 border-t border-gray-200 flex justify-end gap-3 rounded-b-md print:hidden shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 font-bold hover:bg-gray-200 rounded">
            Cancel
          </button>
          <button type="button" onClick={() => window.print()} className="px-6 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 flex items-center gap-2">
            <Printer size={16} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}
