import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CornerDownLeft, Package, Search, Filter } from 'lucide-react';
import api from '../../services/api';
import ReportTabs from '../../components/ReportTabs';
import { useSettings } from '../../contexts/SettingsContext';
import PaginationControls from '../../components/PaginationControls';

const PurchaseReturnReport = () => {
  const { formatCurrency } = useSettings();

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ['purchase-returns'],
    queryFn: async () => {
      const { data } = await api.get('/purchase-returns');
      return data;
    },
  });

  const [search, setSearch] = useState('');
  const [filterFromDate, setFilterFromDate] = useState('');
  const [filterToDate, setFilterToDate] = useState('');

  const filteredReturns = returns.filter((ret: any) => {
    let match = true;
    if (search) {
      const q = search.toLowerCase();
      const supplierMatch = ret.supplier?.name?.toLowerCase().includes(q) || false;
      const returnNoMatch = ret.returnNo?.toLowerCase().includes(q) || false;
      if (!supplierMatch && !returnNoMatch) match = false;
    }
    if (filterFromDate) {
      if (new Date(ret.date) < new Date(filterFromDate)) match = false;
    }
    if (filterToDate) {
      if (new Date(ret.date) > new Date(filterToDate)) match = false;
    }
    return match;
  });

  const [entriesPerPage, setEntriesPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(filteredReturns.length / entriesPerPage);
  const paginatedReturns = filteredReturns.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  return (
    <div className="absolute inset-0 bg-[#F7F7F7] flex flex-col font-sans overflow-hidden z-10 p-4">
      <ReportTabs />

      <div className="flex flex-col flex-1 overflow-hidden mt-4">
        <div className="bg-white border border-[#E6E9ED] shadow-sm rounded-sm flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <div className="bg-[#F8F9FA] border-b border-[#E6E9ED] px-4 py-3">
            <div className="flex items-start md:items-center justify-between gap-2 text-[#F59E0B]">
              <div className="flex items-center gap-2">
                <CornerDownLeft size={18} className="shrink-0" />
                <h2 className="font-bold text-[13px] md:text-[14px] uppercase tracking-wide">Purchase Returns Audit & History Report</h2>
              </div>
              <div className="bg-[#FACC15] text-[#854D0E] font-bold text-[11px] px-3 py-1 rounded-sm shadow-sm shrink-0 whitespace-nowrap">
                {returns.length} Returns
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white p-3 border-b border-[#E6E9ED] grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative col-span-1 md:col-span-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={14} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search by return no or supplier name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded text-[13px] outline-none focus:border-[#F59E0B]"
              />
            </div>
            <div>
              <input
                type="date"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded text-[13px] outline-none focus:border-[#F59E0B]"
              />
            </div>
            <div className="flex gap-2">
              <input
                type="date"
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded text-[13px] outline-none focus:border-[#F59E0B]"
              />
              <button className="bg-[#F59E0B] text-white px-3 rounded flex items-center justify-center hover:bg-[#D97706] transition-colors">
                <Filter size={14} />
              </button>
            </div>
            <div>
              <select
                value={entriesPerPage}
                onChange={(e) => {
                  setEntriesPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded text-[13px] outline-none bg-white focus:border-[#F59E0B]"
              >
                <option value={10}>10 Entries</option>
                <option value={25}>25 Entries</option>
                <option value={50}>50 Entries</option>
                <option value={100}>100 Entries</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-[13px] whitespace-nowrap min-w-[800px]">
              <thead>
                <tr className="bg-[#0F172A] text-white font-bold">
                  <th className="px-4 py-3 border-r border-[#1E293B]">Return No</th>
                  <th className="px-4 py-3 border-r border-[#1E293B]">Return Date</th>
                  <th className="px-4 py-3 border-r border-[#1E293B]">Supplier Name</th>
                  <th className="px-4 py-3 border-r border-[#1E293B]">Returned Products (Qty)</th>
                  <th className="px-4 py-3 border-r border-[#1E293B]">Remarks</th>
                  <th className="px-4 py-3 text-right">Claim Amount</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 font-medium">Loading report data...</td>
                  </tr>
                ) : filteredReturns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 font-medium">No purchase returns found matching your filters.</td>
                  </tr>
                ) : (
                  paginatedReturns.map((ret: any, index: number) => (
                    <tr key={ret.id} className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}`}>
                      <td className="px-4 py-3 border-r border-gray-100 font-bold text-[#F59E0B]">{ret.returnNo}</td>
                      <td className="px-4 py-3 border-r border-gray-100 font-medium text-gray-700">
                        {new Date(ret.date).toISOString().split('T')[0]}
                      </td>
                      <td className="px-4 py-3 border-r border-gray-100 font-bold text-gray-800">
                        {ret.supplier?.name || 'Unknown Supplier'}
                      </td>
                      <td className="px-4 py-3 border-r border-gray-100">
                        <div className="flex flex-wrap gap-2">
                          {ret.items?.map((item: any) => (
                            <div key={item.id} className="bg-white border border-[#FDE68A] text-[#92400E] px-2 py-1 rounded flex items-center gap-1 text-[11px] font-bold shadow-sm">
                              <Package size={12} className="text-[#F59E0B]" />
                              {item.product?.name} <span className="font-normal text-gray-600">(Qty: {item.returnQty})</span>
                            </div>
                          ))}
                          {(!ret.items || ret.items.length === 0) && <span className="text-gray-400 text-[11px]">No items</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 border-r border-gray-100 text-gray-600">
                        {ret.remarks || '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {formatCurrency(ret.totalAmount)}
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
              totalEntries={filteredReturns.length}
              entriesPerPage={entriesPerPage}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseReturnReport;
