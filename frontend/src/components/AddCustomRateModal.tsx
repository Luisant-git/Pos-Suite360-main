import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import Select from 'react-select';

interface AddCustomRateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (productId: number, rate: number) => void;
  products: any[];
}

const AddCustomRateModal = ({ isOpen, onClose, onAdd, products }: AddCustomRateModalProps) => {
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [rate, setRate] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setSelectedProductId(null);
      setRate('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = () => {
    if (selectedProductId && rate && Number(rate) > 0) {
      onAdd(selectedProductId, Number(rate));
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-md rounded-md shadow-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-[#3B82F6] text-white px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-[15px]">Add Custom Product Rate</h2>
          <button onClick={onClose} className="hover:bg-blue-600 p-1 rounded transition-colors"><X size={18} /></button>
        </div>
        <div className="p-4">
          <div className="mb-4">
            <label className="block text-[12px] text-[#1F2937] mb-1 font-semibold">Select Product</label>
            <Select
              options={products.map((p: any) => ({ value: p.id, label: `${p.code} - ${p.name}` }))}
              value={selectedProductId ? { value: selectedProductId, label: products.find((p: any) => p.id === selectedProductId)?.name || 'Select Product' } : null}
              onChange={(val: any) => setSelectedProductId(val?.value || null)}
              className="text-[12px]"
              placeholder="Select Product"
              styles={{
                control: (base: any) => ({ ...base, minHeight: '36px', borderColor: '#CBD5E1' }),
                singleValue: (base: any) => ({ ...base, fontWeight: 'bold', color: 'black' }),
                option: (base: any, state: any) => ({ ...base, fontWeight: 'bold', color: state.isSelected ? 'white' : 'black' })
              }}
            />
          </div>
          <div className="mb-6">
            <label className="block text-[12px] text-[#1F2937] mb-1 font-semibold">Custom Rate</label>
            <input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="0.00"
              step="0.01"
              className="w-full px-3 py-2 border border-[#CBD5E1] rounded shadow-inner focus:border-[#3B82F6] outline-none text-[13px] text-right"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded text-[13px] font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!selectedProductId || !rate || Number(rate) <= 0}
              className="px-4 py-2 bg-[#3B82F6] text-white hover:bg-[#2563EB] disabled:bg-blue-300 rounded text-[13px] font-semibold transition-colors flex items-center gap-1"
            >
              <Plus size={16} />
              Add Rate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCustomRateModal;
