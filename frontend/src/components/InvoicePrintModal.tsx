import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Loader2, QrCode, Download } from 'lucide-react';

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
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';

interface InvoicePrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: any;
  hiddenRenderer?: boolean;
  isEstimation?: boolean;
  autoPrint?: boolean;
  forceFormat?: 'a4' | 'a5' | 'thermal';
}

const InvoicePrintModal = ({ isOpen, onClose, sale: initialSale, hiddenRenderer = false, isEstimation = false, autoPrint = false, forceFormat }: InvoicePrintModalProps) => {
  const { settings } = useSettings();
  const [isSharing, setIsSharing] = useState(false);
  const [isSharingQR, setIsSharingQR] = useState(false);
  const [isDownloadingQR, setIsDownloadingQR] = useState(false);
  const [printFormat, setPrintFormat] = useState<'a4' | 'a5' | 'thermal'>(
    () => {
      const saved = (localStorage.getItem('invoicePrintFormat') || 'a4').toLowerCase();
      return (saved === 'a5' || saved === 'thermal') ? saved as 'a5' | 'thermal' : 'a4';
    }
  );

  // Sync from settings when loaded (forceFormat takes priority, then settings.printFormat)
  useEffect(() => {
    if (forceFormat) {
      setPrintFormat(forceFormat);
      return;
    }
    if (settings?.printFormat) {
      const fmt = settings.printFormat.toLowerCase() as 'a4' | 'a5' | 'thermal';
      if (fmt === 'a4' || fmt === 'a5' || fmt === 'thermal') {
        setPrintFormat(fmt);
        localStorage.setItem('invoicePrintFormat', fmt);
      }
    }
  }, [forceFormat, settings?.printFormat]);

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
  const activeUpiId = isEstimation
    ? settings?.estimationUpiId
    : settings?.upiId;

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
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
      const W = 210;
      const margin = 14;
      let y = margin;
      const col = margin;
      const lineH = 6;

      const addText = (t: string | string[], x: number, yPos: number, opts: any = {}) => {
        doc.setFontSize(opts.size || 10);
        doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
        doc.setTextColor(opts.color || '#1e293b');
        const textOpts: any = {};
        if (opts.maxWidth) textOpts.maxWidth = opts.maxWidth;
        if (opts.align) textOpts.align = opts.align;
        doc.text(t || '', x, yPos, textOpts);
      };

      // Logo
      if (settings?.logoImage) {
        try {
          const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image(); img.crossOrigin = 'Anonymous';
            img.onload = () => resolve(img); img.onerror = reject; img.src = settings.logoImage!;
          });
          const maxW = 50, maxH = 20;
          const ratio = Math.min(maxW / (logoImg.width || 100), maxH / (logoImg.height || 40));
          const lw = (logoImg.width || 100) * ratio, lh = (logoImg.height || 40) * ratio;
          const cv = document.createElement('canvas'); cv.width = logoImg.width; cv.height = logoImg.height;
          cv.getContext('2d')!.drawImage(logoImg, 0, 0);
          doc.addImage(cv.toDataURL('image/png'), 'PNG', col, y, lw, lh);
          y += lh + 4;
        } catch { /* skip */ }
      }

      addText((settings?.shopName || 'POS Suite 360').toUpperCase(), col, y, { size: 14, bold: true, color: '#04325E' }); y += 7;
      if (settings?.invoiceTitle) { addText(settings.invoiceTitle, col, y, { size: 10, color: '#1A63A8' }); y += 5; }
      if (settings?.shopAddress) { addText(settings.shopAddress, col, y, { size: 9, color: '#475569' }); y += 5; }
      const cityLine = [settings?.city, settings?.state, settings?.country].filter(Boolean).join(', ');
      if (cityLine) { addText(cityLine, col, y, { size: 9, bold: true, color: '#475569' }); y += 5; }
      if (settings?.phone) { addText(`Tel: ${settings.phone}`, col, y, { size: 9, color: '#475569' }); y += 5; }
      if (settings?.gstin) { addText(`GSTIN: ${settings.gstin}`, col, y, { size: 9, color: '#475569' }); y += 5; }

      // Invoice label top-right
      addText(isEstimation ? 'ESTIMATION' : 'TAX INVOICE', W - margin, margin + 4, { size: 16, bold: true, color: '#1A63A8', align: 'right' });
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor('#334155');
      doc.text(`${isEstimation ? 'Est No' : 'Invoice No'}: #${invoiceNo}`, W - margin, margin + 11, { align: 'right' });

      y += 4;
      doc.setDrawColor('#e2e8f0'); doc.setLineWidth(0.3); doc.line(col, y, W - margin, y); y += 6;

      // Bill To (left column)
      const billStartY = y;
      addText('BILLED TO / CUSTOMER DETAILS', col, y, { size: 8, bold: true, color: '#64748b' }); y += 5;
      addText(customerName, col, y, { size: 11, bold: true }); y += 5;
      if (sale?.customer?.address) {
        const addressLines = doc.splitTextToSize(sale.customer.address, 80);
        addText(addressLines, col, y, { size: 9, color: '#475569' }); y += (addressLines.length * 4) + 1;
      }
      if (sale?.customer?.state) { addText(sale.customer.state, col, y, { size: 9, color: '#475569' }); y += 5; }
      if (sale?.customer?.phone) { addText(`Phone: ${sale.customer.phone}`, col, y, { size: 9, color: '#475569' }); y += 5; }
      if (sale?.customer?.gstNumber) { addText(`GSTIN: ${sale.customer.gstNumber}`, col, y, { size: 9, color: '#475569' }); y += 5; }

      // Invoice/Estimation details — right column, aligned with Bill To
      const midX = W / 2 + 2;
      const lx = midX, vx = W - margin;
      let iy = billStartY;
      addText(isEstimation ? 'ESTIMATION DETAILS' : 'INVOICE DETAILS', midX, iy, { size: 8, bold: true, color: '#64748b' }); iy += 5;
      doc.setFontSize(9); doc.setTextColor('#334155');
      [['Invoice No:', '#' + invoiceNo], ['Date:', date], ['Payment:', sale?.paymentMode?.name || 'Cash']]
        .forEach(([label, val]) => {
          doc.setFont('helvetica', 'bold'); doc.text(label, lx, iy);
          doc.setFont('helvetica', 'normal'); doc.text(val, vx, iy, { align: 'right' }); iy += 5;
        });

      y += 4;
      doc.setDrawColor('#e2e8f0'); doc.line(col, y, W - margin, y); y += 6;

      // Table header
      doc.setFillColor('#2D6AA1'); doc.rect(col, y - 4, W - margin * 2, 8, 'F');
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor('#ffffff');
      doc.text('#', col + 2, y + 1);
      doc.text('ITEM DESCRIPTION', col + 10, y + 1);
      doc.text('HSN', col + 88, y + 1, { align: 'center' });
      doc.text('QTY', col + 105, y + 1, { align: 'center' });
      doc.text(`RATE (${currency})`, col + 138, y + 1, { align: 'right' });
      doc.text(`AMOUNT (${currency})`, W - margin - 2, y + 1, { align: 'right' });
      y += 8;

      // Table rows
      items.forEach((item: any, idx: number) => {
        const displayName = item.isService 
          ? (item.itemName || item.serviceItem?.name || '')
          : `${item.product?.name || ''}${item.product?.code ? ` (${item.product.code})` : ''}`;

        const splitName = doc.splitTextToSize(displayName, 80);
        const rowH = Math.max(lineH + 2, splitName.length * 4 + 2);
        if (idx % 2 === 0) { doc.setFillColor('#f8fafc'); doc.rect(col, y - 4, W - margin * 2, rowH, 'F'); }
        doc.setFontSize(9); doc.setTextColor('#1e293b');
        doc.setFont('helvetica', 'normal'); doc.text(String(idx + 1), col + 2, y);
        doc.setFont('helvetica', 'bold'); doc.text(splitName, col + 10, y);
        doc.setFont('helvetica', 'normal');
        if (!item.isService && item.product?.hsnCode) { doc.setFontSize(8); doc.text(item.product.hsnCode, col + 88, y, { align: 'center' }); doc.setFontSize(9); }
        doc.text(`${item.quantity} ${item.isService ? 'Svc' : (item.product?.unit?.shortCode || 'Nos')}`, col + 105, y, { align: 'center' });
        doc.text(Number(item.rate || 0).toFixed(2), col + 138, y, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(Number(item.amount || item.total || 0).toFixed(2), W - margin - 2, y, { align: 'right' });
        y += rowH;
      });

      doc.setDrawColor('#e2e8f0'); doc.line(col, y, W - margin, y); y += 6;

      // Push footer to bottom if space allows
      const bottomY = 297 - margin - 50;
      if (y < bottomY) y = bottomY;

      const totalsStartY = y;
      const totalsX = W - margin - 60, valX = W - margin - 2;

      // Terms & Conditions (left)
      const rawNotes = (settings?.invoiceNotes ?? '1. Goods once sold cannot be taken back or exchanged.<br/>2. Subject to Salem jurisdiction.');
      if (rawNotes) {
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor('#1A63A8');
        doc.text('TERMS & CONDITIONS', col, totalsStartY);
        const cleanNotes = rawNotes
          .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li)>/gi, '\n')
          .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')
          .replace(/(\d+\.)/g, '\n$1').replace(/\n\s*\n/g, '\n').trim();
        const splitNotes = doc.splitTextToSize(cleanNotes, totalsX - col - 4);
        doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor('#1e293b');
        doc.text(splitNotes, col, totalsStartY + 5);
      }

      // QR code (left, below terms) — styled card embedded in PDF
      // QR click-to-pay text disabled
      // if (settings?.upiId && grandTotal > 0 && qrCanvas) {
      //   const clickUrl = ...;
      //   doc.text('SCAN OR CLICK TO PAY', col + 26, qrY + 5);
      //   doc.text(`UPI ID: ${activeUpiId.trim()}`, col + 26, qrY + 11);
      //   doc.text('Scan QR or tap text to pay', col + 26, qrY + 17);
      // }
      const qrCanvas = document.getElementById('upi-qr-code-canvas') as HTMLCanvasElement | null;
      if (activeUpiId && grandTotal > 0 && qrCanvas) {
        await new Promise<void>((resolve) => {
          const styledCanvas = document.createElement('canvas');
          const ctx2 = styledCanvas.getContext('2d');
          if (!ctx2) { resolve(); return; }
          const sc = 3;
          const sw = 200 * sc; const sh = 200 * sc;
          styledCanvas.width = sw; styledCanvas.height = sh;
          ctx2.imageSmoothingEnabled = true; ctx2.imageSmoothingQuality = 'high';
          // Background
          ctx2.fillStyle = '#F8FAFC'; ctx2.fillRect(0, 0, sw, sh);
          // Header bar
          ctx2.fillStyle = '#04325E'; ctx2.fillRect(0, 0, sw, 44 * sc);
          ctx2.textAlign = 'center';
          ctx2.fillStyle = '#ffffff'; ctx2.font = `bold ${8 * sc}px sans-serif`;
          ctx2.fillText((settings?.shopName || 'POS Suite 360').toUpperCase(), sw / 2, 18 * sc);
          ctx2.fillStyle = '#94A3B8'; ctx2.font = `bold ${6 * sc}px sans-serif`;
          ctx2.fillText('SCAN TO PAY', sw / 2, 32 * sc);
          // White card
          ctx2.fillStyle = '#ffffff';
          ctx2.fillRect(8 * sc, 48 * sc, sw - 16 * sc, 140 * sc);
          // QR image
          const qrSz = 80 * sc;
          ctx2.drawImage(qrCanvas, (sw - qrSz) / 2, 52 * sc, qrSz, qrSz);
          // Invoice + amount
          ctx2.fillStyle = '#64748B'; ctx2.font = `bold ${5 * sc}px sans-serif`;
          ctx2.fillText(`INVOICE: #${invoiceNo}`, sw / 2, 142 * sc);
          ctx2.fillStyle = '#0F172A'; ctx2.font = `bold ${8 * sc}px sans-serif`;
          ctx2.fillText(`${currency} ${Number(grandTotal).toFixed(2)}`, sw / 2, 158 * sc);
          // UPI ID
          ctx2.fillStyle = '#64748B'; ctx2.font = `${4.5 * sc}px sans-serif`;
          ctx2.fillText(activeUpiId.trim(), sw / 2, 172 * sc);
          styledCanvas.toBlob((blob) => {
            if (!blob) { resolve(); return; }
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = reader.result as string;
              const qrY = totalsStartY + 18;
              const qrW = 50; const qrH = 50;
              doc.addImage(dataUrl, 'PNG', col, qrY, qrW, qrH);
              var iconX = col + qrW / 2;
              var iconY = qrY + qrH + 3;
              doc.setDrawColor('#1A63A8'); doc.setLineWidth(0.6);
              doc.line(iconX, iconY, iconX, iconY + 4);
              doc.line(iconX - 2, iconY + 2, iconX, iconY + 4);
              doc.line(iconX + 2, iconY + 2, iconX, iconY + 4);
              doc.line(iconX - 3, iconY + 5, iconX + 3, iconY + 5);
              doc.setFontSize(6); doc.setFont('helvetica', 'bold'); doc.setTextColor('#1A63A8');
              doc.text('DOWNLOAD QR', iconX, iconY + 9, { align: 'center' });
              var dlUrl = window.location.origin + '/upi-redirect?pa=' + encodeURIComponent(activeUpiId.trim()) + '&pn=' + encodeURIComponent((settings && settings.shopName) || 'Shop') + '&tr=' + encodeURIComponent(invoiceNo) + '&am=' + Number(grandTotal).toFixed(2) + '&cu=INR';
              doc.link(col, qrY, qrW, qrH + 12, { url: dlUrl });
              resolve();
            };
            reader.readAsDataURL(blob);
          }, 'image/png');
        });
      }

      // Totals (right)
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor('#334155');
      doc.text('Subtotal:', totalsX, y);
      doc.text(Number(sale?.subtotal || 0).toFixed(2), valX, y, { align: 'right' }); y += lineH;

      if (settings?.enableTax) {
        const taxVal = Number(sale?.tax || 0);
        if (taxVal > 0) {
          const ss = (settings.state || '').trim().toLowerCase();
          const cs = (sale?.customer?.state || '').trim().toLowerCase();
          if (ss && cs && ss === cs) {
            const half = (taxVal / 2).toFixed(2);
            doc.text('CGST:', totalsX, y); doc.text(half, valX, y, { align: 'right' }); y += lineH;
            doc.text('SGST:', totalsX, y); doc.text(half, valX, y, { align: 'right' }); y += lineH;
          } else {
            doc.text('IGST:', totalsX, y); doc.text(taxVal.toFixed(2), valX, y, { align: 'right' }); y += lineH;
          }
        }
      }
      if (Number(sale?.discount) > 0) {
        doc.text('Discount:', totalsX, y); doc.text(Number(sale.discount).toFixed(2), valX, y, { align: 'right' }); y += lineH;
      }

      // Total due box
      doc.setFillColor('#F0F5FA'); doc.rect(totalsX - 4, y - 4, W - margin - totalsX + 4 + margin, 12, 'F');
      doc.setDrawColor('#1A63A8'); doc.setLineWidth(0.5);
      doc.line(totalsX - 4, y - 4, W, y - 4);
      doc.line(totalsX - 4, y + 8, W, y + 8);
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor('#04325E');
      doc.text('Total Due:', totalsX, y + 3);
      doc.text(`${currency.replace('\u20b9', 'Rs.')} ${Number(grandTotal).toFixed(2)}`, valX, y + 3, { align: 'right' });
      y += 14;
      doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor('#1A63A8');
      doc.text(`${numberToWords(grandTotal)} ONLY`, valX, y, { align: 'right' });

      // Footer
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor('#94a3b8');
      doc.text(`Thank you for partnering with ${settings?.shopName || 'POS Suite 360'}! | Page 1 of 1`, W / 2, 287, { align: 'center' });

      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], `Invoice_${invoiceNo}.pdf`, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `${isEstimation ? 'Estimation' : 'Invoice'} ${invoiceNo}` });
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pdfBlob);
        link.download = `Invoice_${invoiceNo}.pdf`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') console.error('Error generating/sharing PDF:', err);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownloadQR = async () => {
    const qrCanvas = document.getElementById('upi-qr-code-canvas') as HTMLCanvasElement;
    if (!qrCanvas) { toast.error('QR code is not available'); return; }
    setIsDownloadingQR(true);
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2d context');
      const scale = 3;
      const width = 400 * scale; const height = 650 * scale;
      canvas.width = width; canvas.height = height;
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) => {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
        ctx.fillStyle = fill; ctx.fill();
      };
      ctx.fillStyle = '#F8FAFC'; ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#04325E'; ctx.fillRect(0, 0, width, 180 * scale);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff'; ctx.font = `bold ${22 * scale}px sans-serif`;
      ctx.fillText((settings?.shopName || 'POS Suite 360').toUpperCase(), width / 2, 70 * scale);
      ctx.fillStyle = '#94A3B8'; ctx.font = `bold ${13 * scale}px sans-serif`;
      (ctx as any).letterSpacing = `${2 * scale}px`;
      ctx.fillText('SCAN TO PAY', width / 2, 105 * scale);
      (ctx as any).letterSpacing = '0px';
      const cardMargin = 30 * scale; const cardY = 140 * scale;
      const cardWidth = width - cardMargin * 2; const cardHeight = 440 * scale;
      roundRect(ctx, cardMargin, cardY + 8 * scale, cardWidth, cardHeight, 16 * scale, '#E2E8F0');
      roundRect(ctx, cardMargin, cardY, cardWidth, cardHeight, 16 * scale, '#ffffff');
      const qrSize = 240 * scale; const qrX = (width - qrSize) / 2; const qrYPos = cardY + 30 * scale;
      ctx.drawImage(qrCanvas, qrX, qrYPos, qrSize, qrSize);
      let currentY = qrYPos + qrSize + 45 * scale;
      ctx.fillStyle = '#64748B'; ctx.font = `bold ${13 * scale}px sans-serif`;
      ctx.fillText(`INVOICE NO: #${invoiceNo}`, width / 2, currentY);
      currentY += 40 * scale;
      ctx.fillStyle = '#0F172A'; ctx.font = `bold ${26 * scale}px sans-serif`;
      ctx.fillText(`${currency} ${Number(grandTotal).toFixed(2)}`, width / 2, currentY);
      currentY += 45 * scale;
      const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
        const img = new Image(); img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img); img.onerror = reject; img.src = src;
      });
      try {
        const [gpayImg, phonepeImg, paytmImg, upiImg] = await Promise.all([
          loadImage('/icons/gpay.png'), loadImage('/icons/phonepe.png'),
          loadImage('/icons/paytm.png'), loadImage('/icons/upi.png')
        ]);
        const drawImageAspect = (img: HTMLImageElement, x: number, y: number, maxW: number, maxH: number) => {
          const ratio = Math.min(maxW / (img.width || 100), maxH / (img.height || 40));
          const fw = (img.width || 100) * ratio; const fh = (img.height || 40) * ratio;
          ctx.drawImage(img, x + (maxW - fw) / 2, y + (maxH - fh) / 2, fw, fh);
        };
        const iconSize = 44 * scale; const overlap = 14 * scale;
        const totalW = 4 * iconSize - 3 * overlap;
        let startX = (width - totalW) / 2;
        [gpayImg, phonepeImg, paytmImg, upiImg].forEach((img) => {
          ctx.beginPath(); ctx.arc(startX + iconSize / 2, currentY, iconSize / 2 + 1.5 * scale, 0, 2 * Math.PI);
          ctx.fillStyle = '#cbd5e1'; ctx.fill();
          ctx.beginPath(); ctx.arc(startX + iconSize / 2, currentY, iconSize / 2, 0, 2 * Math.PI);
          ctx.fillStyle = '#ffffff'; ctx.fill();
          ctx.save(); ctx.beginPath(); ctx.arc(startX + iconSize / 2, currentY, iconSize / 2, 0, 2 * Math.PI); ctx.clip();
          const p = 8 * scale;
          drawImageAspect(img, startX + p, currentY - iconSize / 2 + p, iconSize - p * 2, iconSize - p * 2);
          ctx.restore(); startX += iconSize - overlap;
        });
      } catch { ctx.fillStyle = '#16A34A'; ctx.font = `bold ${13 * scale}px sans-serif`; ctx.fillText('✓ ACCEPTING ALL UPI APPS', width / 2, currentY); }
      ctx.fillStyle = '#94A3B8'; ctx.font = `bold ${11 * scale}px sans-serif`;
      ctx.fillText('SECURE PAYMENTS BY POS SUITE 360', width / 2, height - 25 * scale);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `QR_${invoiceNo}.png`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (err) {
      toast.error('Failed to download QR');
    } finally {
      setIsDownloadingQR(false);
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

  const ThermalContent = () => (
    <div className="w-full bg-white text-black text-[11px] p-2" style={{ fontFamily: 'monospace', maxWidth: '80mm' }}>
      <div className="text-center mb-2">
        {settings?.logoImage && <img src={settings.logoImage} alt="Logo" className="h-10 mx-auto mb-1 object-contain" />}
        <p className="font-bold text-[13px] uppercase">{settings?.shopName || 'POS Suite 360'}</p>
        {settings?.invoiceTitle && <p className="text-[10px]">{settings.invoiceTitle}</p>}
        {settings?.shopAddress && <p className="text-[10px]">{settings.shopAddress}</p>}
        {[settings?.city, settings?.state].filter(Boolean).length > 0 && <p className="text-[10px]">{[settings?.city, settings?.state].filter(Boolean).join(', ')}</p>}
        {settings?.phone && <p className="text-[10px]">Tel: {settings.phone}</p>}
        {settings?.gstin && <p className="text-[10px]">GSTIN: {settings.gstin}</p>}
      </div>
      <div className="border-t border-dashed border-black my-1" />
      <div className="text-[10px] mb-1">
        <p className="font-bold">{isEstimation ? 'ESTIMATION' : 'INVOICE'}: #{invoiceNo}</p>
        <p>Date: {date}</p>
        {sale?.customer?.name !== 'Cash Customer' && <p>Customer: {customerName}</p>}
        {sale?.customer?.phone && sale?.customer?.name !== 'Cash Customer' && <p>Phone: {sale.customer.phone}</p>}
        <p>Payment: {sale?.paymentMode?.name || 'Cash'}</p>
      </div>
      <div className="border-t border-dashed border-black my-1" />
      <table className="w-full text-[10px]">
        <thead>
          <tr className="font-bold">
            <td className="pb-1">Item</td>
            <td className="pb-1 text-center">Qty</td>
            <td className="pb-1 text-right">Rate</td>
            <td className="pb-1 text-right">Amt</td>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, idx: number) => (
            <tr key={idx}>
              <td className="py-0.5 pr-1 max-w-[28mm] break-words">{item.isService ? (item.itemName || item.serviceItem?.name || '') : (item.product?.name || '')}</td>
              <td className="py-0.5 text-center whitespace-nowrap">{item.quantity} {item.isService ? 'Svc' : (item.product?.unit?.shortCode || '')}</td>
              <td className="py-0.5 text-right whitespace-nowrap">{Number(item.rate || 0).toFixed(2)}</td>
              <td className="py-0.5 text-right whitespace-nowrap font-bold">{Number(item.amount || item.total || 0).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t border-dashed border-black my-1" />
      <div className="text-[10px] space-y-0.5">
        <div className="flex justify-between"><span>Subtotal:</span><span>{Number(sale?.subtotal || 0).toFixed(2)}</span></div>
        {settings?.enableTax && Number(sale?.tax) > 0 && (
          <div className="flex justify-between"><span>Tax:</span><span>{Number(sale.tax).toFixed(2)}</span></div>
        )}
        {Number(sale?.discount) > 0 && (
          <div className="flex justify-between"><span>Discount:</span><span>-{Number(sale.discount).toFixed(2)}</span></div>
        )}
      </div>
      <div className="border-t border-black my-1" />
      <div className="flex justify-between font-bold text-[13px]">
        <span>TOTAL:</span>
        <span>{currency} {Number(grandTotal).toFixed(2)}</span>
      </div>
      <p className="text-[9px] mt-0.5">{numberToWords(grandTotal)} ONLY</p>
      {activeUpiId && grandTotal > 0 && (
        <div className="flex flex-col items-center mt-2">
          <QRCodeCanvas
            id="upi-qr-code-canvas"
            value={`upi://pay?pa=${activeUpiId.trim()}&pn=${encodeURIComponent(settings?.shopName || 'Shop')}&tr=${encodeURIComponent(invoiceNo)}&am=${Number(grandTotal).toFixed(2)}&cu=INR`}
            size={120}
            level="M"
          />
          <p className="text-[9px] mt-0.5">UPI: {activeUpiId.trim()}</p>
        </div>
      )}
      <div className="border-t border-dashed border-black my-1" />
      <p className="text-center text-[10px]">Thank you! Visit again.</p>
    </div>
  );

  const isA5 = printFormat === 'a5';

  const InvoiceContent = () => (
    <div 
      className={`flex flex-col flex-1 bg-white text-slate-800 ${hiddenRenderer ? 'w-[800px] h-[1100px] box-border p-10 text-[13px]' : isA5 ? 'p-4 text-[9px] print:p-3' : 'p-8 text-[12px] print:p-6 print:text-[11px]'} overflow-hidden`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Header */}
      <div className={`flex justify-between items-start ${isA5 ? 'mb-3' : 'mb-8'}`}>
        <div className="flex flex-col gap-3">
          {settings?.logoImage && (
            <img src={settings.logoImage} alt="Logo" className={`${isA5 ? 'max-h-10 max-w-[100px]' : 'max-h-20 max-w-[200px]'} w-auto h-auto object-contain object-left`} />
          )}
          <div>
            <h1 className={`${isA5 ? 'text-base' : settings?.logoImage ? 'text-xl' : 'text-2xl'} font-bold text-[#04325E] uppercase tracking-tight`}>{settings?.shopName || 'POS Suite 360'}</h1>
            {settings?.invoiceTitle && <p className={`text-[#1A63A8] font-bold ${isA5 ? 'text-[9px]' : 'text-sm'} mt-0.5`}>{settings.invoiceTitle}</p>}
            <div className={`${isA5 ? 'mt-1 text-[8px]' : 'mt-2 text-xs'} text-slate-800 leading-relaxed`}>
              {settings?.shopAddress && <p>{settings.shopAddress}</p>}
              <p className="font-bold text-slate-700">{[settings?.city, settings?.state, settings?.country].filter(Boolean).join(', ')}</p>
              {settings?.phone && <p>Tel: {settings.phone}</p>}
              {settings?.gstin && <p>GSTIN: {settings.gstin}</p>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <h2 className={`${isA5 ? 'text-lg' : 'text-3xl'} font-black text-[#1A63A8] tracking-wider mb-1`}>{isEstimation ? 'ESTIMATION' : 'TAX INVOICE'}</h2>
          <p className={`font-bold text-slate-700 ${isA5 ? 'text-[9px]' : 'text-sm'}`}>{isEstimation ? 'Est No' : 'Invoice No'}: #{invoiceNo}</p>
        </div>
      </div>

      {/* Info Cards */}
      <div className={`grid grid-cols-2 gap-2 ${isA5 ? 'mb-2' : 'mb-6'}`}>
        <div className={`bg-slate-50 border border-slate-100 rounded-lg ${isA5 ? 'p-2' : 'p-4'}`}>
          <h3 className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1">Billed To / Customer Details</h3>
          <p className={`font-bold text-slate-800 ${isA5 ? 'text-[9px]' : 'text-sm'} mb-0.5`}>{customerName}</p>
          <div className="text-[8px] text-slate-800 space-y-0.5">
            {sale?.customer?.address && <p>{sale.customer.address}</p>}
            {sale?.customer?.state && <p>{sale.customer.state}</p>}
            {sale?.customer?.phone && <p>Phone: {sale.customer.phone}</p>}
            {sale?.customer?.gstNumber && <p>GSTIN: {sale.customer.gstNumber}</p>}
          </div>
        </div>
        <div className={`bg-slate-50 border border-slate-100 rounded-lg ${isA5 ? 'p-2' : 'p-4'}`}>
          <h3 className="text-[9px] font-black text-slate-700 uppercase tracking-widest mb-1">{isEstimation ? 'Estimation Details' : 'Invoice Details'}</h3>
          <div className={`grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 ${isA5 ? 'text-[8px]' : 'text-xs'}`}>
            <span className="font-bold text-slate-600">Invoice No:</span>
            <span className="text-slate-800">#{invoiceNo}</span>
            <span className="font-bold text-slate-600">Date:</span>
            <span className="text-slate-800">{date}</span>
            <span className="font-bold text-slate-600">Payment:</span>
            <span className="text-slate-800">{sale?.paymentMode?.name || 'Cash'}</span>
            {Number(sale?.customer?.openingBalance) > 0 && (
              <>
                <span className="font-bold text-slate-600">Pending:</span>
                <span className="text-slate-800">{currency} {Number(sale.customer.openingBalance).toFixed(2)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={`border border-slate-200 ${isA5 ? 'mb-2' : 'mb-6'} flex-1 flex flex-col overflow-hidden`}>
        <table className="w-full text-left">
          <thead className="bg-[#2D6AA1] text-white uppercase tracking-wider" style={{ fontSize: isA5 ? '7px' : '10px' }}>
            <tr>
              <th className={`${isA5 ? 'py-1 px-1' : 'py-3 px-4'} font-bold w-[5%]`}>#</th>
              <th className={`${isA5 ? 'py-1 px-1' : 'py-3 px-4'} font-bold w-[35%]`}>Item</th>
              <th className={`${isA5 ? 'py-1 px-1' : 'py-3 px-4'} font-bold w-[10%] text-center`}>HSN</th>
              <th className={`${isA5 ? 'py-1 px-1' : 'py-3 px-4'} font-bold w-[15%] text-center`}>Qty</th>
              <th className={`${isA5 ? 'py-1 px-1' : 'py-3 px-4'} font-bold w-[15%] text-right`}>Rate</th>
              <th className={`${isA5 ? 'py-1 px-1' : 'py-3 px-4'} font-bold w-[20%] text-right`}>Amt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100" style={{ fontSize: isA5 ? '8px' : '12px' }}>
            {items.map((item: any, idx: number) => {
              const displayName = item.isService 
                ? (item.itemName || item.serviceItem?.name || '')
                : (item.product?.name || '');
              return (
                <tr key={idx} className="bg-white">
                  <td className={`${isA5 ? 'py-1 px-1' : 'py-3 px-4'} text-slate-500`}>{idx + 1}</td>
                  <td className={`${isA5 ? 'py-1 px-1' : 'py-3 px-4'}`}>
                    <span className="font-bold text-slate-800">{displayName}</span>
                    {!item.isService && item.product?.code && <span className="text-slate-500 ml-1">({item.product.code})</span>}
                  </td>
                  <td className={`${isA5 ? 'py-1 px-1' : 'py-3 px-4'} text-center text-slate-600`}>{!item.isService ? (item.product?.hsnCode || '-') : '-'}</td>
                  <td className={`${isA5 ? 'py-1 px-1' : 'py-3 px-4'} text-center text-slate-600 font-medium`}>{item.quantity} {item.isService ? 'Svc' : (item.product?.unit?.shortCode || 'Nos')}</td>
                  <td className={`${isA5 ? 'py-1 px-1' : 'py-3 px-4'} text-right text-slate-600`}>{Number(item.rate || 0).toFixed(2)}</td>
                  <td className={`${isA5 ? 'py-1 px-1' : 'py-3 px-4'} text-right font-bold text-slate-800`}>{Number(item.amount || item.total || 0).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Area */}
      <div className={`mt-auto grid gap-3 ${isA5 ? 'grid-cols-[1fr_160px]' : 'grid-cols-[1fr_350px] gap-8'}`}>
        {/* Left Footer: Notes/Terms & QR */}
        <div className="flex flex-col gap-2 h-full">
          <div className={`bg-slate-50 border border-slate-100 rounded-lg ${isA5 ? 'p-2' : 'p-4'} flex-1 flex flex-col`}>
            <h3 className="text-[9px] font-bold text-[#1A63A8] uppercase tracking-widest mb-1">Terms & Conditions</h3>
            <div 
              className={`${isA5 ? 'text-[8px]' : 'text-[11px]'} text-slate-800 font-bold prose prose-sm max-w-none html-content flex-1`}
              dangerouslySetInnerHTML={{ __html: (settings?.invoiceNotes !== undefined && settings?.invoiceNotes !== null) ? settings.invoiceNotes : '1. Goods once sold cannot be taken back or exchanged.<br/>2. Subject to Salem jurisdiction.' }}
            />
          </div>
          {activeUpiId && grandTotal > 0 && (
            <div className={`bg-slate-50 border border-slate-100 rounded-lg ${isA5 ? 'p-1.5' : 'p-3'} flex items-center gap-2`}>
              <div className="bg-white p-1 rounded border border-slate-200 shadow-sm shrink-0">
                <QRCodeCanvas 
                  id="upi-qr-code-canvas"
                  value={`upi://pay?pa=${activeUpiId.trim()}&pn=${encodeURIComponent(settings?.shopName || 'Shop')}&tr=${encodeURIComponent(invoiceNo)}&am=${Number(grandTotal).toFixed(2)}&cu=INR`}
                  size={900}
                  level="M"
                  style={{ width: isA5 ? 40 : 64, height: isA5 ? 40 : 64 }}
                />
              </div>
              <div>
                <p className="text-[9px] font-bold text-slate-800 uppercase tracking-widest">Scan to Pay</p>
                <p className="text-[8px] text-slate-500 mt-0.5">UPI: {activeUpiId.trim()}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Footer: Totals & Signature */}
        <div className="flex flex-col justify-end">
          <div className={`bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg ${isA5 ? 'pt-2 pb-1' : 'pt-4 pb-2'} flex flex-col ${isA5 ? 'mb-2' : 'mb-6'}`}>
            <div className={`${isA5 ? 'space-y-1 text-[9px] px-2 mb-1' : 'space-y-3 text-[13px] px-4 mb-4'}`}>
              <div className="flex justify-between text-[#334155]">
                <span>Subtotal:</span>
                <span className="font-semibold">{Number(sale?.subtotal || 0).toFixed(2)}</span>
              </div>
              {settings?.enableTax && (
                (() => {
                  const taxNum = Number(sale?.tax || 0);
                  if (isNaN(taxNum) || taxNum === 0) return null;
                  const storeState = (settings.state || '').trim().toLowerCase();
                  const custState = (sale?.customer?.state || '').trim().toLowerCase();
                  if (storeState && custState && storeState === custState) {
                    const splitTax = taxNum / 2;
                    return (
                      <>
                        <div className="flex justify-between text-[#334155]"><span>CGST:</span><span className="font-semibold">{splitTax.toFixed(2)}</span></div>
                        <div className="flex justify-between text-[#334155]"><span>SGST:</span><span className="font-semibold">{splitTax.toFixed(2)}</span></div>
                      </>
                    );
                  }
                  return <div className="flex justify-between text-[#334155]"><span>IGST:</span><span className="font-semibold">{taxNum.toFixed(2)}</span></div>;
                })()
              )}
              {Number(sale?.discount) > 0 && (
                <div className="flex justify-between text-[#334155]">
                  <span>Discount:</span>
                  <span className="font-semibold">{Number(sale?.discount || 0).toFixed(2)}</span>
                </div>
              )}
            </div>
            <div className={`bg-[#F0F5FA] border-y-2 border-[#1A63A8] ${isA5 ? 'px-2 py-1' : 'px-4 py-3'} flex justify-between items-center text-[#04325E] mt-1 mb-1`}>
              <span className={`font-bold ${isA5 ? 'text-[10px]' : 'text-[14px]'}`}>Total Due:</span>
              <span className={`font-black tracking-tight ${isA5 ? 'text-[10px]' : 'text-[15px]'}`}>{currency} {Number(grandTotal).toFixed(2)}</span>
            </div>
            <div className={`text-right ${isA5 ? 'px-2 pb-1 text-[7px]' : 'px-4 pb-2 text-[9px]'} text-[#1A63A8] font-bold uppercase tracking-wider`}>
              {numberToWords(grandTotal)} ONLY
            </div>
          </div>

          {settings?.signatureImage && !isEstimation && (
            <div className="text-right mt-2 relative">
              <p className={`${isA5 ? 'text-[8px]' : 'text-[10px]'} font-bold text-slate-800 mb-8`}>For {settings?.shopName || 'POS Suite 360'}</p>
              <img src={settings.signatureImage} alt="Authorised Signature" className="absolute bottom-5 right-6 h-8 object-contain opacity-80 mix-blend-multiply" />
              <div className="inline-block border-t border-slate-400 pt-1 px-6 w-36 mt-2">
                <p className="text-[9px] font-bold text-slate-700 text-center">Authorized Signatory</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={`${isA5 ? 'mt-2' : 'mt-8'} text-center text-[9px] font-medium text-slate-600 border-t border-slate-200 pt-2`}>
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
            {/* <div className="flex items-center gap-1 ml-4">
              {(['a4', 'a5', 'thermal'] as const).map(fmt => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => {
                    setPrintFormat(fmt);
                    localStorage.setItem('invoicePrintFormat', fmt);
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                    printFormat === fmt
                      ? 'bg-white text-[#04325E]'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {fmt === 'a4' ? 'A4' : fmt === 'a5' ? 'A5' : '🧾 Thermal'}
                </button>
              ))}
            </div> */}
            {/* <button type="button" onClick={onClose} className="hover:text-red-400 transition-colors">
              <X size={20} />
            </button> */}
          </div>
        )}

        {/* Print format style injection */}
        <style>{`
          @media print {
            @page {
              size: ${printFormat === 'thermal' ? '80mm auto' : printFormat === 'a5' ? 'A5 portrait' : 'A4 portrait'};
              margin: ${printFormat === 'thermal' ? '4mm' : '10mm'};
            }
          }
        `}</style>

        {/* Printable Area */}
        <div id="printable-invoice" className="flex-1 min-h-0 overflow-auto bg-gray-200 p-2 sm:p-8 print:p-0 print:bg-white flex justify-center print:overflow-visible">
          <div className={`bg-white shadow-sm flex flex-col print:w-full print:max-w-none print:shadow-none ${
            printFormat === 'thermal'
              ? 'w-[80mm] min-h-0 print:min-h-0'
              : printFormat === 'a5'
              ? 'w-full max-w-[148mm] min-h-[210mm] print:min-h-[100vh]'
              : 'w-full max-w-[210mm] min-h-[297mm] print:min-h-[100vh]'
          }`}>
            {printFormat === 'thermal' ? <ThermalContent /> : <InvoiceContent />}
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
              {showPaymentInfo && activeUpiId && grandTotal > 0 && (
                <>
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
                  <button 
                    type="button"
                    onClick={handleDownloadQR}
                    disabled={isDownloadingQR}
                    className="bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-70 text-white px-3 py-2 rounded flex items-center gap-2 font-bold text-[12px] transition-colors"
                  >
                    {isDownloadingQR ? (
                      <><Loader2 size={14} className="animate-spin" /> <span className="hidden sm:inline">Downloading...</span></>
                    ) : (
                      <><Download size={14} /> <span className="hidden sm:inline">Download QR</span></>
                    )}
                  </button>
                </>
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
