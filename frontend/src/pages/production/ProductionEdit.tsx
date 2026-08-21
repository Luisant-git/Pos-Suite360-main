import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle, Box, Grid, Search, Calendar, Edit, Maximize, Minimize } from 'lucide-react';
import api from '../../services/api';

const ProductionEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [outcomeQuantity, setOutcomeQuantity] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFullTable, setIsFullTable] = useState(false);

  // Fetch ALL productions for the right table
  const { data: allProductions = [], isLoading: isListLoading } = useQuery({
    queryKey: ['productions'],
    queryFn: async () => (await api.get('/production')).data,
  });

  // Fetch SINGLE production for the left form
  const { data: production, isLoading: isItemLoading, isError } = useQuery({
    queryKey: ['production', id],
    queryFn: async () => (await api.get(`/production/${id}`)).data,
    enabled: !!id
  });

  useEffect(() => {
    if (production && id) {
      setOutcomeQuantity(production.outcomeQuantity?.toString() || '0');
    } else {
      setOutcomeQuantity('');
    }
  }, [production, id]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        outcomeQuantity: parseInt(outcomeQuantity || '0')
      };
      return api.patch(`/production/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productions'] });
      queryClient.invalidateQueries({ queryKey: ['production', id] });
      toast.success('Production outcome updated successfully!');
      setOutcomeQuantity('');
      navigate('/production/edit'); // clear selection after save
    },
    onError: (err: any) => {
      console.error(err);
      toast.error('Failed to update production entry');
    }
  });

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!id) return;
    if (!outcomeQuantity || parseInt(outcomeQuantity) < 0) {
      toast.error('Please enter a valid outcome quantity');
      return;
    }
    mutation.mutate();
  };

  const filteredProductions = allProductions.filter((p: any) => 
    p.workName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.finishedProduct?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white absolute inset-0 grid grid-cols-1 xl:grid-cols-3 gap-4 p-4 font-sans overflow-hidden">
      
      {!isFullTable && (
      <div className="xl:col-span-1 bg-white border border-[#E6E9ED] shadow-sm rounded-sm flex flex-col h-full">
        <div className="bg-[#3B82F6] text-white px-4 py-3 flex items-center justify-between rounded-t-sm shrink-0">
          <div className="flex items-center gap-2">
            <Box size={18} />
            <h2 className="font-bold text-[14px] uppercase tracking-wider">Update Outcome</h2>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar flex-1">
          {!id ? (
            <div className="text-center py-10 text-gray-400">
               <Box size={40} className="mx-auto mb-2 opacity-50" />
               <p className="text-sm font-medium">Select a production entry from the table to update its outcome.</p>
            </div>
          ) : isItemLoading ? (
            <div className="text-center py-10 text-gray-500 font-bold">Loading...</div>
          ) : isError || !production ? (
            <div className="text-center py-10 text-red-500 font-bold">Failed to load details.</div>
          ) : (
            <>
              <div>
                <label className="block text-[12px] font-bold text-[#1F2937] mb-1">Production Date</label>
                <input 
                  type="text" 
                  readOnly 
                  value={new Date(production.date).toISOString().split('T')[0]} 
                  className="w-full px-3 py-1.5 border border-[#ccc] rounded shadow-inner bg-gray-100 text-[13px] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[12px] font-bold text-[#1F2937] mb-1">Batch / Work Name</label>
                <input 
                  type="text" 
                  readOnly 
                  value={production.workName} 
                  className="w-full px-3 py-1.5 border border-[#ccc] rounded shadow-inner bg-gray-100 text-[13px] cursor-not-allowed font-bold text-blue-700"
                />
              </div>

              <div className="border border-blue-200 bg-blue-50 p-3 rounded">
                <label className="block text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-2">Raw Material (Intake)</label>
                <div className="flex justify-between items-center bg-white p-2 border border-blue-100 rounded text-[13px]">
                   <span className="font-semibold text-gray-700 truncate mr-2" title={production.rawMaterial?.name}>{production.rawMaterial?.name}</span>
                   <span className="font-bold text-blue-700 shrink-0">{production.intakeQuantity} Qty</span>
                </div>
              </div>

              <div className="border border-emerald-200 bg-emerald-50 p-3 rounded">
                <label className="block text-[11px] font-bold text-emerald-800 uppercase tracking-wider mb-2">Finished Product (Outcome)</label>
                <div className="flex justify-between items-center bg-white p-2 border border-emerald-100 rounded text-[13px] mb-3">
                   <span className="font-semibold text-gray-700 truncate mr-2" title={production.finishedProduct?.name}>{production.finishedProduct?.name}</span>
                </div>
                
                <label className="block text-[12px] font-bold text-[#1F2937] mb-1">Produced Quantity *</label>
                <input 
                  type="number" 
                  value={outcomeQuantity} 
                  onChange={e => setOutcomeQuantity(e.target.value)}
                  onFocus={e => e.target.select()}
                  placeholder="0"
                  className="w-full px-3 py-2 border-2 border-emerald-400 rounded shadow-inner focus:border-emerald-600 outline-none text-[15px] text-right font-black text-emerald-700 bg-white"
                />
                <p className="text-[10px] text-emerald-600 font-medium mt-1 leading-tight">Update the actual number of products produced. Stock will be adjusted automatically.</p>
              </div>

              <button 
                type="submit" 
                disabled={mutation.isPending}
                className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white font-bold py-2.5 rounded flex justify-center items-center gap-2 transition-colors mt-2"
              >
                <CheckCircle size={16} />
                {mutation.isPending ? 'SAVING...' : 'SAVE OUTCOME'}
              </button>
              
              <button 
                type="button" 
                onClick={() => navigate('/production/edit')}
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 rounded flex justify-center items-center gap-2 transition-colors"
              >
                CANCEL EDIT
              </button>
            </>
          )}
        </form>
      </div>
      )}

      <div className={`${isFullTable ? 'xl:col-span-3' : 'xl:col-span-2'} bg-white border border-[#E6E9ED] shadow-sm rounded-sm overflow-hidden flex flex-col h-full`}>
        <div className="bg-[#E5E7EB] border-b border-[#E6E9ED] px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 text-[#1F2937]">
            <Grid size={16} className="text-[#3B82F6]" />
            <h2 className="font-bold text-[14px]">PRODUCTION LIST</h2>
          </div>
          <div className="bg-gray-500 text-white text-[11px] font-bold px-2 py-1 rounded-xl">
            {filteredProductions.length} Entries
          </div>
        </div>
        
        <div className="p-3 border-b border-[#E6E9ED] grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#F9F9F9] items-end">
          <div className="flex-1">
            <label className="block text-[12px] font-bold text-[#1F2937] mb-1">Search:</label>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter by batch / product..."
                className="w-full pl-8 pr-3 py-1.5 border border-[#ccc] rounded outline-none text-[12px]"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" 
              onClick={() => setIsFullTable(!isFullTable)}
              className="justify-center text-[#3B82F6] hover:bg-[#EFF6FF] px-3 py-1.5 rounded text-[12px] font-bold flex items-center gap-2 transition-colors border border-[#3B82F6]"
            >
              {isFullTable ? <Minimize size={14} /> : <Maximize size={14} />}
              {isFullTable ? 'Show Form' : 'View Full Table'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-[12px] whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="bg-[#2A2A2A] text-white font-bold">
                <th className="px-3 py-2 border-r border-[#444] text-center w-10">ID</th>
                <th className="px-3 py-2 border-r border-[#444] w-24 text-center">Date</th>
                <th className="px-3 py-2 border-r border-[#444]">Batch Name</th>
                <th className="px-3 py-2 border-r border-[#444]">Intake (RM)</th>
                <th className="px-3 py-2 border-r border-[#444] text-center w-16">In Qty</th>
                <th className="px-3 py-2 border-r border-[#444]">Outcome (Product)</th>
                <th className="px-3 py-2 border-r border-[#444] text-center w-20">Out Qty</th>
                <th className="px-3 py-2 text-center w-16">Act</th>
              </tr>
            </thead>
            <tbody>
              {isListLoading ? (
                <tr><td colSpan={8} className="text-center p-4">Loading...</td></tr>
              ) : filteredProductions.length === 0 ? (
                <tr><td colSpan={8} className="text-center p-4">No productions found.</td></tr>
              ) : (
                filteredProductions.map((p: any, index: number) => (
                  <tr key={p.id} className={`border-b border-[#E5E7EB] ${p.id.toString() === id ? 'bg-blue-100' : index % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'} hover:bg-blue-50 transition-colors`}>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-center font-bold text-gray-700">#{p.id}</td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-center font-medium">
                      <div className="flex items-center justify-center gap-1">
                        <Calendar size={12} className="text-gray-400" />
                        {new Date(p.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] font-bold text-[#1F2937] break-words whitespace-normal">{p.workName}</td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#3B82F6] font-bold break-words whitespace-normal">{p.rawMaterial?.name}</td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-center font-bold text-blue-700">{p.intakeQuantity}</td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-[#10B981] font-bold break-words whitespace-normal">{p.finishedProduct?.name}</td>
                    <td className="px-3 py-2.5 border-r border-[#E5E7EB] text-center font-bold text-emerald-700">{p.outcomeQuantity}</td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex justify-center gap-2">
                        <button type="button" 
                          onClick={() => {
                            setIsFullTable(false);
                            navigate(`/production/edit/${p.id}`);
                          }}
                          className="text-[#3B82F6] border border-[#3B82F6] rounded px-2 py-1 hover:bg-[#3B82F6] hover:text-white transition-colors flex items-center gap-1 font-bold text-[11px]"
                        >
                          <Edit size={12} /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};

export default ProductionEdit;
