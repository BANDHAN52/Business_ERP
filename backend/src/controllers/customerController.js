const db = require('../config/db');

exports.getCustomers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    let query = 'SELECT * FROM customers WHERE 1=1';
    const params = [];
    if (search) { params.push(`%${search}%`); query += ` AND (name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1)`; }
    query += ` ORDER BY name LIMIT ${Number(limit)} OFFSET ${(Number(page)-1)*Number(limit)}`;
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getCustomer = async (req, res) => {
  try {
    const { rows: [customer] } = await db.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    const { rows: sales } = await db.query(
      `SELECT id, invoice_no, total_amount, paid_amount, due_amount, payment_status, created_at
       FROM sales WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 10`, [req.params.id]
    );
    res.json({ ...customer, recent_sales: sales });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createCustomer = async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    if (!name) return res.status(400).json({ message: 'Name required' });
    const { rows } = await db.query(
      'INSERT INTO customers (name, phone, email, address) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, phone || null, email || null, address || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    const { rows } = await db.query(
      'UPDATE customers SET name=$1, phone=$2, email=$3, address=$4 WHERE id=$5 RETURNING *',
      [name, phone || null, email || null, address || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Customer not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteCustomer = async (req, res) => {
  try {
    await db.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
    res.json({ message: 'Customer deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
