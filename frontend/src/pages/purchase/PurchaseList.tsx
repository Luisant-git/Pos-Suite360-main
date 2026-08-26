import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useSettings } from '../../contexts/SettingsContext';
import ViewPurchaseModal from './ViewPurchaseModal';
import PaginationControls from '../../components/PaginationControls';

const PurchaseList = () => {
  const { formatCurrency } = useSettings();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewId, setViewId] = useState<number | null>(null);

  // Fetch Purchases
  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['purchases'],
    queryFn: async () => {
      const { data } = await api.get('/purchases');
      return data;
    },
  });

  // Pagination & Filtering Logic
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredPurchases = purchases.filter((purchase: any) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const invoiceMatch = purchase.invoiceNo?.toLowerCase().includes(term);
      const supplierMatch = purchase.supplier?.name?.toLowerCase().includes(term);
      return invoiceMatch || supplierMatch;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredPurchases.length / entriesPerPage);
  const paginatedPurchases = filteredPurchases.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  return (
    <div className="absolute inset-0 bg-[#F3F4F6] flex flex-col font-sans overflow-hidden z-10">
      {/* Top Header */}
      <div className="bg-[#0B355B] text-white px-2 sm:px-4 py-2 flex flex-wrap gap-2 justify-between items-center shrink-0">
        <div className="flex items-center gap-2 text-[12px] sm:text-[13px] font-bold">
          <span className="opacity-70 hover:opacity-100 cursor-pointer transition-opacity" onClick={() => navigate('/dashboard')}>Home</span> 
          <span className="opacity-50">/</span>
          <span className="opacity-70">Transactions</span>
          <span className="opacity-50">/</span>
          <span className="text-[#60A5FA]">Purchase Invoices</span>
        </div>
        <button 
          type="button" 
          onClick={() => navigate('/purchase/new')}
          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3 sm:px-4 py-1.5 rounded flex items-center gap-2 font-bold text-[12px] sm:text-[13px] transition-colors"
        >
          <Plus size={16} /> <span className="hidden sm:inline">Add New Purchase</span>
        </button>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        
        {/* Controls / Filters */}
        <div className="bg-white p-3 border-b border-[#E5E7EB] shrink-0 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2 text-[12px] font-bold text-gray-700">
            <span>Show</span>
          <select 
            className="border border-[#ccc] rounded px-2 py-1 outline-none text-[#1F2937] bg-white"
            value={entriesPerPage}
            onChange={(e) => {
              setEntriesPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
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
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:w-64 px-3 py-1.5 border border-[#ccc] rounded outline-none text-[12px] focus:border-[#3B82F6]"
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto overflow-x-auto bg-white">
          <table className="w-full text-left text-[13px] whitespace-nowrap">
            <thead>
              <tr className="bg-[#2A2A2A] text-white font-bold">
                <th className="px-3 py-2.5 border-r border-[#444] relative">Date</th>
                <th className="px-3 py-2.5 border-r border-[#444] relative">Entry No</th>
                <th className="px-3 py-2.5 border-r border-[#444] relative">Supp. Inv. No.</th>
                <th className="px-3 py-2.5 border-r border-[#444] relative">Supplier</th>
                <th className="px-3 py-2.5 border-r border-[#444] relative text-right">Total Amount (₹)</th>
                <th className="px-3 py-2.5 border-r border-[#444] relative text-center">Payment Mode</th>
                <th className="px-3 py-2.5 text-center w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-[#73879C]">Loading...</td>
                </tr>
              ) : filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-[#73879C]">No purchase invoices found matching your criteria.</td>
                </tr>
              ) : (
                paginatedPurchases.map((purchase: any, index: number) => (
                  <tr key={purchase.id} className={`border-b border-[#E5E7EB] ${index % 2 === 0 ? 'bg-[#F9F9F9]' : 'bg-white'} hover:bg-blue-50`}>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#333] font-medium">{purchase.date ? new Date(purchase.date).toISOString().split('T')[0] : '-'}</td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#64748B] font-medium">{purchase.invoiceNo}</td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#3B82F6] font-bold cursor-pointer hover:underline">{purchase.supplierInvoiceNo || '-'}</td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#333] font-medium">{purchase.supplier?.name || 'Unknown Supplier'}</td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#333] font-bold text-right">{formatCurrency(purchase.grandTotal)}</td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-center">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold tracking-wide ${
                        purchase.paymentMode?.name === 'Cash' ? 'bg-[#06B6D4] text-white' : 
                        purchase.paymentMode?.name === 'Credit' ? 'bg-[#22C55E] text-white' :
                        'bg-[#22C55E] text-white'
                      }`}>
                        {purchase.paymentMode?.name?.toUpperCase() || 'PAID'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex justify-center gap-2">
                        <button type="button" 
                          onClick={() => setViewId(purchase.id)}
                          className="text-[#3B82F6] border border-[#3B82F6] rounded p-1 hover:bg-[#3B82F6] hover:text-white transition-colors"
                          title="View Invoice"
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
            totalEntries={filteredPurchases.length}
            entriesPerPage={entriesPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {viewId && (
        <ViewPurchaseModal purchaseId={viewId} onClose={() => setViewId(null)} />
      )}
    </div>
  );
};

export default PurchaseList;
