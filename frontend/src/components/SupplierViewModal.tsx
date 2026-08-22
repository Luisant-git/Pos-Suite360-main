import { X } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface SupplierViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: any;
}

const SupplierViewModal = ({ isOpen, onClose, supplier }: SupplierViewModalProps) => {
  const { formatCurrency } = useSettings();

  if (!isOpen || !supplier) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-md shadow-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        <div className="bg-[#3B82F6] text-white px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-[15px]">Supplier Details</h2>
          <button onClick={onClose} className="hover:bg-blue-600 p-1 rounded transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
            <div className="col-span-1 md:col-span-2 pb-2 border-b border-gray-200 mb-2">
              <h3 className="text-xl font-bold text-blue-600">{supplier.name}</h3>
            </div>
            
            <div>
              <span className="block text-[11px] font-bold text-gray-400 uppercase">Contact Person</span>
              <span className="text-sm font-semibold text-gray-800">{supplier.contactPerson || '-'}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-gray-400 uppercase">Mobile Number</span>
              <span className="text-sm font-semibold text-gray-800">{supplier.phone || '-'}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-gray-400 uppercase">Email</span>
              <span className="text-sm font-semibold text-gray-800">{supplier.email || '-'}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-gray-400 uppercase">State</span>
              <span className="text-sm font-semibold text-gray-800">{supplier.state || '-'}</span>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <span className="block text-[11px] font-bold text-gray-400 uppercase">Address</span>
              <span className="text-sm font-semibold text-gray-800">{supplier.address || '-'}</span>
            </div>
            
            <div className="col-span-1 md:col-span-2 border-t border-gray-200 mt-2 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded border border-blue-100 text-center">
                <span className="block text-[11px] font-bold text-blue-400 uppercase mb-1">Opening Balance</span>
                <span className="text-lg font-bold text-blue-700">{formatCurrency(supplier.openingBalance)} ({supplier.openingBalanceType})</span>
              </div>
              <div className="bg-green-50 p-3 rounded border border-green-100 text-center">
                <span className="block text-[11px] font-bold text-green-500 uppercase mb-1">Credit Days</span>
                <span className="text-lg font-bold text-green-700">{supplier.creditDays || 0} Days</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierViewModal;
