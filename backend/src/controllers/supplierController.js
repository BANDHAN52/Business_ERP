const db = require('../config/db');

exports.getSuppliers = async (req, res) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    let query = 'SELECT * FROM suppliers WHERE 1=1';
    const params = [];
    if (search) { params.push(`%${search}%`); query += ` AND (company_name ILIKE $1 OR contact_person ILIKE $1 OR phone ILIKE $1)`; }
    query += ` ORDER BY company_name LIMIT ${Number(limit)} OFFSET ${(Number(page)-1)*Number(limit)}`;
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getSupplier = async (req, res) => {
  try {
    const { rows: [supplier] } = await db.query('SELECT * FROM suppliers WHERE id = $1', [req.params.id]);
    if (!supplier) return res.status(404).json({ message: 'Supplier not found' });
    const { rows: purchases } = await db.query(
      `SELECT id, purchase_no, total_amount, paid_amount, due_amount, payment_status, created_at
       FROM purchases WHERE supplier_id = $1 ORDER BY created_at DESC LIMIT 10`, [req.params.id]
    );
    res.json({ ...supplier, recent_purchases: purchases });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.createSupplier = async (req, res) => {
  try {
    const { company_name, contact_person, phone, email, address } = req.body;
    if (!company_name) return res.status(400).json({ message: 'Company name required' });
    const { rows } = await db.query(
      'INSERT INTO suppliers (company_name, contact_person, phone, email, address) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [company_name, contact_person || null, phone || null, email || null, address || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.updateSupplier = async (req, res) => {
  try {
    const { company_name, contact_person, phone, email, address } = req.body;
    const { rows } = await db.query(
      'UPDATE suppliers SET company_name=$1, contact_person=$2, phone=$3, email=$4, address=$5 WHERE id=$6 RETURNING *',
      [company_name, contact_person || null, phone || null, email || null, address || null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Supplier not found' });
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.deleteSupplier = async (req, res) => {
  try {
    await db.query('DELETE FROM suppliers WHERE id = $1', [req.params.id]);
    res.json({ message: 'Supplier deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
