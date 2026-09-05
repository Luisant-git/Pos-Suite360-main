import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Loader2, QrCode } from 'lucide-react';

const numberToWords = (num: number): string => {
  if (!num || num === 0) return 'ZERO';
  const a = ['', 'ONE ', 'TWO ', 'THREE ', 'FOUR ', 'FIVE ', 'SIX ', 'SEVEN ', 'EIGHT ', 'NINE ', 'TEN ', 'ELEVEN ', 'TWELVE ', 'THIRTEEN ', 'FOURTEEN ', 'FIFTEEN ', 'SIXTEEN ', 'SEVENTEEN ', 'EIGHTEEN ', 'NINETEEN '];
  const b = ['', '', 'TWENTY ', 'THIRTY ', 'FORTY ', 'FIFTY ', 'SIXTY ', 'SEVENTY ', 'EIGHTY ', 'NINETY '];
  const convert = (n: number): string => {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + 'HUNDRED ' + (n % 100 ? convert(n % 100) : '');
    if (n < 1000000) return convert(Math.floor(n / 1000)) + 'THOUSAND ' + (n % 1000 ? convert(n % 1000) : '');
    return n.toString();
  };
  const whole = Math.floor(Number(num));
  const cents = Math.round((Number(num) - whole) * 100);
  let res = convert(whole) || '';
  if (cents > 0) res += `AND CENTS ${convert(cents)}`;
  return res.trim();
};
import { useSettings } from '../contexts/SettingsContext';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';

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

  const handleWhatsApp = async () => {
    setIsSharing(true);
    try {
      // A4 at 96dpi: 794x1123px. Scale 2 for sharpness.
      const S = 2;
      const W = 794 * S, H = 1123 * S;
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(S, S);

      const pad = 32;
      const cw = 794 - pad * 2; // content width
      let y = pad;

      // helpers
      const rect = (x: number, ry: number, w: number, h: number, fill: string) => {
        ctx.fillStyle = fill; ctx.fillRect(x, ry, w, h);
      };
      const border = (x: number, ry: number, w: number, h: number, color: string, lw = 1) => {
        ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.strokeRect(x + lw/2, ry + lw/2, w - lw, h - lw);
      };
      const text = (t: string, x: number, ty: number, font: string, color: string, align: CanvasTextAlign = 'left') => {
        ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(t, x, ty);
      };
      const loadImg = (src: string): Promise<HTMLImageElement> => new Promise((res, rej) => {
        const i = new Image(); i.crossOrigin = 'anonymous';
        i.onload = () => res(i); i.onerror = rej; i.src = src;
      });

      // Background
      rect(0, 0, 794, 1123, '#ffffff');

      // --- HEADER ---
      let headerLeftY = y;
      // Logo (top-left)
      if (settings?.logoImage) {
        try {
          const logo = await loadImg(settings.logoImage);
          const lh = 56, lw = Math.min(160, logo.width * (lh / logo.height));
          ctx.drawImage(logo, pad, headerLeftY, lw, lh);
          headerLeftY += lh + 8;
        } catch { /* skip */ }
      }
      // Shop name below logo
      text((settings?.shopName || 'POS Suite 360').toUpperCase(), pad, headerLeftY + 14, 'bold 16px Arial', '#04325E');
      headerLeftY += 18;
      if (settings?.invoiceTitle) { text(settings.invoiceTitle, pad, headerLeftY + 6, 'bold 11px Arial', '#1A63A8'); headerLeftY += 14; }
      const addrLines = [
        settings?.shopAddress,
        [settings?.city, settings?.state, settings?.country].filter(Boolean).join(', '),
        settings?.phone ? `Tel: ${settings.phone}` : '',
        settings?.gstin ? `GSTIN: ${settings.gstin}` : '',
      ].filter(Boolean) as string[];
      addrLines.forEach((line, i) => text(line, pad, headerLeftY + 8 + i * 14, '10px Arial', '#334155'));
      headerLeftY += 8 + addrLines.length * 14;

      // Invoice title (right)
      text(isEstimation ? 'ESTIMATION' : 'INVOICE', 794 - pad, y + 32, 'bold 30px Arial', '#1A63A8', 'right');
      text(`${isEstimation ? 'Est No' : 'Invoice No'}: #${invoiceNo}`, 794 - pad, y + 50, 'bold 11px Arial', '#334155', 'right');

      y = headerLeftY + 16;

      // --- INFO CARDS ---
      const cardH = 90;
      const halfW = (cw - 8) / 2;
      // Left card
      rect(pad, y, halfW, cardH, '#f8fafc');
      border(pad, y, halfW, cardH, '#f1f5f9');
      text('BILLED TO / CUSTOMER DETAILS', pad + 8, y + 14, 'bold 8px Arial', '#334155');
      text(customerName, pad + 8, y + 28, 'bold 12px Arial', '#1e293b');
      const custLines = [
        sale?.customer?.address, sale?.customer?.state,
        sale?.customer?.phone ? `Phone: ${sale.customer.phone}` : '',
        sale?.customer?.gstNumber ? `GSTIN: ${sale.customer.gstNumber}` : '',
      ].filter(Boolean) as string[];
      custLines.forEach((l, i) => text(l, pad + 8, y + 42 + i * 12, '9px Arial', '#334155'));
      // Right card
      const rx = pad + halfW + 8;
      rect(rx, y, halfW, cardH, '#f8fafc');
      border(rx, y, halfW, cardH, '#f1f5f9');
      text((isEstimation ? 'ESTIMATION' : 'INVOICE') + ' DETAILS', rx + 8, y + 14, 'bold 8px Arial', '#334155');
      const detailRows = [
        ['Date:', date],
        ['Payment Mode:', sale?.paymentMode?.name || 'Cash'],
        ['Status:', sale?.status || 'Completed'],
      ];
      detailRows.forEach(([label, val], i) => {
        text(label, rx + 8, y + 28 + i * 16, 'bold 9px Arial', '#475569');
        text(val, rx + 90, y + 28 + i * 16, '9px Arial', '#1e293b');
      });
      y += cardH + 12;

      // --- ITEMS TABLE ---
      const colX = [pad, pad+28, pad+28+260, pad+28+260+90, pad+28+260+90+90];
      const colW = [28, 260, 90, 90, cw - (28+260+90+90)];
      // Header row
      rect(pad, y, cw, 28, '#2D6AA1');
      const headers = ['#', 'ITEM DESCRIPTION', 'QUANTITY', `UNIT RATE (${currency})`, `AMOUNT (${currency})`];
      const hAligns: CanvasTextAlign[] = ['left','left','center','right','right'];
      headers.forEach((h, i) => {
        const tx = hAligns[i] === 'right' ? colX[i] + colW[i] - 4
                 : hAligns[i] === 'center' ? colX[i] + colW[i]/2 : colX[i] + 4;
        text(h, tx, y + 18, 'bold 8px Arial', '#ffffff', hAligns[i]);
      });
      y += 28;
      // Item rows
      items.forEach((item: any, idx: number) => {
        const rh = 28;
        rect(pad, y, cw, rh, idx % 2 === 0 ? '#ffffff' : '#f8fafc');
        border(pad, y, cw, rh, '#f1f5f9');
        const rowData = [
          String(idx + 1),
          `${item.product?.name || ''}${item.product?.code ? ` (${item.product.code})` : ''}`,
          `${item.quantity} ${item.product?.unit?.shortCode || 'Nos'}`,
          Number(item.rate || 0).toFixed(2),
          Number(item.amount || item.total || 0).toFixed(2),
        ];
        rowData.forEach((d, i) => {
          const tx = hAligns[i] === 'right' ? colX[i] + colW[i] - 4
                   : hAligns[i] === 'center' ? colX[i] + colW[i]/2 : colX[i] + 4;
          text(d, tx, y + 18, i === 1 ? 'bold 9px Arial' : '9px Arial', i === 4 ? '#1e293b' : '#475569', hAligns[i]);
        });
        y += rh;
      });
      y += 12;

      // --- FOOTER ---
      const footerY = y;
      const leftW = cw - 260;
      const rightX = pad + leftW + 8;
      const rightW = 252;

      // Terms box
      rect(pad, footerY, leftW - 8, 70, '#f8fafc');
      border(pad, footerY, leftW - 8, 70, '#f1f5f9');
      text('TERMS & CONDITIONS', pad + 8, footerY + 14, 'bold 8px Arial', '#1A63A8');
      const notesRaw = (settings?.invoiceNotes || '1. Goods once sold cannot be taken back or exchanged.<br/>2. Subject to Salem jurisdiction.')
        .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
      const notes = notesRaw.split('\n');
      notes.slice(0, 4).forEach((line, i) => text(line.trim(), pad + 8, footerY + 26 + i * 12, '8px Arial', '#1e293b'));

      // QR code
      const qrCanvas = document.getElementById('upi-qr-code-canvas') as HTMLCanvasElement | null;
      if (qrCanvas && showPaymentInfo && settings?.upiId && grandTotal > 0) {
        const qrY2 = footerY + 78;
        rect(pad, qrY2, leftW - 8, 60, '#f8fafc');
        border(pad, qrY2, leftW - 8, 60, '#f1f5f9');
        ctx.drawImage(qrCanvas, pad + 8, qrY2 + 6, 48, 48);
        text('SCAN OR CLICK TO PAY', pad + 64, qrY2 + 18, 'bold 9px Arial', '#1e293b');
        text(`UPI ID: ${settings.upiId.trim()}`, pad + 64, qrY2 + 32, '8px Arial', '#475569');
        text('Scan or tap to open UPI app', pad + 64, qrY2 + 44, '8px Arial', '#94a3b8');
      }

      // Totals box
      rect(rightX, footerY, rightW, 110, '#f8fafc');
      border(rightX, footerY, rightW, 110, '#e2e8f0');
      let ty = footerY + 18;
      const totalRows: [string, string][] = [['Subtotal:', Number(sale?.subtotal || 0).toFixed(2)]];
      if (settings?.enableTax) {
        const taxVal = parseFloat(sale?.tax);
        if (!isNaN(taxVal) && taxVal > 0) {
          const ss = (settings.state || '').trim().toLowerCase();
          const cs = (sale?.customer?.state || '').trim().toLowerCase();
          if (ss && cs && ss === cs) {
            const half = (taxVal / 2).toFixed(2);
            totalRows.push(['CGST:', half], ['SGST:', half]);
          } else totalRows.push(['IGST:', taxVal.toFixed(2)]);
        }
      }
      if (Number(sale?.discount) > 0) totalRows.push(['Discount:', Number(sale.discount).toFixed(2)]);
      totalRows.forEach(([label, val]) => {
        text(label, rightX + 8, ty, '10px Arial', '#334155');
        text(val, rightX + rightW - 8, ty, '600 10px Arial', '#334155', 'right');
        ty += 16;
      });
      // Total due bar
      rect(rightX, ty + 2, rightW, 28, '#F0F5FA');
      ctx.strokeStyle = '#1A63A8'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(rightX, ty + 2); ctx.lineTo(rightX + rightW, ty + 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(rightX, ty + 30); ctx.lineTo(rightX + rightW, ty + 30); ctx.stroke();
      text('Total Due:', rightX + 8, ty + 20, 'bold 12px Arial', '#04325E');
      text(`${currency} ${Number(grandTotal).toFixed(2)}`, rightX + rightW - 8, ty + 20, 'bold 13px Arial', '#04325E', 'right');
      ty += 34;
      text(numberToWords(grandTotal) + ' ONLY', rightX + rightW - 8, ty + 8, 'bold 7px Arial', '#1A63A8', 'right');

      // Signature
      if (settings?.signatureImage && !isEstimation) {
        try {
          const sig = await loadImg(settings.signatureImage);
          ctx.drawImage(sig, rightX + rightW - 100, ty + 16, 80, 32);
        } catch { /* skip */ }
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(rightX + rightW - 120, ty + 56); ctx.lineTo(rightX + rightW - 8, ty + 56); ctx.stroke();
        text('Authorized Signatory', rightX + rightW - 64, ty + 66, 'bold 8px Arial', '#334155', 'center');
      }

      // Footer line
      const fy = 1123 - 24;
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad, fy - 8); ctx.lineTo(794 - pad, fy - 8); ctx.stroke();
      text(`Thank you for partnering with ${settings?.shopName || 'POS Suite 360'}! | Page 1 of 1`, 794/2, fy + 4, '9px Arial', '#475569', 'center');

      // Convert canvas → PDF → share
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
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
              href={`${window.location.origin}/?pa=${settings.upiId}&pn=${encodeURIComponent(settings?.shopName || 'Shop')}&tn=${encodeURIComponent(invoiceNo)}&am=${Number(grandTotal).toFixed(2)}&cu=INR`}
              target="_blank" 
              rel="noopener noreferrer" 
              className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-center gap-4 hover:bg-slate-100 transition-colors cursor-pointer"
              style={{ textDecoration: 'none' }}
            >
              <div className="bg-white p-1.5 rounded border border-slate-200 shadow-sm shrink-0">
                <QRCodeSVG 
                  value={`upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings?.shopName || 'Shop')}&tn=${encodeURIComponent(invoiceNo)}&am=${Number(grandTotal).toFixed(2)}&cu=INR&mc=0000&mode=02&purpose=00`}
                  size={64}
                  level="M"
                />
                <QRCodeCanvas 
                  id="upi-qr-code-canvas"
                  value={`upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings?.shopName || 'Shop')}&tn=${encodeURIComponent(invoiceNo)}&am=${Number(grandTotal).toFixed(2)}&cu=INR&mc=0000&mode=02&purpose=00`}
                  size={900}
                  level="M"
                  className="hidden"
                />
              </div>
              <div className="flex flex-col">
                <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-1">Scan or Click to Pay</h3>
                <p className="text-[10px] text-slate-600 font-medium">UPI ID: {settings.upiId}</p>
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
        <div id="printable-invoice" className="flex-1 min-h-0 overflow-auto bg-gray-200 p-2 sm:p-8 print:p-0 print:bg-white flex justify-center print:overflow-visible">
          <div className="bg-white shadow-sm w-full max-w-[210mm] min-h-[297mm] print:w-full print:max-w-none print:shadow-none print:min-h-[100vh] flex flex-col">
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

        {/* Hidden container for PDF generation */}
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
