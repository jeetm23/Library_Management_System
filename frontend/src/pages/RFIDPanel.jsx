import { useState, useEffect, useRef } from 'react';
import API from '../api/axios';
import toast from 'react-hot-toast';
import RFIDScanner from '../components/RFIDScanner';
import { HiOutlineLogin, HiOutlineLogout, HiOutlineStatusOnline } from 'react-icons/hi';

const RFIDPanel = () => {
  const [todayLogs, setTodayLogs] = useState([]);
  const [todaySummary, setTodaySummary] = useState({ entries: 0, exits: 0, total: 0 });
  const [lastScan, setLastScan] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchTodayLogs();
    // Auto-refresh every 10 seconds
    intervalRef.current = setInterval(fetchTodayLogs, 10000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const fetchTodayLogs = async () => {
    try {
      const { data } = await API.get('/rfid/logs/today');
      setTodayLogs(data.data.logs);
      setTodaySummary(data.data.summary);
    } catch (error) {
      console.error('Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (rfidUid) => {
    try {
      setScanning(true);
      const { data } = await API.post('/rfid/scan', { rfidUid });
      setLastScan(data.data);
      toast.success(`${data.data.entryType}: ${data.data.student.name}`);
      fetchTodayLogs();
    } catch (error) {
      toast.error(error.response?.data?.message || 'RFID scan failed');
      setLastScan(null);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="page-header">
        <span className="gradient-text">RFID Panel</span>
      </h1>

      {/* Scanner */}
      <RFIDScanner onScan={handleScan} loading={scanning} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Last Scan Result */}
        <div className="glass-card p-6">
          <h3 className="text-white font-semibold mb-4">Last Scan</h3>
          {lastScan ? (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl text-center ${
                lastScan.entryType === 'ENTRY'
                  ? 'bg-emerald-500/10 border border-emerald-500/20'
                  : 'bg-amber-500/10 border border-amber-500/20'
              }`}>
                {lastScan.entryType === 'ENTRY' ? (
                  <HiOutlineLogin className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                ) : (
                  <HiOutlineLogout className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                )}
                <p className={`text-lg font-bold ${
                  lastScan.entryType === 'ENTRY' ? 'text-emerald-400' : 'text-amber-400'
                }`}>
                  {lastScan.entryType}
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-400">Name</span>
                  <span className="text-white font-medium">{lastScan.student.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Enrollment</span>
                  <span className="text-white">{lastScan.student.enrollmentNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Department</span>
                  <span className="text-white">{lastScan.student.department}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">Time</span>
                  <span className="text-white">{new Date(lastScan.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <HiOutlineStatusOnline className="w-10 h-10 text-dark-600 mx-auto mb-3" />
              <p className="text-dark-400 text-sm">Scan an RFID card to see results.</p>
            </div>
          )}
        </div>

        {/* Today's Summary */}
        <div className="lg:col-span-2 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <HiOutlineLogin className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-xl font-bold text-white">{todaySummary.entries}</p>
              <p className="text-xs text-dark-400">Entries Today</p>
            </div>
            <div className="stat-card">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <HiOutlineLogout className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xl font-bold text-white">{todaySummary.exits}</p>
              <p className="text-xs text-dark-400">Exits Today</p>
            </div>
            <div className="stat-card">
              <div className="w-9 h-9 rounded-xl bg-primary-500/15 flex items-center justify-center">
                <HiOutlineStatusOnline className="w-4 h-4 text-primary-400" />
              </div>
              <p className="text-xl font-bold text-white">{todaySummary.entries - todaySummary.exits}</p>
              <p className="text-xs text-dark-400">Currently Inside</p>
            </div>
          </div>

          {/* Live Feed */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold text-sm">Live Entry/Exit Feed</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-dark-400">Auto-refresh 10s</span>
              </div>
            </div>
            {loading ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : todayLogs.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {todayLogs.map((log) => (
                  <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-dark-700/30 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      log.entryType === 'ENTRY'
                        ? 'bg-emerald-500/15'
                        : 'bg-amber-500/15'
                    }`}>
                      {log.entryType === 'ENTRY'
                        ? <HiOutlineLogin className="w-4 h-4 text-emerald-400" />
                        : <HiOutlineLogout className="w-4 h-4 text-amber-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium">{log.student?.name}</p>
                      <p className="text-xs text-dark-400">{log.student?.department} • {log.student?.enrollmentNo}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={log.entryType === 'ENTRY' ? 'badge-success' : 'badge-warning'}>
                        {log.entryType}
                      </span>
                      <p className="text-xs text-dark-400 mt-1">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-dark-400 text-sm text-center py-6">No entries/exits recorded today.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RFIDPanel;
