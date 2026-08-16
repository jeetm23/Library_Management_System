import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Books from './pages/Books';
import IssueBook from './pages/IssueBook';
import ReturnBook from './pages/ReturnBook';
import Fines from './pages/Fines';
import RFIDPanel from './pages/RFIDPanel';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-64">
        <Navbar />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout><Dashboard /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/students"
        element={
          <ProtectedRoute>
            <AppLayout><Students /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/books"
        element={
          <ProtectedRoute>
            <AppLayout><Books /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/issue-book"
        element={
          <ProtectedRoute>
            <AppLayout><IssueBook /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/return-book"
        element={
          <ProtectedRoute>
            <AppLayout><ReturnBook /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fines"
        element={
          <ProtectedRoute>
            <AppLayout><Fines /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/rfid"
        element={
          <ProtectedRoute>
            <AppLayout><RFIDPanel /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <AppLayout><Notifications /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <AppLayout><Reports /></AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
