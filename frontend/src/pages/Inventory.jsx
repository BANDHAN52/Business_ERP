import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { Modal, Confirm, Badge, PageHeader, SearchInput, Empty, Spinner, Toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function Inventory() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ name:'', sku:'', category_id:'', purchase_price:'', selling_price:'', quantity:'', low_stock_threshold:'10', description:'' });

  const showToast = (message, type='success') => { setToast({message, type}); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { search, category_id: filterCat, low_stock: lowStockOnly || undefined };
      const [p, c] = await Promise.all([api.get('/products', { params }), api.get('/categories')]);
      setProducts(p.data.products); setCategories(c.data);
    } catch { showToast('Failed to load products', 'error'); }
    finally { setLoading(false); }
  }, [search, filterCat, lowStockOnly]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const openAdd = () => { setEditing(null); setForm({ name:'', sku:'', category_id:'', purchase_price:'', selling_price:'', quantity:'', low_stock_threshold:'10', description:'' }); setModal(true); };
  const openEdit = (p) => { setEditing(p); setForm({ name:p.name, sku:p.sku||'', category_id:p.category_id||'', purchase_price:p.purchase_price, selling_price:p.selling_price, quantity:p.quantity, low_stock_threshold:p.low_stock_threshold, description:p.description||'' }); setModal(true); };

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      


      const fd = new FormData();
        const { image, ...rest } = form;
        Object.entries(rest).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
        if (image) fd.append('image', image);



      if (editing) await api.put(`/products/${editing.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      else await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setModal(false); load(); showToast(editing ? 'Product updated' : 'Product created');
    } catch (err) { showToast(err.response?.data?.message || 'Error saving', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await api.delete(`/products/${deleteId}`); setDeleteId(null); load(); showToast('Product deleted'); }
    catch { showToast('Delete failed', 'error'); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <PageHeader title="Inventory" subtitle={`${products.length} products`}
        action={isAdmin && <button className="btn-primary" onClick={openAdd}>+ Add Product</button>} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-48"><SearchInput value={search} onChange={setSearch} placeholder="Search products..." /></div>
        <select className="input w-auto" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
          <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)} className="rounded" />
          Low stock only
        </label>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr><th className="th">Product</th><th className="th">Category</th><th className="th text-right">Buy Price</th><th className="th text-right">Sell Price</th><th className="th text-right">Stock</th>{isAdmin && <th className="th text-right">Actions</th>}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center"><Spinner className="w-6 h-6 mx-auto" /></td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6}><Empty message="No products found" /></td></tr>
              ) : products.map(p => (
                <tr key={p.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="td">
                    <div className="flex items-center gap-3">
                      {p.image_url
                       
                       ? <img src={`http://localhost:5000${p.image_url}`} alt={p.name}
                       
                       className="w-8 h-8 rounded object-cover" />
                        : <div className="w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-400">{p.name[0]}</div>
                      }
                      <div><p className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.name}</p><p className="text-xs text-gray-400">{p.sku || '—'}</p></div>
                    </div>
                  </td>
                  <td className="td text-xs">{p.category_name || '—'}</td>
                  <td className="td text-right text-xs">৳{Number(p.purchase_price).toLocaleString()}</td>
                  <td className="td text-right text-xs font-medium">৳{Number(p.selling_price).toLocaleString()}</td>
                  <td className="td text-right">
                    <span className={`text-xs font-semibold ${p.quantity <= p.low_stock_threshold ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>{p.quantity}</span>
                  </td>
                  {isAdmin && (
                    <td className="td text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(p)} className="btn-sm btn-secondary px-2 py-1">Edit</button>
                        <button onClick={() => setDeleteId(p.id)} className="btn-sm btn-danger px-2 py-1">Del</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Product' : 'Add Product'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Product Name *</label>
              <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div>
              <label className="label">SKU</label>
              <input className="input" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="AUTO-001" />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Purchase Price (৳)</label>
              <input className="input" type="number" min="0" step="0.01" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: e.target.value})} />
            </div>
            <div>
              <label className="label">Selling Price (৳) *</label>
              <input className="input" type="number" min="0" step="0.01" value={form.selling_price} onChange={e => setForm({...form, selling_price: e.target.value})} required />
            </div>
            <div>
              <label className="label">Quantity</label>
              <input className="input" type="number" min="0" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
            </div>
            <div>
              <label className="label">Low Stock Alert</label>
              <input className="input" type="number" min="1" value={form.low_stock_threshold} onChange={e => setForm({...form, low_stock_threshold: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea className="input" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="col-span-2">
              <label className="label">Product Image</label>
              <input type="file" accept="image/*" className="input" onChange={e => setForm({...form, image: e.target.files[0]})} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <Confirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        message="Delete this product? This cannot be undone." loading={deleting} />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
