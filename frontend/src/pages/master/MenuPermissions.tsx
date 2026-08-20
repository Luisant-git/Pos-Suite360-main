import { useState, useEffect } from 'react';
import { Check, Save, Shield, Settings2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';

const MODULES = [
  {
    id: 'master',
    name: 'Master / Settings',
    icon: <Settings2 size={18} />,
    permissions: [
      { id: 'master_products', name: 'Products' },
      { id: 'master_brands', name: 'Brands' },
      { id: 'master_categories', name: 'Categories' },
      { id: 'master_units', name: 'Units' },
      { id: 'master_suppliers', name: 'Suppliers' },
      { id: 'master_customers', name: 'Customers' },
      { id: 'master_payment_modes', name: 'Payment Modes' },
      { id: 'master_payment_types', name: 'Payment Types' },
      { id: 'master_expense_categories', name: 'Expense Categories' },
    ]
  },
  {
    id: 'purchases',
    name: 'Purchases',
    icon: <Shield size={18} />,
    permissions: [
      { id: 'purchase_entry', name: 'Purchase Entry' },
      { id: 'purchase_return', name: 'Purchase Return' },
      { id: 'purchase_payments', name: 'Supplier Payments' },
    ]
  },
  {
    id: 'manufacturing',
    name: 'Manufacturing',
    icon: <Shield size={18} />,
    permissions: [
      { id: 'mfg_rm_master', name: 'Raw Material Master' },
      { id: 'mfg_rm_purchase', name: 'Raw Material Purchase' },
      { id: 'mfg_production', name: 'Production Entry' },
    ]
  },
  {
    id: 'sales',
    name: 'Sales',
    icon: <Shield size={18} />,
    permissions: [
      { id: 'sales_pos', name: 'Sales Entry (POS)' },
      { id: 'sales_return', name: 'Sales Return' },
      { id: 'sales_receipts', name: 'Customer Receipts' },
    ]
  },
  {
    id: 'expenses',
    name: 'Expenses',
    icon: <Shield size={18} />,
    permissions: [
      { id: 'expenses_entry', name: 'Expenses' },
    ]
  },
  {
    id: 'reports',
    name: 'Reports',
    icon: <Shield size={18} />,
    permissions: [
      { id: 'reports_sales', name: 'Sales Reports' },
      { id: 'reports_purchase', name: 'Purchase Reports' },
      { id: 'reports_manufacturing', name: 'Manufacturing Reports' },
      { id: 'reports_financial', name: 'Financial & Stock Reports' },
    ]
  }
];

const MenuPermissions = () => {
  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [activePermissions, setActivePermissions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const { data } = await api.get('/roles');
      setRoles(data);
      if (data.length > 0) {
        setSelectedRoleId(data[0].id);
        setActivePermissions(data[0].permissions || []);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load roles');
    }
  };

  const handleRoleChange = async (roleId: number) => {
    setSelectedRoleId(roleId);
    try {
      const { data } = await api.get(`/roles/${roleId}`);
      setActivePermissions(data.permissions || []);
    } catch (error) {
      toast.error('Failed to load permissions');
    }
  };

  const togglePermission = (permId: string) => {
    setActivePermissions(prev => 
      prev.includes(permId) 
        ? prev.filter(p => p !== permId)
        : [...prev, permId]
    );
  };

  const toggleModule = (moduleId: string, isChecked: boolean) => {
    const modulePerms = MODULES.find(m => m.id === moduleId)?.permissions.map(p => p.id) || [];
    if (isChecked) {
      setActivePermissions(prev => [...new Set([...prev, ...modulePerms])]);
    } else {
      setActivePermissions(prev => prev.filter(p => !modulePerms.includes(p)));
    }
  };

  const handleSave = async () => {
    if (!selectedRoleId) return;
    setIsSaving(true);
    try {
      await api.put(`/roles/${selectedRoleId}/permissions`, { permissions: activePermissions });
      toast.success('Permissions saved successfully! Please reload the page to apply changes.');
    } catch (error) {
      toast.error('Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const selectAll = () => {
    const allPerms = MODULES.flatMap(m => m.permissions.map(p => p.id));
    setActivePermissions(allPerms);
  };

  const deselectAll = () => {
    setActivePermissions([]);
  };

  return (
    <div className="absolute inset-0 bg-[#F3F4F6] flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <div className="bg-[#0F172A] text-white px-4 py-2 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div>
          <h1 className="text-base font-bold flex items-center gap-2">
            <Shield className="text-[#3B82F6]" size={16} /> 
            Menu Permissions
          </h1>
          <p className="text-slate-400 text-xs">Control module access</p>
        </div>
        <div className="flex gap-2">
          <button onClick={deselectAll} className="text-[#94A3B8] hover:text-white px-3 py-1.5 rounded font-bold text-xs transition-colors border border-[#334155] hover:bg-[#1E293B]">
            Uncheck All
          </button>
          <button onClick={selectAll} className="text-[#3B82F6] hover:text-white px-3 py-1.5 rounded font-bold text-xs transition-colors border border-[#3B82F6] hover:bg-[#3B82F6]">
            Select All
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-[#10B981] hover:bg-[#059669] text-white px-4 py-1.5 rounded font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
          >
            <Save size={14} /> {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* Role Selector */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Users size={24} />
            </div>
            <div className="flex-1">
              <label className="text-sm font-bold text-gray-500 block mb-1">Select Role to Modify</label>
              <select 
                value={selectedRoleId || ''}
                onChange={(e) => handleRoleChange(Number(e.target.value))}
                className="w-full max-w-md border-0 bg-gray-50 px-4 py-2.5 rounded-lg font-bold text-gray-800 outline-none ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-500 transition-all"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Permissions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MODULES.map(module => {
              const modulePermIds = module.permissions.map(p => p.id);
              const isAllChecked = modulePermIds.length > 0 && modulePermIds.every(id => activePermissions.includes(id));
              const isSomeChecked = modulePermIds.some(id => activePermissions.includes(id));

              return (
                <div key={module.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:border-blue-300 transition-colors">
                  <div className={`px-5 py-3 border-b flex items-center justify-between ${isAllChecked ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-gray-200'}`}>
                    <h3 className={`font-bold flex items-center gap-2 ${isAllChecked ? 'text-blue-700' : 'text-gray-700'}`}>
                      {module.icon} {module.name}
                    </h3>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={isAllChecked}
                        ref={input => {
                          if (input) input.indeterminate = isSomeChecked && !isAllChecked;
                        }}
                        onChange={(e) => toggleModule(module.id, e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  
                  <div className="p-2 flex-1 flex flex-col gap-1">
                    {module.permissions.map(perm => {
                      const isChecked = activePermissions.includes(perm.id);
                      return (
                        <label 
                          key={perm.id} 
                          onClick={(e) => {
                            e.preventDefault(); // Prevent double trigger
                            togglePermission(perm.id);
                          }}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${isChecked ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                        >
                          <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'}`}>
                            {isChecked && <Check size={14} className="text-white" />}
                          </div>
                          <span className={`text-sm font-medium ${isChecked ? 'text-gray-900' : 'text-gray-600'}`}>
                            {perm.name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
};

export default MenuPermissions;
