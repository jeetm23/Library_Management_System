import { useState, useEffect } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import {
  HiOutlineBell, HiOutlineFilter, HiOutlineMail,
  HiOutlineEye, HiOutlineEyeOff,
} from 'react-icons/hi';

const typeLabels = {
  DUE_REMINDER: { label: 'Due Reminder', color: 'badge-warning' },
  OVERDUE_ALERT: { label: 'Overdue Alert', color: 'badge-danger' },
  ISSUE_CONFIRMATION: { label: 'Issue Confirmation', color: 'badge-info' },
  RETURN_CONFIRMATION: { label: 'Return Confirmation', color: 'badge-success' },
  FINE_NOTICE: { label: 'Fine Notice', color: 'badge-danger' },
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [page, typeFilter]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 20 };
      if (typeFilter) params.type = typeFilter;
      const { data } = await API.get('/notifications', { params });
      setNotifications(data.data.items);
      setPagination(data.data.pagination);
    } catch (error) {
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const toggleRead = async (id) => {
    try {
      await API.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (error) {
      toast.error('Failed to update notification');
    }
  };

  const sendReminders = async () => {
    try {
      setSending(true);
      const { data } = await API.post('/notifications/send-reminders');
      toast.success(`${data.data.remindersSent} reminder(s) sent!`);
      fetchNotifications();
    } catch (error) {
      toast.error('Failed to send reminders');
    } finally {
      setSending(false);
    }
  };

  const notifTypes = ['DUE_REMINDER', 'OVERDUE_ALERT', 'ISSUE_CONFIRMATION', 'RETURN_CONFIRMATION', 'FINE_NOTICE'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="page-header mb-0">
          <span className="gradient-text">Notifications</span>
        </h1>
        <button
          onClick={sendReminders}
          disabled={sending}
          className="btn-primary flex items-center gap-2"
        >
          {sending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <HiOutlineMail className="w-4 h-4" />
          )}
          Send Today's Reminders
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <HiOutlineFilter className="w-4 h-4 text-gray-500" />
        <button
          onClick={() => { setTypeFilter(''); setPage(1); }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !typeFilter ? 'bg-primary-50 text-primary-600 border border-primary-200' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          All
        </button>
        {notifTypes.map((t) => (
          <button
            key={t}
            onClick={() => { setTypeFilter(t); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              typeFilter === t ? 'bg-primary-50 text-primary-600 border border-primary-200' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            {typeLabels[t]?.label || t}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`glass-card p-4 flex items-start gap-4 transition-all duration-300 ${
                notif.isRead ? 'opacity-60' : ''
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                notif.isRead ? 'bg-gray-100' : 'bg-primary-50'
              }`}>
                <HiOutlineBell className={`w-5 h-5 ${notif.isRead ? 'text-gray-500' : 'text-primary-600'}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={typeLabels[notif.type]?.color || 'badge-neutral'}>
                    {typeLabels[notif.type]?.label || notif.type}
                  </span>
                  {notif.student && (
                    <span className="text-xs text-gray-500">
                      {notif.student.name} ({notif.student.enrollmentNo})
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700">{notif.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(notif.sentAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => toggleRead(notif.id)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
                title={notif.isRead ? 'Mark as unread' : 'Mark as read'}
              >
                {notif.isRead ? (
                  <HiOutlineEyeOff className="w-4 h-4 text-gray-500" />
                ) : (
                  <HiOutlineEye className="w-4 h-4 text-primary-600" />
                )}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-12 text-center">
          <HiOutlineBell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No notifications found.</p>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!pagination.hasPrev} className="btn-secondary text-sm py-2 px-4 disabled:opacity-30">Prev</button>
          <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={!pagination.hasNext} className="btn-secondary text-sm py-2 px-4 disabled:opacity-30">Next</button>
        </div>
      )}
    </div>
  );
};

export default Notifications;
