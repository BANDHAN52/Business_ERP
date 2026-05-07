import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '../services/api';
import { StatCard, Spinner, Empty } from '../components/ui';

const COLORS = ['#185FA5', '#1D9E75', '#EF9F27', '#D4537E', '#7F77DD', '#63b3ed'];

function fmt(n) { return '৳ ' + Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 0 }); }

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [chart, setChart] = useState([]);
  const [catChart, setCatChart] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/sales-chart?days=7'),
      api.get('/dashboard/category-chart'),
      api.get('/dashboard/top-products'),
      api.get('/dashboard/low-stock'),
    ]).then(([s, c, cat, tp, ls]) => {
      setStats(s.data); setChart(c.data); setCatChart(cat.data);
      setTopProducts(tp.data); setLowStock(ls.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner className="w-8 h-8" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {new Date().toLocaleDateString('en-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Sales" value={fmt(stats?.today_sales)}
          sub={`${stats?.today_invoices || 0} invoices`} color="blue"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
        />
        <StatCard label="Month Sales" value={fmt(stats?.month_sales)}
          sub={`${stats?.total_customers || 0} customers`} color="green"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}
        />
        <StatCard label="Total Due" value={fmt(stats?.total_due)}
          sub="From customers" color="red"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>}
        />
        <StatCard label="Low Stock" value={stats?.low_stock || 0}
          sub={`${stats?.total_products || 0} total products`} color="amber"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a1 1 0 00-1 1v10a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1zM4 5h16"/></svg>}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="card p-4 lg:col-span-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Sales This Week</h3>
          {chart.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => [fmt(v), 'Sales']} />
                <Bar dataKey="total" fill="#185FA5" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty message="No sales this week" />}
        </div>
        <div className="card p-4 lg:col-span-2">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Sales by Category</h3>
          {catChart.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={catChart} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={70}>
                  {catChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Tooltip formatter={v => [fmt(v)]} />
              </PieChart>
            </ResponsiveContainer>
          ) : <Empty message="No sales data" />}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="card">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Top Products (30 days)</h3>
          </div>
          {topProducts.length ? (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr><th className="th">Product</th><th className="th text-right">Units</th><th className="th text-right">Revenue</th></tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="td"><div className="font-medium text-xs">{p.name}</div><div className="text-gray-400 text-xs">{p.sku}</div></td>
                    <td className="td text-right text-xs">{p.units_sold}</td>
                    <td className="td text-right text-xs font-medium">{fmt(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty message="No sales data" />}
        </div>

        {/* Low Stock */}
        <div className="card">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Low Stock Alert</h3>
          </div>
          {lowStock.length ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {lowStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.name}</p>
                    <p className="text-xs text-gray-400">{item.category || 'Uncategorized'}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold ${item.quantity <= 3 ? 'text-red-500' : 'text-amber-500'}`}>
                      {item.quantity} left
                    </span>
                    <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                      <div className={`h-full rounded-full ${item.quantity <= 3 ? 'bg-red-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min((item.quantity / item.low_stock_threshold) * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-green-600 dark:text-green-400">✓ All products well stocked</div>
          )}
        </div>
      </div>
    </div>
  );
}
