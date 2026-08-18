import { useLocation } from 'react-router-dom';
import { 
  ShoppingBag, 
  CornerDownLeft, 
  FileText, 
  Box, 
  RefreshCw, 
  TrendingUp, 
  PieChart, 
  Users, 
  Truck 
} from 'lucide-react';

const ReportTabs = () => {
  const location = useLocation();

  const tabs = [
    { name: 'Purchase Report', path: '/reports/purchase', icon: <ShoppingBag size={14} /> },
    { name: 'Purchase Return Report', path: '/reports/purchase-return', icon: <CornerDownLeft size={14} /> },
    { name: 'Sales Report', path: '/reports/sales', icon: <FileText size={14} /> },
    { name: 'Sales Return Report', path: '/reports/sales-return', icon: <CornerDownLeft size={14} /> },
    { name: 'Stock as on Date', path: '/reports/stock', icon: <Box size={14} /> },
    { name: 'Monthly Movement', path: '/reports/monthly-movement', icon: <RefreshCw size={14} /> },
    { name: 'Fast Moving Chart', path: '/reports/fast-moving', icon: <TrendingUp size={14} /> },
    { name: 'Profit & Ledger', path: '/reports/profit-ledger', icon: <PieChart size={14} /> },
    { name: 'Customer Receipts & Dues Report', path: '/reports/customer-receipts', icon: <Users size={14} /> },
    { name: 'Supplier Payments & Payables Report', path: '/reports/supplier-payments', icon: <Truck size={14} /> },
  ];

  const activeTab = tabs.find(tab => location.pathname === tab.path) || tabs[0]; // fallback to first if not found

  return (
    <div className="mb-2">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-[14px] font-bold bg-[#0F172A] text-white shadow-sm border border-[#0F172A]">
        {activeTab.icon}
        <span className="tracking-wide">{activeTab.name}</span>
      </div>
    </div>
  );
};

export default ReportTabs;
