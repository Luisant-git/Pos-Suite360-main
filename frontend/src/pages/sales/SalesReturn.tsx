import { useState, useEffect, useMemo, useRef } from 'react';
import { Save, Trash2, RotateCcw, FileText, X, List } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';
import SearchableSelect from '../../components/SearchableSelect';

const SalesReturn = () => {
  const navigate = useNavigate();
  const [returnNo, setReturnNo] = useState('');
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [pendingSavePayload, setPendingSavePayload] = useState<any>(null);
  const printAfterSaveRef = useRef(false);

  // Fetch next sequential code
  const fetchNextCode = async () => {
    try {
      const { data } = await api.get('/sales-returns/next-code');
      setReturnNo(data);
    } catch (error) {
      console.error('Error fetching next return code', error);
    }
  };

  useEffect(() => {
    fetchNextCode();
  }, []);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [remarks, setRemarks] = useState('');

  // Fetch Customers
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: async () => (await api.get('/customers')).data
  });

  // Fetch Sales for selected customer
  const { data: sales = [] } = useQuery({
    queryKey: ['sales', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return [];
      const res = await api.get(`/sales?customerId=${selectedCustomerId}`);
      return res.data;
    },
    enabled: !!selectedCustomerId
  });

  // Fetch Sale Details when sale is selected
  const { data: saleDetails } = useQuery({
    queryKey: ['saleDetails', selectedSaleId],
    queryFn: async () => {
      if (!selectedSaleId) return null;
      const res = await api.get(`/sales/${selectedSaleId}`);
      return res.data;
    },
    enabled: !!selectedSaleId
  });

  const [returnItems, setReturnItems] = useState<any[]>([]);

  useEffect(() => {
    if (saleDetails && saleDetails.items) {
      setReturnItems(saleDetails.items.map((item: any) => ({
        ...item,
        returnQty: 0,
      })));
    } else {
      setReturnItems([]);
    }
  }, [saleDetails]);

  const handleReturnQtyChange = (index: number, val: string) => {
    const qty = val === '' ? '' : parseInt(val) || 0;
    const newItems = [...returnItems];
    // prevent returning more than sold
    if (typeof qty === 'number' && qty > newItems[index].quantity) return;
    newItems[index].returnQty = typeof qty === 'number' ? (qty >= 0 ? qty : 0) : '';
    setReturnItems(newItems);
  };

  const handleClear = () => {
    setSelectedCustomerId('');
    setSelectedSaleId('');
    setRemarks('');
    setReturnItems([]);
    fetchNextCode();
  };

  const totals = useMemo(() => {
    return returnItems.reduce((acc, item) => {
      if (item.returnQty > 0) {
        acc.itemsCount += 1;
        acc.qtyCount += item.returnQty;
        acc.totalAmount += (item.returnQty * parseFloat(item.rate));
      }
      return acc;
    }, { itemsCount: 0, qtyCount: 0, totalAmount: 0 });
  }, [returnItems]);

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/sales-returns', payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Sales Return Saved Successfully!');
      setTimeout(() => {
        if (printAfterSaveRef.current) {
          window.print();
        }
        handleClear();
      }, 100);
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(`Failed to save sales return: ${err.response?.data?.message || err.message}`);
    }
  });

  const handleSave = () => {
    if (!selectedCustomerId) { toast.error('Select a customer'); return; }
    if (totals.qtyCount === 0) { toast.error('Return at least 1 quantity'); return; }
    
    const itemsPayload = returnItems
      .filter(item => item.returnQty > 0)
      .map(item => ({
        productId: item.productId,
        returnQty: item.returnQty,
        rate: Number(item.rate),
        amount: item.returnQty * Number(item.rate)
      }));

    setPendingSavePayload({
      returnNo,
      date: returnDate,
      saleId: selectedSaleId ? Number(selectedSaleId) : undefined,
      customerId: Number(selectedCustomerId),
      remarks,
      totalAmount: totals.totalAmount,
      items: itemsPayload
    });
    setIsSaveModalOpen(true);
  };

  const handleConfirmSave = (print: boolean) => {
    printAfterSaveRef.current = print;
    setIsSaveModalOpen(false);
    if (pendingSavePayload) {
      saveMutation.mutate(pendingSavePayload);
      setPendingSavePayload(null);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault();
        handleSave();
      } else if (e.key === 'Escape') {
        if (isSaveModalOpen) {
          setIsSaveModalOpen(false);
        } else {
          navigate('/dashboard');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, isSaveModalOpen, navigate]);

  return (
    <div className="absolute inset-0 bg-[#F3F4F6] flex flex-col font-sans overflow-hidden z-10">
      {/* Header */}
      <div className="bg-[#0f172a] text-white px-4 py-2 flex flex-wrap items-center justify-between shadow-md gap-2">
        <div className="flex items-center gap-4">
          <button onClick={handleSave} className="bg-red-500 hover:bg-red-600 text-white font-bold py-1.5 px-4 rounded text-sm flex items-center gap-2 disabled:opacity-50" disabled={saveMutation.isPending}>
            <Save size={16} /> {saveMutation.isPending ? 'SAVING...' : 'SAVE SALES RETURN (F10)'}
          </button>
        </div>
        <Link to="/dashboard" className="bg-red-500 hover:bg-red-600 text-white py-1.5 px-4 rounded text-sm flex items-center gap-2">
          <X size={16} /> Close (Esc)
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-2 overflow-y-auto custom-scrollbar flex flex-col">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col h-full">
          
          <div className="flex-shrink-0">
          
          {/* Top Form */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border-b border-gray-200 bg-gray-50/50">
            <div>
              <label className="block text-[11px] font-bold text-red-500 mb-1">Return No</label>
              <input type="text" value={returnNo} readOnly className="w-full text-red-500 font-bold bg-gray-100 border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Return Date</label>
              <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#1ABB9C]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Customer Name *</label>
              <SearchableSelect
                value={selectedCustomerId}
                onChange={(val) => { setSelectedCustomerId(String(val)); setSelectedSaleId(''); }}
                options={[
                  { label: 'Select Customer...', value: '' },
                  ...customers.map((c: any) => ({ label: `${c.name} - ${c.phone || ''}`, value: c.id }))
                ]}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-blue-600 mb-1">Sales Invoice / Bill No *</label>
              <SearchableSelect
                value={selectedSaleId}
                onChange={(val) => setSelectedSaleId(String(val))}
                options={[
                  { label: 'Select Sales Invoice...', value: '' },
                  ...sales.map((s: any) => ({ label: `${s.invoiceNo} (Date: ${new Date(s.date).toLocaleDateString()})`, value: s.id }))
                ]}
              />
            </div>
          </div>
          
          {/* Optional remarks */}
          <div className="p-4 border-b border-gray-200 bg-gray-50/50">
             <label className="block text-[11px] font-bold text-gray-700 mb-1">Remarks / Reason</label>
             <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional return remarks..." className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[#1ABB9C]" />
          </div>

          {/* Table Header */}
          <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-0">
            <h3 className="font-bold text-sm flex items-center gap-2 uppercase">
              <List size={16} className="text-gray-500" /> SOLD ITEMS TO RETURN
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={handleClear} className="bg-white border border-gray-300 hover:bg-gray-50 text-orange-500 font-semibold py-1 px-3 rounded text-xs flex items-center gap-1 shadow-sm">
                <RotateCcw size={14} /> Clear
              </button>
              <button onClick={() => navigate('/reports/sales-return')} className="bg-white border border-gray-300 hover:bg-gray-50 text-blue-600 font-semibold py-1 px-3 rounded text-xs flex items-center gap-1 shadow-sm">
                <FileText size={14} /> Reports
              </button>
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">{returnItems.length} Items</span>
            </div>
          </div>

          </div>

          {/* Table */}
          <div className="overflow-auto flex-1 overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap responsive-table md:min-w-[800px]">
              <thead className="text-xs text-white uppercase bg-[#2d3748]">
                <tr>
                  <th className="px-4 py-2 border-r border-gray-600 text-center w-12">#</th>
                  <th className="px-4 py-2 border-r border-gray-600">Product Name / Code</th>
                  <th className="px-4 py-2 border-r border-gray-600 text-center w-24">Unit</th>
                  <th className="px-4 py-2 border-r border-gray-600 text-center w-32">Sold Qty</th>
                  <th className="px-4 py-2 border-r border-gray-600 text-right w-24">Sale Rate</th>
                  <th className="px-4 py-2 border-r border-gray-600 text-center text-red-400 w-32">Return Qty</th>
                  <th className="px-4 py-2 border-r border-gray-600 text-right w-32">Total Amount</th>
                  <th className="px-4 py-2 text-center w-20">Action</th>
                </tr>
              </thead>
              <tbody>
                {returnItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      Select a Sales Invoice / Bill No above to load items for return.
                    </td>
                  </tr>
                ) : (
                  returnItems.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td data-label="#" className="px-4 py-2 border-r border-gray-200 text-center">{index + 1}</td>
                      <td data-label="Product" className="px-4 py-2 border-r border-gray-200 font-medium">
                        {item.product.name} <span className="text-gray-400 text-xs ml-1">({item.product.code})</span>
                      </td>
                      <td data-label="Unit" className="px-4 py-2 border-r border-gray-200 text-center">
                        {item.product.unit?.name || 'Nos'}
                      </td>
                      <td data-label="Sold Qty" className="px-4 py-2 border-r border-gray-200 text-center font-bold text-gray-700">
                        {item.quantity}
                      </td>
                      <td data-label="Sale Rate" className="px-4 py-2 border-r border-gray-200 text-right">
                        {Number(item.rate).toFixed(2)}
                      </td>
                      <td data-label="Return Qty" className="px-4 py-2 border-r border-gray-200">
                        <input 
                          type="number" 
                          min="0" 
                          max={item.quantity}
                          value={item.returnQty === '' ? '' : item.returnQty || ''} 
                          placeholder="0"
                          onChange={(e) => handleReturnQtyChange(index, e.target.value)} 
                          className="w-full border border-red-300 bg-red-50 rounded px-2 py-1 text-sm text-center text-red-600 font-bold focus:outline-none focus:ring-1 focus:ring-red-400" 
                        />
                      </td>
                      <td data-label="Total Amount" className="px-4 py-2 border-r border-gray-200 text-right font-bold text-gray-700">
                        {(item.returnQty * parseFloat(item.rate)).toFixed(2)}
                      </td>
                      <td data-label="Action" className="px-4 py-2 text-center">
                        <button onClick={() => handleReturnQtyChange(index, '0')} className="text-red-500 hover:text-red-700" title="Clear return quantity">
                          <Trash2 size={16} className="mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex-shrink-0 mt-auto">
            {/* Totals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border-t border-gray-200 bg-gray-50">
            <div>
              <label className="block text-[13px] font-bold text-[#1F2937] uppercase mb-1">Total Items Returned</label>
              <div className="border border-[#D1D5DB] rounded px-3 py-1.5 bg-white text-center font-black text-[20px] text-[#1F2937]">{totals.itemsCount}</div>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#1F2937] uppercase mb-1">Total Quantity Returned</label>
              <div className="border border-[#D1D5DB] rounded px-3 py-1.5 bg-white text-center font-black text-[20px] text-red-500">{totals.qtyCount.toFixed(2)}</div>
            </div>
            <div>
              <label className="block text-[13px] font-bold text-[#1F2937] uppercase mb-1">Total Credit / Refund Amount</label>
              <div className="flex items-center justify-between border-b-2 border-[#D1D5DB] pb-1 mt-1">
                <span className="bg-red-500 text-white font-black px-2 py-0.5 rounded text-[14px]">TOTAL REFUND</span>
                <span className="font-black text-[28px] text-[#059669]">{totals.totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="p-4 bg-gray-50 flex justify-end">
             {/* <button onClick={handleSave} disabled={saveMutation.isPending} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded shadow-md flex items-center gap-2 disabled:opacity-50">
                <Save size={18} /> {saveMutation.isPending ? 'SAVING...' : 'SAVE SALES RETURN (F10)'}
             </button> */}
          </div>
          </div>
        </div>
      </div>


      {/* Save Confirmation Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform transition-all scale-100">
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1E3A8A] text-white px-5 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2 font-bold text-[16px]">
                <Save size={20} /> Confirm Sales Return
              </div>
              <button type="button" onClick={() => setIsSaveModalOpen(false)} className="text-white/80 hover:text-white transition-colors bg-white/10 hover:bg-white/20 p-1.5 rounded-full">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 text-center">
              <div className="bg-red-50 text-red-800 p-4 rounded-lg mb-6 shadow-sm border border-red-100">
                <p className="font-bold text-[15px]">Refund Amount: {pendingSavePayload?.totalAmount?.toFixed(2)}</p>
                <p className="text-[13px] mt-1 text-red-600">Return No: {pendingSavePayload?.returnNo}</p>
              </div>
              <p className="text-[#334155] font-medium mb-2">How would you like to proceed?</p>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button 
                type="button"
                onClick={() => handleConfirmSave(false)}
                className="w-full bg-[#10B981] hover:bg-[#059669] text-white py-2.5 rounded-lg font-bold text-[14px] transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Save size={16} /> Confirm Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SalesReturn;
