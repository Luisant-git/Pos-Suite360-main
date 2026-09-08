import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Eye, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import InvoicePrintModal from '../../components/InvoicePrintModal';
import { useSettings } from '../../contexts/SettingsContext';
import ViewSalesModal from './ViewSalesModal';
import PaginationControls from '../../components/PaginationControls';

const CashSales = () => {
  const { formatCurrency } = useSettings();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSale, setSelectedSale] = useState<any>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [viewSaleId, setViewSaleId] = useState<number | null>(null);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: paymentModes = [] } = useQuery({
    queryKey: ['paymentModes'],
    queryFn: async () => (await api.get('/payment-modes')).data,
  });

  const cashMode = paymentModes.find((p: any) => p.name?.toLowerCase() === 'cash');

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ['sales', 'cash', cashMode?.id],
    queryFn: async () => {
      const params = cashMode?.id ? `?paymentModeId=${cashMode.id}` : '';
      return (await api.get(`/sales${params}`)).data;
    },
    enabled: paymentModes.length > 0,
  });

  const filteredSales = sales.filter((sale: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      sale.invoiceNo?.toLowerCase().includes(term) ||
      sale.customer?.name?.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filteredSales.length / entriesPerPage);
  const paginatedSales = filteredSales.slice(
    (currentPage - 1) * entriesPerPage,
    currentPage * entriesPerPage
  );

  const totalAmount = filteredSales.reduce((sum: number, s: any) => sum + Number(s.grandTotal || 0), 0);

  return (
    <div className="absolute inset-0 bg-[#F3F4F6] flex flex-col font-sans overflow-hidden z-10">
      {/* Header */}
      <div className="bg-[#0B355B] text-white px-2 sm:px-4 py-2 flex flex-wrap gap-2 justify-between items-center shrink-0">
        <div className="flex items-center gap-2 text-[12px] sm:text-[13px] font-bold">
          <span className="opacity-70 hover:opacity-100 cursor-pointer transition-opacity" onClick={() => navigate('/dashboard')}>Home</span>
          <span className="opacity-50">/</span>
          <span className="opacity-70">Sales</span>
          <span className="opacity-50">/</span>
          <span className="text-[#60A5FA]">Cash Sales</span>
        </div>
        <button
          type="button"
          onClick={() => navigate('/sales/pos')}
          className="bg-[#22C55E] hover:bg-[#16A34A] text-white px-3 sm:px-4 py-1.5 rounded flex items-center gap-2 font-bold text-[12px] sm:text-[13px] transition-colors"
        >
          <Plus size={16} /> New Cash Sale
        </button>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Summary Bar */}
        <div className="bg-[#16A34A] text-white px-4 py-2 shrink-0 flex flex-wrap gap-4 items-center text-[13px] font-bold">
          <span>Total Cash Sales: <span className="text-white text-[15px]">{filteredSales.length}</span></span>
          <span className="opacity-40">|</span>
          <span>Total Amount: <span className="text-white text-[15px]">{formatCurrency(totalAmount)}</span></span>
        </div>

        {/* Controls */}
        <div className="bg-white p-3 border-b border-[#E5E7EB] shrink-0 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2 text-[12px] font-bold text-gray-700">
            <span>Show</span>
            <select
              className="border border-[#ccc] rounded px-2 py-1 outline-none text-[#1F2937] bg-white"
              value={entriesPerPage}
              onChange={(e) => { setEntriesPerPage(Number(e.target.value)); setCurrentPage(1); }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            <span>entries</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-[12px] font-bold text-[#1F2937] hidden sm:block">Search:</label>
            <input
              type="text"
              placeholder="Search invoice / customer..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full sm:w-64 px-3 py-1.5 border border-[#ccc] rounded outline-none text-[12px] focus:border-[#3B82F6]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto bg-white">
          <table className="w-full text-left text-[13px] whitespace-nowrap">
            <thead>
              <tr className="bg-[#2A2A2A] text-white font-bold">
                <th className="px-3 py-2.5 border-r border-[#444]">Date</th>
                <th className="px-3 py-2.5 border-r border-[#444]">Invoice No</th>
                <th className="px-3 py-2.5 border-r border-[#444]">Customer</th>
                <th className="px-3 py-2.5 border-r border-[#444] text-right">Amount</th>
                <th className="px-3 py-2.5 text-center w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-3 py-4 text-center text-[#73879C]">Loading...</td></tr>
              ) : paginatedSales.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-4 text-center text-[#73879C]">No cash sales found.</td></tr>
              ) : (
                paginatedSales.map((sale: any, index: number) => (
                  <tr key={sale.id} className={`border-b border-[#E5E7EB] ${index % 2 === 0 ? 'bg-[#F9F9F9]' : 'bg-white'} hover:bg-green-50`}>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#333] font-medium">
                      {sale.date ? new Date(sale.date).toISOString().split('T')[0] : '-'}
                    </td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#3B82F6] font-bold">{sale.invoiceNo}</td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#333] font-medium">
                      {sale.customer?.name === 'Cash Customer' ? (
                        <span className="text-[#16A34A] font-bold">Cash Sale</span>
                      ) : (
                        sale.customer?.name || 'Cash Sale'
                      )}
                    </td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#333] font-bold text-right">
                      {formatCurrency(sale.grandTotal)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => { setSelectedSale(sale); setIsPrintModalOpen(true); }}
                          className="text-[#F59E0B] border border-[#F59E0B] rounded p-1 hover:bg-[#F59E0B] hover:text-white transition-colors"
                          title="Print Invoice"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewSaleId(sale.id)}
                          className="text-[#3B82F6] border border-[#3B82F6] rounded p-1 hover:bg-[#3B82F6] hover:text-white transition-colors"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && (
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalEntries={filteredSales.length}
            entriesPerPage={entriesPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      <InvoicePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => { setIsPrintModalOpen(false); setSelectedSale(null); }}
        sale={selectedSale}
      />

      {viewSaleId && (
        <ViewSalesModal saleId={viewSaleId} onClose={() => setViewSaleId(null)} />
      )}
    </div>
  );
};

export default CashSales;
