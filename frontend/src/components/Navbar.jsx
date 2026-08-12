import { useAuth } from '../context/AuthContext';
import { HiOutlineBell, HiOutlineLogout, HiOutlineUser } from 'react-icons/hi';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-dark-900/80 backdrop-blur-xl border-b border-dark-700/50 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left — Page context */}
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" />
        <span className="text-dark-400 text-sm">System Online</span>
      </div>

      {/* Right — Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Link
          to="/notifications"
          className="relative p-2 rounded-xl text-dark-400 hover:text-white hover:bg-dark-700/50 transition-all duration-300"
        >
          <HiOutlineBell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full" />
        </Link>

        {/* User Info */}
        <div className="flex items-center gap-3 pl-4 border-l border-dark-700">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
            <HiOutlineUser className="w-4 h-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-white leading-none">{user?.name}</p>
            <p className="text-xs text-dark-400 mt-0.5">{user?.role}</p>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 rounded-xl text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-300 ml-1"
            title="Logout"
          >
            <HiOutlineLogout className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
