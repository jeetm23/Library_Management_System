import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { HiOutlineChartBar, HiOutlineDownload } from 'react-icons/hi';

const Reports = () => {
  const [monthlyData, setMonthlyData] = useState([]);
  const [topBooks, setTopBooks] = useState([]);
  const [overdueStudents, setOverdueStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const [monthlyRes, topBooksRes, overdueRes] = await Promise.all([
        API.get('/reports/monthly-issues'),
        API.get('/reports/top-books').catch(() => ({ data: { data: [] } })),
        API.get('/issues/overdue').catch(() => ({ data: { data: [] } })),
      ]);
      setMonthlyData(monthlyRes.data.data);
      setTopBooks(topBooksRes.data.data || []);
      setOverdueStudents(overdueRes.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (overdueStudents.length === 0) {
      toast.error('No overdue data to export');
      return;
    }

    const headers = ['Student Name', 'Enrollment', 'Department', 'Email', 'Book Title', 'Due Date', 'Days Overdue', 'Fine'];
    const rows = overdueStudents.map((item) => [
      item.student?.name,
      item.student?.enrollmentNo,
      item.student?.department,
      item.student?.email,
      item.book?.title,
      new Date(item.dueDate).toLocaleDateString(),
      item.calculatedDaysOverdue,
      item.calculatedFine,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overdue_students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded!');
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Compute department-wise stats from overdue data
  const deptStats = {};
  overdueStudents.forEach((item) => {
    const dept = item.student?.department || 'Unknown';
    if (!deptStats[dept]) deptStats[dept] = { department: dept, count: 0 };
    deptStats[dept].count++;
  });
  const deptData = Object.values(deptStats);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">
        <span className="gradient-text">Reports</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Issue Trends */}
        <div className="glass-card p-6">
          <h2 className="text-white font-semibold mb-4">Monthly Issue Trends</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="issued" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} name="Issued" />
                <Line type="monotone" dataKey="returned" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Returned" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 10 Books */}
        <div className="glass-card p-6">
          <h2 className="text-white font-semibold mb-4">Top 10 Most Issued Books</h2>
          <div className="h-72">
            {topBooks.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topBooks} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} />
                  <YAxis
                    dataKey="title"
                    type="category"
                    stroke="#64748b"
                    fontSize={10}
                    width={120}
                    tick={{ fill: '#94a3b8' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="issueCount" fill="#8b5cf6" radius={[0, 6, 6, 0]} name="Issues" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-dark-400 text-sm">No issue data available yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Department-wise Stats */}
        <div className="glass-card p-6">
          <h2 className="text-white font-semibold mb-4">Department-wise Overdue Stats</h2>
          {deptData.length > 0 ? (
            <div className="space-y-3">
              {deptData.map((dept, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-dark-300 w-32 flex-shrink-0">{dept.department}</span>
                  <div className="flex-1 bg-dark-900 rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full flex items-center justify-end pr-3"
                      style={{ width: `${Math.min(100, (dept.count / Math.max(...deptData.map(d => d.count))) * 100)}%` }}
                    >
                      <span className="text-xs text-white font-semibold">{dept.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-dark-400 text-sm">No overdue issues by department.</p>
            </div>
          )}
        </div>

        {/* Overdue Students */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Overdue Students</h2>
            <button onClick={downloadCSV} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
              <HiOutlineDownload className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
          {overdueStudents.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {overdueStudents.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-dark-900/50 rounded-xl text-sm">
                  <div>
                    <p className="text-white font-medium">{item.student?.name}</p>
                    <p className="text-xs text-dark-400">
                      {item.book?.title} • {item.calculatedDaysOverdue} days overdue
                    </p>
                  </div>
                  <span className="text-red-400 font-bold">₹{item.calculatedFine}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <HiOutlineChartBar className="w-10 h-10 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400 text-sm">No overdue students! 🎉</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
