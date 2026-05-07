import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { Modal, Confirm, Badge, PageHeader, SearchInput, Empty, Spinner, Toast } from '../components/ui';
import { useAuth } from '../context/AuthContext';

function fmt(n) { return '৳ ' + Number(n||0).toLocaleString(); }

export default function Sales() {
  const { isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ customer_id: '', paid_amount: '', notes: '', items: [{ product_id: '', quantity: 1, unit_price: 0, discount: 0 }] });

  const showToast = (message, type='success') => { setToast({message, type}); setTimeout(() => setToast(null), 3000); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/sales', { params: { search, status } });
      setSales(data);
    } finally { setLoading(false); }
  }, [search, status]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const openNew = async () => {
    const [p, c] = await Promise.all([api.get('/products', { params: { limit: 100 } }), api.get('/customers')]);
    setProducts(p.data.products); setCustomers(c.data);
    setForm({ customer_id: '', paid_amount: '', notes: '', items: [{ product_id: '', quantity: 1, unit_price: 0, discount: 0 }] });
    setModal(true);
  };

  const viewSale = async (id) => {
    const { data } = await api.get(`/sales/${id}`);
    setViewing(data); setViewModal(true);
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { product_id: '', quantity: 1, unit_price: 0, discount: 0 }] }));
  const removeItem = (i) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, val) => {
    setForm(f => {
      const items = [...f.items];
      items[i] = { ...items[i], [field]: val };
      if (field === 'product_id') {
        const p = products.find(p => p.id == val);
        if (p) items[i].unit_price = p.selling_price;
      }
      return { ...f, items };
    });
  };

  const total = form.items.reduce((s, item) => s + (item.quantity * item.unit_price * (1 - (item.discount||0)/100)), 0);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/sales', { ...form, paid_amount: parseFloat(form.paid_amount) || 0, items: form.items.filter(i => i.product_id) });
      setModal(false); load(); showToast('Sale created successfully!');
    } catch (err) { showToast(err.response?.data?.message || 'Error creating sale', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try { await api.delete(`/sales/${deleteId}`); setDeleteId(null); load(); showToast('Sale voided'); }
    catch { showToast('Failed to void sale', 'error'); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <PageHeader title="Sales" subtitle={`${sales.length} records`}
        action={<button className="btn-primary" onClick={openNew}>+ New Sale</button>} />

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex-1 min-w-48"><SearchInput value={search} onChange={setSearch} placeholder="Search invoice..." /></div>
        <select className="input w-auto" value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="paid">Paid</option><option value="partial">Partial</option><option value="due">Due</option>
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr><th className="th">Invoice</th><th className="th">Customer</th><th className="th">Date</th><th className="th text-right">Total</th><th className="th text-right">Paid</th><th className="th text-right">Due</th><th className="th">Status</th><th className="th text-right">Actions</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="py-16 text-center"><Spinner className="w-6 h-6 mx-auto" /></td></tr>
              : sales.length === 0 ? <tr><td colSpan={8}><Empty message="No sales found" /></td></tr>
              : sales.map(s => (
                <tr key={s.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="td font-mono text-xs font-medium text-blue-600 dark:text-blue-400">{s.invoice_no}</td>
                  <td className="td text-sm">{s.customer_name || 'Walk-in'}</td>
                  <td className="td text-xs text-gray-400">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="td text-right text-xs font-medium">{fmt(s.total_amount)}</td>
                  <td className="td text-right text-xs text-green-600">{fmt(s.paid_amount)}</td>
                  <td className="td text-right text-xs text-red-500">{fmt(s.due_amount)}</td>
                  <td className="td"><Badge status={s.payment_status} /></td>
                  <td className="td text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => viewSale(s.id)} className="btn-sm btn-secondary px-2 py-1">View</button>
                      {isAdmin && <button onClick={() => setDeleteId(s.id)} className="btn-sm btn-danger px-2 py-1">Void</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Sale Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="New Sale" size="xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Customer</label>
              <select className="input" value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})}>
                <option value="">Walk-in customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount Paid (৳)</label>
              <input className="input" type="number" min="0" step="0.01" value={form.paid_amount}
                onChange={e => setForm({...form, paid_amount: e.target.value})} placeholder="Leave empty for full due" />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Items</label>
              <button type="button" className="btn-secondary btn-sm" onClick={addItem}>+ Add Item</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <select className="input" value={item.product_id} onChange={e => updateItem(i, 'product_id', e.target.value)} required>
                      <option value="">Select product</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.quantity})</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input className="input" type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value)||1)} placeholder="Qty" />
                  </div>
                  <div className="col-span-2">
                    <input className="input" type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value)||0)} placeholder="Price" />
                  </div>
                  <div className="col-span-2">
                    <input className="input" type="number" min="0" max="100" value={item.discount} onChange={e => updateItem(i, 'discount', parseFloat(e.target.value)||0)} placeholder="Disc%" />
                  </div>
                  <div className="col-span-1">
                    <button type="button" onClick={() => removeItem(i)} className="btn-danger btn-sm w-full" disabled={form.items.length===1}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
            <div>
              <label className="label">Notes</label>
              <input className="input w-64" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional note" />
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Total Amount</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{fmt(total)}</p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Sale'}</button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal open={viewModal} onClose={() => setViewModal(false)} title={`Invoice — ${viewing?.invoice_no}`} size="lg">
        {viewing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-400">Customer: </span><span className="font-medium">{viewing.customer_name || 'Walk-in'}</span></div>
              <div><span className="text-gray-400">Date: </span><span>{new Date(viewing.created_at).toLocaleString()}</span></div>
              <div><span className="text-gray-400">Status: </span><Badge status={viewing.payment_status} /></div>
              <div><span className="text-gray-400">Created by: </span><span>{viewing.created_by}</span></div>
            </div>
            <table className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <thead className="bg-gray-50 dark:bg-gray-800"><tr><th className="th">Product</th><th className="th text-right">Qty</th><th className="th text-right">Price</th><th className="th text-right">Disc</th><th className="th text-right">Total</th></tr></thead>
              <tbody>
                {viewing.items?.map((item, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="td">{item.product_name}</td>
                    <td className="td text-right">{item.quantity}</td>
                    <td className="td text-right">{fmt(item.unit_price)}</td>
                    <td className="td text-right">{item.discount}%</td>
                    <td className="td text-right font-medium">{fmt(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end">
              <div className="space-y-1 text-sm text-right">
                <div className="flex justify-between gap-8"><span className="text-gray-400">Total:</span><span className="font-semibold">{fmt(viewing.total_amount)}</span></div>
                <div className="flex justify-between gap-8"><span className="text-gray-400">Paid:</span><span className="text-green-600">{fmt(viewing.paid_amount)}</span></div>
                <div className="flex justify-between gap-8"><span className="text-gray-400">Due:</span><span className="text-red-500 font-semibold">{fmt(viewing.due_amount)}</span></div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Confirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        message="Void this sale? Stock will be restored." loading={deleting} />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
