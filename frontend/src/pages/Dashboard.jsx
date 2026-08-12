import { useState, useEffect } from 'react';
import API from '../api/axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  HiOutlineBookOpen, HiOutlineUserGroup, HiOutlineClipboardList,
  HiOutlineExclamationCircle, HiOutlineCash, HiOutlineLogin, HiOutlineLogout,
} from 'react-icons/hi';

const COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8', '#6d28d9', '#7c3aed', '#5b21b6'];

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, monthlyRes] = await Promise.all([
        API.get('/dashboard/stats'),
        API.get('/reports/monthly-issues'),
      ]);
      setStats(statsRes.data.data);
      setMonthlyData(monthlyRes.data.data);
    } catch (error) {
      console.error('Dashboard fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Books', value: stats?.totalBooks || 0, icon: HiOutlineBookOpen, color: 'from-primary-500 to-indigo-500', shadow: 'shadow-primary-500/20' },
    { label: 'Active Students', value: stats?.totalStudents || 0, icon: HiOutlineUserGroup, color: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20' },
    { label: 'Active Issues', value: stats?.totalIssued || 0, icon: HiOutlineClipboardList, color: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20' },
    { label: 'Overdue', value: stats?.overdueCount || 0, icon: HiOutlineExclamationCircle, color: 'from-red-500 to-rose-500', shadow: 'shadow-red-500/20' },
    { label: 'Fines Collected', value: `₹${stats?.totalFineCollected?.toFixed(0) || 0}`, icon: HiOutlineCash, color: 'from-violet-500 to-purple-500', shadow: 'shadow-violet-500/20' },
    { label: 'Today Entries', value: stats?.todayEntries || 0, icon: HiOutlineLogin, color: 'from-cyan-500 to-blue-500', shadow: 'shadow-cyan-500/20' },
  ];

  const pieData = stats?.booksByCategory?.map((c) => ({
    name: c.category,
    value: c.count,
  })) || [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-dark-800 border border-dark-600 rounded-xl p-3 shadow-xl">
          <p className="text-white font-semibold text-sm mb-1">{label}</p>
          {payload.map((entry, i) => (
            <p key={i} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">
        <span className="gradient-text">Dashboard</span>
      </h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className={`stat-card animate-slide-up`} style={{ animationDelay: `${i * 50}ms` }}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg ${card.shadow}`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
            <p className="text-xs text-dark-400">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart — Monthly Issues */}
        <div className="lg:col-span-2 glass-card p-6">
          <h2 className="text-white font-semibold mb-4">Books Issued Per Month</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="issued" fill="#6366f1" radius={[6, 6, 0, 0]} name="Issued" />
                <Bar dataKey="returned" fill="#22c55e" radius={[6, 6, 0, 0]} name="Returned" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart — Books by Category */}
        <div className="glass-card p-6">
          <h2 className="text-white font-semibold mb-4">Books by Category</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-6">
        <h2 className="text-white font-semibold mb-4">Recent Activity</h2>
        {stats?.recentActivity?.length > 0 ? (
          <div className="space-y-3">
            {stats.recentActivity.map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-dark-700/30 transition-colors">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  item.status === 'RETURNED' ? 'bg-emerald-400' :
                  item.status === 'OVERDUE' ? 'bg-red-400' : 'bg-primary-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">
                    <span className="font-semibold">{item.student?.name}</span>
                    {' — '}
                    <span className="text-dark-300">{item.book?.title}</span>
                  </p>
                  <p className="text-xs text-dark-400 mt-0.5">
                    {item.student?.enrollmentNo} • {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className={
                  item.status === 'RETURNED' ? 'badge-success' :
                  item.status === 'OVERDUE' ? 'badge-danger' : 'badge-info'
                }>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-dark-400 text-sm">No recent activity.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
