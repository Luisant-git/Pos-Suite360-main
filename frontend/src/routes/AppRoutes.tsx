import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';
import Login from '../pages/auth/Login';
import Dashboard from '../pages/dashboard/Dashboard';
import QuickStart from '../pages/QuickStart';

// Master
import Products from '../pages/master/Products';
import Brands from '../pages/master/Brands';
import Categories from '../pages/master/Categories';
import Suppliers from '../pages/master/Suppliers';
import Customers from '../pages/master/Customers';
import Units from '../pages/master/Units';
import PaymentModes from '../pages/master/PaymentModes';
import PaymentTypes from '../pages/master/PaymentTypes';
import ExpenseCategories from '../pages/master/ExpenseCategories';
import Users from '../pages/master/Users';
import Taxes from '../pages/master/Taxes';

// Purchase
import PurchaseList from '../pages/purchase/PurchaseList';
import PurchaseEntry from '../pages/purchase/PurchaseEntry';
import PurchaseView from '../pages/purchase/PurchaseView';
import SupplierPayments from '../pages/purchase/SupplierPayments';
import PurchaseReturn from '../pages/purchase/PurchaseReturn';

// Sales
import SalesList from '../pages/sales/SalesList';
import POS from '../pages/sales/POS';
import SalesHistory from '../pages/sales/SalesHistory';
import SalesView from '../pages/sales/SalesView';
import CustomerReceipts from '../pages/sales/CustomerReceipts';
import SalesReturn from '../pages/sales/SalesReturn';

// Inventory
import Stock from '../pages/inventory/Stock';
import StockLedger from '../pages/inventory/StockLedger';
import StockAdjustment from '../pages/inventory/StockAdjustment';

// Expenses
import ExpenseList from '../pages/expenses/ExpenseList';
import ExpenseEntry from '../pages/expenses/ExpenseEntry';

// Reports
import SalesReport from '../pages/reports/SalesReport';
import SalesReturnReport from '../pages/reports/SalesReturnReport';
import PurchaseReport from '../pages/reports/PurchaseReport';
import PurchaseReturnReport from '../pages/reports/PurchaseReturnReport';
import StockReport from '../pages/reports/StockReport';
import StockLedgerReport from '../pages/reports/StockLedgerReport';
import ExpenseReport from '../pages/reports/ExpenseReport';
import ProfitLossReport from '../pages/reports/ProfitLossReport';

// Settings
import Settings from '../pages/Settings';

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>
      
      <Route element={<MainLayout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/quick-start" element={<QuickStart />} />
        
        {/* Master Routes */}
        <Route path="/master/products" element={<Products />} />
        <Route path="/master/brands" element={<Brands />} />
        <Route path="/master/categories" element={<Categories />} />
        <Route path="/master/suppliers" element={<Suppliers />} />
        <Route path="/master/customers" element={<Customers />} />
        <Route path="/master/units" element={<Units />} />
        <Route path="/master/payment-modes" element={<PaymentModes />} />
        <Route path="/master/payment-types" element={<PaymentTypes />} />
        <Route path="/master/expense-categories" element={<ExpenseCategories />} />
        <Route path="/master/users" element={<Users />} />
        <Route path="/master/taxes" element={<Taxes />} />

        {/* Purchase Routes */}
        <Route path="/purchase" element={<PurchaseList />} />
        <Route path="/purchase/new" element={<PurchaseEntry />} />
        <Route path="/purchase/payments" element={<SupplierPayments />} />
        <Route path="/purchase/return" element={<PurchaseReturn />} />
        <Route path="/purchase/:id" element={<PurchaseView />} />

        {/* Sales Routes */}
        <Route path="/sales" element={<SalesList />} />
        <Route path="/sales/pos" element={<POS />} />
        <Route path="/sales/receipts" element={<CustomerReceipts />} />
        <Route path="/sales/return" element={<SalesReturn />} />
        <Route path="/sales/history" element={<SalesHistory />} />
        <Route path="/sales/:id" element={<SalesView />} />

        {/* Inventory Routes */}
        <Route path="/inventory/stock" element={<Stock />} />
        <Route path="/inventory/ledger" element={<StockLedger />} />
        <Route path="/inventory/adjustment" element={<StockAdjustment />} />

        {/* Expense Routes */}
        <Route path="/expenses" element={<ExpenseList />} />
        <Route path="/expenses/new" element={<ExpenseEntry />} />
        <Route path="/expenses/history" element={<ExpenseList />} />

        {/* Report Routes */}
        <Route path="/reports/sales" element={<SalesReport />} />
        <Route path="/reports/sales-return" element={<SalesReturnReport />} />
        <Route path="/reports/purchase" element={<PurchaseReport />} />
        <Route path="/reports/purchase-return" element={<PurchaseReturnReport />} />
        <Route path="/reports/stock" element={<StockReport />} />
        <Route path="/reports/stock-ledger" element={<StockLedgerReport />} />
        <Route path="/reports/expenses" element={<ExpenseReport />} />
        <Route path="/reports/profit-ledger" element={<ProfitLossReport />} />

        {/* Settings */}
        <Route path="/settings" element={<Settings />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
