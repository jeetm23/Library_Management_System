import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import FineTable from '../components/FineTable';
import { HiOutlineCash, HiOutlineFilter } from 'react-icons/hi';

const Fines = () => {
  const [fines, setFines] = useState([]);
  const [summary, setSummary] = useState({ totalUnpaid: 0 });
  const [filter, setFilter] = useState('');
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFines();
  }, [page, filter]);

  const fetchFines = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (filter) params.paid = filter;
      const { data } = await API.get('/fines', { params });
      setFines(data.data.items);
      setPagination(data.data.pagination);
      setSummary(data.data.summary || { totalUnpaid: 0 });
    } catch (error) {
      toast.error('Failed to fetch fines');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (fine) => {
    if (!confirm(`Mark fine #${fine.id} (₹${fine.amount}) as paid?`)) return;
    try {
      await API.put(`/fines/${fine.id}/pay`);
      toast.success('Fine marked as paid!');
      fetchFines();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to pay fine');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">
        <span className="gradient-text">Fines</span>
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
            <HiOutlineCash className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-red-400">₹{summary.totalUnpaid?.toFixed(2) || '0.00'}</p>
          <p className="text-xs text-dark-400">Total Unpaid Fines</p>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <HiOutlineCash className="w-5 h-5 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-white">{fines.filter(f => !f.isPaid).length}</p>
          <p className="text-xs text-dark-400">Pending Fines</p>
        </div>
        <div className="stat-card">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <HiOutlineCash className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{fines.filter(f => f.isPaid).length}</p>
          <p className="text-xs text-dark-400">Paid Fines</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <HiOutlineFilter className="w-4 h-4 text-dark-400" />
        <div className="flex gap-2">
          {[
            { label: 'All', value: '' },
            { label: 'Unpaid', value: 'false' },
            { label: 'Paid', value: 'true' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => { setFilter(f.value); setPage(1); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f.value
                  ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20'
                  : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <FineTable fines={fines} onPay={handlePay} />
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev} className="btn-secondary text-sm py-2 px-4 disabled:opacity-30">Prev</button>
          <span className="text-sm text-dark-400">Page {pagination.page} of {pagination.totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext} className="btn-secondary text-sm py-2 px-4 disabled:opacity-30">Next</button>
        </div>
      )}
    </div>
  );
};

export default Fines;
