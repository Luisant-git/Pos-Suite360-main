import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Eye, Printer, Trash2, ArrowRightLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import InvoicePrintModal from '../../components/InvoicePrintModal';
import { useSettings } from '../../contexts/SettingsContext';
import PaginationControls from '../../components/PaginationControls';
import toast from 'react-hot-toast';
import ViewEstimationModal from './ViewEstimationModal';

const EstimationList = () => {
  const { formatCurrency } = useSettings();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEstimation, setSelectedEstimation] = useState<any>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [viewEstimationId, setViewEstimationId] = useState<number | null>(null);

  // Fetch Estimations from API
  const { data: estimations = [], isLoading } = useQuery({
    queryKey: ['estimations'],
    queryFn: async () => {
      const { data } = await api.get('/estimations');
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/estimations/${id}`),
    onSuccess: () => {
      toast.success('Estimation deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['estimations'] });
    },
    onError: () => toast.error('Failed to delete estimation')
  });

  // Pagination & Filtering Logic
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredEstimations = estimations.filter((est: any) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const estMatch = est.estimationNo?.toLowerCase().includes(term);
      const customerMatch = est.customer?.name?.toLowerCase().includes(term);
      return estMatch || customerMatch;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredEstimations.length / entriesPerPage);
  const paginatedEstimations = filteredEstimations.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Converted': return 'bg-[#22C55E]';
      case 'Cancelled': return 'bg-[#EF4444]';
      default: return 'bg-[#F59E0B]';
    }
  };

  return (
    <div className="absolute inset-0 bg-[#F3F4F6] flex flex-col font-sans overflow-hidden z-10">
      {/* Top Header (Hidden on print) */}
      <div className="bg-[#0B355B] text-white px-2 sm:px-4 py-2 flex flex-wrap gap-2 justify-between items-center shrink-0 print:hidden">
        <div className="flex items-center gap-2 text-[12px] sm:text-[13px] font-bold">
          <span className="opacity-70 hover:opacity-100 cursor-pointer transition-opacity" onClick={() => navigate('/dashboard')}>Home</span> 
          <span className="opacity-50">/</span>
          <span className="opacity-70">Transactions</span>
          <span className="opacity-50">/</span>
          <span className="text-[#60A5FA]">Estimation List</span>
        </div>
        <button 
          type="button" 
          onClick={() => navigate('/sales/estimation')}
          className="bg-[#22C55E] hover:bg-[#16A34A] text-white px-3 sm:px-4 py-1.5 rounded flex items-center gap-2 font-bold text-[12px] sm:text-[13px] transition-colors"
        >
          <Plus size={16} /> <span className="hidden sm:inline">New Estimation</span>
        </button>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        
        {/* Controls / Filters (Hidden on print) */}
        <div className="bg-white p-3 border-b border-[#E5E7EB] shrink-0 flex flex-col sm:flex-row justify-between items-center gap-3 print:hidden">
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
              placeholder="Search estimations..."
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
        <div className="flex-1 overflow-auto overflow-x-auto bg-white print:overflow-visible">
          <table className="w-full text-left text-[13px] whitespace-nowrap">
            <thead>
              <tr className="bg-[#2A2A2A] text-white font-bold">
                <th className="px-3 py-2.5 border-r border-[#444] relative">Date</th>
                <th className="px-3 py-2.5 border-r border-[#444] relative">Estimation No</th>
                <th className="px-3 py-2.5 border-r border-[#444] relative">Customer</th>
                <th className="px-3 py-2.5 border-r border-[#444] relative text-right">Total Amount (₹)</th>
                <th className="px-3 py-2.5 border-r border-[#444] relative text-center">Status</th>
                <th className="px-3 py-2.5 text-center w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-[#73879C]">Loading...</td>
                </tr>
              ) : filteredEstimations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-[#73879C]">No estimations found matching your criteria.</td>
                </tr>
              ) : (
                paginatedEstimations.map((est: any, index: number) => (
                  <tr key={est.id} className={`border-b border-[#E5E7EB] ${index % 2 === 0 ? 'bg-[#F9F9F9]' : 'bg-white'} hover:bg-blue-50`}>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#333] font-medium">{est.date ? new Date(est.date).toISOString().split('T')[0] : '-'}</td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#3B82F6] font-bold cursor-pointer hover:underline">{est.estimationNo}</td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#333] font-medium">{est.customer?.name || 'Counter Sale'}</td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#333] font-bold text-right">{formatCurrency(est.grandTotal)}</td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-center">
                      <span className={`${getStatusColor(est.status)} text-white px-2 py-0.5 rounded text-[11px] font-bold tracking-wide`}>
                        {est.status?.toUpperCase() || 'PENDING'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex justify-center items-center gap-2">
                        {est.status !== 'Converted' && (
                          <button type="button" 
                            onClick={() => navigate(`/sales/pos?estimationId=${est.id}`)}
                            className="flex items-center gap-1 text-[#10B981] border border-[#10B981] rounded px-2 py-1 text-[11px] font-bold hover:bg-[#10B981] hover:text-white transition-colors"
                            title="Convert to Sale"
                          >
                            <ArrowRightLeft size={12} /> Convert to Sale
                          </button>
                        )}
                        <button type="button" 
                          onClick={() => {
                            setSelectedEstimation(est);
                            setIsPrintModalOpen(true);
                          }}
                          className="text-[#F59E0B] border border-[#F59E0B] rounded p-1 hover:bg-[#F59E0B] hover:text-white transition-colors"
                          title="Print Estimation"
                        >
                          <Printer size={14} />
                        </button>
                        <button type="button" 
                          onClick={() => setViewEstimationId(est.id)}
                          className="text-[#3B82F6] border border-[#3B82F6] rounded p-1 hover:bg-[#3B82F6] hover:text-white transition-colors"
                          title="View Estimation Details"
                        >
                          <Eye size={14} />
                        </button>
                        {/* <button type="button" 
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this estimation?')) {
                              deleteMutation.mutate(est.id);
                            }
                          }}
                          className="text-[#EF4444] border border-[#EF4444] rounded p-1 hover:bg-[#EF4444] hover:text-white transition-colors"
                          title="Delete Estimation"
                        >
                          <Trash2 size={14} />
                        </button> */}
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
            totalEntries={filteredEstimations.length}
            entriesPerPage={entriesPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Visual Modal for Printing */}
      <InvoicePrintModal 
        isOpen={isPrintModalOpen} 
        onClose={() => {
          setIsPrintModalOpen(false);
          setSelectedEstimation(null);
        }} 
        sale={selectedEstimation} 
        isEstimation={true}
      />

      {/* View Details Modal */}
      {viewEstimationId && (
        <ViewEstimationModal 
          estimationId={viewEstimationId}
          onClose={() => setViewEstimationId(null)}
        />
      )}
    </div>
  );
};

export default EstimationList;
