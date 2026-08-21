import { useQuery } from '@tanstack/react-query';
import { Printer, Download, Receipt, Calendar, FileText, Building2, X, Truck } from 'lucide-react';
import api from '../../services/api';
import { useSettings } from '../../contexts/SettingsContext';
import { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

interface RawMaterialPurchaseModalProps {
  purchaseId: number;
  onClose: () => void;
}

const RawMaterialPurchaseModal = ({ purchaseId, onClose }: RawMaterialPurchaseModalProps) => {
  const { formatCurrency, settings } = useSettings();

  const { data: purchase, isLoading, isError } = useQuery({
    queryKey: ['rm-purchase', purchaseId],
    queryFn: async () => {
      const { data } = await api.get(`/raw-material-purchases/${purchaseId}`);
      return data;
    },
    enabled: !!purchaseId
  });

  const generatePDF = () => {
    if (!purchase) return;
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(20);
      doc.text(settings?.shopName || 'Company Name', 14, 22);
      
      doc.setFontSize(10);
      doc.text(settings?.shopAddress || '', 14, 30);
      doc.text(`Phone: ${settings?.phone || ''}`, 14, 36);
      
      // Document Title
      doc.setFontSize(16);
      doc.text('RAW MATERIAL PURCHASE INVOICE', 14, 50);
      
      // Info Grid
      doc.setFontSize(10);
      doc.text(`Invoice No: ${purchase.invoiceNo}`, 14, 60);
      doc.text(`Date: ${new Date(purchase.date).toLocaleDateString()}`, 14, 66);
      
      doc.text(`Supplier: ${purchase.supplier?.name}`, 120, 60);
      if (purchase.supplier?.phone) doc.text(`Phone: ${purchase.supplier.phone}`, 120, 66);
      
      // Items Table
      const tableColumn = ["#", "Material", "Width (mm)", "Length (m)", "Sq.M", "Qty", "Price", "Amount"];
      const tableRows = purchase.items.map((item: any, index: number) => [
        index + 1,
        item.rawMaterial?.name,
        item.widthMm,
        item.lengthM,
        Number(item.sqM).toFixed(3),
        item.quantity,
        formatCurrency(item.price).replace(/[^0-9.-]+/g, ""),
        formatCurrency(item.amount).replace(/[^0-9.-]+/g, "")
      ]);
      
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 75,
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 138] }
      });
      
      // Totals
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.text(`Subtotal: ${formatCurrency(purchase.subtotal)}`, 140, finalY);
      doc.text(`Tax: ${formatCurrency(purchase.tax)}`, 140, finalY + 6);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Grand Total: ${formatCurrency(purchase.grandTotal)}`, 140, finalY + 14);
      
      doc.save(`${purchase.invoiceNo}.pdf`);
      toast.success('PDF Downloaded');
    } catch (error) {
      toast.error('Failed to generate PDF');
    }
  };

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `RM_Purchase_${purchase?.invoiceNo || ''}`,
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-center items-center p-2 sm:p-6 font-sans">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden relative">
        
        {/* Modal Header */}
        <div className="bg-[#0B355B] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Receipt size={20} className="text-amber-400" />
            <h2 className="text-lg font-bold">Purchase Details</h2>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => handlePrint()} className="bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded flex items-center gap-2 text-[12px] font-bold transition-colors">
              <Printer size={14} /> Print
            </button>
            <button onClick={generatePDF} className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded flex items-center gap-2 text-[12px] font-bold transition-colors">
              <Download size={14} /> PDF
            </button>
            <div className="w-px h-6 bg-white/20"></div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex justify-center items-center p-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : isError || !purchase ? (
          <div className="flex-1 flex justify-center items-center p-12 text-gray-500 font-medium">
            Invoice Not Found
          </div>
        ) : (
          <>
            {/* --- WEB UI --- */}
            <div className="flex-1 overflow-auto p-4 sm:p-6 custom-scrollbar">
            {/* Invoice Header */}
            <div className="border-b border-gray-200 pb-6 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-black text-gray-800 uppercase tracking-wide">RM Purchase Invoice</h1>
                  <p className="text-gray-500 font-medium mt-1 print:hidden">Status: <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">Completed</span></p>
                </div>
                <div className="text-left sm:text-right">
                  <h2 className="text-xl font-bold text-blue-600">{settings?.shopName || 'Suite360'}</h2>
                  <p className="text-gray-500 text-sm mt-1">{settings?.shopAddress}</p>
                  <p className="text-gray-500 text-sm">{settings?.phone}</p>
                </div>
              </div>
            </div>

            {/* Invoice Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 border border-gray-200 rounded-xl p-5 mb-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Invoice Number</p>
                    <p className="font-bold text-gray-800">{purchase.invoiceNo}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date</p>
                    <p className="font-bold text-gray-800">{new Date(purchase.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Supplier</p>
                    <p className="font-bold text-gray-800">{purchase.supplier?.name}</p>
                    {purchase.supplier?.phone && <p className="text-sm text-gray-600">{purchase.supplier.phone}</p>}
                  </div>
                </div>
                {purchase.supplierInvoiceNo && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded bg-slate-200 text-slate-600 flex items-center justify-center shrink-0">
                      <Truck size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Supplier Bill No</p>
                      <p className="font-bold text-gray-800">{purchase.supplierInvoiceNo}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            <div className="mb-6">
              <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wider">Order Items</h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left text-[13px] whitespace-nowrap">
                  <thead>
                    <tr className="bg-gray-100 text-gray-600 font-bold">
                      <th className="px-4 py-3 border-b">#</th>
                      <th className="px-4 py-3 border-b">Raw Material</th>
                      <th className="px-4 py-3 border-b text-center">Width (mm)</th>
                      <th className="px-4 py-3 border-b text-center">Length (m)</th>
                      <th className="px-4 py-3 border-b text-center">Sq.M</th>
                      <th className="px-4 py-3 border-b text-center">Qty (Rolls)</th>
                      <th className="px-4 py-3 border-b text-right">Price / Sq.M</th>
                      <th className="px-4 py-3 border-b text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {purchase.items?.map((item: any, index: number) => (
                      <tr key={index} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-gray-500 font-medium">{index + 1}</td>
                        <td className="px-4 py-3 font-bold text-gray-800">{item.rawMaterial?.name}</td>
                        <td className="px-4 py-3 text-center">{item.widthMm}</td>
                        <td className="px-4 py-3 text-center">{item.lengthM}</td>
                        <td className="px-4 py-3 text-center font-medium">{Number(item.sqM).toFixed(3)}</td>
                        <td className="px-4 py-3 text-center font-bold text-blue-600">{item.quantity}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-800">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals Section */}
            <div className="bg-slate-50 border border-gray-200 rounded-xl p-5 flex justify-end">
              <div className="w-full sm:w-1/2 space-y-3">
                <div className="flex justify-between items-center text-gray-600">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-bold">{formatCurrency(purchase.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span className="font-medium">Tax</span>
                  <span className="font-bold">{formatCurrency(purchase.tax)}</span>
                </div>
                <div className="h-px bg-gray-200 my-2"></div>
                <div className="flex justify-between items-center">
                  <span className="font-black text-gray-800 text-lg">Grand Total</span>
                  <span className="font-black text-emerald-600 text-xl">{formatCurrency(purchase.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* --- PRINT UI (Hidden in DOM, used by react-to-print) --- */}
          <div style={{ display: 'none' }}>
            <div ref={printRef} className="bg-white text-black font-sans p-10 w-full max-w-[800px] mx-auto print-container">
              {/* Header */}
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold uppercase mb-1">{settings?.shopName || 'COMPANY NAME'}</h1>
                <p className="text-sm text-gray-600">{settings?.shopAddress}</p>
                <p className="text-sm text-gray-600">Phone: {settings?.phone}</p>
              </div>
              
              <div className="border-b-2 border-black mb-6"></div>
              
              <h2 className="text-center font-bold text-xl mb-6 uppercase tracking-wider">Raw Material Purchase Bill</h2>

              {/* Info */}
              <div className="flex justify-between mb-8 text-sm">
                <div>
                  <p className="mb-1"><strong>Supplier:</strong> {purchase.supplier?.name}</p>
                  <p className="mb-1"><strong>Phone:</strong> {purchase.supplier?.phone}</p>
                  {purchase.supplierInvoiceNo && <p className="mb-1"><strong>Supplier Bill No:</strong> {purchase.supplierInvoiceNo}</p>}
                </div>
                <div className="text-right">
                  <p className="mb-1"><strong>Invoice No:</strong> {purchase.invoiceNo}</p>
                  <p className="mb-1"><strong>Date:</strong> {new Date(purchase.date).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Table */}
              <table className="w-full text-left text-sm border-collapse border border-black mb-8">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black px-2 py-2 font-bold">S.No</th>
                    <th className="border border-black px-2 py-2 font-bold">Raw Material</th>
                    <th className="border border-black px-2 py-2 text-center font-bold">W (mm)</th>
                    <th className="border border-black px-2 py-2 text-center font-bold">L (m)</th>
                    <th className="border border-black px-2 py-2 text-center font-bold">Sq.M</th>
                    <th className="border border-black px-2 py-2 text-center font-bold">Qty</th>
                    <th className="border border-black px-2 py-2 text-right font-bold">Price</th>
                    <th className="border border-black px-2 py-2 text-right font-bold">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {purchase.items?.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="border border-black px-2 py-2">{index + 1}</td>
                      <td className="border border-black px-2 py-2">{item.rawMaterial?.name}</td>
                      <td className="border border-black px-2 py-2 text-center">{item.widthMm}</td>
                      <td className="border border-black px-2 py-2 text-center">{item.lengthM}</td>
                      <td className="border border-black px-2 py-2 text-center">{Number(item.sqM).toFixed(3)}</td>
                      <td className="border border-black px-2 py-2 text-center font-bold">{item.quantity}</td>
                      <td className="border border-black px-2 py-2 text-right">{formatCurrency(item.price)}</td>
                      <td className="border border-black px-2 py-2 text-right font-bold">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex justify-end mb-16">
                <div className="w-72">
                  <div className="flex justify-between py-2 border-b border-black">
                    <span className="font-bold">Subtotal:</span>
                    <span>{formatCurrency(purchase.subtotal)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-black">
                    <span className="font-bold">Tax:</span>
                    <span>{formatCurrency(purchase.tax)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b-2 border-black font-bold text-xl mt-1">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(purchase.grandTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              <div className="flex justify-between mt-24 pt-8">
                <div className="text-center">
                  <div className="border-t border-black w-48 pt-2 font-bold">Receiver's Signature</div>
                </div>
                <div className="text-center">
                  <div className="border-t border-black w-48 pt-2 font-bold">Authorized Signatory</div>
                </div>
              </div>
            </div>
          </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RawMaterialPurchaseModal;
