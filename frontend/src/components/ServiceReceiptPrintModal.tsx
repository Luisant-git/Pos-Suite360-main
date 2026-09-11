import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface ServiceReceiptPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: any;
  autoPrint?: boolean;
}

const ServiceReceiptPrintModal = ({ isOpen, onClose, sale, autoPrint = false }: ServiceReceiptPrintModalProps) => {
  const { settings, formatCurrency } = useSettings();
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && sale && autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isOpen, sale, autoPrint]);

  useEffect(() => {
    if (isOpen && sale?.invoiceNo) {
      const orig = document.title;
      document.title = `service_receipt_${sale.invoiceNo}`;
      return () => { document.title = orig; };
    }
  }, [isOpen, sale?.invoiceNo]);

  if (!isOpen || !sale) return null;

  const subtotal = Number(sale.subtotal || 0);
  const discount = Number(sale.discount || 0);
  const tax = Number(sale.tax || 0);
  const grandTotal = Number(sale.grandTotal || 0);
  const shopName = settings?.shopName || 'My Shop';
  const shopAddress = settings?.shopAddress || '';
  const phone = settings?.phone || '';
  const gstin = settings?.gstin || '';
  const invoiceDate = sale?.date ? new Date(sale.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
  const invoiceTime = sale?.createdAt ? new Date(sale.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
  const customerName = sale?.customer?.name || 'Cash Customer';
  const customerPhone = sale?.customer?.phone;
  const paymentModeName = sale?.paymentMode?.name || 'Cash';

  const handlePrint = () => {
    window.print();
  };

  const receiptContent = (
    <div
      ref={printRef}
      id="service-receipt-print-area"
      style={{
        width: '80mm',
        maxWidth: '80mm',
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: '11px',
        color: '#000',
        padding: '4px 6px',
        lineHeight: '1.4',
        background: 'white',
      }}
    >
      {/* Shop Header */}
      <div style={{ textAlign: 'center', marginBottom: '6px' }}>
        {settings?.logoImage && (
          <img
            src={settings.logoImage}
            alt="logo"
            style={{ maxHeight: '48px', maxWidth: '120px', objectFit: 'contain', marginBottom: '4px', display: 'block', margin: '0 auto 4px' }}
          />
        )}
        <div style={{ fontWeight: 'bold', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {shopName}
        </div>
        {shopAddress && (
          <div style={{ fontSize: '10px', color: '#444', marginTop: '2px', whiteSpace: 'pre-line' }}>
            {shopAddress}
          </div>
        )}
        {phone && <div style={{ fontSize: '10px', marginTop: '1px' }}>Ph: {phone}</div>}
        {gstin && <div style={{ fontSize: '10px', marginTop: '1px' }}>GSTIN: {gstin}</div>}
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* Invoice Info */}
      <div style={{ marginBottom: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
          <span style={{ fontWeight: 'bold' }}>SERVICE RECEIPT</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '2px' }}>
          <span>Bill No: <b>{sale.invoiceNo}</b></span>
          <span>{invoiceDate}</span>
        </div>
        {invoiceTime && (
          <div style={{ fontSize: '10px', color: '#555' }}>Time: {invoiceTime}</div>
        )}
        {customerName !== 'Cash Customer' && (
          <div style={{ fontSize: '10px', marginTop: '2px' }}>
            Customer: <b>{customerName}</b>
            {customerPhone && ` | ${customerPhone}`}
          </div>
        )}
        <div style={{ fontSize: '10px' }}>Payment: <b>{paymentModeName}</b></div>
        {sale.notes && <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>Note: {sale.notes}</div>}
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />

      {/* Items Header */}
      <div style={{ display: 'flex', fontWeight: 'bold', fontSize: '10px', marginBottom: '2px' }}>
        <span style={{ flex: 1 }}>Service</span>
        <span style={{ width: '32px', textAlign: 'center' }}>Qty</span>
        <span style={{ width: '48px', textAlign: 'right' }}>Rate</span>
        <span style={{ width: '52px', textAlign: 'right' }}>Amt</span>
      </div>
      <div style={{ borderTop: '1px solid #000', marginBottom: '3px' }} />

      {/* Items */}
      {(sale.items || []).map((item: any, idx: number) => {
        const rate = Number(item.rate || 0);
        const qty = Number(item.quantity || 1);
        const amount = Number(item.amount || 0);
        const discountAmt = Number(item.discount || 0);
        return (
          <div key={idx} style={{ marginBottom: '4px' }}>
            <div style={{ display: 'flex', fontSize: '11px' }}>
              <span style={{ flex: 1, fontWeight: '600', wordBreak: 'break-word', paddingRight: '4px' }}>
                {item.serviceName || item.serviceItem?.name}
              </span>
              <span style={{ width: '32px', textAlign: 'center' }}>{Number(qty).toFixed(qty % 1 === 0 ? 0 : 2)}</span>
              <span style={{ width: '48px', textAlign: 'right' }}>{rate.toFixed(2)}</span>
              <span style={{ width: '52px', textAlign: 'right', fontWeight: 'bold' }}>{amount.toFixed(2)}</span>
            </div>
            {discountAmt > 0 && (
              <div style={{ fontSize: '10px', color: '#666', textAlign: 'right' }}>
                Disc: -{discountAmt.toFixed(2)}
              </div>
            )}
          </div>
        );
      })}

      {/* Separator */}
      <div style={{ borderTop: '1px solid #000', margin: '4px 0' }} />

      {/* Totals */}
      <div style={{ fontSize: '11px' }}>
        {discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>Subtotal</span>
            <span>{subtotal.toFixed(2)}</span>
          </div>
        )}
        {discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>Discount</span>
            <span>-{discount.toFixed(2)}</span>
          </div>
        )}
        {tax > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span>Tax</span>
            <span>+{tax.toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', marginTop: '3px' }}>
          <span>TOTAL</span>
          <span>{formatCurrency(grandTotal)}</span>
        </div>
      </div>

      {/* Separator */}
      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />

      {/* Footer */}
      <div style={{ textAlign: 'center', fontSize: '10px', color: '#444' }}>
        {settings?.invoiceNotes ? (
          <div dangerouslySetInnerHTML={{ __html: settings.invoiceNotes }} style={{ marginBottom: '4px' }} />
        ) : (
          <div>Thank you for your visit!</div>
        )}
        <div style={{ marginTop: '4px', fontSize: '9px', color: '#777' }}>
          Powered by POS Suite 360
        </div>
      </div>

      {/* Final cut line */}
      <div style={{ borderTop: '1px dashed #aaa', margin: '8px 0 2px' }} />
    </div>
  );

  return createPortal(
    <>
      {/* Print Style */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #service-receipt-portal { display: block !important; }
          #service-receipt-portal > .no-print { display: none !important; }
          @page { 
            size: 80mm auto; 
            margin: 0mm; 
          }
          #service-receipt-print-area {
            width: 80mm !important;
            max-width: 80mm !important;
          }
        }
        #service-receipt-portal {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
      `}</style>

      <div id="service-receipt-portal">
        {/* Print-only receipt */}
        {receiptContent}

        {/* Screen view modal */}
        <div className="no-print bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '90vh', width: '360px' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-700 to-purple-500 text-white px-4 py-3 flex items-center justify-between shrink-0">
            <span className="font-bold flex items-center gap-2">
              <Printer size={16} /> Service Receipt
            </span>
            <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Receipt Preview */}
          <div className="overflow-auto p-4 bg-gray-100 flex justify-center flex-1">
            <div className="bg-white shadow-md p-1">
              {receiptContent}
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t flex gap-3 shrink-0 bg-white">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-sm transition-colors shadow"
            >
              <Printer size={15} /> Print Receipt
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default ServiceReceiptPrintModal;
