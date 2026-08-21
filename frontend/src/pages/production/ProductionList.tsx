import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Eye, Pencil } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import PaginationControls from '../../components/PaginationControls';
import ProductionModal from './ProductionModal';

const ProductionList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewId, setViewId] = useState<number | null>(null);
  const [filterRmId, setFilterRmId] = useState<string>('');
  const [filterProductId, setFilterProductId] = useState<string>('');

  // Fetch Production Entries
  const { data: productions = [], isLoading } = useQuery({
    queryKey: ['productions'],
    queryFn: async () => {
      const { data } = await api.get('/production');
      return data;
    },
  });

  const { data: rawMaterials = [] } = useQuery({
    queryKey: ['rawMaterials'],
    queryFn: async () => (await api.get('/raw-materials')).data,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => (await api.get('/products')).data,
  });

  // Pagination & Filtering Logic
  const entriesPerPage = 20;
  const [currentPage, setCurrentPage] = useState(1);

  const filteredProductions = productions.filter((prod: any) => {
    if (filterRmId && prod.rawMaterialId?.toString() !== filterRmId) return false;
    if (filterProductId && prod.finishedProductId?.toString() !== filterProductId) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const workMatch = prod.workName?.toLowerCase().includes(term);
      const rmMatch = prod.rawMaterial?.name?.toLowerCase().includes(term);
      const fpMatch = prod.finishedProduct?.name?.toLowerCase().includes(term);
      return workMatch || rmMatch || fpMatch;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredProductions.length / entriesPerPage);
  const paginatedProductions = filteredProductions.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  return (
    <div className="absolute inset-0 bg-[#F3F4F6] flex flex-col font-sans overflow-hidden z-10">
      {/* Top Header */}
      <div className="bg-[#0B355B] text-white px-2 sm:px-4 py-2 flex flex-wrap gap-2 justify-between items-center shrink-0">
        <div className="flex items-center gap-2 text-[12px] sm:text-[13px] font-bold">
          <span className="opacity-70 hover:opacity-100 cursor-pointer transition-opacity" onClick={() => navigate('/dashboard')}>Home</span> 
          <span className="opacity-50">/</span>
          <span className="opacity-70">Manufacturing</span>
          <span className="opacity-50">/</span>
          <span className="text-[#60A5FA]">Production List</span>
        </div>
        <button 
          type="button" 
          onClick={() => navigate('/production/new')}
          className="bg-[#10B981] hover:bg-[#059669] text-white px-3 sm:px-4 py-1.5 rounded flex items-center gap-2 font-bold text-[12px] sm:text-[13px] transition-colors"
        >
          <Plus size={16} /> <span className="hidden sm:inline">New Production Entry</span>
        </button>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        
        <div className="bg-white p-3 border-b border-[#E5E7EB] shrink-0 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2 text-[12px] font-bold text-gray-700">
            <span>Filter by:</span>
            <select 
              className="border border-[#ccc] rounded px-2 py-1 outline-none text-[#1F2937] bg-white w-32 sm:w-40"
              value={filterRmId}
              onChange={(e) => {
                setFilterRmId(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Raw Materials</option>
              {rawMaterials.map((rm: any) => (
                <option key={rm.id} value={rm.id}>{rm.name}</option>
              ))}
            </select>
            
            <select 
              className="border border-[#ccc] rounded px-2 py-1 outline-none text-[#1F2937] bg-white w-32 sm:w-40"
              value={filterProductId}
              onChange={(e) => {
                setFilterProductId(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Products</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <label className="text-[12px] font-bold text-[#1F2937] hidden sm:block">Search:</label>
            <input 
              type="text" 
              placeholder="Search batch or materials..."
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
                <th className="px-3 py-2.5 border-r border-[#444] relative">Batch / Work Name</th>
                <th className="px-3 py-2.5 border-r border-[#444] relative">Raw Material Intake</th>
                <th className="px-3 py-2.5 border-r border-[#444] relative text-right">Intake Qty</th>
                <th className="px-3 py-2.5 border-r border-[#444] relative">Finished Product Outcome</th>
                <th className="px-3 py-2.5 border-r border-[#444] relative text-right">Produced Qty</th>
                <th className="px-3 py-2.5 border-[#444] relative text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-[#73879C]">Loading...</td>
                </tr>
              ) : filteredProductions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-[#73879C]">No production entries found matching your criteria.</td>
                </tr>
              ) : (
                paginatedProductions.map((production: any, index: number) => (
                  <tr key={production.id} className={`border-b border-[#E5E7EB] ${index % 2 === 0 ? 'bg-[#F9F9F9]' : 'bg-white'} hover:bg-blue-50`}>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#333] font-medium">{production.date ? new Date(production.date).toISOString().split('T')[0] : '-'}</td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#3B82F6] font-bold">{production.workName}</td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#B91C1C] font-medium">{production.rawMaterial?.name || 'Unknown RM'}</td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#B91C1C] font-bold text-right">{production.intakeQuantity}</td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#333] font-medium">{production.finishedProduct?.name}</td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#059669] font-bold text-right">{production.outcomeQuantity}</td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => navigate(`/production/edit/${production.id}`)}
                          className="p-1.5 bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#4F46E5] hover:text-white rounded transition-colors"
                          title="Edit Outcome"
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => setViewId(production.id)}
                          className="p-1.5 bg-[#EBF5FF] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white rounded transition-colors"
                          title="View Details"
                        >
                          <Eye size={16} />
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
            totalEntries={filteredProductions.length}
            entriesPerPage={entriesPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {viewId && (
        <ProductionModal productionId={viewId} onClose={() => setViewId(null)} />
      )}
    </div>
  );
};

export default ProductionList;
