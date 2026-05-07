const db = require('../config/db');

exports.getStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [todaySales, totalProducts, totalDue, lowStock, totalCustomers, monthSales] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(total_amount),0) as total, COUNT(*) as count FROM sales WHERE DATE(created_at) = $1`, [today]),
      db.query(`SELECT COUNT(*) as count FROM products`),
      db.query(`SELECT COALESCE(SUM(due_amount),0) as total FROM sales WHERE payment_status IN ('due','partial')`),
      db.query(`SELECT COUNT(*) as count FROM products WHERE quantity <= low_stock_threshold`),
      db.query(`SELECT COUNT(*) as count FROM customers`),
      db.query(`SELECT COALESCE(SUM(total_amount),0) as total FROM sales WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`),
    ]);
    res.json({
      today_sales:      parseFloat(todaySales.rows[0].total),
      today_invoices:   parseInt(todaySales.rows[0].count),
      total_products:   parseInt(totalProducts.rows[0].count),
      total_due:        parseFloat(totalDue.rows[0].total),
      low_stock:        parseInt(lowStock.rows[0].count),
      total_customers:  parseInt(totalCustomers.rows[0].count),
      month_sales:      parseFloat(monthSales.rows[0].total),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getSalesChart = async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 90);
    const { rows } = await db.query(`
      SELECT TO_CHAR(DATE(created_at), 'Mon DD') as date,
             DATE(created_at) as raw_date,
             COALESCE(SUM(total_amount), 0) as total,
             COUNT(*) as count
      FROM sales
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY raw_date ASC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getCategoryChart = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT c.name as category, COALESCE(SUM(si.line_total), 0) as total
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE si.sale_id IN (SELECT id FROM sales WHERE created_at >= NOW() - INTERVAL '30 days')
      GROUP BY c.name ORDER BY total DESC LIMIT 6
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getTopProducts = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT p.name, p.sku, SUM(si.quantity) as units_sold, SUM(si.line_total) as revenue
      FROM sale_items si JOIN products p ON si.product_id = p.id
      WHERE si.sale_id IN (SELECT id FROM sales WHERE created_at >= NOW() - INTERVAL '30 days')
      GROUP BY p.id, p.name, p.sku ORDER BY revenue DESC LIMIT 5
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getLowStockItems = async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT p.id, p.name, p.sku, p.quantity, p.low_stock_threshold, c.name as category
      FROM products p LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.quantity <= p.low_stock_threshold ORDER BY p.quantity ASC LIMIT 10
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

exports.getProfitLoss = async (req, res) => {
  try {
    const { from, to } = req.query;
    const fromDate = from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const toDate = to || new Date().toISOString().split('T')[0];
    const [revenue, cost] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(total_amount),0) as total FROM sales WHERE DATE(created_at) BETWEEN $1 AND $2`, [fromDate, toDate]),
      db.query(`SELECT COALESCE(SUM(total_amount),0) as total FROM purchases WHERE DATE(created_at) BETWEEN $1 AND $2`, [fromDate, toDate]),
    ]);
    const rev = parseFloat(revenue.rows[0].total);
    const cos = parseFloat(cost.rows[0].total);
    res.json({ revenue: rev, cost: cos, gross_profit: rev - cos, margin: rev > 0 ? ((rev - cos) / rev * 100).toFixed(1) : 0 });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
