import { X, Printer, Loader2 } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

// Basic number to words converter (for Malaysian Ringgit / general use)
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
  return res ? res.trim() : "";
};

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: any;
  hiddenRenderer?: boolean;
}

const InvoicePrintModal = ({ isOpen, onClose, sale: initialSale, hiddenRenderer = false }: InvoicePrintModalProps) => {
  const { settings } = useSettings();

  // Always fetch full sale data to ensure unit, paymentMode, customer are fully populated
  const { data: fullSale, isLoading } = useQuery({
    queryKey: ['invoice-print', initialSale?.id],
    queryFn: async () => (await api.get(`/sales/${initialSale.id}`)).data,
    enabled: isOpen && !!initialSale?.id,
    staleTime: 0,
    gcTime: 0,
  });

  const sale = fullSale || initialSale;

  if (!isOpen) return null;

  if (isLoading && !hiddenRenderer) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-white p-6 rounded-md shadow-lg font-bold text-blue-900 flex items-center gap-3">
          <Loader2 className="animate-spin" size={20} /> Loading invoice data...
        </div>
      </div>
    );
  }

  // Fallback data if sale is not fully populated yet
  const invoiceNo = sale?.invoiceNo || '';
  const date = sale?.date ? new Date(sale.date).toISOString().split('T')[0] : '';
  const customerName = sale?.customer?.name || 'CASH A/C\nCounter Sale';
  const items = sale?.items || [];
  const grandTotal = sale?.grandTotal || 0;

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    let text = `*NSA FRESH MART - INVOICE*\n`;
    text += `Invoice No: ${invoiceNo}\n`;
    text += `Date: ${date}\n\n`;
    items.forEach((item: any) => {
      text += `${item.quantity}x ${item.product?.name || 'Product'} - ${settings?.currencySymbol || 'RM'} ${item.amount}\n`;
    });
    text += `\n*TOTAL: ${settings?.currencySymbol || 'RM'} ${grandTotal}*`;
    
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (hiddenRenderer) {
    return (
      <div id="hidden-printable-invoice" className="fixed top-0 left-0 bg-white text-black font-sans text-[12px] w-[800px] flex flex-col p-8 h-[250mm] box-border" style={{ zIndex: -9999 }}>
        <div className="text-center mb-4 print:pt-4">
          <div className="text-xl font-bold uppercase">NASA FRESH MART <span className="text-base font-normal">(001634825-A)</span></div>
          <p className="mt-1">NO 8G, JLN 3/2 PANDAN JAYA, 55100 KUALA LUMPUR.</p>
          <p>Tel : 019-300 1451</p>
        </div>
        
        <div className="border-t border-b border-black py-2 mb-4 text-center font-bold text-lg uppercase tracking-wider">
          INVOICE
        </div>
        
        <div className="flex justify-between mb-6">
          {/* Left Column */}
          <div className="w-1/2 pr-4">
             <div className="flex">
               <span className="w-16 font-bold">Bill To:</span>
               <div>
                 <p className="font-bold">{sale?.customer?.id ? `CUST-${sale.customer.id}` : ''}</p>
                 <p className="font-bold">{customerName}</p>
                 <p>{sale?.customer?.address || ''}</p>
               </div>
             </div>
             <div className="mt-4 flex gap-4">
               <span className="font-bold">TEL: {sale?.customer?.phone || ''}</span>
               <span className="font-bold">FAX: </span>
             </div>
             <p className="font-bold">Attn:</p>
          </div>
          
          {/* Right Column */}
          <div className="w-1/2 pl-12">
             <div className="grid grid-cols-[100px_10px_1fr] gap-y-1">
               <span className="font-bold">NO.</span><span className="font-bold">:</span><span className="font-bold">{invoiceNo}</span>
               <span className="font-bold">DATE</span><span className="font-bold">:</span><span className="font-bold">{date}</span>
               {/* <span className="font-bold">YOUR P/O NO.</span><span className="font-bold">:</span><span></span> */}
               <span className="font-bold">SALESMAN</span><span className="font-bold">:</span><span></span>
               {/* <span className="font-bold">TERMS</span><span className="font-bold">:</span><span className="font-bold">C.O.D.</span> */}
               <span className="font-bold">PAY TYPE</span><span className="font-bold">:</span><span>{sale?.paymentMode?.name || 'Cash'}</span>
               <span className="font-bold">PENDING AMT</span><span className="font-bold">:</span><span className="font-bold">{Number(sale?.customer?.openingBalance || 0).toFixed(2)}</span>
               <span className="font-bold">PAGE</span><span className="font-bold">:</span><span className="font-bold">1 of 1</span>
             </div>
          </div>
        </div>
        
        <table className="w-full text-left border-y border-black mb-8">
          <thead>
            <tr className="border-b border-black text-xs uppercase">
              <th className="py-2 w-[15%] font-bold">Code</th>
              <th className="py-2 w-[40%] font-bold">Description</th>
              <th className="py-2 w-[10%] text-right font-bold">Qty</th>
              <th className="py-2 w-[10%] text-center font-bold">UOM</th>
              <th className="py-2 w-[10%] text-right font-bold">U.Price</th>
              <th className="py-2 w-[15%] text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody className="align-top">
            {items.map((item: any, idx: number) => (
              <tr key={idx}>
                <td className="py-1 font-medium">{item.product?.code || ''}</td>
                <td className="py-1 font-medium">{item.product?.name || ''}</td>
                <td className="py-1 text-right font-medium">{item.quantity}</td>
                <td className="py-1 text-center font-medium">{item.product?.unit?.name || item.product?.unit?.shortCode || 'Nos'}</td>
                <td className="py-1 text-right font-medium">{Number(item.rate || 0).toFixed(2)}</td>
                <td className="py-1 text-right font-medium">{Number(item.amount || item.total || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="mt-auto">
          <p className="uppercase mb-4">RINGGIT MALAYSIA {numberToWords(grandTotal)} ONLY</p>
          
          <div className="flex justify-between items-start border-t border-black pt-2">
            <div 
              className="w-2/3 text-[10px] text-black pr-4 html-content"
              dangerouslySetInnerHTML={{ __html: settings?.invoiceNotes || '' }}
            />
            <div className="w-1/3 flex justify-between font-bold text-sm">
              <span>TOTAL : RM</span>
              <span className="border-b-2 border-black border-double min-w-[100px] text-right">{Number(grandTotal).toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex justify-end mt-16">
            <div className="text-center w-64 border-t border-black pt-1 relative">
              {settings?.signatureImage && (
                <img 
                  src={settings.signatureImage} 
                  alt="Authorised Signature" 
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 h-16 object-contain"
                />
              )}
              Authorised Signature
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 print:absolute print:top-0 print:left-0 print:block print:bg-transparent print:m-0 print:p-0">
      <div className="bg-white w-[210mm] h-[97vh] flex flex-col rounded-md shadow-2xl relative print:w-full print:shadow-none print:h-auto print:min-h-[250mm]">
        
        {/* Header - Screen Only */}
        <div className="flex justify-between items-center bg-[#111827] text-white p-3 rounded-t-md print:hidden">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Printer size={16} />
            <span>Print Invoice - {invoiceNo}</span>
          </div>
          <button type="button" onClick={onClose} className="hover:text-red-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Printable Area */}
        <div id="printable-invoice" className="flex-1 overflow-auto flex flex-col p-8 font-sans text-black print:p-6 bg-white">
          <div className="text-center mb-4 print:pt-4">
            <div className="text-xl font-bold uppercase">NASA FRESH MART <span className="text-base font-normal">(001634825-A)</span></div>
            <p className="mt-1">NO 8G, JLN 3/2 PANDAN JAYA, 55100 KUALA LUMPUR.</p>
            <p>Tel : 019-300 1451</p>
          </div>
          
          <div className="border-t border-b border-black py-2 mb-4 text-center font-bold text-lg uppercase tracking-wider">
            INVOICE
          </div>
          
          <div className="flex justify-between mb-6 text-xs">
            {/* Left Column */}
            <div className="w-1/2 pr-4">
               <div className="flex">
                 <span className="w-16 font-bold">Bill To:</span>
                 <div>
                   <p className="font-bold">{sale?.customer?.id ? `CUST-${sale.customer.id}` : ''}</p>
                   <p className="font-bold">{customerName}</p>
                   <p>{sale?.customer?.address || ''}</p>
                 </div>
               </div>
               <div className="mt-4 flex gap-4">
                 <span className="font-bold">TEL: {sale?.customer?.phone || ''}</span>
                 <span className="font-bold">FAX: </span>
               </div>
               <p className="font-bold">Attn:</p>
            </div>
            
            {/* Right Column */}
            <div className="w-1/2 pl-12 text-xs">
               <div className="grid grid-cols-[100px_10px_1fr] gap-y-1">
                 <span className="font-bold">NO.</span><span className="font-bold">:</span><span className="font-bold">{invoiceNo}</span>
                 <span className="font-bold">DATE</span><span className="font-bold">:</span><span className="font-bold">{date}</span>
                 {/* <span className="font-bold">YOUR P/O NO.</span><span className="font-bold">:</span><span></span> */}
                 <span className="font-bold">SALESMAN</span><span className="font-bold">:</span><span></span>
                 {/* <span className="font-bold">TERMS</span><span className="font-bold">:</span><span className="font-bold">C.O.D.</span> */}
                 <span className="font-bold">PAY TYPE</span><span className="font-bold">:</span><span>{sale?.paymentMode?.name || 'Cash'}</span>
                 <span className="font-bold">PENDING AMT</span><span className="font-bold">:</span><span className="font-bold">{Number(sale?.customer?.openingBalance || 0).toFixed(2)}</span>
                 <span className="font-bold">PAGE</span><span className="font-bold">:</span><span className="font-bold">1 of 1</span>
               </div>
            </div>
          </div>
          
          <table className="w-full text-left border-y border-black mb-4 text-xs">
            <thead>
              <tr className="border-b border-black uppercase">
                <th className="py-2 w-[15%] font-bold">Code</th>
                <th className="py-2 w-[40%] font-bold">Description</th>
                <th className="py-2 w-[10%] text-right font-bold">Qty</th>
                <th className="py-2 w-[10%] text-center font-bold">UOM</th>
                <th className="py-2 w-[10%] text-right font-bold">U.Price</th>
                <th className="py-2 w-[15%] text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody className="align-top">
              {items.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td className="py-1 font-medium">{item.product?.code || ''}</td>
                  <td className="py-1 font-medium">{item.product?.name || ''}</td>
                  <td className="py-1 text-right font-medium">{item.quantity}</td>
                  <td className="py-1 text-center font-medium">{item.product?.unit?.name || item.product?.unit?.shortCode || 'Nos'}</td>
                  <td className="py-1 text-right font-medium">{Number(item.rate || 0).toFixed(2)}</td>
                  <td className="py-1 text-right font-medium">{Number(item.amount || item.total || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="flex-1"></div>

          <div>
            <p className="uppercase mb-4">RINGGIT MALAYSIA {numberToWords(grandTotal)} ONLY</p>
            
            <div className="flex justify-between items-start border-t border-black pt-2">
              <div 
                className="w-2/3 text-[10px] text-black pr-4 html-content"
                dangerouslySetInnerHTML={{ __html: settings?.invoiceNotes || '' }}
              />
              <div className="w-1/3 flex flex-col font-bold text-sm gap-1">
                <div className="flex justify-between">
                  <span>SUBTOTAL :</span>
                  <span className="min-w-[100px] text-right">{Number(sale?.subtotal || 0).toFixed(2)}</span>
                </div>
                {Number(sale?.discount) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>DISCOUNT :</span>
                    <span className="min-w-[100px] text-right">-{Number(sale?.discount).toFixed(2)}</span>
                  </div>
                )}
                {settings?.enableTax && Number(sale?.tax) > 0 && (
                  (() => {
                    const storeState = (settings.state || '').trim().toLowerCase();
                    const custState = (sale?.customer?.state || '').trim().toLowerCase();
                    
                    if (storeState && custState && storeState === custState) {
                      const splitTax = Number(sale.tax) / 2;
                      return (
                        <>
                          <div className="flex justify-between">
                            <span>CGST :</span>
                            <span className="min-w-[100px] text-right">{splitTax.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>SGST :</span>
                            <span className="min-w-[100px] text-right">{splitTax.toFixed(2)}</span>
                          </div>
                        </>
                      );
                    } else {
                      return (
                        <div className="flex justify-between">
                          <span>IGST :</span>
                          <span className="min-w-[100px] text-right">{Number(sale?.tax).toFixed(2)}</span>
                        </div>
                      );
                    }
                  })()
                )}
                <div className="flex justify-between border-t border-black pt-1 mt-1">
                  <span>TOTAL : RM</span>
                  <span className="border-b-2 border-black border-double min-w-[100px] text-right">{Number(grandTotal).toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end mt-8">
              <div className="text-center w-64 border-t border-black pt-1 relative">
                {settings?.signatureImage && (
                  <img 
                    src={settings.signatureImage} 
                    alt="Authorised Signature" 
                    className="absolute bottom-6 left-1/2 -translate-x-1/2 h-16 object-contain"
                  />
                )}
                Authorised Signature
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions - Screen Only */}
        <div className="flex justify-between items-center p-4 bg-gray-50 border-t border-gray-200 rounded-b-md print:hidden">
          <button 
            type="button"
            onClick={handleWhatsApp}
            className="flex items-center gap-2 bg-[#25D366] hover:bg-[#1DA851] text-white font-bold py-2 px-4 rounded transition-colors shadow-sm"
          >
            <i className="fa fa-whatsapp text-lg"></i>
            WhatsApp
          </button>
          
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 bg-[#1E3A8A] hover:bg-[#1E40AF] text-white font-bold py-2 px-4 rounded transition-colors shadow-sm"
            >
              <Printer size={16} />
              Print / Save PDF
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors shadow-sm"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default InvoicePrintModal;
