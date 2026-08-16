import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineViewGrid,
  HiOutlineUserGroup,
  HiOutlineBookOpen,
  HiOutlineClipboardList,
  HiOutlineReply,
  HiOutlineCash,
  HiOutlineStatusOnline,
  HiOutlineBell,
  HiOutlineChartBar,
} from 'react-icons/hi';

const navItems = [
  { to: '/dashboard', icon: HiOutlineViewGrid, label: 'Dashboard' },
  { to: '/students', icon: HiOutlineUserGroup, label: 'Students' },
  { to: '/books', icon: HiOutlineBookOpen, label: 'Books' },
  { to: '/issue-book', icon: HiOutlineClipboardList, label: 'Issue Book' },
  { to: '/return-book', icon: HiOutlineReply, label: 'Return Book' },
  { to: '/fines', icon: HiOutlineCash, label: 'Fines' },
  { to: '/rfid', icon: HiOutlineStatusOnline, label: 'RFID Panel' },
  { to: '/notifications', icon: HiOutlineBell, label: 'Notifications' },
  { to: '/reports', icon: HiOutlineChartBar, label: 'Reports' },
];

const Sidebar = () => {
  const { user } = useAuth();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-gray-200 flex flex-col z-40">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-200">
        <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center shadow-sm">
          <HiOutlineBookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-900 leading-none">Library</h1>
          <p className="text-[10px] text-gray-400 mt-0.5 uppercase tracking-widest">Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group ${
                isActive
                  ? 'bg-primary-50 text-primary-700 border border-primary-200'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom — User badge */}
      <div className="p-4 border-t border-gray-200">
        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-[10px] text-gray-400">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
