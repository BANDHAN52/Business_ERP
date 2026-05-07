const db = require('../config/db');

exports.getSales = async (req, res) => {
  try {
    const { search, status, from, to, customer_id, page = 1, limit = 20 } = req.query;
    let query = `SELECT s.*, c.name as customer_name, u.name as created_by
                 FROM sales s
                 LEFT JOIN customers c ON s.customer_id = c.id
                 LEFT JOIN users u ON s.user_id = u.id
                 WHERE 1=1`;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (s.invoice_no ILIKE $${params.length} OR c.name ILIKE $${params.length})`;
    }
    if (status) { params.push(status); query += ` AND s.payment_status = $${params.length}`; }
    if (from)   { params.push(from);   query += ` AND s.created_at >= $${params.length}`; }
    if (to)     { params.push(to);     query += ` AND s.created_at <= $${params.length}::date + 1`; }
    if (customer_id) { params.push(customer_id); query += ` AND s.customer_id = $${params.length}`; }

    query += ` ORDER BY s.created_at DESC LIMIT ${Number(limit)} OFFSET ${(Number(page)-1)*Number(limit)}`;
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getSale = async (req, res) => {
  try {
    const { rows: [sale] } = await db.query(
      `SELECT s.*, c.name as customer_name, c.phone as customer_phone,
              u.name as created_by
       FROM sales s
       LEFT JOIN customers c ON s.customer_id = c.id
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    const { rows: items } = await db.query(
      `SELECT si.*, p.name as product_name, p.sku
       FROM sale_items si LEFT JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = $1`,
      [req.params.id]
    );
    res.json({ ...sale, items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createSale = async (req, res) => {
  const { customer_id, items, paid_amount = 0, notes } = req.body;
  if (!items || !items.length)
    return res.status(400).json({ message: 'At least one item required' });

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Check stock
    for (const item of items) {
      const { rows } = await client.query(
        'SELECT quantity, name FROM products WHERE id = $1 FOR UPDATE', [item.product_id]
      );
      if (!rows.length) throw new Error(`Product ${item.product_id} not found`);
      if (rows[0].quantity < item.quantity)
        throw new Error(`Insufficient stock for "${rows[0].name}". Available: ${rows[0].quantity}`);
    }

    // Calculate total
    let total = 0;
    for (const item of items) {
      total += item.quantity * item.unit_price * (1 - (item.discount || 0) / 100);
    }

    const paid = Math.min(paid_amount, total);
    const status = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'due';
    const invoiceNo = 'INV-' + Date.now();

    const { rows: [sale] } = await client.query(
      `INSERT INTO sales (invoice_no, customer_id, user_id, total_amount, paid_amount, payment_status, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [invoiceNo, customer_id || null, req.user.id, total.toFixed(2), paid.toFixed(2), status, notes || null]
    );

    for (const item of items) {
      const lineTotal = item.quantity * item.unit_price * (1 - (item.discount || 0) / 100);
      await client.query(
        `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount, line_total)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [sale.id, item.product_id, item.quantity, item.unit_price, item.discount || 0, lineTotal.toFixed(2)]
      );
      await client.query(
        'UPDATE products SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    // Update customer due
    if (customer_id && status !== 'paid') {
      await client.query(
        'UPDATE customers SET total_due = total_due + $1 WHERE id = $2',
        [(total - paid).toFixed(2), customer_id]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Sale created', sale_id: sale.id, invoice_no: invoiceNo });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
};

exports.recordPayment = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { amount } = req.body;
    const { rows: [sale] } = await client.query(
      'SELECT * FROM sales WHERE id = $1 FOR UPDATE', [req.params.id]
    );
    if (!sale) throw new Error('Sale not found');

    const newPaid = parseFloat(sale.paid_amount) + parseFloat(amount);
    const capped = Math.min(newPaid, parseFloat(sale.total_amount));
    const newStatus = capped >= parseFloat(sale.total_amount) ? 'paid' : 'partial';

    await client.query(
      'UPDATE sales SET paid_amount = $1, payment_status = $2 WHERE id = $3',
      [capped.toFixed(2), newStatus, req.params.id]
    );

    if (sale.customer_id) {
      await client.query(
        'UPDATE customers SET total_due = GREATEST(0, total_due - $1) WHERE id = $2',
        [amount, sale.customer_id]
      );
    }

    await client.query('COMMIT');
    res.json({ message: 'Payment recorded', new_status: newStatus });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
};

exports.voidSale = async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: [sale] } = await client.query('SELECT * FROM sales WHERE id = $1', [req.params.id]);
    if (!sale) throw new Error('Sale not found');

    const { rows: items } = await client.query('SELECT * FROM sale_items WHERE sale_id = $1', [req.params.id]);
    for (const item of items) {
      await client.query(
        'UPDATE products SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    if (sale.customer_id) {
      await client.query(
        'UPDATE customers SET total_due = GREATEST(0, total_due - $1) WHERE id = $2',
        [sale.due_amount, sale.customer_id]
      );
    }

    await client.query('DELETE FROM sales WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');
    res.json({ message: 'Sale voided and stock restored' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ message: err.message });
  } finally {
    client.release();
  }
};
