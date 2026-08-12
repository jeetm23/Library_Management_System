import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import { HiOutlineSearch, HiOutlineReply, HiOutlineCash } from 'react-icons/hi';

const ReturnBook = () => {
  const [issues, setIssues] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState(null);
  const [returnResult, setReturnResult] = useState(null);

  useEffect(() => {
    fetchIssues();
  }, [search]);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const { data } = await API.get('/issues', {
        params: { status: search ? undefined : 'ISSUED', search, limit: 50 },
      });
      // Filter to only show ISSUED and OVERDUE
      const activeIssues = data.data.items.filter(i => i.status === 'ISSUED' || i.status === 'OVERDUE');
      setIssues(activeIssues);
    } catch (error) {
      toast.error('Failed to fetch issues');
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async (issue) => {
    try {
      setReturning(issue.id);
      const { data } = await API.put(`/issues/${issue.id}/return`);
      setReturnResult(data.data);
      toast.success('Book returned successfully!');
      fetchIssues();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to return book');
    } finally {
      setReturning(null);
    }
  };

  const handlePayFine = async (fineId) => {
    try {
      await API.put(`/fines/${fineId}/pay`);
      toast.success('Fine marked as paid!');
      setReturnResult((prev) => ({
        ...prev,
        fine: { ...prev.fine, isPaid: true },
      }));
    } catch (error) {
      toast.error('Failed to pay fine');
    }
  };

  const getDaysOverdue = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((now - due) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const estimateFine = (dueDate) => {
    const days = getDaysOverdue(dueDate);
    return days * 2; // default ₹2/day
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">
        <span className="gradient-text">Return Book</span>
      </h1>

      {/* Search */}
      <div className="relative max-w-md">
        <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
        <input
          type="text"
          placeholder="Search by student or book..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-12"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Issues List */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : issues.length > 0 ? (
            <div className="space-y-3">
              {issues.map((issue) => {
                const daysOver = getDaysOverdue(issue.dueDate);
                const isOverdue = daysOver > 0;
                const estFine = estimateFine(issue.dueDate);

                return (
                  <div key={issue.id} className="glass-card-hover p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-white font-semibold text-sm">{issue.book?.title}</h3>
                          <span className={issue.status === 'OVERDUE' ? 'badge-danger' : 'badge-info'}>
                            {issue.status}
                          </span>
                        </div>
                        <p className="text-xs text-dark-400 mb-2">by {issue.book?.author}</p>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                          <div>
                            <span className="text-dark-400">Student: </span>
                            <span className="text-white">{issue.student?.name}</span>
                          </div>
                          <div>
                            <span className="text-dark-400">Enrollment: </span>
                            <span className="text-white">{issue.student?.enrollmentNo}</span>
                          </div>
                          <div>
                            <span className="text-dark-400">Issued: </span>
                            <span className="text-white">{new Date(issue.issueDate).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="text-dark-400">Due: </span>
                            <span className={isOverdue ? 'text-red-400 font-semibold' : 'text-white'}>
                              {new Date(issue.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {isOverdue && (
                          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-xs text-red-400">
                              ⚠️ Overdue by {daysOver} days — Estimated fine: <span className="font-bold">₹{estFine}</span>
                            </p>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleReturn(issue)}
                        disabled={returning === issue.id}
                        className="btn-primary text-sm py-2 px-5 flex items-center gap-2 flex-shrink-0"
                      >
                        {returning === issue.id ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <HiOutlineReply className="w-4 h-4" />
                        )}
                        Return
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-card p-12 text-center">
              <HiOutlineReply className="w-12 h-12 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400">No active issues found.</p>
            </div>
          )}
        </div>

        {/* Return Result */}
        <div className="glass-card p-6 h-fit sticky top-24">
          <h3 className="text-white font-semibold mb-4">Return Summary</h3>
          {returnResult ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                <p className="text-emerald-400 font-semibold text-lg">✅ Book Returned</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-400">Book</span>
                  <span className="text-white font-medium">{returnResult.issue?.book?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Student</span>
                  <span className="text-white">{returnResult.issue?.student?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Return Date</span>
                  <span className="text-white">{new Date(returnResult.issue?.returnDate).toLocaleDateString()}</span>
                </div>
              </div>

              {returnResult.fine ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-dark-300 text-sm">Fine Amount</span>
                    <span className="text-red-400 font-bold text-lg">₹{returnResult.fine.amount.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-dark-400 mb-3">Overdue by {returnResult.fine.daysOverdue} days</p>
                  {!returnResult.fine.isPaid && (
                    <button
                      onClick={() => handlePayFine(returnResult.fine.id)}
                      className="btn-success w-full text-sm flex items-center justify-center gap-2"
                    >
                      <HiOutlineCash className="w-4 h-4" />
                      Mark Fine as Paid
                    </button>
                  )}
                  {returnResult.fine.isPaid && (
                    <div className="text-center p-2 bg-emerald-500/10 rounded-lg">
                      <span className="text-emerald-400 text-sm font-semibold">✅ Fine Paid</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center">
                  <p className="text-emerald-400 text-sm">No fine applicable ✨</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <HiOutlineReply className="w-10 h-10 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400 text-sm">Return a book to see the summary here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReturnBook;
