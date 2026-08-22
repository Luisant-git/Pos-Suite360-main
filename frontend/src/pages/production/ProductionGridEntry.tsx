import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle, PlusCircle, RotateCcw, List, Plus, Trash2, FileText } from 'lucide-react';
import api from '../../services/api';
import SearchableSelect from '../../components/SearchableSelect';
import LeaveConfirmModal from '../../components/LeaveConfirmModal';

const ProductionGridEntry = ({ onSwitchToMaster }: { onSwitchToMaster?: () => void }) => {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [workName, setWorkName] = useState('');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  
  const [items, setItems] = useState<any[]>([
    { rawMaterialId: 0, sqM: '', intakeQuantity: '', finishedProductId: 0, outcomeQuantity: '' }
  ]);

  const { data: rawMaterials = [] } = useQuery({ 
    queryKey: ['rawMaterials'], 
    queryFn: async () => (await api.get('/raw-materials')).data 
  });

  const { data: products = [] } = useQuery({ 
    queryKey: ['products'], 
    queryFn: async () => (await api.get('/products')).data 
  });

  const finishedProducts = products;

  const addItem = () => {
    setItems([...items, { rawMaterialId: 0, sqM: '', intakeQuantity: '', finishedProductId: 0, outcomeQuantity: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleClear = () => {
    setWorkName('');
    setDate(new Date().toISOString().split('T')[0]);
    setItems([{ rawMaterialId: 0, sqM: '', intakeQuantity: '', finishedProductId: 0, outcomeQuantity: '' }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    
    if (field === 'intakeQuantity') {
      const rawMaterialId = newItems[index].rawMaterialId;
      const material = rawMaterials.find((m: any) => m.id === rawMaterialId);
      const currentStock = material?.currentStock || 0;
      
      if (Number(value) > currentStock) {
        toast.error(`Quantity Intake cannot exceed Current Stock (${currentStock})`);
        return;
      }

      const sqMPerRoll = material?.rawMaterialPurchaseItems?.[0]?.sqM || 0;
      newItems[index].sqM = (Number(value) * Number(sqMPerRoll)).toFixed(3);
    }
    
    if (field === 'rawMaterialId') {
      const material = rawMaterials.find((m: any) => m.id === Number(value));
      const sqMPerRoll = material?.rawMaterialPurchaseItems?.[0]?.sqM || 0;
      const currentQty = Number(newItems[index].intakeQuantity) || 0;
      newItems[index].sqM = (currentQty * Number(sqMPerRoll)).toFixed(3);
    }

    if (field === 'finishedProductId') {
      const product = products.find((p: any) => p.id === Number(value));
      newItems[index].finishedProductId = value;

      if (product && product.rawMaterials && product.rawMaterials.length > 0) {
        // Update current row with the first raw material
        const autoRawMatId = product.rawMaterials[0].rawMaterialId;
        newItems[index].rawMaterialId = autoRawMatId;
        
        // Recalculate sqM
        const material = rawMaterials.find((m: any) => m.id === autoRawMatId);
        const sqMPerRoll = material?.rawMaterialPurchaseItems?.[0]?.sqM || 0;
        const currentQty = Number(newItems[index].intakeQuantity) || 0;
        newItems[index].sqM = (currentQty * Number(sqMPerRoll)).toFixed(3);

        // If there are multiple raw materials, insert additional rows
        if (product.rawMaterials.length > 1) {
          const additionalItems = product.rawMaterials.slice(1).map((rmMap: any) => {
             const rmId = rmMap.rawMaterialId;
             const sqM = '0.000';
             return {
               rawMaterialId: rmId,
               sqM,
               intakeQuantity: '',
               finishedProductId: value,
               outcomeQuantity: newItems[index].outcomeQuantity || ''
             };
          });
          newItems.splice(index + 1, 0, ...additionalItems);
        }
      }
      setItems(newItems);
      return;
    }

    newItems[index][field] = value;
    setItems(newItems);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const validItems = items.filter(i => i.rawMaterialId > 0 && i.finishedProductId > 0);
      
      // Submit multiple production entries concurrently
      const promises = validItems.map(item => {
        const payload = {
          date,
          workName,
          rawMaterialId: parseInt(item.rawMaterialId),
          intakeQuantity: parseInt(item.intakeQuantity || '0'),
          finishedProductId: parseInt(item.finishedProductId),
          outcomeQuantity: parseInt(item.outcomeQuantity || '0')
        };
        // The backend doesn't store quality currently, so we just drop it or we can ignore it for now.
        return api.post('/production', payload);
      });

      return Promise.all(promises);
    },
    onSuccess: () => {
      toast.success('Production entries saved successfully');
      handleClear();
    },
    onError: (err: any) => {
      console.error(err);
      toast.error('Failed to save production entries');
    }
  });

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!workName) {
      toast.error('Please fill Name of Work');
      return;
    }
    const validItems = items.filter(i => i.rawMaterialId > 0 && i.finishedProductId > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one complete production row.');
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
        if (!showLeaveModal) {
          setShowLeaveModal(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit, handleClear, showLeaveModal]);

  return (
    <div className="absolute inset-0 bg-[#F3F4F6] flex flex-col font-sans overflow-hidden z-10">
      
      {/* Top Bar */}


      <form className="flex flex-col flex-1 overflow-y-auto custom-scrollbar" onSubmit={handleSubmit}>
        
        {/* Header Section */}
        <div className="bg-white p-3 sm:p-4 border-b border-[#E5E7EB] shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:flex lg:flex-row gap-3 sm:gap-4">
            
            <div className="w-full lg:flex-1 lg:max-w-[200px]">
              <label className="block text-[11px] font-bold text-[#1F2937] mb-1">Production Date *</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-2 py-1.5 border border-[#D1D5DB] rounded text-[13px] outline-none focus:border-[#3B82F6]"
              />
            </div>

            <div className="w-full lg:flex-[2] lg:max-w-[500px]">
              <label className="block text-[11px] font-bold text-[#1F2937] mb-1">Name of Work / Batch Name *</label>
              <input
                type="text"
                value={workName}
                onChange={e => setWorkName(e.target.value)}
                placeholder="e.g. Batch 1 Manufacturing"
                className="w-full px-2 py-1.5 border border-[#D1D5DB] rounded text-[13px] outline-none focus:border-[#3B82F6]"
              />
            </div>
            
          </div>
        </div>

        {/* Items Grid */}
        <div className="flex-1 overflow-auto custom-scrollbar bg-white p-2 sm:p-4 border-b border-[#E5E7EB] overflow-x-auto">
          <div className="flex flex-wrap justify-between gap-2 mb-2 min-w-[300px]">
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => { if (onSwitchToMaster) onSwitchToMaster(); }}
                className="border border-[#10B981] text-[#10B981] hover:bg-[#10B981] hover:text-white px-3 py-1 rounded flex items-center gap-1 text-[12px] transition-colors font-bold"
              >
                <List size={14} /> List
              </button>
              <button 
                type="button"
                onClick={() => navigate('/reports/production')}
                className="border border-[#8B5CF6] text-[#8B5CF6] hover:bg-[#8B5CF6] hover:text-white px-3 py-1 rounded flex items-center gap-1 text-[12px] transition-colors font-bold"
              >
                <FileText size={14} /> Report
              </button>
              <button 
                type="button"
                onClick={() => handleSubmit()}
                className="bg-[#10B981] hover:bg-[#059669] text-white px-3 py-1 rounded flex items-center gap-1 text-[12px] font-bold transition-colors"
              >
                <CheckCircle size={14} /> Save Entry (F10)
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
          
          <table className="w-full border-collapse border border-[#E5E7EB] md:min-w-[1200px] whitespace-nowrap responsive-table">
            <thead>
              <tr className="bg-[#0F172A] text-white">
                <th className="px-2 py-2 text-center text-[12px] font-medium border border-[#334155] w-10">#</th>
                <th className="px-2 py-2 text-left text-[12px] font-medium border border-[#334155] w-[250px]">Finished Product Name (Outcome)</th>
                <th className="px-2 py-2 text-center text-[12px] font-medium border border-[#334155] w-24">Product Sq.M</th>
                <th className="px-2 py-2 text-left text-[12px] font-medium border border-[#334155] w-[250px]">Material Name (Intake)</th>
                <th className="px-2 py-2 text-center text-[12px] font-medium border border-[#334155] w-24">Current Stock</th>
                <th className="px-2 py-2 text-center text-[12px] font-medium border border-[#334155] w-24">Quantity Intake</th>
                <th className="px-2 py-2 text-center text-[12px] font-medium border border-[#334155] w-32">RAW SQ.M</th>
                <th className="px-2 py-2 text-center text-[12px] font-medium border border-[#334155] w-28">Outcome Products Count</th>
                <th className="px-2 py-2 text-center text-[12px] font-medium border border-[#334155] w-16">Act</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b border-[#E5E7EB] hover:bg-[#F9FAFB]">
                  <td className="px-2 py-1 text-center text-[13px] border-r border-[#E5E7EB]">{index + 1}</td>
                  
                  {/* OUTCOME - Product */}
                  <td className="px-2 py-1 border-r border-[#E5E7EB]">
                    <SearchableSelect
                      value={item.finishedProductId}
                      onChange={(val) => updateItem(index, 'finishedProductId', Number(val))}
                      options={[
                        { label: 'Type product...', value: 0 },
                        ...finishedProducts.map((p: any) => ({ label: `${p.name} (Stock: ${p.currentStock})`, value: p.id }))
                      ]}
                    />
                  </td>
                  <td className="px-2 py-1 border-r border-[#E5E7EB]">
                    <input 
                      type="text" 
                      readOnly
                      tabIndex={-1}
                      value={products.find((p: any) => p.id === item.finishedProductId)?.sqM || '0.000'}
                      className="w-full px-2 py-1 border border-[#D1D5DB] rounded bg-[#E5E7EB] text-[13px] outline-none text-right font-bold text-[#4B5563] cursor-not-allowed"
                    />
                  </td>

                  {/* INTAKE */}
                  <td className="px-2 py-1 border-r border-[#E5E7EB]">
                    <SearchableSelect
                      value={item.rawMaterialId}
                      onChange={(val) => updateItem(index, 'rawMaterialId', Number(val))}
                      options={[
                        { label: 'Type material...', value: 0 },
                        ...rawMaterials.map((m: any) => ({ label: `${m.name}`, value: m.id }))
                      ]}
                    />
                  </td>
                  <td className="px-2 py-1 border-r border-[#E5E7EB]">
                    <input 
                      type="text" 
                      readOnly
                      value={rawMaterials.find((m: any) => m.id === item.rawMaterialId)?.currentStock || 0}
                      className="w-full px-2 py-1 border border-[#D1D5DB] rounded bg-[#E5E7EB] text-[13px] outline-none text-right font-bold text-[#4B5563] cursor-not-allowed"
                    />
                  </td>
                  <td className="px-2 py-1 border-r border-[#E5E7EB]">
                    <input 
                      type="number" value={item.intakeQuantity} onChange={e => updateItem(index, 'intakeQuantity', e.target.value)}
                      placeholder="0" onFocus={e => e.target.select()}
                      className="w-full px-2 py-1 border border-[#D1D5DB] rounded text-[13px] outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6] focus:bg-blue-50 transition-colors text-right font-bold text-blue-700" 
                    />
                  </td>
                  <td className="px-2 py-1 border-r border-[#E5E7EB]">
                    <input 
                      type="text" value={item.sqM || '0.000'} readOnly tabIndex={-1}
                      className="w-full px-2 py-1 border border-[#D1D5DB] rounded bg-[#E5E7EB] text-[13px] outline-none text-right font-bold text-[#4B5563] cursor-not-allowed" 
                    />
                  </td>

                  {/* OUTCOME - Quantity */}
                  <td className="px-2 py-1 border-r border-[#E5E7EB]">
                    <input 
                      type="number" value={item.outcomeQuantity} onChange={e => updateItem(index, 'outcomeQuantity', e.target.value)}
                      placeholder="0" onFocus={e => e.target.select()}
                      readOnly={true}
                      className="w-full px-2 py-1 border border-[#D1D5DB] rounded bg-[#E5E7EB] text-[13px] outline-none text-right font-black text-[#4B5563] cursor-not-allowed" 
                    />
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
              <label className="text-[14px] font-extrabold text-[#1F2937] uppercase">Total Quantity Intake:</label>
              <input
                value={items.reduce((acc, item) => acc + (Number(item.intakeQuantity) || 0), 0)}
                readOnly
                className="w-full px-3 py-2 border border-[#D1D5DB] bg-[#FEF2F2] rounded text-[20px] outline-none text-right font-black text-[#991B1B]"
              />
            </div>

            <div className="w-full md:flex-1 flex flex-col gap-1">
              <label className="text-[14px] font-extrabold text-[#1F2937] uppercase">Total Outcome Produced:</label>
              <input
                value={items.reduce((acc, item) => acc + (Number(item.outcomeQuantity) || 0), 0)}
                readOnly
                className="w-full px-3 py-2 border border-[#D1D5DB] bg-[#F0FDF4] rounded text-[20px] outline-none text-right font-black text-[#065F46]"
              />
            </div>
            
            <div className="w-full md:flex-[2] flex flex-col gap-1"></div>

          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="bg-white border-t border-gray-200 px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-0 mt-auto shrink-0">
          <div className="flex flex-nowrap justify-between sm:justify-center gap-1 sm:gap-2 w-full md:w-auto">
            <button 
              type="button" onClick={addItem}
              className="bg-[#2563EB] text-white text-[10px] sm:text-[11px] font-bold px-2 sm:px-3 py-1.5 rounded-sm flex items-center gap-1 cursor-pointer hover:bg-[#1D4ED8] whitespace-nowrap"
            >
              <span className="opacity-70 border-r border-[#60A5FA] pr-1 mr-1">F2</span> Add Row
            </button>

            <button 
              type="button" disabled={mutation.isPending} onClick={() => handleSubmit()}
              className="bg-[#059669] text-white text-[10px] sm:text-[11px] font-bold px-2 sm:px-3 py-1.5 rounded-sm flex items-center gap-1 cursor-pointer hover:bg-[#047857] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap" 
            >
              <span className="opacity-70 border-r border-[#34D399] pr-1 mr-1">F10</span> 
              {mutation.isPending ? 'Saving...' : 'Save Production Entry'}
            </button>
            <button 
              type="button"
              className="bg-[#0891B2] text-white text-[10px] sm:text-[11px] font-bold px-2 sm:px-3 py-1.5 rounded-sm flex items-center gap-1 cursor-pointer hover:bg-[#0E7490] whitespace-nowrap" 
              onClick={() => navigate('/dashboard')}
            >
              <span className="opacity-70 border-r border-[#67E8F9] pr-1 mr-1">Esc</span> Dashboard
            </button>
          </div>
        </div>

      </form>
      <LeaveConfirmModal 
        isOpen={showLeaveModal}
        onConfirm={() => navigate('/dashboard')}
        onClose={() => setShowLeaveModal(false)}
      />
    </div>
  );
};

export default ProductionGridEntry;
