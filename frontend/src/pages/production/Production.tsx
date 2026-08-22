import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2, CheckCircle, Box, Grid, Maximize, Minimize, Search, PlusCircle, RotateCcw, ArrowRight, Eye } from 'lucide-react';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import api from '../../services/api';
import SearchableSelect from '../../components/SearchableSelect';
import toast from 'react-hot-toast';
import ProductionGridEntry from './ProductionGridEntry';
import ProductionViewModal from '../../components/ProductionViewModal';
import LeaveConfirmModal from '../../components/LeaveConfirmModal';
import { useNavigate } from 'react-router-dom';

const Production = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'master' | 'grid'>('master');
  const [filterStatus, setFilterStatus] = useState<'pending' | 'completed'>('pending');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [workName, setWorkName] = useState('');
  
  const [items, setItems] = useState<any[]>([
    { rawMaterialId: 0, sqM: '', intakeQuantity: '', finishedProductId: 0, outcomeQuantity: '' }
  ]);
  
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [viewingProduction, setViewingProduction] = useState<any>(null);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFullTable, setIsFullTable] = useState(false);

  const { data: rawMaterials = [] } = useQuery({ 
    queryKey: ['rawMaterials'], 
    queryFn: async () => (await api.get('/raw-materials')).data 
  });
  
  const { data: products = [] } = useQuery({ 
    queryKey: ['products'], 
    queryFn: async () => (await api.get('/products')).data 
  });
  
  const { data: productions = [], isLoading } = useQuery({
    queryKey: ['productions'],
    queryFn: async () => (await api.get('/production')).data
  });

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
    setEditingId(null);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    
    if (field === 'intakeQuantity') {
      const rawMaterialId = newItems[index].rawMaterialId;
      const material = rawMaterials.find((m: any) => m.id === rawMaterialId);
      const currentStock = material?.currentStock || 0;
      if (!editingId && Number(value) > currentStock) {
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

    newItems[index][field] = value;
    setItems(newItems);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const item = items[0];
        const payload = {
          date,
          workName,
          rawMaterialId: parseInt(item.rawMaterialId),
          intakeQuantity: parseInt(item.intakeQuantity || '0'),
          finishedProductId: parseInt(item.finishedProductId),
          outcomeQuantity: parseInt(item.outcomeQuantity || '0')
        };
        return api.patch(`/production/${editingId}`, payload);
      } else {
        const validItems = items.filter(i => i.rawMaterialId > 0 && i.finishedProductId > 0);
        const promises = validItems.map(item => {
          const payload = {
            date,
            workName,
            rawMaterialId: parseInt(item.rawMaterialId),
            intakeQuantity: parseInt(item.intakeQuantity || '0'),
            finishedProductId: parseInt(item.finishedProductId),
            outcomeQuantity: parseInt(item.outcomeQuantity || '0')
          };
          return api.post('/production', payload);
        });
        return Promise.all(promises);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      toast.success(editingId ? 'Production updated successfully' : 'Production entries saved successfully');
      handleClear();
    },
    onError: (err: any) => {
      console.error(err);
      toast.error('Failed to save production entries');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/production/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      toast.success('Production entry deleted successfully');
      setItemToDelete(null);
    },
    onError: (err: any) => {
      console.error(err);
      toast.error('Failed to delete production entry');
      setItemToDelete(null);
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
    saveMutation.mutate();
  };

  const handleEdit = (production: any) => {
    setIsFullTable(false);
    setEditingId(production.id);
    setDate(new Date(production.date).toISOString().split('T')[0]);
    setWorkName(production.workName);
    
    const material = rawMaterials.find((m: any) => m.id === production.rawMaterialId);
    const sqMPerRoll = material?.rawMaterialPurchaseItems?.[0]?.sqM || 0;
    const sqM = (Number(production.intakeQuantity) * Number(sqMPerRoll)).toFixed(3);

    setItems([{
      rawMaterialId: production.rawMaterialId,
      intakeQuantity: production.intakeQuantity,
      sqM: sqM,
      finishedProductId: production.finishedProductId,
      outcomeQuantity: production.outcomeQuantity || ''
    }]);
  };

  const handleView = (production: any) => {
    setViewingProduction(production);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'F2' && !editingId) {
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

  const filteredProductions = productions.filter((p: any) => {
    const isCompleted = p.outcomeQuantity && p.outcomeQuantity > 0;
    if (filterStatus === 'pending' && isCompleted) return false;
    if (filterStatus === 'completed' && !isCompleted) return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return p.workName?.toLowerCase().includes(term) || 
           p.rawMaterial?.name?.toLowerCase().includes(term) ||
           p.finishedProduct?.name?.toLowerCase().includes(term);
  });

  return (
    <div className="absolute inset-0 bg-[#F3F4F6] flex flex-col z-10 font-sans">
      {/* Tabs */}
      <div className="flex border-b border-gray-300 shrink-0 bg-white shadow-sm">
        <button
          className={`px-6 py-3 text-[13px] font-bold tracking-wider uppercase transition-colors flex items-center gap-2 ${
            activeTab === 'master' 
              ? 'border-b-2 border-[#3B82F6] text-[#3B82F6] bg-blue-50/50' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('master')}
        >
          <Box size={16} /> Master View
        </button>
        <button
          className={`px-6 py-3 text-[13px] font-bold tracking-wider uppercase transition-colors flex items-center gap-2 ${
            activeTab === 'grid' 
              ? 'border-b-2 border-[#10B981] text-[#10B981] bg-emerald-50/50' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => setActiveTab('grid')}
        >
          <Grid size={16} /> Grid Entry View
        </button>
      </div>

      {activeTab === 'grid' ? (
        <div className="flex-1 relative">
          <ProductionGridEntry onSwitchToMaster={() => setActiveTab('master')} />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 flex-1 overflow-hidden p-4">
          
          {!isFullTable && (
      <div className="xl:col-span-1 bg-white border border-[#E6E9ED] shadow-sm rounded-sm flex flex-col h-full overflow-hidden">
        <div className="bg-[#EBF5FF] border-b border-[#3B82F6] px-4 py-2 flex items-center justify-between rounded-t-sm shrink-0">
          <div className="flex items-center gap-2">
            <Box size={16} className="text-[#1E3A8A]" />
            <h2 className="font-bold text-[14px] text-[#1E3A8A]">PRODUCTION ENTRY</h2>
          </div>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={handleClear}
              className="text-[#EF4444] hover:bg-red-50 px-2 py-1 rounded flex items-center gap-1 text-[11px] font-bold transition-colors"
            >
              <RotateCcw size={12} /> CLEAR (F4)
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-3 flex flex-col gap-3 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[12px] font-bold text-[#1F2937] mb-1">Batch / Work Name *</label>
              <input 
                type="text" 
                value={workName}
                onChange={e => setWorkName(e.target.value)}
                readOnly={!!editingId}
                placeholder="e.g. Batch 1 Manufacturing"
                className={`w-full px-3 py-1.5 border border-[#ccc] rounded shadow-inner outline-none text-[13px] ${editingId ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:border-[#3B82F6]'}`}
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[12px] font-bold text-[#1F2937] mb-1">Production Date *</label>
              <input 
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
                readOnly={!!editingId}
                className={`w-full px-3 py-1.5 border border-[#ccc] rounded shadow-inner outline-none text-[13px] ${editingId ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:border-[#3B82F6]'}`}
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-2 border-b border-[#E5E7EB] pb-2">
            <h3 className="font-bold text-[13px] text-gray-800">Production Items</h3>
            {!editingId && (
              <button 
                type="button"
                onClick={addItem}
                className="text-[#3B82F6] hover:bg-blue-50 px-2 py-1 rounded flex items-center gap-1 text-[11px] font-bold transition-colors border border-[#3B82F6]"
              >
                <PlusCircle size={12} /> ADD ITEM (F2)
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {items.map((item, index) => (
              <div key={index} className="border border-[#E5E7EB] rounded bg-[#F9FAFB] flex flex-col">
                <div className="flex justify-between items-center p-2 bg-gray-100 border-b border-[#E5E7EB]">
                  <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">Item #{index + 1}</span>
                  {!editingId && items.length > 1 && (
                    <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                
                <div className="p-2 flex flex-col gap-2">
                  {/* INTAKE */}
                  <div className="border border-blue-100 bg-blue-50/50 p-2 rounded">
                    <label className="block text-[11px] font-bold text-blue-800 mb-1">Material Name (Intake)</label>
                    <div className="mb-2">
                      <SearchableSelect
                        value={item.rawMaterialId}
                        onChange={(val) => updateItem(index, 'rawMaterialId', Number(val))}
                        disabled={!!editingId}
                        options={[
                          { label: 'Select material...', value: 0 },
                          ...rawMaterials.map((m: any) => ({ label: `${m.name} (Stock: ${m.currentStock})`, value: m.id }))
                        ]}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">Quantity Intake</label>
                        <input 
                          type="number" value={item.intakeQuantity} onChange={e => updateItem(index, 'intakeQuantity', e.target.value)}
                          placeholder="0" onFocus={e => !editingId && e.target.select()}
                          readOnly={!!editingId}
                          className={`w-full px-2 py-1.5 border border-[#ccc] rounded text-[13px] outline-none text-right font-bold ${editingId ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:border-blue-500 text-blue-700'}`} 
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">SQ.M (Auto)</label>
                        <input 
                          type="text" value={item.sqM || '0.000'} readOnly tabIndex={-1}
                          className="w-full px-2 py-1.5 border border-[#E5E7EB] rounded bg-gray-100 text-[13px] outline-none text-right font-bold text-gray-500 cursor-not-allowed" 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center -my-3 z-10">
                    <div className="bg-white border border-[#E5E7EB] rounded-full p-1 text-gray-400">
                      <ArrowRight size={14} className="rotate-90" />
                    </div>
                  </div>

                  {/* OUTCOME */}
                  <div className="border border-emerald-100 bg-emerald-50/50 p-2 rounded">
                    <label className="block text-[11px] font-bold text-emerald-800 mb-1">Finished Product (Outcome)</label>
                    <div className="mb-2">
                      <SearchableSelect
                        value={item.finishedProductId}
                        onChange={(val) => updateItem(index, 'finishedProductId', Number(val))}
                        disabled={!!editingId}
                        options={[
                          { label: 'Select product...', value: 0 },
                          ...products.map((p: any) => ({ label: `${p.name}`, value: p.id }))
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-1">Outcome Quantity</label>
                      <input 
                        type="number" value={item.outcomeQuantity} onChange={e => updateItem(index, 'outcomeQuantity', e.target.value)}
                        placeholder="0" onFocus={e => e.target.select()}
                        className={`w-full px-2 py-1.5 border-2 rounded text-[13px] outline-none text-right font-black ${editingId ? 'border-[#10B981] ring-2 ring-[#10B981]/30 bg-[#ECFDF5] text-emerald-800 text-[15px]' : 'border-[#ccc] focus:border-emerald-500 text-emerald-700'}`} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 mt-4 shrink-0">
            <button 
              type="submit" 
              disabled={saveMutation.isPending}
              className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white font-bold py-2.5 rounded flex justify-center items-center gap-2 transition-colors"
            >
              <CheckCircle size={16} />
              {editingId ? 'UPDATE PRODUCTION' : 'SAVE PRODUCTION (F10)'}
            </button>
            {editingId && (
              <button 
                type="button" 
                onClick={handleClear}
                className="w-full bg-[#6B7280] hover:bg-[#4B5563] text-white font-bold py-2.5 rounded flex justify-center items-center gap-2 transition-colors"
              >
                <RotateCcw size={16} />
                CANCEL EDIT
              </button>
            )}
          </div>
        </form>
      </div>
      )}

      {/* Right Column: List */}
      <div className={`${isFullTable ? 'xl:col-span-3' : 'xl:col-span-2'} bg-white border border-[#E6E9ED] shadow-sm rounded-sm overflow-hidden flex flex-col h-full`}>
        <div className="bg-[#EBF5FF] border-b border-[#3B82F6] px-4 py-3 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 text-[#1E3A8A]">
            <Grid size={16} className="text-[#1E3A8A]" />
            <h2 className="font-bold text-[14px]">PRODUCTION LIST</h2>
          </div>
          <div className="bg-gray-500 text-white text-[11px] font-bold px-2 py-1 rounded-xl">
            {filteredProductions.length} Entries
          </div>
        </div>

        <div className="p-3 border-b border-[#E6E9ED] bg-white flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <Search size={14} className="text-gray-400" />
            </div>
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by batch, material or product..."
              className="w-full sm:w-64 pl-7 pr-3 py-1.5 border border-[#ccc] rounded text-[13px] outline-none focus:border-[#3B82F6]"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="flex bg-gray-100 p-0.5 rounded border border-gray-300 w-full sm:w-auto">
              <button 
                type="button"
                onClick={() => setFilterStatus('pending')}
                className={`flex-1 sm:flex-none px-3 py-1 text-[12px] font-bold rounded-sm transition-colors ${filterStatus === 'pending' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Pending
              </button>
              <button 
                type="button"
                onClick={() => setFilterStatus('completed')}
                className={`flex-1 sm:flex-none px-3 py-1 text-[12px] font-bold rounded-sm transition-colors ${filterStatus === 'completed' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Completed
              </button>
            </div>
            <button type="button" 
              onClick={() => setIsFullTable(!isFullTable)}
              className="w-full sm:w-auto justify-center text-[#3B82F6] hover:bg-[#EFF6FF] px-3 py-1.5 rounded text-[12px] font-bold flex items-center gap-2 transition-colors border border-[#3B82F6]"
            >
              {isFullTable ? <Minimize size={14} /> : <Maximize size={14} />}
              {isFullTable ? 'Show Form' : 'View Full Table'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto overflow-x-auto">
          <table className="w-full text-left text-[13px] whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="bg-[#2A2A2A] text-white font-bold">
                <th className="px-3 py-2.5 border-r border-[#444] text-center w-8">#</th>
                <th className="px-3 py-2.5 border-r border-[#444] text-center">Date</th>
                <th className="px-3 py-2.5 border-r border-[#444]">Batch Name</th>
                <th className="px-3 py-2.5 border-r border-[#444]">Material (Intake)</th>
                <th className="px-3 py-2.5 border-r border-[#444] text-center">Intake Qty</th>
                <th className="px-3 py-2.5 border-r border-[#444]">Product (Outcome)</th>
                <th className="px-3 py-2.5 border-r border-[#444] text-center">Outcome Qty</th>
                <th className="px-3 py-2.5 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="text-center p-4">Loading...</td></tr>
              ) : filteredProductions.length === 0 ? (
                <tr><td colSpan={8} className="text-center p-4">No production entries found.</td></tr>
              ) : (
                filteredProductions.map((production: any, index: number) => (
                  <tr key={production.id} className={`border-b border-[#E5E7EB] ${index % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'} hover:bg-blue-50`}>
                    <td data-label="#" className="px-3 py-3 border-r border-[#E5E7EB] text-center font-bold text-gray-700">{index + 1}</td>
                    <td data-label="Date" className="px-3 py-3 border-r border-[#E5E7EB] text-center font-medium text-gray-600">{new Date(production.date).toLocaleDateString()}</td>
                    <td data-label="Batch Name" className="px-3 py-3 border-r border-[#E5E7EB] font-bold text-blue-700">{production.workName}</td>
                    <td data-label="Material" className="px-3 py-3 border-r border-[#E5E7EB] text-gray-800">{production.rawMaterial?.name}</td>
                    <td data-label="Intake Qty" className="px-3 py-3 border-r border-[#E5E7EB] text-center font-bold text-blue-600">{production.intakeQuantity}</td>
                    <td data-label="Product" className="px-3 py-3 border-r border-[#E5E7EB] text-gray-800">{production.finishedProduct?.name}</td>
                    <td data-label="Outcome Qty" className="px-3 py-3 border-r border-[#E5E7EB] text-center font-bold text-emerald-600">{production.outcomeQuantity}</td>
                    <td data-label="Actions" className="px-3 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        {!(production.outcomeQuantity > 0) ? (
                          <>
                            <button type="button" 
                              onClick={() => handleEdit(production)}
                              className="text-[#3B82F6] border border-[#3B82F6] rounded p-1 hover:bg-[#3B82F6] hover:text-white transition-colors title='Edit Pending Entry'"
                            >
                              <Edit size={12} />
                            </button>
                            <button type="button" 
                              onClick={() => setItemToDelete(production)}
                              className="text-[#EF4444] border border-[#EF4444] rounded p-1 hover:bg-[#EF4444] hover:text-white transition-colors title='Delete Pending Entry'"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        ) : (
                          <button type="button" 
                            onClick={() => handleView(production)}
                            className="text-[#10B981] border border-[#10B981] rounded p-1 hover:bg-[#10B981] hover:text-white transition-colors title='View Completed Entry'"
                          >
                            <Eye size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteConfirmationModal 
        isOpen={!!itemToDelete}
        itemName={itemToDelete?.workName}
        isDeleting={deleteMutation.isPending}
        onConfirm={() => {
          if (itemToDelete) {
            deleteMutation.mutate(itemToDelete.id);
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />

      <ProductionViewModal 
        isOpen={!!viewingProduction}
        onClose={() => setViewingProduction(null)}
        production={viewingProduction}
      />
      <LeaveConfirmModal 
        isOpen={showLeaveModal}
        onConfirm={() => navigate('/dashboard')}
        onClose={() => setShowLeaveModal(false)}
      />
    </div>
      )}
    </div>
  );
};

export default Production;
