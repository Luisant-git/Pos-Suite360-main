import { useQuery } from '@tanstack/react-query';
import { X, Printer, FileText, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';
import { useSettings } from '../../contexts/SettingsContext';
import { useState } from 'react';
import InvoicePrintModal from '../../components/InvoicePrintModal';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import toast from 'react-hot-toast';

const WhatsAppIcon = ({ size = 16, className = "" }: { size?: number, className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

interface Props {
  estimationId: number;
  onClose: () => void;
}

export default function ViewEstimationModal({ estimationId, onClose }: Props) {
  const { settings, formatCurrency } = useSettings();
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  const { data: est, isLoading } = useQuery({
    queryKey: ['estimations', estimationId],
    queryFn: async () => (await api.get(`/estimations/${estimationId}`)).data,
    enabled: !!estimationId,
  });

  const processHiddenPdf = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      setIsProcessingPdf(true);
      setTimeout(async () => {
        const element = document.getElementById('hidden-printable-invoice');
        if (!element) {
          setIsProcessingPdf(false);
          return resolve(null);
        }
        const opt = {
          margin: 0.5,
          filename: `Estimation_${est?.estimationNo}.pdf`,
          image:        { type: 'jpeg' as const, quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' as const }
        };
        const pdfBase64 = await html2pdf().set(opt).from(element).output('datauristring');
        setIsProcessingPdf(false);
        resolve(pdfBase64);
      }, 300);
    });
  };

  const handleWhatsAppSend = async () => {
    const phone = est?.customer?.phone;
    if (!phone) {
      toast.error('Customer does not have a phone number attached.');
      return;
    }
    toast.loading('Preparing WhatsApp message...', { id: 'wa-toast' });
    const pdfBase64 = await processHiddenPdf();
    if (pdfBase64) {
      toast.loading('Sending estimation directly to WhatsApp...', { id: 'wa-toast' });
      try {
        const message = `Hello ${est.customer.name},\n\nHere is your estimation ${est.estimationNo}.\nTotal Amount: ${formatCurrency(est.grandTotal)}\n\nThank you for your business!`;
        await api.post('/whatsapp/send-pdf', {
          phone: phone,
          base64Pdf: pdfBase64,
          filename: `Estimation_${est.estimationNo}.pdf`,
          caption: message
        });
        toast.success('Estimation sent successfully to WhatsApp!', { id: 'wa-toast' });
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to send WhatsApp message.', { id: 'wa-toast' });
      }
    } else {
      toast.error('Failed to generate PDF for WhatsApp.', { id: 'wa-toast' });
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white p-6 rounded-md shadow-lg font-bold text-[#1E3A8A]">Loading estimation details...</div>
      </div>
    );
  }

  if (!est) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-5xl rounded-md shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-[#3B82F6] text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-[16px]">Estimation - {est.estimationNo}</h2>
            <div className="flex gap-2 items-center text-[12px] text-blue-100">
              <span>{est.date ? new Date(est.date).toISOString().split('T')[0] : ''}</span>
              <span>•</span>
              <span className={`flex items-center gap-1 font-bold px-2 py-0.5 rounded ${
                est.status === 'Converted' ? 'bg-[#D1FAE5] text-emerald-800' : 'bg-[#FEF3C7] text-amber-800'
              }`}>
                <CheckCircle2 size={12} /> {est.status?.toUpperCase() || 'PENDING'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsPrintModalOpen(true)}
              className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-800 px-3 py-1.5 rounded font-bold text-[12px] transition-colors"
            >
              <Printer size={14} /> Print
            </button>
            <button 
              onClick={handleWhatsAppSend}
              className="flex items-center gap-1.5 bg-[#22C55E] hover:bg-[#16A34A] px-3 py-1.5 rounded font-bold text-[12px] transition-colors"
            >
              <WhatsAppIcon size={14} /> Send WhatsApp
            </button>
            <button onClick={onClose} className="hover:bg-blue-600 p-1.5 rounded transition-colors ml-2"><X size={18} /></button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-[#F8FAFC]">
          <div className="flex gap-6 flex-col md:flex-row">
            
            {/* Left Column - Details */}
            <div className="flex-1 space-y-6">
              <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#1E293B] px-4 py-2 flex items-center gap-2 text-white">
                  <FileText size={16} />
                  <h3 className="font-bold text-[14px]">ESTIMATION DETAILS</h3>
                </div>
                <div className="p-5 flex justify-between">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Customer</p>
                    <p className="font-bold text-[15px] text-gray-800">{est.customer?.name || 'Counter Sale'}</p>
                    <p className="text-[13px] text-gray-600 mt-1">{est.customer?.phone || 'No phone number'}</p>
                    {est.customer?.address && <p className="text-[13px] text-gray-600 mt-1 max-w-[250px]">{est.customer.address}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">Status</p>
                    <p className="font-bold text-[14px] text-gray-800">{est.status || 'Pending'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#F8FAFC] px-4 py-2 border-b border-gray-200">
                  <h3 className="font-bold text-[14px] text-gray-800">ITEMIZED BILLING</h3>
                </div>
                <div className="overflow-x-auto p-4">
                  <table className="w-full text-left text-[13px] whitespace-nowrap">
                    <thead>
                      <tr className="border-b-2 border-gray-200 text-gray-500">
                        <th className="py-2 px-2 font-bold">Code</th>
                        <th className="py-2 px-2 font-bold">Product</th>
                        <th className="py-2 px-2 font-bold text-right">Qty</th>
                        <th className="py-2 px-2 font-bold text-center">Unit</th>
                        <th className="py-2 px-2 font-bold text-right">Rate</th>
                        <th className="py-2 px-2 font-bold text-right">Discount</th>
                        <th className="py-2 px-2 font-bold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {est.items?.map((item: any, idx: number) => (
                        <tr key={idx} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                          <td className="py-3 px-2 font-medium text-gray-600">{item.product?.code || '-'}</td>
                          <td className="py-3 px-2 font-bold text-gray-800">{item.product?.name}</td>
                          <td className="py-3 px-2 text-right">{item.quantity}</td>
                          <td className="py-3 px-2 text-center text-gray-500">{item.product?.unit?.name || 'Nos'}</td>
                          <td className="py-3 px-2 text-right font-medium">{formatCurrency(item.rate)}</td>
                          <td className="py-3 px-2 text-right text-red-500">{item.discount > 0 ? formatCurrency(item.discount) : '-'}</td>
                          <td className="py-3 px-2 text-right font-bold text-gray-900">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column - Summary */}
            <div className="w-full md:w-[320px] shrink-0">
              <div className="bg-white rounded shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-[#F8FAFC] px-4 py-2 border-b border-gray-200">
                  <h3 className="font-bold text-[14px] text-gray-800">SUMMARY</h3>
                </div>
                <div className="p-4 space-y-3 text-[14px]">
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-bold">{formatCurrency(est.subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-red-500 border-b border-gray-100 pb-3">
                    <span>Discount</span>
                    <span className="font-bold">- {formatCurrency(est.discount)}</span>
                  </div>
                  {settings?.enableTax && (
                    (() => {
                      if (Number(est.tax) === 0) {
                        return (
                          <div className="flex justify-between items-center text-gray-600">
                            <span>Tax</span>
                            <span className="font-bold">{formatCurrency(0)}</span>
                          </div>
                        );
                      }

                      const storeState = (settings.state || '').trim().toLowerCase();
                      const custState = (est.customer?.state || '').trim().toLowerCase();
                      
                      if (storeState && custState && storeState === custState) {
                        const splitTax = Number(est.tax) / 2;
                        return (
                          <>
                            <div className="flex justify-between items-center text-gray-600">
                              <span>CGST</span>
                              <span className="font-bold">{formatCurrency(splitTax)}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-600">
                              <span>SGST</span>
                              <span className="font-bold">{formatCurrency(splitTax)}</span>
                            </div>
                          </>
                        );
                      } else {
                        return (
                          <div className="flex justify-between items-center text-gray-600">
                            <span>IGST</span>
                            <span className="font-bold">{formatCurrency(est.tax)}</span>
                          </div>
                        );
                      }
                    })()
                  )}
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-[16px] font-black text-gray-900">GRAND TOTAL</span>
                    <span className="text-[20px] font-black text-[#2563EB]">{formatCurrency(est.grandTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <InvoicePrintModal 
        isOpen={isPrintModalOpen} 
        onClose={() => setIsPrintModalOpen(false)} 
        sale={est}
        isEstimation={true} 
      />

      {isProcessingPdf && (
        <InvoicePrintModal 
          isOpen={true} 
          onClose={() => {}} 
          sale={est} 
          isEstimation={true}
          hiddenRenderer={true}
        />
      )}
    </div>
  );
}
