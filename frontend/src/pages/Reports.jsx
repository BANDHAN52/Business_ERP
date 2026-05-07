import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import api from '../services/api';
import { PageHeader, StatCard, Spinner } from '../components/ui';

function fmt(n) { return '৳ ' + Number(n||0).toLocaleString(); }

export default function Reports() {
  const [pl, setPl] = useState(null);
  const [chart, setChart] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const [from, setFrom] = useState(firstDay);
  const [to, setTo]   = useState(today.toISOString().split('T')[0]);

  const load = async () => {
    setLoading(true);
    try {
      const [plRes, chartRes] = await Promise.all([
        api.get('/dashboard/profit-loss', { params: { from, to } }),
        api.get('/dashboard/sales-chart', { params: { days: 30 } }),
      ]);
      setPl(plRes.data); setChart(chartRes.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [from, to]);

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" subtitle="Business performance overview" />

      {/* Date range */}
      <div className="card p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="label">From</label>
          <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <button className="btn-primary" onClick={load}>Apply</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><Spinner className="w-8 h-8" /></div>
      ) : (
        <>
          {/* P&L Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Revenue" value={fmt(pl?.revenue)} color="green"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>}
            />
            <StatCard label="Total Cost" value={fmt(pl?.cost)} color="red"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4"/></svg>}
            />
            <StatCard label="Gross Profit" value={fmt(pl?.gross_profit)} color={pl?.gross_profit >= 0 ? 'green' : 'red'}
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}
            />
            <StatCard label="Profit Margin" value={`${pl?.margin || 0}%`} color="blue"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"/><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"/></svg>}
            />
          </div>

          {/* Sales trend chart */}
          <div className="card p-5">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Sales Trend (Last 30 Days)</h3>
            {chart.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={v => [fmt(v), 'Sales']} />
                  <Line type="monotone" dataKey="total" stroke="#185FA5" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-gray-400 text-center py-12">No data for selected range</p>}
          </div>

          {/* P&L Summary */}
          <div className="card p-5">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Profit & Loss Summary</h3>
            <div className="space-y-3">
              {[
                { label: 'Total Revenue (Sales)', value: pl?.revenue, color: 'text-green-600' },
                { label: 'Total Cost (Purchases)', value: pl?.cost, color: 'text-red-500' },
                { label: 'Gross Profit', value: pl?.gross_profit, color: pl?.gross_profit >= 0 ? 'text-green-600' : 'text-red-500', bold: true },
                { label: 'Profit Margin', value: `${pl?.margin || 0}%`, color: 'text-blue-600', bold: true },
              ].map((row, i) => (
                <div key={i} className={`flex justify-between items-center py-2 ${i > 1 ? 'border-t border-gray-200 dark:border-gray-700' : ''}`}>
                  <span className={`text-sm ${row.bold ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>{row.label}</span>
                  <span className={`text-sm font-semibold ${row.color}`}>{typeof row.value === 'string' ? row.value : fmt(row.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
