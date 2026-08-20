import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, Download, Calendar, RotateCcw, Plus, Box, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ReportTabs from '../../components/ReportTabs';
import { exportToExcel } from '../../utils/exportExcel';
import PaginationControls from '../../components/PaginationControls';
import ProductionModal from '../production/ProductionModal';

const ProductionReport = () => {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState(() => new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]); 
  const [workName, setWorkName] = useState('');
  const [quickSearch, setQuickSearch] = useState('');
  const [viewId, setViewId] = useState<number | null>(null);

  // Fetch Report Data
  const { data: productions = [], isLoading, refetch } = useQuery({
    queryKey: ['productionReport', fromDate, toDate, workName],
    queryFn: async () => {
      const { data } = await api.get(`/production`, { 
        params: { 
          fromDate, 
          toDate, 
          workName: workName || undefined,
        } 
      });
      return data.map((p: any) => ({
        id: p.id,
        date: new Date(p.date).toISOString().split('T')[0],
        workName: p.workName || '-',
        rawMaterial: p.rawMaterial?.name || '-',
        intakeQuantity: p.intakeQuantity || 0,
        finishedProduct: p.finishedProduct?.name || '-',
        outcomeQuantity: p.outcomeQuantity || 0,
      }));
    },
  });

  const filteredProductions = productions.filter((p: any) => {
    if (!quickSearch) return true;
    const term = quickSearch.toLowerCase();
    return (
      p.workName.toLowerCase().includes(term) ||
      p.rawMaterial.toLowerCase().includes(term) ||
      p.finishedProduct.toLowerCase().includes(term)
    );
  });

  const [entriesPerPage, setEntriesPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(filteredProductions.length / entriesPerPage);
  const paginatedProductions = filteredProductions.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  return (
    <div className="absolute inset-0 bg-[#F8FAFC] flex flex-col font-sans overflow-hidden z-10 p-4">
      
      <ReportTabs />

      {/* Filter Section */}
      <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-md mb-4 p-4 shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-4">
          
          <div>
            <label className="flex items-center gap-1 text-[12px] text-[#64748B] mb-1 font-bold"><Calendar size={12} /> From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-[#CBD5E1] rounded outline-none text-[13px] text-[#334155] focus:border-[#3B82F6]"
            />
          </div>

          <div>
            <label className="flex items-center gap-1 text-[12px] text-[#64748B] mb-1 font-bold"><Calendar size={12} /> To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-1.5 border border-[#CBD5E1] rounded outline-none text-[13px] text-[#334155] focus:border-[#3B82F6]"
            />
          </div>

          <div>
            <label className="flex items-center gap-1 text-[12px] text-[#3B82F6] mb-1 font-bold"><Box size={12} /> Batch / Work Name</label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input 
                type="text" 
                value={workName}
                onChange={(e) => setWorkName(e.target.value)}
                placeholder="Search batch name..."
                className="w-full pl-8 pr-3 py-1.5 border border-[#CBD5E1] rounded outline-none text-[13px] text-[#334155] focus:border-[#3B82F6]"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1 text-[12px] text-[#64748B] mb-1 font-bold">Show</label>
            <select
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="w-full px-3 py-1.5 border border-[#CBD5E1] rounded outline-none text-[13px] text-[#334155] bg-white focus:border-[#3B82F6]"
            >
              <option value={10}>10 Entries</option>
              <option value={25}>25 Entries</option>
              <option value={50}>50 Entries</option>
              <option value={100}>100 Entries</option>
            </select>
          </div>

        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center pt-2 border-t border-dashed border-[#E2E8F0] gap-3 md:gap-0">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <button type="button" onClick={() => refetch()} className="bg-[#0F172A] hover:bg-[#1E293B] text-white px-4 py-1.5 rounded-md flex items-center gap-2 text-[13px] font-bold transition-colors">
              <Search size={14} /> Apply Filter
            </button>
            <button type="button" onClick={() => {
              setFromDate(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
              setToDate(new Date().toISOString().split('T')[0]);
              setWorkName('');
              setQuickSearch('');
            }} className="text-[#64748B] hover:text-[#334155] flex items-center gap-1 text-[13px] font-bold transition-colors">
              <RotateCcw size={14} /> Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Report Table Section */}
      <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-md overflow-hidden flex flex-col flex-1">
        <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0 shrink-0">
          <div className="flex items-center gap-2 text-[#64748B]">
            <FileText size={16} />
            <h2 className="font-bold text-[13px] tracking-wide">PRODUCTION REPORT</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input 
                type="text" 
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Quick search table..."
                className="pl-8 pr-3 py-1.5 border border-[#CBD5E1] rounded outline-none text-[12px] w-64 focus:border-[#3B82F6]"
              />
            </div>
            <button type="button" 
              onClick={() => exportToExcel(productions, `Production_Report_${fromDate}_to_${toDate}`)}
              className="bg-[#10B981] hover:bg-[#059669] text-white px-3 py-1.5 rounded flex items-center gap-1.5 text-[12px] font-bold transition-colors"
            >
              <Download size={14} /> Export Excel
            </button>
            <button type="button" 
              onClick={() => navigate('/production/new')}
              className="text-[#64748B] border border-[#CBD5E1] hover:bg-gray-50 px-3 py-1.5 rounded flex items-center gap-1.5 text-[12px] font-bold transition-colors"
            >
              <Plus size={14} /> New Production Entry
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto overflow-x-auto">
          <table className="w-full text-left text-[12px] whitespace-nowrap">
            <thead>
              <tr className="bg-[#0F172A] text-white font-bold">
                <th className="px-4 py-3 border-r border-[#1E293B]">Date</th>
                <th className="px-4 py-3 border-r border-[#1E293B]">Batch / Work Name</th>
                <th className="px-4 py-3 border-r border-[#1E293B]">Raw Material Used</th>
                <th className="px-4 py-3 border-r border-[#1E293B] text-right">Intake Qty</th>
                <th className="px-4 py-3 border-r border-[#1E293B]">Finished Product Output</th>
                <th className="px-4 py-3 border-r border-[#1E293B] text-right">Produced Qty</th>
                <th className="px-4 py-3 border-[#1E293B] text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center p-6 text-gray-500">Loading report data...</td></tr>
              ) : filteredProductions.length === 0 ? (
                <tr><td colSpan={7} className="text-center p-6 text-gray-500">No production records found.</td></tr>
              ) : (
                paginatedProductions.map((p: any, index: number) => (
                  <tr key={p.id} className={`border-b border-[#E2E8F0] ${index % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'} hover:bg-[#EFF6FF]`}>
                    <td className="px-4 py-3 border-r border-[#E2E8F0] text-[#475569]">{p.date}</td>
                    <td className="px-4 py-3 border-r border-[#E2E8F0] font-bold text-[#1E293B]">{p.workName}</td>
                    <td className="px-4 py-3 border-r border-[#E2E8F0] font-medium text-[#B91C1C]">{p.rawMaterial}</td>
                    <td className="px-4 py-3 border-r border-[#E2E8F0] text-right font-bold text-[#B91C1C]">{p.intakeQuantity}</td>
                    <td className="px-4 py-3 border-r border-[#E2E8F0] font-medium text-[#15803D]">{p.finishedProduct}</td>
                    <td className="px-4 py-3 border-r border-[#E2E8F0] text-right font-bold text-[#15803D]">{p.outcomeQuantity}</td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => setViewId(p.id)}
                        className="p-1.5 bg-[#EBF5FF] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white rounded transition-colors"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
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

export default ProductionReport;
