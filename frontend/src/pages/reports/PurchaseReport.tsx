import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, FileText, Download, Calendar, FileDigit, Truck, CreditCard, RotateCcw, Plus, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../contexts/SettingsContext';
import api from '../../services/api';
import ReportTabs from '../../components/ReportTabs';
import { exportToExcel } from '../../utils/exportExcel';
import ViewPurchaseModal from '../purchase/ViewPurchaseModal';
import PaginationControls from '../../components/PaginationControls';

const PurchaseReport = () => {
  const navigate = useNavigate();
  const { formatCurrency, settings } = useSettings();
  const [fromDate, setFromDate] = useState(() => new Date(new Date().setDate(1)).toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]); // Today
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [paymentMode, setPaymentMode] = useState('');
  const [quickSearch, setQuickSearch] = useState('');
  const [viewId, setViewId] = useState<number | null>(null);

  // Fetch Master Data for filters
  const { data: suppliers = [] } = useQuery({ 
    queryKey: ['suppliers'], 
    queryFn: async () => (await api.get('/suppliers')).data 
  });

  const { data: paymentModes = [] } = useQuery({ 
    queryKey: ['paymentModes'], 
    queryFn: async () => (await api.get('/payment-modes')).data 
  });

  // Fetch Report Data
  const { data: purchases = [], isLoading, refetch } = useQuery({
    queryKey: ['purchaseReport', fromDate, toDate, supplierId, invoiceNo, paymentMode],
    queryFn: async () => {
      const { data } = await api.get(`/purchases`, { 
        params: { 
          fromDate, 
          toDate, 
          supplierId: supplierId || undefined,
          invoiceNo: invoiceNo || undefined,
          paymentModeId: paymentMode || undefined,
        } 
      });
      return data.map((p: any) => ({
        id: p.id,
        entryNo: `PUR-${p.id.toString().padStart(6, '0')}`,
        invoiceNo: p.invoiceNo || '-',
        date: new Date(p.date).toISOString().split('T')[0],
        supplierName: p.supplier?.name || '-',
        mode: p.paymentMode?.name || '-',
        totalAmount: formatCurrency(p.subtotal),
        taxAmount: formatCurrency(p.tax),
        netAmount: formatCurrency(p.grandTotal),
      }));
    },
  });

  const filteredPurchases = purchases.filter((p: any) => {
    if (!quickSearch) return true;
    const term = quickSearch.toLowerCase();
    return (
      p.entryNo.toLowerCase().includes(term) ||
      p.invoiceNo.toLowerCase().includes(term) ||
      p.supplierName.toLowerCase().includes(term) ||
      p.mode.toLowerCase().includes(term) ||
      p.totalAmount.toLowerCase().includes(term) ||
      p.netAmount.toLowerCase().includes(term)
    );
  });

  const [entriesPerPage, setEntriesPerPage] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(filteredPurchases.length / entriesPerPage);
  const paginatedPurchases = filteredPurchases.slice((currentPage - 1) * entriesPerPage, currentPage * entriesPerPage);

  return (
    <div className="absolute inset-0 bg-[#F8FAFC] flex flex-col font-sans overflow-hidden z-10 p-4">
      
      <ReportTabs />

      {/* Filter Section */}
      <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-md mb-4 p-4 shrink-0">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end mb-4">
          
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
            <label className="flex items-center gap-1 text-[12px] text-[#3B82F6] mb-1 font-bold"><FileDigit size={12} /> Entry / Invoice No</label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input 
                type="text" 
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="Type or select invoice..."
                className="w-full pl-8 pr-3 py-1.5 border border-[#CBD5E1] rounded outline-none text-[13px] text-[#334155] focus:border-[#3B82F6]"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1 text-[12px] text-[#64748B] mb-1 font-bold"><Truck size={12} /> Supplier Name</label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 border border-[#CBD5E1] rounded outline-none text-[13px] text-[#334155] bg-white focus:border-[#3B82F6]"
              >
                <option value="">Type or select supplier...</option>
                {suppliers.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-1 text-[12px] text-[#64748B] mb-1 font-bold"><CreditCard size={12} /> Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full px-3 py-1.5 border border-[#CBD5E1] rounded outline-none text-[13px] text-[#334155] bg-white focus:border-[#3B82F6]"
            >
              <option value="">All Payment Modes</option>
              {paymentModes.map((pm: any) => (
                <option key={pm.id} value={pm.id}>{pm.name}</option>
              ))}
            </select>
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
              setSupplierId('');
              setInvoiceNo('');
              setPaymentMode('');
              setQuickSearch('');
            }} className="text-[#64748B] hover:text-[#334155] flex items-center gap-1 text-[13px] font-bold transition-colors">
              <RotateCcw size={14} /> Reset Filters
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button type="button" onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setFromDate(today);
              setToDate(today);
            }} className="text-[#3B82F6] hover:bg-[#EFF6FF] px-3 py-1 rounded text-[12px] font-bold transition-colors">Today</button>
            <button type="button" onClick={() => {
              setFromDate(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
              setToDate(new Date().toISOString().split('T')[0]);
            }} className="text-[#3B82F6] hover:bg-[#EFF6FF] px-3 py-1 rounded text-[12px] font-bold transition-colors">This Month</button>
          </div>
        </div>
      </div>

      {/* Report Table Section */}
      <div className="bg-white border border-[#E2E8F0] shadow-sm rounded-md overflow-hidden flex flex-col flex-1">
        <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-4 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0 shrink-0">
          <div className="flex items-center gap-2 text-[#64748B]">
            <FileText size={16} />
            <h2 className="font-bold text-[13px] tracking-wide">PURCHASE REPORT DISPLAY</h2>
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
              onClick={() => exportToExcel(purchases, `Purchase_Report_${fromDate}_to_${toDate}`)}
              className="bg-[#10B981] hover:bg-[#059669] text-white px-3 py-1.5 rounded flex items-center gap-1.5 text-[12px] font-bold transition-colors"
            >
              <Download size={14} /> Export Excel
            </button>
            <button type="button" 
              onClick={() => navigate('/purchase/new')}
              className="text-[#64748B] border border-[#CBD5E1] hover:bg-gray-50 px-3 py-1.5 rounded flex items-center gap-1.5 text-[12px] font-bold transition-colors"
            >
              <Plus size={14} /> New Purchase Entry
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto overflow-x-auto">
          <table className="w-full text-left text-[12px] whitespace-nowrap">
            <thead>
              <tr className="bg-[#0F172A] text-white font-bold">
                <th className="px-4 py-3 border-r border-[#1E293B]">Entry No</th>
                <th className="px-4 py-3 border-r border-[#1E293B]">Invoice No</th>
                <th className="px-4 py-3 border-r border-[#1E293B]">Date</th>
                <th className="px-4 py-3 border-r border-[#1E293B]">Supplier Name</th>
                <th className="px-4 py-3 border-r border-[#1E293B]">Mode</th>
                <th className="px-4 py-3 border-r border-[#1E293B] text-right">Total Amount</th>
                {settings?.enableTax && <th className="px-4 py-3 border-r border-[#1E293B] text-right">Tax Amount</th>}
                <th className="px-4 py-3 border-r border-[#1E293B] text-right">Net Amount</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center p-6 text-gray-500">Loading report data...</td></tr>
              ) : filteredPurchases.length === 0 ? (
                <tr><td colSpan={8} className="text-center p-6 text-gray-500">No purchase records found.</td></tr>
              ) : (
                paginatedPurchases.map((p: any, index: number) => (
                  <tr key={p.id} className={`border-b border-[#E2E8F0] ${index % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'} hover:bg-[#EFF6FF]`}>
                    <td className="px-4 py-3 border-r border-[#E2E8F0] font-bold text-[#1E293B]">{p.entryNo}</td>
                    <td className="px-4 py-3 border-r border-[#E2E8F0] text-[#64748B]">{p.invoiceNo}</td>
                    <td className="px-4 py-3 border-r border-[#E2E8F0] text-[#475569]">{p.date}</td>
                    <td className="px-4 py-3 border-r border-[#E2E8F0] font-medium text-[#334155]">{p.supplierName}</td>
                    <td className="px-4 py-3 border-r border-[#E2E8F0]">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.mode === 'Cash' ? 'bg-[#06B6D4] text-white' : 
                        p.mode === 'Card' ? 'bg-[#0EA5E9] text-white' : 
                        'bg-[#14B8A6] text-white'
                      }`}>
                        {p.mode}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-[#E2E8F0] text-right text-[#475569]">{p.totalAmount}</td>
                    {settings?.enableTax && <td className="px-4 py-3 border-r border-[#E2E8F0] text-right text-[#475569]">{p.taxAmount}</td>}
                    <td className="px-4 py-3 border-r border-[#E2E8F0] text-right font-bold text-[#10B981]">{p.netAmount}</td>
                    <td className="px-4 py-3 text-center">
                      <button type="button" 
                        onClick={() => setViewId(p.id)}
                        className="text-[#3B82F6] border border-[#3B82F6] rounded p-1 hover:bg-[#3B82F6] hover:text-white transition-colors"
                        title="View Invoice"
                      >
                        <Eye size={14} />
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

export default PurchaseReport;
