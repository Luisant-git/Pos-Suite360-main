import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit, Trash2, CheckCircle, Package, Grid, Maximize, Minimize } from 'lucide-react';
import toast from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import api from '../../services/api';
import { useSettings } from '../../contexts/SettingsContext';
import LeaveConfirmModal from '../../components/LeaveConfirmModal';
import { useNavigate } from 'react-router-dom';

const productSchema = z.object({
  code: z.string().min(1, 'Product Code is required'),
  name: z.string().min(1, 'Product Name is required'),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  unitId: z.string().min(1, 'Unit is required'),
  supplierId: z.string().optional(),
  currentStock: z.coerce.number().min(0).default(0), // Opening Stock
  purchaseRate: z.coerce.number().min(0).default(0),
  wholesaleRate: z.coerce.number().min(0).default(0),
  sellingRate: z.coerce.number().min(0).default(0), // Sale Rate (Retail)
  taxPercent: z.coerce.number().min(0).default(0),  // GST %
  minStock: z.coerce.number().min(0).default(0),    // Min Qty (Alert)
  reorderLevel: z.coerce.number().min(0).default(0),
});

type ProductFormValues = z.infer<typeof productSchema>;

const Products = () => {
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [filterCategory, setFilterCategory] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFullTable, setIsFullTable] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      code: '',
      name: '',
      categoryId: '',
      brandId: '',
      unitId: '',
      supplierId: '',
      currentStock: '' as any,
      purchaseRate: '' as any,
      wholesaleRate: '' as any,
      sellingRate: '' as any,
      taxPercent: '' as any,
      minStock: '' as any,
      reorderLevel: '' as any,
    }
  });

  // Fetch Master Data
  const { settings, formatCurrency } = useSettings();
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: async () => (await api.get('/categories')).data });
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: async () => (await api.get('/brands')).data });
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: async () => (await api.get('/units')).data });
  const { data: suppliers = [] } = useQuery({ queryKey: ['suppliers'], queryFn: async () => (await api.get('/suppliers')).data });
  const { data: taxes = [] } = useQuery({ queryKey: ['taxes'], queryFn: async () => (await api.get('/taxes')).data, enabled: !!settings?.enableTax });

  // Fetch Products
  const { data: products = [], isLoading } = useQuery({ 
    queryKey: ['products'], 
    queryFn: async () => (await api.get('/products')).data 
  });

  const { data: nextCodeData } = useQuery({
    queryKey: ['nextProductCode'],
    queryFn: async () => (await api.get('/products/next-code')).data
  });

  useEffect(() => {
    if (nextCodeData?.code && !editingId) {
      setValue('code', nextCodeData.code);
    }
  }, [nextCodeData, editingId, setValue]);

  const handleAutoCode = async () => {
    try {
      const res = await api.get('/products/next-code');
      if (res.data && res.data.code) {
        setValue('code', res.data.code);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredProducts = products.filter((p: any) => {
    if (filterCategory && p.categoryId.toString() !== filterCategory) return false;
    if (filterBrand && p.brandId?.toString() !== filterBrand) return false;
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !p.code.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const mutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      const payload = {
        ...data,
        categoryId: data.categoryId ? parseInt(data.categoryId) : undefined,
        brandId: data.brandId ? parseInt(data.brandId) : undefined,
        unitId: parseInt(data.unitId || '0'),
        supplierId: data.supplierId ? parseInt(data.supplierId) : undefined,
      };
      
      if (editingId) {
        return api.patch(`/products/${editingId}`, payload);
      }
      return api.post('/products', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['nextProductCode'] });
      toast.success(editingId ? 'Product updated successfully!' : 'Product added successfully!');
      reset();
      setEditingId(null);
    },
    onError: (err: any) => {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to save product. Please check your inputs.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
      setItemToDelete(null);
    },
    onError: (err: any) => {
      console.error(err);
      toast.error('Failed to delete product. It may be in use.');
      setItemToDelete(null);
    }
  });

  const onSubmit = (data: ProductFormValues) => {
    mutation.mutate(data);
  };

  const onFormError = (errors: any) => {
    console.error(errors);
    toast.error('Please fill all mandatory fields correctly.');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F10') {
        e.preventDefault();
        handleSubmit(onSubmit as any, onFormError)();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit, onSubmit]);

  const handleEdit = (product: any) => {
    setIsFullTable(false);
    setEditingId(product.id);
    setValue('code', product.code);
    setValue('name', product.name);
    setValue('categoryId', product.categoryId ? product.categoryId.toString() : '');
    setValue('brandId', product.brandId ? product.brandId.toString() : '');
    setValue('unitId', product.unitId ? product.unitId.toString() : '');
    setValue('supplierId', product.supplierId ? product.supplierId.toString() : '');
    setValue('currentStock', Number(product.currentStock));
    setValue('purchaseRate', Number(product.purchaseRate));
    setValue('wholesaleRate', Number(product.wholesaleRate));
    setValue('sellingRate', Number(product.sellingRate));
    setValue('taxPercent', Number(product.taxPercent || 0));
    setValue('minStock', Number(product.minStock));
    setValue('reorderLevel', Number(product.reorderLevel));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName);
      if (e.key === 'Escape' && !isInput) {
        if (typeof itemToDelete !== 'undefined' && itemToDelete) {
          setItemToDelete(null);
        } else if (isLeaveModalOpen) {
          setIsLeaveModalOpen(false);
        } else {
          setIsLeaveModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [typeof itemToDelete !== 'undefined' ? itemToDelete : null, isLeaveModalOpen, navigate]);

  return (
    <div className="bg-[#F7F7F7] min-h-[calc(100vh-100px)] grid grid-cols-1 xl:grid-cols-3 gap-4">
      
      {/* Left Column: Form */}
      {!isFullTable && (
      <div className="xl:col-span-1 bg-white border border-[#E6E9ED] shadow-sm rounded-sm flex flex-col">
        <div className="bg-[#3B82F6] text-white px-4 py-3 flex items-center justify-between rounded-t-sm">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-white" />
            <h2 className="font-bold text-[14px]">PRODUCT MASTER</h2>
          </div>
          <button type="button" onClick={handleAutoCode} className="bg-[#1E3A8A] text-white text-[11px] px-3 py-1 font-bold rounded">
            Auto Code
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit as any, onFormError)} className="p-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold text-[#1F2937] mb-1">Product Code *</label>
              <input 
                {...register('code')}
                type="text" 
                readOnly
                placeholder="Code"
                className="w-full px-3 py-1.5 border border-[#ccc] rounded shadow-inner focus:border-[#3B82F6] outline-none text-[13px] bg-gray-100"
              />
              {errors.code && <span className="text-red-500 text-xs mt-1 block">{errors.code.message}</span>}
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[#1F2937] mb-1">Unit *</label>
              <select 
                {...register('unitId')}
                className="w-full px-3 py-1.5 border border-[#ccc] rounded shadow-inner focus:border-[#3B82F6] outline-none text-[13px] bg-white"
              >
                <option value="">-- Select --</option>
                {units.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              {errors.unitId && <span className="text-red-500 text-xs mt-1 block">{errors.unitId.message}</span>}
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-bold text-[#1F2937] mb-1">Product Name *</label>
            <input 
              {...register('name')}
              type="text" 
              placeholder="Full item description"
              className="w-full px-3 py-1.5 border border-[#ccc] rounded shadow-inner focus:border-[#3B82F6] outline-none text-[13px]"
            />
            {errors.name && <span className="text-red-500 text-xs mt-1 block">{errors.name.message}</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Category</label>
              <select 
                {...register('categoryId')}
                className="w-full px-3 py-1.5 border border-[#ccc] rounded shadow-inner focus:border-[#3B82F6] outline-none text-[13px] bg-white"
              >
                <option value="">-- Select Category --</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[#1F2937] mb-1">Brand</label>
              <select 
                {...register('brandId')}
                className="w-full px-3 py-1.5 border border-[#ccc] rounded shadow-inner focus:border-[#3B82F6] outline-none text-[13px] bg-white"
              >
                <option value="">-- Select Brand --</option>
                {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-bold text-[#1F2937] mb-1">Default Supplier</label>
              <select 
                {...register('supplierId')}
                className="w-full px-3 py-1.5 border border-[#ccc] rounded shadow-inner focus:border-[#3B82F6] outline-none text-[13px] bg-white"
              >
                <option value="">-- Select Supplier --</option>
                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {settings?.enableTax && (
              <div>
                <label className="block text-[12px] font-bold text-[#1F2937] mb-1">GST % (Tax)</label>
                <select 
                  {...register('taxPercent')}
                  className="w-full px-3 py-1.5 border border-[#ccc] rounded shadow-inner focus:border-[#3B82F6] outline-none text-[13px] bg-white"
                >
                  <option value="0">None (0%)</option>
                  {taxes.map((t: any) => <option key={t.id} value={Number(t.rate)}>{t.name} ({Number(t.rate)}%)</option>)}
                </select>
              </div>
            )}
          </div>

          <h3 className="font-bold text-[13px] text-gray-500 mt-2 uppercase">Pricing Matrix</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] text-[#1F2937] mb-1">Opening Stock</label>
              <input 
                {...register('currentStock')}
                type="number" 
                placeholder="0"
                className="w-full px-3 py-1.5 border border-[#ccc] rounded shadow-inner focus:border-[#3B82F6] outline-none text-[13px] text-right"
              />
            </div>
            <div>
              <label className="block text-[12px] text-[#1F2937] mb-1">Pur Rate</label>
              <input 
                {...register('purchaseRate')}
                type="number" 
                placeholder="0"
                className="w-full px-3 py-1.5 border border-[#ccc] rounded shadow-inner focus:border-[#3B82F6] outline-none text-[13px] text-right"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[#16A34A] mb-1">Wholesale Rate</label>
              <input 
                {...register('wholesaleRate')}
                type="number" 
                placeholder="0"
                className="w-full px-3 py-1.5 border border-[#ccc] rounded shadow-inner focus:border-[#3B82F6] outline-none text-[13px] text-right"
              />
            </div>
            <div>
              <label className="block text-[12px] font-bold text-[#3B82F6] mb-1">Sale Rate (Retail)</label>
              <input 
                {...register('sellingRate')}
                type="number" 
                placeholder="0"
                className="w-full px-3 py-1.5 border border-[#ccc] rounded shadow-inner focus:border-[#3B82F6] outline-none text-[13px] text-right"
              />
            </div>
          </div>

          <h3 className="font-bold text-[13px] text-red-500 mt-2 uppercase">Stock Alerts & Thresholds</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
            <div>
              <label className="block text-[12px] text-[#1F2937] mb-1">Min Qty (Alert)</label>
              <input 
                {...register('minStock')}
                type="number" 
                placeholder="0"
                className="w-full px-3 py-1.5 border border-[#ccc] rounded shadow-inner focus:border-[#3B82F6] outline-none text-[13px] text-right"
              />
            </div>
            <div>
              <label className="block text-[12px] text-[#1F2937] mb-1">Reorder Level</label>
              <input 
                {...register('reorderLevel')}
                type="number" 
                placeholder="0"
                className="w-full px-3 py-1.5 border border-[#ccc] rounded shadow-inner focus:border-[#3B82F6] outline-none text-[13px] text-right"
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={mutation.isPending}
            className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white font-bold py-2.5 rounded flex justify-center items-center gap-2 transition-colors"
          >
            <CheckCircle size={16} />
            {editingId ? 'UPDATE PRODUCT' : 'SAVE PRODUCT (F10)'}
          </button>
          
          {editingId && (
            <button 
              type="button" 
              onClick={() => { reset(); setEditingId(null); }}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 rounded flex justify-center items-center gap-2 transition-colors"
            >
              CANCEL EDIT
            </button>
          )}
        </form>
      </div>
      )}

      {/* Right Column: List */}
      <div className={`${isFullTable ? 'xl:col-span-3' : 'xl:col-span-2'} bg-white border border-[#E6E9ED] shadow-sm rounded-sm overflow-hidden flex flex-col`}>
        <div className="bg-[#E5E7EB] border-b border-[#E6E9ED] px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2 text-[#1F2937]">
            <Grid size={16} className="text-[#3B82F6]" />
            <h2 className="font-bold text-[14px]">MASTER PRODUCT LIST BY CATEGORY & BRAND</h2>
          </div>
          <div className="bg-gray-500 text-white text-[11px] font-bold px-2 py-1 rounded-xl">
            {filteredProducts.length} Products
          </div>
        </div>
        
        {/* Filters */}
        <div className="p-3 border-b border-[#E6E9ED] grid grid-cols-1 md:grid-cols-4 gap-3 bg-[#F9F9F9] items-end">
          <div>
            <label className="block text-[12px] font-bold text-[#1F2937] mb-1">Category:</label>
            <select 
              value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-2 py-1.5 border border-[#ccc] rounded outline-none text-[12px] bg-white"
            >
              <option value="">All Categories</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[#1F2937] mb-1">Brand:</label>
            <select 
              value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)}
              className="w-full px-2 py-1.5 border border-[#ccc] rounded outline-none text-[12px] bg-white"
            >
              <option value="">All Brands</option>
              {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2 flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[12px] font-bold text-[#1F2937] mb-1">Search:</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter by name / code..."
                  className="w-full px-3 py-1.5 border border-[#ccc] rounded outline-none text-[12px]"
                />
              </div>
            </div>
            <button type="button" 
              onClick={() => { setFilterCategory(''); setFilterBrand(''); setSearchTerm(''); }}
              className="px-4 py-1.5 border border-[#ccc] rounded bg-white text-gray-700 text-[12px] font-bold hover:bg-gray-100"
            >
              Reset
            </button>
            <button type="button" 
              onClick={() => setIsFullTable(!isFullTable)}
              className="justify-center text-[#3B82F6] hover:bg-[#EFF6FF] px-3 py-1.5 rounded text-[12px] font-bold flex items-center gap-2 transition-colors border border-[#3B82F6]"
            >
              {isFullTable ? <Minimize size={14} /> : <Maximize size={14} />}
              {isFullTable ? 'Show Form' : 'View Full Table'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto overflow-x-auto">
          <table className="w-full text-left text-[12px] whitespace-nowrap min-w-[800px]">
            <thead>
              <tr className="bg-[#2A2A2A] text-white font-bold">
                <th className="px-3 py-2 border-r border-[#444] text-center w-8">#</th>
                <th className="px-3 py-2 border-r border-[#444]">Code</th>
                <th className="px-3 py-2 border-r border-[#444]">Product Description</th>
                <th className="px-3 py-2 border-r border-[#444]">Category</th>
                <th className="px-3 py-2 border-r border-[#444]">Brand</th>
                <th className="px-3 py-2 border-r border-[#444] text-center">Stock</th>
                {settings?.enableTax && <th className="px-3 py-2 border-r border-[#444] text-center">Tax %</th>}
                <th className="px-3 py-2 border-r border-[#444] text-right">Pur Rate</th>
                <th className="px-3 py-2 border-r border-[#444] text-right">Wholesale</th>
                <th className="px-3 py-2 border-r border-[#444] text-right">Sale Rate</th>
                <th className="px-3 py-2 text-center w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={12} className="text-center p-4">Loading...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={12} className="text-center p-4">No products found.</td></tr>
              ) : (
                filteredProducts.map((product: any, index: number) => (
                  <tr key={product.id} className={`border-b border-[#E5E7EB] ${index % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'} hover:bg-blue-50`}>
                    <td data-label="#" className="px-3 py-2.5 border-r border-[#E5E7EB] text-center font-bold text-gray-700">{index + 1}</td>
                    <td data-label="Code" className="px-3 py-2.5 border-r border-[#E5E7EB] font-bold text-[#3B82F6]">{product.code}</td>
                    <td data-label="Product Description" className="px-3 py-2.5 border-r border-[#E5E7EB] font-bold text-[#1F2937]">{product.name}</td>
                    <td data-label="Category" className="px-3 py-2.5 border-r border-[#E5E7EB]">
                      <span className="text-[10px] font-bold text-[#16A34A] uppercase bg-[#DCFCE7] px-2 py-0.5 rounded">{product.category?.name || '-'}</span>
                    </td>
                    <td data-label="Brand" className="px-3 py-2.5 border-r border-[#E5E7EB]">
                      <span className="text-[10px] font-bold text-[#D97706] uppercase bg-[#FEF3C7] px-2 py-0.5 rounded">{product.brand?.name || '-'}</span>
                    </td>
                    <td data-label="Stock" className="px-3 py-2.5 border-r border-[#E5E7EB] text-center font-bold">
                      {product.currentStock} {product.unit?.name}
                    </td>
                    {settings?.enableTax && (
                      <td data-label="Tax %" className="px-3 py-2.5 border-r border-[#E5E7EB] text-center font-medium">
                        {product.taxPercent ? `${Number(product.taxPercent)}%` : '0%'}
                      </td>
                    )}
                    <td data-label="Pur Rate" className="px-3 py-2.5 border-r border-[#E5E7EB] text-right text-gray-600 font-medium">{formatCurrency(product.purchaseRate)}</td>
                    <td data-label="Wholesale" className="px-3 py-2.5 border-r border-[#E5E7EB] text-right font-bold text-[#16A34A]">{formatCurrency(product.wholesaleRate)}</td>
                    <td data-label="Sale Rate" className="px-3 py-2.5 border-r border-[#E5E7EB] text-right font-bold text-[#3B82F6]">{formatCurrency(product.sellingRate)}</td>
                    <td data-label="Actions" className="px-3 py-2.5 text-center">
                      <div className="flex justify-center gap-2">
                        <button type="button" 
                          onClick={() => handleEdit(product)}
                          className="text-[#3B82F6] border border-[#3B82F6] rounded p-1 hover:bg-[#3B82F6] hover:text-white transition-colors"
                        >
                          <Edit size={12} />
                        </button>
                        <button type="button" 
                          onClick={() => {
                            setItemToDelete(product);
                          }}
                          className="text-[#EF4444] border border-[#EF4444] rounded p-1 hover:bg-[#EF4444] hover:text-white transition-colors"
                        >
                          <Trash2 size={12} />
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
      
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal 
        isOpen={!!itemToDelete}
        itemName={itemToDelete?.name}
        isDeleting={deleteMutation.isPending}
        onConfirm={() => {
          if (itemToDelete) {
            deleteMutation.mutate(itemToDelete.id);
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />
    
      <LeaveConfirmModal 
        isOpen={isLeaveModalOpen} 
        onClose={() => setIsLeaveModalOpen(false)} 
        onConfirm={() => navigate('/dashboard')} 
      />
</div>
  );
};

export default Products;
