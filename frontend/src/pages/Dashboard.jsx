import { useState, useEffect } from 'react';
import API from '../api/axios';
import {
  HiOutlineBookOpen, HiOutlineUserGroup, HiOutlineClipboardList,
  HiOutlineExclamationCircle, HiOutlineCash, HiOutlineLogin,
} from 'react-icons/hi';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const statsRes = await API.get('/dashboard/stats');
      setStats(statsRes.data.data);
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
    { label: 'Total Books', value: stats?.totalBooks || 0, icon: HiOutlineBookOpen, color: 'bg-primary-600', bgLight: 'bg-primary-50', textColor: 'text-primary-700' },
    { label: 'Active Students', value: stats?.totalStudents || 0, icon: HiOutlineUserGroup, color: 'bg-emerald-600', bgLight: 'bg-emerald-50', textColor: 'text-emerald-700' },
    { label: 'Active Issues', value: stats?.totalIssued || 0, icon: HiOutlineClipboardList, color: 'bg-amber-600', bgLight: 'bg-amber-50', textColor: 'text-amber-700' },
    { label: 'Overdue', value: stats?.overdueCount || 0, icon: HiOutlineExclamationCircle, color: 'bg-red-600', bgLight: 'bg-red-50', textColor: 'text-red-700' },
    { label: 'Fines Collected', value: `₹${stats?.totalFineCollected?.toFixed(0) || 0}`, icon: HiOutlineCash, color: 'bg-violet-600', bgLight: 'bg-violet-50', textColor: 'text-violet-700' },
    { label: 'Today Entries', value: stats?.todayEntries || 0, icon: HiOutlineLogin, color: 'bg-cyan-600', bgLight: 'bg-cyan-50', textColor: 'text-cyan-700' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">
        <span className="gradient-text">Dashboard</span>
      </h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="stat-card animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center shadow-sm`}>
              <card.icon className="w-5 h-5 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            <p className="text-xs text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="glass-card p-6">
        <h2 className="text-gray-900 font-semibold mb-4">Recent Activity</h2>
        {stats?.recentActivity?.length > 0 ? (
          <div className="space-y-3">
            {stats.recentActivity.map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  item.status === 'RETURNED' ? 'bg-emerald-500' :
                  item.status === 'OVERDUE' ? 'bg-red-500' : 'bg-primary-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">{item.student?.name}</span>
                    {' — '}
                    <span className="text-gray-500">{item.book?.title}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
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
          <p className="text-gray-400 text-sm">No recent activity.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
