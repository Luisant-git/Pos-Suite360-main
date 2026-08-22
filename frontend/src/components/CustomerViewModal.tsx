import { X } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

interface CustomerViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
}

const CustomerViewModal = ({ isOpen, onClose, customer }: CustomerViewModalProps) => {
  const { formatCurrency, settings } = useSettings();

  if (!isOpen || !customer) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-md shadow-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
        <div className="bg-[#3B82F6] text-white px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-[15px]">Customer Details</h2>
          <button onClick={onClose} className="hover:bg-blue-600 p-1 rounded transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
            <div className="col-span-1 md:col-span-2 pb-2 border-b border-gray-200 mb-2">
              <h3 className="text-xl font-bold text-blue-600">{customer.name}</h3>
            </div>
            
            <div>
              <span className="block text-[11px] font-bold text-gray-400 uppercase">Contact Person</span>
              <span className="text-sm font-semibold text-gray-800">{customer.contactPerson || '-'}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-gray-400 uppercase">Mobile Number</span>
              <span className="text-sm font-semibold text-gray-800">{customer.phone || '-'}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-gray-400 uppercase">Email</span>
              <span className="text-sm font-semibold text-gray-800">{customer.email || '-'}</span>
            </div>
            <div>
              <span className="block text-[11px] font-bold text-gray-400 uppercase">State</span>
              <span className="text-sm font-semibold text-gray-800">{customer.state || '-'}</span>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <span className="block text-[11px] font-bold text-gray-400 uppercase">Billing Address</span>
              <span className="text-sm font-semibold text-gray-800">{customer.address || '-'}</span>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <span className="block text-[11px] font-bold text-gray-400 uppercase">Shipping Address</span>
              <span className="text-sm font-semibold text-gray-800">{customer.shippingAddress || '-'}</span>
            </div>

            <div className="col-span-1 md:col-span-2 border-t border-gray-200 mt-2 pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-3 rounded border border-blue-100 text-center">
                <span className="block text-[11px] font-bold text-blue-400 uppercase mb-1">Opening Balance</span>
                <span className="text-lg font-bold text-blue-700">{formatCurrency(customer.openingBalance)} ({customer.openingBalanceType})</span>
              </div>
              <div className="bg-red-50 p-3 rounded border border-red-100 text-center">
                <span className="block text-[11px] font-bold text-red-400 uppercase mb-1">Credit Limit</span>
                <span className="text-lg font-bold text-red-700">{formatCurrency(customer.creditLimit)}</span>
              </div>
              <div className="bg-green-50 p-3 rounded border border-green-100 text-center">
                <span className="block text-[11px] font-bold text-green-500 uppercase mb-1">Credit Days</span>
                <span className="text-lg font-bold text-green-700">{customer.creditDays || 0} Days</span>
              </div>
            </div>
            
            {settings?.enableCustomerWiseRate && customer.productRates && customer.productRates.length > 0 && (
              <div className="col-span-1 md:col-span-2 border-t border-gray-200 mt-4 pt-4">
                <span className="block text-sm font-bold text-indigo-600 mb-2">Custom Product Rates</span>
                <div className="bg-white border border-gray-200 rounded overflow-hidden">
                  <table className="min-w-full text-left text-[12px] whitespace-nowrap">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 border-r border-gray-200 font-semibold text-gray-600">Product Code/Name</th>
                        <th className="px-3 py-2 font-semibold text-gray-600 text-right">Custom Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {customer.productRates.map((pr: any) => (
                        <tr key={pr.id}>
                          <td className="px-3 py-2 border-r border-gray-200 font-bold text-black">{pr.product?.code} - {pr.product?.name}</td>
                          <td className="px-3 py-2 text-right font-bold text-indigo-600">{formatCurrency(pr.rate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerViewModal;
