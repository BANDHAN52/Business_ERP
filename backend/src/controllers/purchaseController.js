const db = require('../config/db');

exports.getPurchases = async (req, res) => {
  try {
    const { search, status, from, to, supplier_id, page = 1, limit = 20 } = req.query;
    let query = `SELECT p.*, s.company_name as supplier_name, u.name as created_by
                 FROM purchases p
                 LEFT JOIN suppliers s ON p.supplier_id = s.id
                 LEFT JOIN users u ON p.user_id = u.id
                 WHERE 1=1`;
    const params = [];
    if (search) { params.push(`%${search}%`); query += ` AND (p.purchase_no ILIKE $${params.length} OR s.company_name ILIKE $${params.length})`; }
    if (status) { params.push(status); query += ` AND p.payment_status = $${params.length}`; }
    if (from)   { params.push(from);   query += ` AND p.created_at >= $${params.length}`; }
    if (to)     { params.push(to);     query += ` AND p.created_at <= $${params.length}::date + 1`; }
    if (supplier_id) { params.push(supplier_id); query += ` AND p.supplier_id = $${params.length}`; }
    query += ` ORDER BY p.created_at DESC LIMIT ${Number(limit)} OFFSET ${(Number(page)-1)*Number(limit)}`;
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getPurchase = async (req, res) => {
  try {
    const { rows: [purchase] } = await db.query(
      `SELECT p.*, s.company_name as supplier_name, u.name as created_by
       FROM purchases p LEFT JOIN suppliers s ON p.supplier_id = s.id
       LEFT JOIN users u ON p.user_id = u.id WHERE p.id = $1`, [req.params.id]
    );
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
    const { rows: items } = await db.query(
      `SELECT pi.*, pr.name as product_name, pr.sku FROM purchase_items pi
       LEFT JOIN products pr ON pi.product_id = pr.id WHERE pi.purchase_id = $1`, [req.params.id]
    );
    res.json({ ...purchase, items });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createPurchase = async (req, res) => {
  const { supplier_id, items, paid_amount = 0, notes } = req.body;
  if (!items || !items.length) return res.status(400).json({ message: 'At least one item required' });
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    let total = 0;
    for (const item of items) total += item.quantity * item.unit_cost;
    const paid = Math.min(paid_amount, total);
    const status = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'due';
    const purchaseNo = 'PO-' + Date.now();
    const { rows: [purchase] } = await client.query(
      `INSERT INTO purchases (purchase_no, supplier_id, user_id, total_amount, paid_amount, payment_status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [purchaseNo, supplier_id || null, req.user.id, total.toFixed(2), paid.toFixed(2), status, notes || null]
    );
    for (const item of items) {
      await client.query(
        `INSERT INTO purchase_items (purchase_id, product_id, quantity, unit_cost, line_total) VALUES ($1,$2,$3,$4,$5)`,
        [purchase.id, item.product_id, item.quantity, item.unit_cost, (item.quantity * item.unit_cost).toFixed(2)]
      );
      await client.query('UPDATE products SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2', [item.quantity, item.product_id]);
    }
    if (supplier_id && status !== 'paid') {
      await client.query('UPDATE suppliers SET total_due = total_due + $1 WHERE id = $2', [(total - paid).toFixed(2), supplier_id]);
    }
    await client.query('COMMIT');
    res.status(201).json({ message: 'Purchase created', purchase_id: purchase.id, purchase_no: purchaseNo });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message });
  } finally { client.release(); }
};

exports.recordPayment = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { amount } = req.body;
    const { rows: [p] } = await client.query('SELECT * FROM purchases WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!p) throw new Error('Purchase not found');
    const newPaid = Math.min(parseFloat(p.paid_amount) + parseFloat(amount), parseFloat(p.total_amount));
    const newStatus = newPaid >= parseFloat(p.total_amount) ? 'paid' : 'partial';
    await client.query('UPDATE purchases SET paid_amount = $1, payment_status = $2 WHERE id = $3', [newPaid.toFixed(2), newStatus, req.params.id]);
    if (p.supplier_id) await client.query('UPDATE suppliers SET total_due = GREATEST(0, total_due - $1) WHERE id = $2', [amount, p.supplier_id]);
    await client.query('COMMIT');
    res.json({ message: 'Payment recorded' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message });
  } finally { client.release(); }
};

exports.cancelPurchase = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [p] } = await client.query('SELECT * FROM purchases WHERE id = $1', [req.params.id]);
    if (!p) throw new Error('Purchase not found');
    const { rows: items } = await client.query('SELECT * FROM purchase_items WHERE purchase_id = $1', [req.params.id]);
    for (const item of items) {
      await client.query('UPDATE products SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2', [item.quantity, item.product_id]);
    }
    if (p.supplier_id) await client.query('UPDATE suppliers SET total_due = GREATEST(0, total_due - $1) WHERE id = $2', [p.due_amount, p.supplier_id]);
    await client.query('DELETE FROM purchases WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ message: 'Purchase cancelled and stock reversed' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message });
  } finally { client.release(); }
};
