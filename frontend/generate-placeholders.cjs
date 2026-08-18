const fs = require('fs');
const path = require('path');

const pages = [
  { path: 'master/Products.tsx', name: 'Products' },
  { path: 'master/ProductForm.tsx', name: 'ProductForm' },
  { path: 'master/Brands.tsx', name: 'Brands' },
  { path: 'master/Categories.tsx', name: 'Categories' },
  { path: 'master/Suppliers.tsx', name: 'Suppliers' },
  { path: 'master/Customers.tsx', name: 'Customers' },
  { path: 'master/Units.tsx', name: 'Units' },
  { path: 'master/PaymentModes.tsx', name: 'PaymentModes' },
  { path: 'master/ExpenseCategories.tsx', name: 'ExpenseCategories' },
  { path: 'master/Users.tsx', name: 'Users' },

  { path: 'purchase/PurchaseList.tsx', name: 'PurchaseList' },
  { path: 'purchase/PurchaseEntry.tsx', name: 'PurchaseEntry' },
  { path: 'purchase/PurchaseView.tsx', name: 'PurchaseView' },

  { path: 'sales/SalesList.tsx', name: 'SalesList' },
  { path: 'sales/POS.tsx', name: 'POS' },
  { path: 'sales/SalesHistory.tsx', name: 'SalesHistory' },
  { path: 'sales/SalesView.tsx', name: 'SalesView' },

  { path: 'inventory/Stock.tsx', name: 'Stock' },
  { path: 'inventory/StockLedger.tsx', name: 'StockLedger' },
  { path: 'inventory/StockAdjustment.tsx', name: 'StockAdjustment' },

  { path: 'expenses/ExpenseList.tsx', name: 'ExpenseList' },
  { path: 'expenses/ExpenseEntry.tsx', name: 'ExpenseEntry' },

  { path: 'reports/SalesReport.tsx', name: 'SalesReport' },
  { path: 'reports/PurchaseReport.tsx', name: 'PurchaseReport' },
  { path: 'reports/StockReport.tsx', name: 'StockReport' },
  { path: 'reports/StockLedgerReport.tsx', name: 'StockLedgerReport' },
  { path: 'reports/ExpenseReport.tsx', name: 'ExpenseReport' }
];

pages.forEach(page => {
  const fullPath = path.join('src', 'pages', page.path);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  const content = `const ${page.name} = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-2xl font-bold text-slate-800 mb-4">${page.name}</h2>
      <p className="text-slate-500">This is a placeholder for the ${page.name} page.</p>
    </div>
  );
};

export default ${page.name};
`;
  fs.writeFileSync(fullPath, content);
});
console.log('Placeholders created');
