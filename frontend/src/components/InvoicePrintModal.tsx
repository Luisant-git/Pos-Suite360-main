import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
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
  isEstimation?: boolean;
  autoPrint?: boolean;
}

const InvoicePrintModal = ({ isOpen, onClose, sale: initialSale, hiddenRenderer = false, isEstimation = false, autoPrint = false }: InvoicePrintModalProps) => {
  const { settings } = useSettings();
  const [isSharing, setIsSharing] = useState(false);

  // Always fetch full sale data to ensure unit, paymentMode, customer are fully populated
  const { data: fullSale, isLoading } = useQuery({
    queryKey: [isEstimation ? 'estimation-print' : 'invoice-print', initialSale?.id],
    queryFn: async () => (await api.get(`/${isEstimation ? 'estimations' : 'sales'}/${initialSale.id}`)).data,
    enabled: isOpen && !!initialSale?.id,
    staleTime: 0,
    gcTime: 0,
  });

  const sale = fullSale || initialSale;

  useEffect(() => {
    if (autoPrint && !isLoading && sale) {
      const timer = setTimeout(() => {
        window.print();
        onClose();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, isLoading, sale, onClose]);

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
  const invoiceNo = sale?.estimationNo || sale?.invoiceNo || '';
  const date = sale?.date ? new Date(sale.date).toISOString().split('T')[0] : '';
  const customerName = sale?.customer?.name || 'CASH A/C';
  const items = sale?.items || [];
  const grandTotal = sale?.grandTotal || 0;
  const currency = settings?.currencySymbol || 'RM';

  const handleWhatsApp = () => {
    setIsSharing(true);
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const W = 210;
    const margin = 14;
    let y = margin;
    const col = margin;
    const lineH = 6;

    const addText = (text: string, x: number, yPos: number, opts: any = {}) => {
      doc.setFontSize(opts.size || 10);
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
      doc.setTextColor(opts.color || '#1e293b');
      doc.text(String(text ?? ''), x, yPos, { maxWidth: opts.maxWidth });
    };

    // Header
    addText(settings?.shopName || 'POS Suite 360', col, y, { size: 16, bold: true, color: '#04325E' });
    y += 7;
    if (settings?.invoiceTitle) { addText(settings.invoiceTitle, col, y, { size: 10, color: '#1A63A8' }); y += 5; }
    if (settings?.shopAddress) { addText(settings.shopAddress, col, y, { size: 9, color: '#475569' }); y += 5; }
    const cityLine = [settings?.city, settings?.state, settings?.country].filter(Boolean).join(', ');
    if (cityLine) { addText(cityLine, col, y, { size: 9, bold: true, color: '#475569' }); y += 5; }
    if (settings?.phone) { addText(`Tel: ${settings.phone}`, col, y, { size: 9, color: '#475569' }); y += 5; }
    if (settings?.gstin) { addText(`GSTIN: ${settings.gstin}`, col, y, { size: 9, color: '#475569' }); y += 5; }

    // Invoice label top-right
    addText(isEstimation ? 'ESTIMATION' : 'INVOICE', W - margin, margin + 4, { size: 20, bold: true, color: '#1A63A8' });
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor('#334155');
    doc.text(`${isEstimation ? 'Est No' : 'Invoice No'}: #${invoiceNo}`, W - margin, margin + 11, { align: 'right' });
    doc.text(`Date: ${date}`, W - margin, margin + 17, { align: 'right' });

    y += 4;
    doc.setDrawColor('#e2e8f0'); doc.setLineWidth(0.3); doc.line(col, y, W - margin, y);
    y += 6;

    // Bill To
    addText('BILLED TO', col, y, { size: 8, bold: true, color: '#64748b' }); y += 5;
    addText(customerName, col, y, { size: 11, bold: true }); y += 5;
    if (sale?.customer?.phone) { addText(`Phone: ${sale.customer.phone}`, col, y, { size: 9, color: '#475569' }); y += 5; }
    if (sale?.customer?.address) { addText(sale.customer.address, col, y, { size: 9, color: '#475569', maxWidth: 80 }); y += 5; }
    if (sale?.customer?.gstNumber) { addText(`GSTIN: ${sale.customer.gstNumber}`, col, y, { size: 9, color: '#475569' }); y += 5; }

    // Payment info right side
    const infoY = y - (5 * (1 + (sale?.customer?.phone ? 1 : 0) + (sale?.customer?.address ? 1 : 0) + (sale?.customer?.gstNumber ? 1 : 0))) - 5;
    addText('PAYMENT MODE', W - margin - 60, infoY, { size: 8, bold: true, color: '#64748b' });
    addText(sale?.paymentMode?.name || 'Cash', W - margin - 60, infoY + 5, { size: 10, bold: true });

    y += 4;
    doc.line(col, y, W - margin, y); y += 6;

    // Table header
    doc.setFillColor('#2D6AA1');
    doc.rect(col, y - 4, W - margin * 2, 8, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor('#ffffff');
    doc.text('#', col + 2, y + 1);
    doc.text('Item Description', col + 10, y + 1);
    doc.text('Qty', col + 100, y + 1, { align: 'center' });
    doc.text('Rate', col + 130, y + 1, { align: 'right' });
    doc.text('Amount', W - margin, y + 1, { align: 'right' });
    y += 8;

    // Table rows
    items.forEach((item: any, idx: number) => {
      if (idx % 2 === 0) { doc.setFillColor('#f8fafc'); doc.rect(col, y - 4, W - margin * 2, lineH + 2, 'F'); }
      doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor('#1e293b');
      doc.text(String(idx + 1), col + 2, y);
      doc.setFont('helvetica', 'bold');
      doc.text(item.product?.name || '', col + 10, y, { maxWidth: 80 });
      doc.setFont('helvetica', 'normal');
      doc.text(`${item.quantity} ${item.product?.unit?.shortCode || 'Nos'}`, col + 100, y, { align: 'center' });
      doc.text(Number(item.rate || 0).toFixed(2), col + 130, y, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(Number(item.amount || 0).toFixed(2), W - margin, y, { align: 'right' });
      y += lineH + 2;
    });

    doc.setDrawColor('#e2e8f0'); doc.line(col, y, W - margin, y); y += 6;

    // Totals
    const totalsX = W - margin - 60;
    const valX = W - margin;
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor('#334155');
    doc.text('Subtotal:', totalsX, y); doc.text(Number(sale?.subtotal || 0).toFixed(2), valX, y, { align: 'right' }); y += lineH;
    if (Number(sale?.discount) > 0) { doc.text('Discount:', totalsX, y); doc.text(Number(sale.discount).toFixed(2), valX, y, { align: 'right' }); y += lineH; }
    if (Number(sale?.tax) > 0) { doc.text('Tax:', totalsX, y); doc.text(Number(sale.tax).toFixed(2), valX, y, { align: 'right' }); y += lineH; }

    // Grand total box
    doc.setFillColor('#F0F5FA'); doc.rect(totalsX - 4, y - 4, W - margin - totalsX + 4 + margin, 10, 'F');
    doc.setDrawColor('#1A63A8'); doc.setLineWidth(0.5);
    doc.line(totalsX - 4, y - 4, W - margin + margin, y - 4);
    doc.line(totalsX - 4, y + 6, W - margin + margin, y + 6);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor('#04325E');
    doc.text('Total Due:', totalsX, y + 3);
    doc.text(`${currency} ${Number(grandTotal).toFixed(2)}`, valX, y + 3, { align: 'right' });
    y += 16;

    // Footer
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor('#94a3b8');
    doc.text(`Thank you for partnering with ${settings?.shopName || 'POS Suite 360'}!`, W / 2, y, { align: 'center' });

    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], `Invoice_${invoiceNo}.pdf`, { type: 'application/pdf' });

    // Try native share (works on mobile/Edge), fallback to download on desktop Chrome
    const tryShare = async () => {
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: `Invoice ${invoiceNo}` });
          setIsSharing(false);
          return;
        }
      } catch (_) { /* fall through */ }
      const link = document.createElement('a');
      link.href = URL.createObjectURL(pdfBlob);
      link.download = `Invoice_${invoiceNo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setIsSharing(false);
    };
    tryShare();
  };

  const InvoiceContent = () => (
    <div 
      className={`flex flex-col flex-1 bg-white text-slate-800 ${hiddenRenderer ? 'w-[800px] h-[1100px] box-border p-10 text-[13px]' : 'p-8 text-[12px] print:p-6 print:text-[11px]'} overflow-hidden`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex flex-col gap-3">
          {settings?.logoImage && (
            <img src={settings.logoImage} alt="Logo" className="max-h-20 max-w-[200px] w-auto h-auto object-contain object-left" />
          )}
          <div>
            <h1 className={`${settings?.logoImage ? 'text-xl' : 'text-2xl'} font-bold text-[#04325E] uppercase tracking-tight`}>{settings?.shopName || 'POS Suite 360'}</h1>
            {settings?.invoiceTitle && <p className="text-[#1A63A8] font-bold text-sm mt-1">{settings.invoiceTitle}</p>}
          <div className="mt-2 text-slate-800 text-xs leading-relaxed">
            {settings?.shopAddress && <p>{settings.shopAddress}</p>}
            <p className="font-bold text-slate-700">
              {[settings?.city, settings?.state, settings?.country].filter(Boolean).join(', ')}
            </p>
            {settings?.phone && <p>Tel: {settings.phone}</p>}
            {settings?.gstin && <p>GSTIN: {settings.gstin}</p>}
          </div>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-4xl font-black text-[#1A63A8] tracking-wider mb-2">{isEstimation ? 'ESTIMATION' : 'INVOICE'}</h2>
          <p className="font-bold text-slate-700 text-sm">{isEstimation ? 'Est No' : 'Invoice No'}: #{invoiceNo}</p>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
          <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-3">Billed To / Customer Details</h3>
          <p className="font-bold text-slate-800 text-sm mb-1">{customerName}</p>
          <div className="text-slate-800 text-xs space-y-1">

            {sale?.customer?.address && <p>{sale.customer.address}</p>}
            {sale?.customer?.state && <p>{sale.customer.state}</p>}
            {sale?.customer?.phone && <p>Phone: {sale.customer.phone}</p>}
            {sale?.customer?.gstNumber && <p>GSTIN: {sale.customer.gstNumber}</p>}
          </div>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
          <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest mb-3">{isEstimation ? 'Estimation Details' : 'Invoice Details'}</h3>
          <div className="grid grid-cols-[120px_1fr] gap-y-2 text-xs">
            <span className="font-bold text-slate-600">Date:</span>
            <span className="text-slate-800">{date}</span>
            <span className="font-bold text-slate-600">Payment Mode:</span>
            <span className="text-slate-800">{sale?.paymentMode?.name || 'Cash'}</span>
            <span className="font-bold text-slate-600">Status:</span>
            <span className="text-slate-800">{sale?.status || 'Completed'}</span>
            {Number(sale?.customer?.openingBalance) > 0 && (
              <>
                <span className="font-bold text-slate-600">Pending Amount:</span>
                <span className="text-slate-800">{currency} {Number(sale.customer.openingBalance).toFixed(2)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border border-slate-200 mb-6 flex-1 flex flex-col overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#2D6AA1] text-white text-[10px] uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4 font-bold w-[5%]">#</th>
              <th className="py-3 px-4 font-bold w-[45%]">Item Description</th>
              <th className="py-3 px-4 font-bold w-[15%] text-center">Quantity</th>
              <th className="py-3 px-4 font-bold w-[15%] text-right whitespace-nowrap">Unit Rate ({currency})</th>
              <th className="py-3 px-4 font-bold w-[20%] text-right whitespace-nowrap">Amount ({currency})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {items.map((item: any, idx: number) => (
              <tr key={idx} className="bg-white">
                <td className="py-3 px-4 text-slate-500">{idx + 1}</td>
                <td className="py-3 px-4">
                  <span className="font-bold text-slate-800">{item.product?.name || ''}</span>
                  {item.product?.code && <span className="text-slate-500 ml-2">({item.product.code})</span>}
                </td>
                <td className="py-3 px-4 text-center text-slate-600 font-medium">{item.quantity} {item.product?.unit?.shortCode || 'Nos'}</td>
                <td className="py-3 px-4 text-right text-slate-600">{Number(item.rate || 0).toFixed(2)}</td>
                <td className="py-3 px-4 text-right font-bold text-slate-800">{Number(item.amount || item.total || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Area */}
      <div className="mt-auto grid grid-cols-[1fr_350px] gap-8">
        {/* Left Footer: Notes/Terms */}
        <div>
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 h-full flex flex-col">
            <h3 className="text-[10px] font-bold text-[#1A63A8] uppercase tracking-widest mb-2">Terms & Conditions</h3>
            <div 
              className="text-[11px] text-slate-600 prose prose-sm max-w-none html-content flex-1"
              dangerouslySetInnerHTML={{ __html: (settings?.invoiceNotes !== undefined && settings?.invoiceNotes !== null) ? settings.invoiceNotes : '1. Goods once sold cannot be taken back or exchanged.<br/>2. Subject to Salem jurisdiction.' }}
            />
          </div>
        </div>
        
        {/* Right Footer: Totals & Signature */}
        <div className="flex flex-col justify-end">
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg pt-4 pb-2 flex flex-col mb-6">
            <div className="space-y-3 text-[13px] px-4 mb-4">
              <div className="flex justify-between text-[#334155]">
                <span>Subtotal:</span>
                <span className="font-semibold tracking-wide">{Number(sale?.subtotal || 0).toFixed(2)}</span>
              </div>
              
              {/* Tax Rendering */}
              {settings?.enableTax && (
                (() => {
                  if (Number(sale?.tax) === 0) return null;

                  const storeState = (settings.state || '').trim().toLowerCase();
                  const custState = (sale?.customer?.state || '').trim().toLowerCase();
                  
                  if (storeState && custState && storeState === custState) {
                    const splitTax = Number(sale.tax) / 2;
                    return (
                      <>
                        <div className="flex justify-between text-[#334155]">
                          <span>CGST:</span>
                          <span className="font-semibold tracking-wide">{splitTax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-[#334155]">
                          <span>SGST:</span>
                          <span className="font-semibold tracking-wide">{splitTax.toFixed(2)}</span>
                        </div>
                      </>
                    );
                  } else {
                    return (
                      <div className="flex justify-between text-[#334155]">
                        <span>IGST:</span>
                        <span className="font-semibold tracking-wide">{Number(sale?.tax).toFixed(2)}</span>
                      </div>
                    );
                  }
                })()
              )}

              {Number(sale?.discount) > 0 && (
                <div className="flex justify-between text-[#334155]">
                  <span>Discount:</span>
                  <span className="font-semibold tracking-wide">{Number(sale?.discount || 0).toFixed(2)}</span>
                </div>
              )}
            </div>
            
            <div className="bg-[#F0F5FA] border-y-2 border-[#1A63A8] px-4 py-3 flex justify-between items-center text-[#04325E] mt-1 mb-1">
              <span className="font-bold text-[14px]">Total Due:</span>
              <span className="text-[15px] font-black tracking-tight">{currency} {Number(grandTotal).toFixed(2)}</span>
            </div>
            <div className="text-right px-4 pb-2 text-[9px] text-[#1A63A8] font-bold uppercase tracking-wider">
              {numberToWords(grandTotal)} ONLY
            </div>
          </div>

          <div className="text-right mt-4 relative">
            <p className="text-[10px] font-bold text-slate-800 mb-12">For {settings?.shopName || 'POS Suite 360'}</p>
            {settings?.signatureImage && (
              <img 
                src={settings.signatureImage} 
                alt="Authorised Signature" 
                className="absolute bottom-6 right-8 h-12 object-contain opacity-80 mix-blend-multiply"
              />
            )}
            <div className="inline-block border-t border-slate-400 pt-2 px-8 w-48 mt-4">
              <p className="text-[11px] font-bold text-slate-700 text-center">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-[11px] font-medium text-slate-600 border-t border-slate-200 pt-3">
        <p>Thank you for partnering with {settings?.shopName || 'POS Suite 360'}! | Page 1 of 1</p>
      </div>
    </div>
  );

  if (hiddenRenderer) {
    return (
      <div id="hidden-printable-invoice" className="fixed top-0 left-0 bg-white" style={{ zIndex: -9999 }}>
        <InvoiceContent />
      </div>
    );
  }

  return createPortal(
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 print:absolute print:inset-0 print:block print:bg-transparent print:m-0 print:p-0 ${autoPrint ? 'opacity-0 pointer-events-none print:opacity-100' : 'bg-black/60'}`}>
      <div className={`bg-white w-full max-w-4xl max-h-[90vh] flex flex-col rounded-md relative print:w-full print:max-w-none print:shadow-none print:h-auto print:min-h-0 ${!autoPrint && 'shadow-2xl'}`}>
        
        {/* Header - Screen Only */}
        {!autoPrint && (
          <div className="flex justify-between items-center bg-[#111827] text-white p-3 rounded-t-md print:hidden shrink-0">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Printer size={16} />
              <span>Print {isEstimation ? 'Estimation' : 'Invoice'} - {invoiceNo}</span>
            </div>
            {/* <button type="button" onClick={onClose} className="hover:text-red-400 transition-colors">
              <X size={20} />
            </button> */}
          </div>
        )}

        {/* Printable Area */}
        <div id="printable-invoice" className="flex-1 min-h-0 overflow-auto bg-gray-200 p-2 sm:p-8 print:p-0 print:bg-white flex justify-center print:overflow-visible">
          <div className="bg-white shadow-sm w-full max-w-[210mm] min-h-[297mm] print:w-full print:max-w-none print:shadow-none print:min-h-[100vh] flex flex-col">
            <InvoiceContent />
          </div>
        </div>

        {/* Footer Actions - Screen Only */}
        {!autoPrint && (
          <div className="flex flex-wrap justify-between items-center gap-2 p-3 bg-gray-50 border-t border-gray-200 rounded-b-md print:hidden shrink-0">
            <button 
              type="button"
              onClick={handleWhatsApp}
              disabled={isSharing}
              className="bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-70 text-white px-3 py-2 rounded flex items-center gap-2 font-bold text-[12px] transition-colors"
            >
              {isSharing ? (
                <><Loader2 size={14} className="animate-spin" /> Preparing...</>
              ) : (
                <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> Share Invoice</>
              )}
            </button>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => window.print()}
                className="bg-[#04325E] hover:bg-[#032341] text-white px-3 py-2 rounded font-bold flex items-center gap-1.5 text-[12px]"
              >
                <Printer size={14} /> <span className="hidden sm:inline">Print / Save PDF</span><span className="sm:hidden">Print</span>
              </button>
              <button onClick={onClose} className="px-3 py-2 bg-gray-500 text-white font-bold hover:bg-gray-600 rounded text-[12px]">
                Close
              </button>
            </div>
          </div>
        )}

      </div>
    </div>,
    document.body
  );
};

export default InvoicePrintModal;
