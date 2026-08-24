import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle, ArrowLeft, PlusCircle, RotateCcw, List, FileText, Plus, Trash2, Package } from 'lucide-react';
import api from '../../services/api';
import SearchableSelect from '../../components/SearchableSelect';
import LeaveConfirmModal from '../../components/LeaveConfirmModal';
import { useSettings } from '../../contexts/SettingsContext';

const RawMaterialPurchaseEntry = () => {
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const queryClient = useQueryClient();
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplierId, setSupplierId] = useState(0);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [paymentModeId, setPaymentModeId] = useState(0);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  
  const [items, setItems] = useState<any[]>([{ rawMaterialId: 0, widthMm: '', lengthM: '', sqM: 0, quantity: '', price: '', amount: 0 }]);

  const { data: suppliers = [] } = useQuery({ 
    queryKey: ['suppliers'], 
    queryFn: async () => (await api.get('/suppliers')).data 
  });
  
  const { data: rawMaterials = [] } = useQuery({ 
    queryKey: ['rawMaterials'], 
    queryFn: async () => (await api.get('/raw-materials')).data 
  });

  const { data: paymentModes = [] } = useQuery({ 
    queryKey: ['paymentModes'], 
    queryFn: async () => (await api.get('/payment-modes')).data 
  });

  const generateNextCode = () => {
    const rmCodes = rawMaterials
      .filter((m: any) => m.code?.startsWith('RM-'))
      .map((m: any) => parseInt(m.code.replace('RM-', '')))
      .filter((n: number) => !isNaN(n));
    const maxCode = rmCodes.length > 0 ? Math.max(...rmCodes) : 0;
    return `RM-${String(maxCode + 1).padStart(3, '0')}`;
  };

  const handleCreateNewMaterial = async (index: number, name: string) => {
    try {
      const toastId = toast.loading(`Creating ${name}...`);
      const { data } = await api.post('/raw-materials', {
        code: generateNextCode(),
        name,
        unitId: 1, // Using 1 as a fallback default unit ID
        currentStock: 0,
        purchaseRate: 0
      });
      queryClient.invalidateQueries({ queryKey: ['rawMaterials'] });
      updateItem(index, 'rawMaterialId', data.id);
      toast.success(`${name} created successfully!`, { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to create raw material');
    }
  };

  const addItem = () => {
    setItems([...items, { rawMaterialId: 0, widthMm: '', lengthM: '', sqM: 0, quantity: '', price: '', amount: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleClear = () => {
    setInvoiceNo('');
    setDate(new Date().toISOString().split('T')[0]);
    setSupplierId(0);
    setItems([{ rawMaterialId: 0, widthMm: '', lengthM: '', sqM: 0, quantity: '', price: '', amount: 0 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'widthMm' || field === 'lengthM') {
      const width = parseFloat(newItems[index].widthMm || '0');
      const length = parseFloat(newItems[index].lengthM || '0');
      newItems[index].sqM = (width / 1000) * length;
    }

    if (field === 'widthMm' || field === 'lengthM' || field === 'quantity' || field === 'price') {
      const sqM = newItems[index].sqM || 0;
      const qty = parseFloat(newItems[index].quantity || '0');
      const price = parseFloat(newItems[index].price || '0');
      newItems[index].amount = sqM * qty * price;
    }

    setItems(newItems);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
  const tax = 0;
  const grandTotal = subtotal + tax;

  const mutation = useMutation({
    mutationFn: async () => {
      const validItems = items.filter(i => i.rawMaterialId > 0);
      const payload = {
        invoiceNo,
        date,
        supplierId: supplierId,
        subtotal,
        tax,
        grandTotal,
        paymentModeId: paymentModeId,
        items: validItems.map(item => ({
          rawMaterialId: parseInt(item.rawMaterialId),
          widthMm: parseFloat(item.widthMm || '0'),
          lengthM: parseFloat(item.lengthM || '0'),
          sqM: parseFloat(item.sqM || '0'),
          quantity: parseInt(item.quantity || '0'),
          price: parseFloat(item.price || '0'),
          amount: parseFloat(item.amount || '0')
        }))
      };
      return api.post('/raw-material-purchases', payload);
    },
    onSuccess: () => {
      toast.success('Purchase saved successfully');
      navigate('/raw-materials/purchase-list');
    },
    onError: (err: any) => {
      console.error(err);
      toast.error('Failed to save purchase');
    }
  });

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!invoiceNo || !supplierId || !paymentModeId) {
      toast.error('Please fill required fields (Invoice No, Supplier & Payment Mode)');
      return;
    }
    const validItems = items.filter(i => i.rawMaterialId > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one material.');
      return;
    }
    const invalidItems = validItems.some(i => i.amount <= 0);
    if (invalidItems) {
      toast.error('Please ensure all items have valid amounts.');
      return;
    }
    mutation.mutate();
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'F2') {
        e.preventDefault();
        addItem();
      } else if (e.key === 'F4') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Escape') {
        if (isLeaveModalOpen) {
          setIsLeaveModalOpen(false);
        } else {
          setIsLeaveModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit, handleClear, isLeaveModalOpen, navigate]);


  return (
    <div className="absolute inset-0 bg-[#F3F4F6] flex flex-col font-sans overflow-hidden z-10">
      
      {/* Top Bar - Differentiated color for Manufacturing */}
      <div className="bg-[#475569] text-white px-2 sm:px-4 py-2 flex flex-wrap gap-2 justify-between items-center shrink-0">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="font-bold text-[14px] uppercase tracking-wider flex items-center gap-2">
            <span className="bg-[#334155] p-1 rounded"><Package size={16} /></span>
            Raw Material Purchase
          </h1>
          <button 
            type="button"
            onClick={() => handleSubmit()}
            className="bg-[#10B981] hover:bg-[#059669] text-white px-4 py-1.5 rounded flex items-center gap-2 font-bold text-[13px] transition-colors shadow-sm"
          >
            <CheckCircle size={16} /> SAVE PURCHASE (F10)
          </button>
        </div>
        <button 
          onClick={() => setIsLeaveModalOpen(true)}
          className="text-white hover:text-white/80 transition-colors flex items-center gap-1.5 font-medium text-[13px]"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      <form className="flex flex-col flex-1 overflow-y-auto custom-scrollbar" onSubmit={handleSubmit}>
        
        {/* Header Section */}
        <div className="bg-white p-4 sm:p-5 border-b border-[#E5E7EB] shrink-0 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-5 lg:gap-8">
            
            <div className="w-full lg:max-w-[300px]">
              <label className="block text-[12px] font-bold text-[#374151] mb-1.5 uppercase tracking-wide">Supplier Invoice No *</label>
              <input
                type="text"
                value={invoiceNo}
                onChange={e => setInvoiceNo(e.target.value)}
                placeholder="Enter Bill No"
                className="w-full px-3 py-2 border border-[#D1D5DB] rounded bg-[#F9FAFB] focus:bg-white text-[13px] outline-none focus:border-[#475569] focus:ring-1 focus:ring-[#475569] transition-all"
              />
            </div>

            <div className="w-full lg:flex-[2]">
              <label className="block text-[12px] font-bold text-[#374151] mb-1.5 uppercase tracking-wide">Select Supplier *</label>
              <div className="w-full">
                <SearchableSelect
                  value={supplierId}
                  onChange={(val) => setSupplierId(Number(val))}
                  options={[
                    { label: 'Click or type supplier name / phone...', value: 0 },
                    ...suppliers.map((s: any) => ({ label: `${s.name} - ${s.phone || ''}`, value: s.id }))
                  ]}
                />
              </div>
            </div>

            <div className="w-full lg:max-w-[200px]">
              <label className="block text-[12px] font-bold text-[#374151] mb-1.5 uppercase tracking-wide">Purchase Date *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#D1D5DB] rounded bg-[#F9FAFB] focus:bg-white text-[13px] outline-none focus:border-[#475569] focus:ring-1 focus:ring-[#475569] transition-all"
              />
            </div>

            <div className="w-full lg:max-w-[200px]">
              <label className="block text-[12px] font-bold text-[#374151] mb-1.5 uppercase tracking-wide">Payment Mode *</label>
              <select
                value={paymentModeId}
                onChange={e => setPaymentModeId(Number(e.target.value))}
                className="w-full px-3 py-2 border border-[#D1D5DB] rounded bg-[#F9FAFB] focus:bg-white text-[13px] outline-none focus:border-[#475569] focus:ring-1 focus:ring-[#475569] transition-all"
              >
                <option value={0}>Select Mode</option>
                {paymentModes.map((mode: any) => (
                  <option key={mode.id} value={mode.id}>{mode.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-auto custom-scrollbar bg-white p-2 sm:p-4 border-b border-[#E5E7EB] overflow-x-auto">
          <div className="flex flex-wrap justify-between gap-2 mb-2 min-w-[300px]">
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => navigate('/raw-materials/purchase-list')}
                className="border border-[#10B981] text-[#10B981] hover:bg-[#10B981] hover:text-white px-3 py-1 rounded flex items-center gap-1 text-[12px] transition-colors font-bold"
              >
                <List size={14} /> List
              </button>
              <button 
                type="button"
                onClick={() => navigate('/reports/raw-material-purchase')}
                className="border border-[#8B5CF6] text-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-white px-3 py-1 rounded flex items-center gap-1 text-[12px] transition-colors font-bold"
              >
                <FileText size={14} /> Report
              </button>
            </div>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={addItem}
                className="border border-[#0B355B] text-[#0B355B] hover:bg-[#0B355B] hover:text-white px-3 py-1 rounded flex items-center gap-1 text-[12px] transition-colors font-bold"
              >
                <PlusCircle size={14} /> Add Row
              </button>
              <button 
                type="button"
                onClick={handleClear}
                className="border border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444] hover:text-white px-3 py-1 rounded flex items-center gap-1 text-[12px] transition-colors font-bold"
              >
                <RotateCcw size={14} /> Clear (F4)
              </button>
            </div>
          </div>
          
          <table className="w-full border-collapse border border-[#E5E7EB] md:min-w-[1200px] whitespace-nowrap responsive-table shadow-sm">
            <thead>
              <tr className="bg-[#1E293B] text-white">
                <th className="px-2 py-2.5 text-center text-[12px] font-medium border border-[#334155] w-10">#</th>
                <th className="px-3 py-2.5 text-left text-[12px] font-medium border border-[#334155]">Raw Material (Searchable)</th>
                <th className="px-2 py-2.5 text-center text-[12px] font-medium border border-[#334155] w-24">Width (MM)</th>
                <th className="px-2 py-2.5 text-center text-[12px] font-medium border border-[#334155] w-24">Length (M)</th>
                <th className="px-2 py-2.5 text-center text-[12px] font-bold border border-[#334155] w-28 bg-[#334155] text-green-300 tracking-wide">SQ.M</th>
                <th className="px-2 py-2.5 text-center text-[12px] font-medium border border-[#334155] w-20">Qty (Rolls)</th>
                <th className="px-2 py-2.5 text-center text-[12px] font-medium border border-[#334155] w-28">Price / Sq.M</th>
                <th className="px-3 py-2.5 text-right text-[12px] font-bold border border-[#334155] w-32 tracking-wide">AMOUNT</th>
                <th className="px-2 py-2.5 text-center text-[12px] font-medium border border-[#334155] w-16">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                  <td className="px-2 py-1 text-center text-[13px] border-r border-[#E5E7EB]">{index + 1}</td>
                  <td className="px-2 py-1 border-r border-[#E5E7EB]">
                    <SearchableSelect
                      creatable={true}
                      value={item.rawMaterialId}
                      onChange={(val) => updateItem(index, 'rawMaterialId', Number(val))}
                      onCreate={(name) => handleCreateNewMaterial(index, name)}
                      options={[
                        { label: 'Type material name / code...', value: 0 },
                        ...rawMaterials.map((p: any) => ({ label: `${p.code} - ${p.name}`, value: p.id }))
                      ]}
                    />
                  </td>
                  <td className="px-2 py-1 border-r border-[#E5E7EB]">
                    <input 
                      type="number" value={item.widthMm} onChange={e => updateItem(index, 'widthMm', e.target.value)}
                      placeholder="0" onFocus={e => e.target.select()}
                      className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-[13px] outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] focus:bg-blue-50 transition-colors text-right" 
                    />
                  </td>
                  <td className="px-2 py-1 border-r border-[#E5E7EB]">
                    <input 
                      type="number" value={item.lengthM} onChange={e => updateItem(index, 'lengthM', e.target.value)}
                      placeholder="0" onFocus={e => e.target.select()}
                      className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-[13px] outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] focus:bg-blue-50 transition-colors text-right" 
                    />
                  </td>
                  <td className="px-2 py-1 border-r border-[#E5E7EB] bg-blue-50 text-center font-bold text-blue-700">
                    {item.sqM.toFixed(3)}
                  </td>
                  <td className="px-2 py-1 border-r border-[#E5E7EB]">
                    <input 
                      type="number" value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)}
                      placeholder="0" onFocus={e => e.target.select()}
                      className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-[13px] outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] focus:bg-blue-50 transition-colors text-right" 
                    />
                  </td>
                  <td className="px-2 py-1 border-r border-[#E5E7EB]">
                    <input 
                      type="number" step="0.01" value={item.price} onChange={e => updateItem(index, 'price', e.target.value)}
                      placeholder="0.00" onFocus={e => e.target.select()}
                      className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-[13px] outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] focus:bg-blue-50 transition-colors text-right" 
                    />
                  </td>
                  <td className="px-2 py-1 border-r border-[#E5E7EB]">
                    <input type="number" readOnly tabIndex={-1} value={item.amount.toFixed(2)} className="w-full px-2 py-1 bg-transparent text-[13px] outline-none text-right font-bold" />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        type="button" onClick={addItem} 
                        className="bg-[#10B981] text-white p-1.5 rounded hover:bg-[#059669] transition-colors shadow-sm"
                        title="Add Row"
                      >
                        <Plus size={14} strokeWidth={3} />
                      </button>
                      <button 
                        type="button" onClick={() => removeItem(index)} 
                        disabled={items.length === 1} 
                        className="bg-red-50 text-red-500 p-1.5 rounded hover:bg-red-500 hover:text-white transition-colors disabled:opacity-30 disabled:hover:bg-red-50 disabled:hover:text-red-500"
                        title="Remove Row"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Calculation Area */}
        <div className="bg-white border-t border-[#E5E7EB] p-3 sm:p-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 md:gap-6">
            
            <div className="w-full md:flex-1 flex flex-col gap-1">
              <label className="text-[14px] font-extrabold text-[#1F2937] uppercase">Total Quantity:</label>
              <input
                value={items.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0)}
                readOnly
                className="w-full px-3 py-2 border border-[#D1D5DB] bg-[#F9FAFB] rounded text-[20px] outline-none text-right font-black text-[#1F2937]"
              />
            </div>

            <div className="w-full md:flex-1 flex flex-col gap-1">
              <label className="text-[14px] font-extrabold text-[#1F2937] uppercase">Total SQ.M:</label>
              <input
                value={items.reduce((acc, item) => acc + ((Number(item.sqM) || 0) * (Number(item.quantity) || 0)), 0).toFixed(3)}
                readOnly
                className="w-full px-3 py-2 border border-[#D1D5DB] bg-[#F9FAFB] rounded text-[20px] outline-none text-right font-black text-[#1F2937]"
              />
            </div>
            
            <div className="w-full md:flex-[2] flex flex-col gap-1"></div>

          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="bg-[#F8FAFC] border-t border-[#CBD5E1] px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0 mt-auto shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex flex-nowrap justify-between sm:justify-center gap-2 w-full md:w-auto">
            <button 
              type="button" onClick={addItem}
              className="bg-[#334155] text-white text-[11px] font-bold px-3 py-2 rounded flex items-center gap-1.5 cursor-pointer hover:bg-[#1E293B] shadow-sm transition-colors"
            >
              <span className="opacity-60 border-r border-[#64748B] pr-1.5">F2</span> Add Material
            </button>

            <button 
              type="button" disabled={mutation.isPending} onClick={() => handleSubmit()}
              className="bg-[#10B981] text-white text-[11px] font-bold px-3 py-2 rounded flex items-center gap-1.5 cursor-pointer hover:bg-[#059669] shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
            >
              <span className="opacity-60 border-r border-[#6EE7B7] pr-1.5">F10</span> 
              {mutation.isPending ? 'Saving...' : 'Save Record'}
            </button>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t border-gray-200 md:border-none pt-3 md:pt-0">
            <span className="text-[16px] sm:text-[18px] font-bold text-[#475569] uppercase">Total Purchase Amount:</span>
            <span className="text-[24px] sm:text-[32px] font-black text-[#10B981]">
              {formatCurrency(grandTotal || 0)}
            </span>
          </div>
        </div>

      </form>
      
      <LeaveConfirmModal 
        isOpen={isLeaveModalOpen} 
        onClose={() => setIsLeaveModalOpen(false)} 
        onConfirm={() => navigate('/dashboard')} 
      />
    </div>
  );
};

export default RawMaterialPurchaseEntry;
