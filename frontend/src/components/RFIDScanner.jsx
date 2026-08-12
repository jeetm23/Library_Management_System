import { useState } from 'react';
import { HiOutlineStatusOnline } from 'react-icons/hi';

const RFIDScanner = ({ onScan, loading }) => {
  const [uid, setUid] = useState('');

  const handleScan = (e) => {
    e.preventDefault();
    if (uid.trim()) {
      onScan(uid.trim());
      setUid('');
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
          <HiOutlineStatusOnline className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-sm">RFID Scanner</h3>
          <p className="text-dark-400 text-xs">Enter or scan RFID card UID</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400">Ready</span>
        </div>
      </div>

      <form onSubmit={handleScan} className="flex gap-3">
        <input
          type="text"
          value={uid}
          onChange={(e) => setUid(e.target.value)}
          placeholder="Enter RFID UID (e.g., RFID-001-CS)"
          className="input-field flex-1"
          autoFocus
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!uid.trim() || loading}
          className="btn-primary whitespace-nowrap flex items-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <HiOutlineStatusOnline className="w-4 h-4" />
          )}
          Scan
        </button>
      </form>
    </div>
  );
};

export default RFIDScanner;
