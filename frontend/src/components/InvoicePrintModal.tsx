import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Loader2, QrCode } from 'lucide-react';

import { useSettings } from '../contexts/SettingsContext';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';

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
  const [isSharingQR, setIsSharingQR] = useState(false);

  // Always fetch full sale data to ensure unit, paymentMode, customer are fully populated
  const { data: fullSale, isLoading } = useQuery({
    queryKey: [isEstimation ? 'estimation-print' : 'invoice-print', initialSale?.id],
    queryFn: async () => (await api.get(`/${isEstimation ? 'estimations' : 'sales'}/${initialSale.id}`)).data,
    enabled: isOpen && !!initialSale?.id,
    staleTime: 0,
    gcTime: 0,
  });

  const sale = fullSale || initialSale;
  const invoiceNo = sale?.estimationNo || sale?.invoiceNo || '';
  const showPaymentInfo = !isEstimation || (sale?.stockMaintained ?? settings?.estimationStockMaintain);

  useEffect(() => {
    if (autoPrint && !isLoading && sale) {
      const timer = setTimeout(() => {
        window.print();
        onClose();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPrint, isLoading, sale, onClose]);

  useEffect(() => {
    if (isOpen && invoiceNo) {
      const originalTitle = document.title;
      document.title = `invoice_${invoiceNo}`;
      return () => {
        document.title = originalTitle;
      };
    }
  }, [isOpen, invoiceNo]);

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

  const date = sale?.date ? new Date(sale.date).toISOString().split('T')[0] : '';
  const customerName = sale?.customer?.name || 'CASH A/C';
  const items = sale?.items || [];
  const grandTotal = sale?.grandTotal || 0;
  const currency = settings?.currencySymbol || 'RM';

  const buildInvoiceHTML = (): string => {
    const upiValue = showPaymentInfo && settings?.upiId && grandTotal > 0
      ? `upi://pay?pa=${settings.upiId.trim()}&pn=${encodeURIComponent(settings?.shopName || 'Shop')}&tr=${encodeURIComponent(invoiceNo)}&am=${Number(grandTotal).toFixed(2)}&cu=INR`
      : null;

    const qrCanvas = document.getElementById('upi-qr-code-canvas') as HTMLCanvasElement | null;
    const qrDataUrl = qrCanvas ? qrCanvas.toDataURL('image/png') : null;

    const taxRows = (() => {
      if (!settings?.enableTax) return '';
      const taxAmount = Number(sale?.tax);
      if (!taxAmount || isNaN(taxAmount) || taxAmount === 0) return '';
      const storeState = (settings.state || '').trim().toLowerCase();
      const custState = (sale?.customer?.state || '').trim().toLowerCase();
      if (storeState && custState && storeState === custState) {
        const split = (taxAmount / 2).toFixed(2);
        return `<tr><td style="padding:4px 0;color:#334155">CGST:</td><td style="text-align:right;font-weight:600">${split}</td></tr>
                <tr><td style="padding:4px 0;color:#334155">SGST:</td><td style="text-align:right;font-weight:600">${split}</td></tr>`;
      }
      return `<tr><td style="padding:4px 0;color:#334155">IGST:</td><td style="text-align:right;font-weight:600">${taxAmount.toFixed(2)}</td></tr>`;
    })();

    const itemRows = items.map((item: any, idx: number) => `
      <tr style="border-bottom:1px solid #f1f5f9">
        <td style="padding:10px 12px;color:#94a3b8">${idx + 1}</td>
        <td style="padding:10px 12px"><span style="font-weight:700;color:#1e293b">${item.product?.name || ''}</span>${item.product?.code ? ` <span style="color:#94a3b8">(${item.product.code})</span>` : ''}</td>
        <td style="padding:10px 12px;text-align:center;color:#475569">${item.quantity} ${item.product?.unit?.shortCode || 'Nos'}</td>
        <td style="padding:10px 12px;text-align:right;color:#475569">${Number(item.rate || 0).toFixed(2)}</td>
        <td style="padding:10px 12px;text-align:right;font-weight:700;color:#1e293b">${Number(item.amount || item.total || 0).toFixed(2)}</td>
      </tr>`).join('');

    const notes = (settings?.invoiceNotes !== undefined && settings?.invoiceNotes !== null)
      ? settings.invoiceNotes
      : '1. Goods once sold cannot be taken back or exchanged.<br/>2. Subject to Salem jurisdiction.';

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; background: #fff; }
  @page { size: A4; margin: 10mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>
<div style="width:100%;background:#fff;padding:20px">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px">
    <div>
      ${settings?.logoImage ? `<img src="${settings.logoImage}" style="max-height:60px;max-width:160px;object-fit:contain;display:block;margin-bottom:8px"/>` : ''}
      <div style="font-size:18px;font-weight:700;color:#04325E;text-transform:uppercase">${settings?.shopName || 'POS Suite 360'}</div>
      ${settings?.invoiceTitle ? `<div style="color:#1A63A8;font-weight:700;font-size:11px;margin-top:2px">${settings.invoiceTitle}</div>` : ''}
      <div style="margin-top:6px;font-size:10px;color:#334155;line-height:1.6">
        ${settings?.shopAddress ? `<div>${settings.shopAddress}</div>` : ''}
        <div style="font-weight:700">${[settings?.city, settings?.state, settings?.country].filter(Boolean).join(', ')}</div>
        ${settings?.phone ? `<div>Tel: ${settings.phone}</div>` : ''}
        ${settings?.gstin ? `<div>GSTIN: ${settings.gstin}</div>` : ''}
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:28px;font-weight:900;color:#1A63A8;letter-spacing:2px">${isEstimation ? 'ESTIMATION' : 'INVOICE'}</div>
      <div style="font-weight:700;color:#334155;font-size:11px;margin-top:4px">${isEstimation ? 'Est No' : 'Invoice No'}: #${invoiceNo}</div>
    </div>
  </div>

  <!-- Info Cards -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
    <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:8px;padding:12px">
      <div style="font-size:9px;font-weight:900;color:#334155;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Billed To / Customer Details</div>
      <div style="font-weight:700;font-size:12px;margin-bottom:4px">${customerName}</div>
      <div style="font-size:10px;color:#334155;line-height:1.6">
        ${sale?.customer?.address ? `<div>${sale.customer.address}</div>` : ''}
        ${sale?.customer?.state ? `<div>${sale.customer.state}</div>` : ''}
        ${sale?.customer?.phone ? `<div>Phone: ${sale.customer.phone}</div>` : ''}
        ${sale?.customer?.gstNumber ? `<div>GSTIN: ${sale.customer.gstNumber}</div>` : ''}
      </div>
    </div>
    <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:8px;padding:12px">
      <div style="font-size:9px;font-weight:900;color:#334155;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${isEstimation ? 'Estimation Details' : 'Invoice Details'}</div>
      <table style="font-size:10px;width:100%">
        <tr><td style="font-weight:700;color:#475569;padding:2px 0;width:110px">Date:</td><td>${date}</td></tr>
        <tr><td style="font-weight:700;color:#475569;padding:2px 0">Payment Mode:</td><td>${sale?.paymentMode?.name || 'Cash'}</td></tr>
        <tr><td style="font-weight:700;color:#475569;padding:2px 0">Status:</td><td>${sale?.status || 'Completed'}</td></tr>
        ${Number(sale?.customer?.openingBalance) > 0 ? `<tr><td style="font-weight:700;color:#475569;padding:2px 0">Pending Amount:</td><td>${currency} ${Number(sale.customer.openingBalance).toFixed(2)}</td></tr>` : ''}
      </table>
    </div>
  </div>

  <!-- Items Table -->
  <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;margin-bottom:16px;font-size:11px">
    <thead>
      <tr style="background:#2D6AA1;color:#fff;font-size:9px;text-transform:uppercase;letter-spacing:1px">
        <th style="padding:10px 12px;font-weight:700;width:5%;text-align:left">#</th>
        <th style="padding:10px 12px;font-weight:700;width:45%;text-align:left">Item Description</th>
        <th style="padding:10px 12px;font-weight:700;width:15%;text-align:center">Quantity</th>
        <th style="padding:10px 12px;font-weight:700;width:15%;text-align:right">Unit Rate (${currency})</th>
        <th style="padding:10px 12px;font-weight:700;width:20%;text-align:right">Amount (${currency})</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>

  <!-- Footer -->
  <div style="display:grid;grid-template-columns:1fr 300px;gap:24px">
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:8px;padding:12px">
        <div style="font-size:9px;font-weight:700;color:#1A63A8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Terms &amp; Conditions</div>
        <div style="font-size:10px;color:#1e293b;font-weight:700">${notes}</div>
      </div>
      ${qrDataUrl && upiValue ? `
      <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:8px;padding:12px;display:flex;align-items:center;gap:12px">
        <img src="${qrDataUrl}" style="width:64px;height:64px;border:1px solid #e2e8f0;border-radius:4px"/>
        <div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">Scan or Click to Pay</div>
          <div style="font-size:9px;color:#475569">UPI ID: ${settings!.upiId!.trim()}</div>
          <div style="font-size:8px;color:#94a3b8;margin-top:2px">Scan or tap to open UPI app</div>
        </div>
      </div>` : ''}
    </div>
    <div style="display:flex;flex-direction:column;justify-content:flex-end">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:16px">
        <table style="width:100%;font-size:12px">
          <tr><td style="padding:4px 0;color:#334155">Subtotal:</td><td style="text-align:right;font-weight:600">${Number(sale?.subtotal || 0).toFixed(2)}</td></tr>
          ${taxRows}
          ${Number(sale?.discount) > 0 ? `<tr><td style="padding:4px 0;color:#334155">Discount:</td><td style="text-align:right;font-weight:600">${Number(sale?.discount || 0).toFixed(2)}</td></tr>` : ''}
        </table>
        <div style="background:#F0F5FA;border-top:2px solid #1A63A8;border-bottom:2px solid #1A63A8;padding:10px 0;display:flex;justify-content:space-between;margin-top:8px">
          <span style="font-weight:700;font-size:13px;color:#04325E">Total Due:</span>
          <span style="font-weight:900;font-size:14px;color:#04325E">${currency} ${Number(grandTotal).toFixed(2)}</span>
        </div>
        <div style="text-align:right;font-size:8px;color:#1A63A8;font-weight:700;text-transform:uppercase;margin-top:4px">${numberToWords(grandTotal)} ONLY</div>
      </div>
      ${settings?.signatureImage && !isEstimation ? `
      <div style="text-align:right;position:relative">
        <div style="font-size:9px;font-weight:700;margin-bottom:40px">For ${settings?.shopName || 'POS Suite 360'}</div>
        <img src="${settings.signatureImage}" style="position:absolute;bottom:20px;right:24px;height:40px;object-fit:contain;opacity:0.8"/>
        <div style="display:inline-block;border-top:1px solid #94a3b8;padding-top:6px;width:160px">
          <div style="font-size:10px;font-weight:700;color:#334155;text-align:center">Authorized Signatory</div>
        </div>
      </div>` : ''}
    </div>
  </div>

  <div style="margin-top:24px;text-align:center;font-size:10px;color:#475569;border-top:1px solid #e2e8f0;padding-top:10px">
    Thank you for partnering with ${settings?.shopName || 'POS Suite 360'}! | Page 1 of 1
  </div>
</div>
</body></html>`;
  };

  const handleWhatsApp = async () => {
    setIsSharing(true);
    try {
      const html = buildInvoiceHTML();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      // Load HTML into a hidden iframe — it has NO Tailwind/oklch styles
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:none;visibility:hidden';
      iframe.src = url;
      document.body.appendChild(iframe);

      await new Promise<void>((resolve) => { iframe.onload = () => resolve(); });

      // html2canvas on the iframe's body — no oklch in that document
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(iframe.contentDocument!.body, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: 794,
        height: 1123,
      });

      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);

      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
      const pdfBlob = pdf.output('blob');

      const file = new File([pdfBlob], `Invoice_${invoiceNo}.pdf`, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `${isEstimation ? 'Estimation' : 'Invoice'} ${invoiceNo}` });
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfBlob);
        link.download = `Invoice_${invoiceNo}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('Error generating/sharing PDF:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleShareQR = async () => {
    const qrCanvas = document.getElementById('upi-qr-code-canvas') as HTMLCanvasElement;
    if (!qrCanvas) {
      toast.error('QR code is not available for this invoice');
      return;
    }
    
    setIsSharingQR(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2d context');

      const scale = 3;
      const width = 400 * scale;
      const height = 650 * scale;
      canvas.width = width;
      canvas.height = height;

      // Ensure high quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Helper function to draw rounded rectangles
      const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
      };

      // 1. Background (Light Slate)
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(0, 0, width, height);

      // 2. Header Area (Dark Blue)
      ctx.fillStyle = '#04325E';
      ctx.fillRect(0, 0, width, 180 * scale);

      // 3. Header Text
      ctx.textAlign = 'center';
      
      // Shop Name
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${22 * scale}px sans-serif`;
      ctx.fillText((settings?.shopName || 'POS Suite 360').toUpperCase(), width / 2, 70 * scale);
      
      // Subtitle
      ctx.fillStyle = '#94A3B8';
      ctx.font = `bold ${13 * scale}px sans-serif`;
      ctx.letterSpacing = `${2 * scale}px`; // Simulating letter spacing by adding spaces could be done, but standard canvas doesn't support letterSpacing directly in all old browsers. Modern browsers support ctx.letterSpacing.
      (ctx as any).letterSpacing = `${2 * scale}px`;
      ctx.fillText('SCAN TO PAY', width / 2, 105 * scale);
      (ctx as any).letterSpacing = '0px';

      // 4. Floating White Card
      const cardMargin = 30 * scale;
      const cardY = 140 * scale;
      const cardWidth = width - (cardMargin * 2);
      const cardHeight = 440 * scale;
      
      // Shadow (Draw a slightly offset gray rect)
      roundRect(ctx, cardMargin, cardY + 8 * scale, cardWidth, cardHeight, 16 * scale, '#E2E8F0');
      // Main Card
      roundRect(ctx, cardMargin, cardY, cardWidth, cardHeight, 16 * scale, '#ffffff');

      // 5. QR Code inside the card
      const qrSize = 240 * scale;
      const qrX = (width - qrSize) / 2;
      const qrY = cardY + 30 * scale;
      ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

      // 6. Payment Details inside card
      let currentY = qrY + qrSize + 45 * scale;
      
      ctx.fillStyle = '#64748B';
      ctx.font = `bold ${13 * scale}px sans-serif`;
      ctx.fillText(`INVOICE NO: #${invoiceNo}`, width / 2, currentY);

      currentY += 40 * scale;
      ctx.fillStyle = '#0F172A';
      ctx.font = `bold ${26 * scale}px sans-serif`;
      ctx.fillText(`${currency} ${Number(grandTotal).toFixed(2)}`, width / 2, currentY);

      currentY += 45 * scale;
      
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      };

      try {
        const [gpayImg, phonepeImg, paytmImg, upiImg] = await Promise.all([
          loadImage('/icons/gpay.png'),
          loadImage('/icons/phonepe.png'),
          loadImage('/icons/paytm.png'),
          loadImage('/icons/upi.png')
        ]);

        const drawImageAspect = (img: HTMLImageElement, x: number, y: number, maxWidth: number, maxHeight: number) => {
          let w = img.width || 100;
          let h = img.height || 40;
          const ratio = Math.min(maxWidth / w, maxHeight / h);
          const finalW = w * ratio;
          const finalH = h * ratio;
          const offsetX = x + (maxWidth - finalW) / 2;
          const offsetY = y + (maxHeight - finalH) / 2;
          ctx.drawImage(img, offsetX, offsetY, finalW, finalH);
        };

        const centerY = currentY;
        const iconSize = 44 * scale; 
        const overlap = 14 * scale;
        const totalW = (4 * iconSize) - (3 * overlap);
        let startX = (width - totalW) / 2;

        const imgs = [gpayImg, phonepeImg, paytmImg, upiImg];
        imgs.forEach((img) => {
          // Draw a thin grey border circle to distinguish overlap
          ctx.beginPath();
          ctx.arc(startX + (iconSize / 2), centerY, (iconSize / 2) + (1.5 * scale), 0, 2 * Math.PI);
          ctx.fillStyle = '#cbd5e1';
          ctx.fill();

          // Draw inner white circle
          ctx.beginPath();
          ctx.arc(startX + (iconSize / 2), centerY, iconSize / 2, 0, 2 * Math.PI);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          // Create circular clipping path for the image
          ctx.save();
          ctx.beginPath();
          ctx.arc(startX + (iconSize / 2), centerY, iconSize / 2, 0, 2 * Math.PI);
          ctx.clip();

          // Draw the image inside (with padding)
          const padding = 8 * scale;
          drawImageAspect(img, startX + padding, centerY - (iconSize / 2) + padding, iconSize - (padding * 2), iconSize - (padding * 2));
          
          ctx.restore();

          startX += iconSize - overlap;
        });
      } catch (err) {
        console.error('Failed to load payment icons', err);
        ctx.fillStyle = '#16A34A';
        ctx.font = `bold ${13 * scale}px sans-serif`;
        ctx.fillText('✓ ACCEPTING ALL UPI APPS', width / 2, currentY);
      }

      // 7. Footer Watermark
      ctx.fillStyle = '#94A3B8';
      ctx.font = `bold ${11 * scale}px sans-serif`;
      ctx.fillText('SECURE PAYMENTS BY POS SUITE 360', width / 2, height - 25 * scale);

      await new Promise<void>((resolve) => {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            resolve();
            return;
          }
          const file = new File([blob], `Pay_${invoiceNo}.png`, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({ files: [file], title: `Pay Invoice ${invoiceNo}` });
            } catch (err: any) {
              if (err.name !== 'AbortError') {
                console.error('Error sharing QR code:', err);
              }
            }
          } else {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Pay_${invoiceNo}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
          resolve();
        }, 'image/png');
      });
    } catch (err) {
      console.error('Error sharing QR Code:', err);
      toast.error('Failed to share QR Code');
    } finally {
      setIsSharingQR(false);
    }
  };

  const InvoiceContent = () => (
    <div 
      className={`flex flex-col flex-1 bg-white text-slate-800 ${hiddenRenderer ? 'w-[800px] h-[1100px] box-border p-10 text-[13px]' : 'p-8 text-[12px] print:p-6 print:text-[11px]'} print:overflow-visible overflow-hidden`}
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
        {/* Left Footer: Notes/Terms & QR */}
        <div className="flex flex-col gap-4 h-full">
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex-1 flex flex-col">
            <h3 className="text-[10px] font-bold text-[#1A63A8] uppercase tracking-widest mb-2">Terms & Conditions</h3>
            <div 
              className="text-[11px] text-slate-800 font-bold prose prose-sm max-w-none html-content flex-1"
              dangerouslySetInnerHTML={{ __html: (settings?.invoiceNotes !== undefined && settings?.invoiceNotes !== null) ? settings.invoiceNotes : '1. Goods once sold cannot be taken back or exchanged.<br/>2. Subject to Salem jurisdiction.' }}
            />
          </div>
          
          {showPaymentInfo && settings?.upiId && grandTotal > 0 && (
            <a 
              href={`${window.location.origin}/?pa=${settings.upiId.trim()}&pn=${encodeURIComponent(settings?.shopName || 'Shop')}&tr=${encodeURIComponent(invoiceNo)}&am=${Number(grandTotal).toFixed(2)}&cu=INR`}
              target="_blank" 
              rel="noopener noreferrer" 
              className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-center gap-4 hover:bg-slate-100 transition-colors cursor-pointer"
              style={{ textDecoration: 'none' }}
            >
              <div className="bg-white p-1.5 rounded border border-slate-200 shadow-sm shrink-0">
                <QRCodeSVG 
                  value={`upi://pay?pa=${settings.upiId.trim()}&pn=${encodeURIComponent(settings?.shopName || 'Shop')}&tr=${encodeURIComponent(invoiceNo)}&am=${Number(grandTotal).toFixed(2)}&cu=INR`}
                  size={64}
                  level="M"
                />
                <QRCodeCanvas 
                  id="upi-qr-code-canvas"
                  value={`upi://pay?pa=${settings.upiId.trim()}&pn=${encodeURIComponent(settings?.shopName || 'Shop')}&tr=${encodeURIComponent(invoiceNo)}&am=${Number(grandTotal).toFixed(2)}&cu=INR`}
                  size={900}
                  level="M"
                  className="hidden"
                />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-1">Scan or Click to Pay</h3>
                <p className="text-[10px] text-slate-600 font-medium">UPI ID: {settings.upiId.trim()}</p>
                <p className="text-[9px] text-slate-500 mt-1">Scan or tap to open UPI app</p>
              </div>
            </a>
          )}
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
                  const taxAmount = Number(sale?.tax);
                  if (!taxAmount || isNaN(taxAmount) || taxAmount === 0) return null;

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

          {settings?.signatureImage && !isEstimation && (
            <div className="text-right mt-4 relative">
              <p className="text-[10px] font-bold text-slate-800 mb-12">For {settings?.shopName || 'POS Suite 360'}</p>
              <img 
                src={settings.signatureImage} 
                alt="Authorised Signature" 
                className="absolute bottom-6 right-8 h-12 object-contain opacity-80 mix-blend-multiply"
              />
              <div className="inline-block border-t border-slate-400 pt-2 px-8 w-48 mt-4">
                <p className="text-[11px] font-bold text-slate-700 text-center">Authorized Signatory</p>
              </div>
            </div>
          )}
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
        <div id="printable-invoice" className="flex-1 min-h-0 overflow-auto bg-gray-200 p-2 sm:p-8 print:p-0 print:bg-white flex justify-center print:block print:overflow-visible">
          <div className="bg-white shadow-sm w-full max-w-[210mm] min-h-[297mm] print:w-full print:max-w-none print:shadow-none print:min-h-screen flex flex-col">
            <InvoiceContent />
          </div>
        </div>

        {/* Footer Actions - Screen Only */}
        {!autoPrint && (
          <div className="flex flex-wrap justify-between items-center gap-2 p-3 bg-gray-50 border-t border-gray-200 rounded-b-md print:hidden shrink-0">
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={handleWhatsApp}
                disabled={isSharing}
                className="bg-[#25D366] hover:bg-[#128C7E] disabled:opacity-70 text-white px-3 py-2 rounded flex items-center gap-2 font-bold text-[12px] transition-colors"
              >
                {isSharing ? (
                  <><Loader2 size={14} className="animate-spin" /> Preparing...</>
                ) : (
                  <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg> <span className="hidden sm:inline">Share Invoice</span></>
                )}
              </button>
              {showPaymentInfo && settings?.upiId && grandTotal > 0 && (
                <button 
                  type="button"
                  onClick={handleShareQR}
                  disabled={isSharingQR}
                  className="bg-[#38BDF8] hover:bg-[#0EA5E9] disabled:opacity-70 text-white px-3 py-2 rounded flex items-center gap-2 font-bold text-[12px] transition-colors"
                >
                  {isSharingQR ? (
                    <><Loader2 size={14} className="animate-spin" /> <span className="hidden sm:inline">Preparing...</span></>
                  ) : (
                    <><QrCode size={14} /> <span className="hidden sm:inline">Share QR</span></>
                  )}
                </button>
              )}
            </div>
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

        {/* Hidden container for full A4 PDF generation via html2pdf */}
        <div style={{ display: 'none' }}>
          <div id="pdf-invoice-content">
            <div className="w-[800px] bg-white">
              <InvoiceContent />
            </div>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default InvoicePrintModal;
