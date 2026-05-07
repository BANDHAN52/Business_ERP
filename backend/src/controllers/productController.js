const db = require('../config/db');

exports.getProducts = async (req, res) => {
  try {
    const { search, category_id, low_stock, page = 1, limit = 20 } = req.query;
    let query = `SELECT p.*, c.name as category_name
                 FROM products p
                 LEFT JOIN categories c ON p.category_id = c.id
                 WHERE 1=1`;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`;
    }
    if (category_id) {
      params.push(category_id);
      query += ` AND p.category_id = $${params.length}`;
    }
    if (low_stock === 'true') {
      query += ` AND p.quantity <= p.low_stock_threshold`;
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM products p WHERE 1=1` +
      (search ? ` AND (p.name ILIKE '%${search}%' OR p.sku ILIKE '%${search}%')` : '') +
      (category_id ? ` AND p.category_id = ${category_id}` : '') +
      (low_stock === 'true' ? ` AND p.quantity <= p.low_stock_threshold` : ''),
      []
    );

    query += ` ORDER BY p.name LIMIT ${Number(limit)} OFFSET ${(Number(page) - 1) * Number(limit)}`;
    const { rows } = await db.query(query, params);

    res.json({ products: rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, c.name as category_name FROM products p
       LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, sku, category_id, purchase_price, selling_price,
            quantity, low_stock_threshold, description } = req.body;
    if (!name || !selling_price)
      return res.status(400).json({ message: 'Name and selling price required' });

    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const { rows } = await db.query(
      `INSERT INTO products (name, sku, category_id, purchase_price, selling_price,
       quantity, low_stock_threshold, image_url, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, sku || null, category_id || null, purchase_price || 0,
       selling_price, quantity || 0, low_stock_threshold || 10, image_url, description || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'SKU already exists' });
    res.status(500).json({ message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { name, sku, category_id, purchase_price, selling_price,
            quantity, low_stock_threshold, description } = req.body;
    const image_url = req.file ? `/uploads/${req.file.filename}` : undefined;

    const current = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (!current.rows.length) return res.status(404).json({ message: 'Product not found' });

    const { rows } = await db.query(
      `UPDATE products SET name=$1, sku=$2, category_id=$3, purchase_price=$4,
       selling_price=$5, quantity=$6, low_stock_threshold=$7,
       image_url=COALESCE($8, image_url), description=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [name, sku || null, category_id || null, purchase_price || 0,
       selling_price, quantity ?? current.rows[0].quantity,
       low_stock_threshold || 10, image_url || null, description || null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { rows } = await db.query('DELETE FROM products WHERE id=$1 RETURNING id', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Category name required' });
    const { rows } = await db.query(
      'INSERT INTO categories (name, description) VALUES ($1,$2) RETURNING *',
      [name, description || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Category already exists' });
    res.status(500).json({ message: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    await db.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
