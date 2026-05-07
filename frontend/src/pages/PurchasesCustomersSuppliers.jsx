// Purchases.jsx
import { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { Modal, Badge, PageHeader, SearchInput, Empty, Spinner, Toast, Confirm } from '../components/ui';

function fmt(n) { return '৳ ' + Number(n||0).toLocaleString(); }

export function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ supplier_id:'', paid_amount:'', notes:'', items:[{product_id:'', quantity:1, unit_cost:0}] });

  const showToast = (msg, type='success') => { setToast({message:msg, type}); setTimeout(()=>setToast(null),3000); };
  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/purchases', { params: { search } }); setPurchases(data); }
    finally { setLoading(false); }
  }, [search]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const openNew = async () => {
    const [p, s] = await Promise.all([api.get('/products', {params:{limit:100}}), api.get('/suppliers')]);
    setProducts(p.data.products); setSuppliers(s.data);
    setForm({ supplier_id:'', paid_amount:'', notes:'', items:[{product_id:'', quantity:1, unit_cost:0}] });
    setModal(true);
  };
  const addItem = () => setForm(f => ({...f, items:[...f.items, {product_id:'', quantity:1, unit_cost:0}]}));
  const removeItem = (i) => setForm(f => ({...f, items: f.items.filter((_,idx)=>idx!==i)}));
  const updateItem = (i, field, val) => {
    setForm(f => { const items=[...f.items]; items[i]={...items[i],[field]:val}; return {...f,items}; });
  };
  const total = form.items.reduce((s,item) => s + item.quantity * item.unit_cost, 0);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/purchases', {...form, paid_amount: parseFloat(form.paid_amount)||0, items: form.items.filter(i=>i.product_id)});
      setModal(false); load(); showToast('Purchase order created!');
    } catch (err) { showToast(err.response?.data?.message||'Error','error'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <PageHeader title="Purchases" subtitle={`${purchases.length} orders`}
        action={<button className="btn-primary" onClick={openNew}>+ New Purchase</button>} />
      <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Search purchase..." /></div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr><th className="th">PO Number</th><th className="th">Supplier</th><th className="th">Date</th><th className="th text-right">Total</th><th className="th text-right">Paid</th><th className="th">Status</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="py-16 text-center"><Spinner className="w-6 h-6 mx-auto" /></td></tr>
              : purchases.length === 0 ? <tr><td colSpan={6}><Empty message="No purchases found" /></td></tr>
              : purchases.map(p => (
                <tr key={p.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="td font-mono text-xs font-medium text-blue-600 dark:text-blue-400">{p.purchase_no}</td>
                  <td className="td text-sm">{p.supplier_name || '—'}</td>
                  <td className="td text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="td text-right text-xs font-medium">{fmt(p.total_amount)}</td>
                  <td className="td text-right text-xs text-green-600">{fmt(p.paid_amount)}</td>
                  <td className="td"><Badge status={p.payment_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="New Purchase Order" size="xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Supplier</label>
              <select className="input" value={form.supplier_id} onChange={e => setForm({...form, supplier_id: e.target.value})}>
                <option value="">No supplier</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount Paid (৳)</label>
              <input className="input" type="number" min="0" step="0.01" value={form.paid_amount} onChange={e => setForm({...form, paid_amount: e.target.value})} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Items</label>
              <button type="button" className="btn-secondary btn-sm" onClick={addItem}>+ Add</button>
            </div>
            {form.items.map((item, i) => (
              <div key={i} className="grid grid-cols-10 gap-2 items-end mb-2">
                <div className="col-span-5">
                  <select className="input" value={item.product_id} onChange={e => updateItem(i,'product_id',e.target.value)} required>
                    <option value="">Select product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <input className="input" type="number" min="1" value={item.quantity} onChange={e => updateItem(i,'quantity',parseInt(e.target.value)||1)} placeholder="Qty" />
                </div>
                <div className="col-span-2">
                  <input className="input" type="number" min="0" step="0.01" value={item.unit_cost} onChange={e => updateItem(i,'unit_cost',parseFloat(e.target.value)||0)} placeholder="Cost" />
                </div>
                <button type="button" onClick={() => removeItem(i)} className="btn-danger btn-sm" disabled={form.items.length===1}>✕</button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
            <input className="input w-48" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notes" />
            <div className="text-right">
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{fmt(total)}</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create PO'}</button>
          </div>
        </form>
      </Modal>
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// Customers.jsx
export function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ name:'', phone:'', email:'', address:'' });

  const showToast = (msg, type='success') => { setToast({message:msg, type}); setTimeout(()=>setToast(null),3000); };
  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/customers', { params: { search } }); setCustomers(data); }
    finally { setLoading(false); }
  }, [search]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const openAdd = () => { setEditing(null); setForm({name:'',phone:'',email:'',address:''}); setModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({name:c.name,phone:c.phone||'',email:c.email||'',address:c.address||''}); setModal(true); };
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await api.put(`/customers/${editing.id}`, form);
      else await api.post('/customers', form);
      setModal(false); load(); showToast(editing ? 'Customer updated' : 'Customer added');
    } catch (err) { showToast(err.response?.data?.message||'Error','error'); }
    finally { setSaving(false); }
  };
  const handleDelete = async () => {
    setDeleting(true);
    try { await api.delete(`/customers/${deleteId}`); setDeleteId(null); load(); showToast('Customer deleted'); }
    catch { showToast('Delete failed','error'); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <PageHeader title="Customers" subtitle={`${customers.length} total`}
        action={<button className="btn-primary" onClick={openAdd}>+ Add Customer</button>} />
      <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Search customers..." /></div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr><th className="th">Name</th><th className="th">Phone</th><th className="th">Email</th><th className="th text-right">Total Due</th><th className="th text-right">Actions</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="py-16 text-center"><Spinner className="w-6 h-6 mx-auto" /></td></tr>
              : customers.length===0 ? <tr><td colSpan={5}><Empty message="No customers found" /></td></tr>
              : customers.map(c => (
                <tr key={c.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="td font-medium">{c.name}</td>
                  <td className="td text-sm text-gray-500">{c.phone || '—'}</td>
                  <td className="td text-sm text-gray-500">{c.email || '—'}</td>
                  <td className="td text-right"><span className={`text-sm font-semibold ${c.total_due > 0 ? 'text-red-500' : 'text-green-600'}`}>{fmt(c.total_due)}</span></td>
                  <td className="td text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(c)} className="btn-sm btn-secondary px-2 py-1">Edit</button>
                      <button onClick={() => setDeleteId(c.id)} className="btn-sm btn-danger px-2 py-1">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Customer' : 'Add Customer'}>
        <form onSubmit={handleSave} className="space-y-3">
          {['name','phone','email','address'].map(f => (
            <div key={f}>
              <label className="label capitalize">{f}{f==='name'?' *':''}</label>
              {f==='address' ? <textarea className="input" rows={2} value={form[f]} onChange={e => setForm({...form,[f]:e.target.value})} />
              : <input className="input" value={form[f]} onChange={e => setForm({...form,[f]:e.target.value})} required={f==='name'} />}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </Modal>
      <Confirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} message="Delete this customer?" loading={deleting} />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// Suppliers.jsx
export function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ company_name:'', contact_person:'', phone:'', email:'', address:'' });

  const showToast = (msg, type='success') => { setToast({message:msg, type}); setTimeout(()=>setToast(null),3000); };
  const load = useCallback(async () => {
    setLoading(true);
    try { const { data } = await api.get('/suppliers', { params: { search } }); setSuppliers(data); }
    finally { setLoading(false); }
  }, [search]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const openAdd = () => { setEditing(null); setForm({company_name:'',contact_person:'',phone:'',email:'',address:''}); setModal(true); };
  const openEdit = (s) => { setEditing(s); setForm({company_name:s.company_name,contact_person:s.contact_person||'',phone:s.phone||'',email:s.email||'',address:s.address||''}); setModal(true); };
  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (editing) await api.put(`/suppliers/${editing.id}`, form);
      else await api.post('/suppliers', form);
      setModal(false); load(); showToast(editing ? 'Supplier updated' : 'Supplier added');
    } catch (err) { showToast(err.response?.data?.message||'Error','error'); }
    finally { setSaving(false); }
  };
  const handleDelete = async () => {
    setDeleting(true);
    try { await api.delete(`/suppliers/${deleteId}`); setDeleteId(null); load(); showToast('Supplier deleted'); }
    catch { showToast('Delete failed','error'); }
    finally { setDeleting(false); }
  };

  return (
    <div>
      <PageHeader title="Suppliers" subtitle={`${suppliers.length} total`}
        action={<button className="btn-primary" onClick={openAdd}>+ Add Supplier</button>} />
      <div className="mb-4"><SearchInput value={search} onChange={setSearch} placeholder="Search suppliers..." /></div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr><th className="th">Company</th><th className="th">Contact</th><th className="th">Phone</th><th className="th text-right">Total Due</th><th className="th text-right">Actions</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="py-16 text-center"><Spinner className="w-6 h-6 mx-auto" /></td></tr>
              : suppliers.length===0 ? <tr><td colSpan={5}><Empty message="No suppliers found" /></td></tr>
              : suppliers.map(s => (
                <tr key={s.id} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                  <td className="td font-medium">{s.company_name}</td>
                  <td className="td text-sm text-gray-500">{s.contact_person || '—'}</td>
                  <td className="td text-sm text-gray-500">{s.phone || '—'}</td>
                  <td className="td text-right"><span className={`text-sm font-semibold ${s.total_due > 0 ? 'text-red-500' : 'text-green-600'}`}>{fmt(s.total_due)}</span></td>
                  <td className="td text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(s)} className="btn-sm btn-secondary px-2 py-1">Edit</button>
                      <button onClick={() => setDeleteId(s.id)} className="btn-sm btn-danger px-2 py-1">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Supplier' : 'Add Supplier'}>
        <form onSubmit={handleSave} className="space-y-3">
          {[['company_name','Company Name',true],['contact_person','Contact Person',false],['phone','Phone',false],['email','Email',false],['address','Address',false]].map(([f,label,req]) => (
            <div key={f}>
              <label className="label">{label}{req?' *':''}</label>
              {f==='address' ? <textarea className="input" rows={2} value={form[f]} onChange={e => setForm({...form,[f]:e.target.value})} />
              : <input className="input" value={form[f]} onChange={e => setForm({...form,[f]:e.target.value})} required={req} />}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </Modal>
      <Confirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete} message="Delete this supplier?" loading={deleting} />
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
}
