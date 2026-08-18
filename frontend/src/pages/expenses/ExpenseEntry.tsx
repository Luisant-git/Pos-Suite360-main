import { useState } from 'react';
import { X, Briefcase, PlusSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ExpenseEntry = () => {
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentModeId, setPaymentModeId] = useState('');
  const [notes, setNotes] = useState('');
  
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ['expenseCategories'],
    queryFn: async () => (await api.get('/expense-categories')).data
  });

  const { data: paymentModes = [] } = useQuery({
    queryKey: ['paymentModes'],
    queryFn: async () => (await api.get('/payment-modes')).data
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => (await api.get('/expenses')).data
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/expenses', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setAmount('');
      setNotes('');
      setCategoryId('');
      setPaymentModeId('');
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(`Failed to save expense: ${err.message}`);
    }
  });

  const handleSave = () => {
    if (!categoryId || !amount || !paymentModeId) {
      toast.error('Please fill out all required fields');
      return;
    }
    createMutation.mutate({
      date: expenseDate,
      expenseCategoryId: Number(categoryId),
      amount: Number(amount),
      paymentModeId: Number(paymentModeId),
      notes
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#F3F4F6]">
      {/* Header */}
      <div className="bg-[#0f172a] text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Briefcase size={20} className="text-blue-400" />
          <h2 className="text-base font-bold tracking-wide">DAILY EXPENSES MANAGEMENT</h2>
        </div>
        <Link to="/dashboard" className="bg-red-500 hover:bg-red-600 text-white py-1.5 px-4 rounded text-sm flex items-center gap-2 shadow-sm">
          <X size={16} /> Close (Esc)
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-auto overflow-x-auto">
        <div className="flex flex-col lg:flex-row gap-6 h-full">
          
          {/* Left Panel - Log New Expense */}
          <div className="w-full lg:w-1/3 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
              <h3 className="font-bold text-[#0f172a] text-sm flex items-center gap-2">
                LOG NEW EXPENSE
              </h3>
            </div>
            
            <div className="p-4 flex-1 flex flex-col gap-4">
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">Expense Date</label>
                <input 
                  type="date" 
                  value={expenseDate} 
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                />
              </div>
              
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">Expense Category *</label>
                <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="">Select Category...</option>
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">Amount *</label>
                <input 
                  type="number" 
                  value={amount}
                  placeholder="0.00"
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">Payment Mode *</label>
                <select value={paymentModeId} onChange={(e) => setPaymentModeId(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
                  <option value="">Select Payment Mode...</option>
                  {paymentModes.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">Description / Notes</label>
                <textarea 
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none" 
                ></textarea>
              </div>

              <div className="mt-auto pt-4">
                <button onClick={handleSave} disabled={createMutation.isPending} className="w-full bg-[#0f172a] hover:bg-gray-800 text-white font-bold py-2.5 px-4 rounded shadow-md flex justify-center items-center gap-2 transition-colors disabled:opacity-50">
                  <PlusSquare size={18} /> {createMutation.isPending ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - Expense Log History */}
          <div className="w-full lg:w-2/3 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
              <h3 className="font-bold text-[#0f172a] text-sm">
                EXPENSE LOG HISTORY
              </h3>
            </div>

            <div className="p-4 flex-1 overflow-auto overflow-x-auto">
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="text-xs text-white uppercase bg-[#0f172a]">
                    <tr>
                      <th className="px-4 py-3 font-semibold text-center w-32 border-r border-gray-600">Date</th>
                      <th className="px-4 py-3 font-semibold border-r border-gray-600 text-center w-64">Category</th>
                      <th className="px-4 py-3 font-semibold border-r border-gray-600 text-center w-48">Mode</th>
                      <th className="px-4 py-3 font-semibold text-right w-40">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-4 text-gray-500">No expenses logged yet.</td>
                      </tr>
                    ) : (
                      expenses.map((exp: any) => (
                        <tr key={exp.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5 text-center text-gray-700">{new Date(exp.date).toISOString().split('T')[0]}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-900">{exp.category?.name}</td>
                          <td className="px-4 py-2.5 text-gray-600">{exp.paymentMode?.name}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-red-600">₹{Number(exp.amount).toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ExpenseEntry;
