import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Send,
  Users,
  FileText,
  Mail,
  Settings,
  Menu,
  X,
  AtSign,
  Code,
  LogOut
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Campaigns', href: '/campaigns', icon: Send },
  { name: 'Contacts', href: '/contacts', icon: Users },
  { name: 'Templates', href: '/templates', icon: FileText },
  { name: 'Email Accounts', href: '/email-accounts', icon: AtSign },
  { name: 'Email Logs', href: '/logs', icon: Mail },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-indigo-700 transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-4 flex-shrink-0">
          <span className="text-xl font-bold text-white">Email Blaster</span>
          <button onClick={() => setSidebarOpen(false)} className="text-white">
            <X className="h-6 w-6" />
          </button>
        </div>
        <nav className="mt-4 px-2 space-y-1 flex-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'bg-indigo-800 text-white'
                    : 'text-indigo-100 hover:bg-indigo-600'
                }`
              }
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </NavLink>
          ))}
        </nav>
        <div className="px-2 pb-4">
          <div className="px-4 py-2 text-xs text-indigo-300 truncate">
            {user?.username}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg text-indigo-100 hover:bg-indigo-600 transition-colors"
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-indigo-700 overflow-y-auto">
          <div className="flex items-center h-16 px-4">
            <span className="text-xl font-bold text-white">Email Blaster</span>
          </div>
          <nav className="mt-4 flex-1 px-2 space-y-1">
            {navigation.map((item) => (
              <NavLink
                key={item.name}
                to={item.href}
                end={item.href === '/'}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-indigo-800 text-white'
                      : 'text-indigo-100 hover:bg-indigo-600'
                  }`
                }
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </NavLink>
            ))}
          </nav>
          <div className="px-2 pb-4">
            <div className="px-4 py-2 text-xs text-indigo-300 truncate">
              {user?.username}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-sm font-medium rounded-lg text-indigo-100 hover:bg-indigo-600 transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 flex items-center h-16 bg-white shadow lg:hidden px-4">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500">
            <Menu className="h-6 w-6" />
          </button>
          <span className="ml-4 text-lg font-semibold text-gray-900">Email Blaster</span>
        </div>

        <main className="p-6 min-h-[calc(100vh-4rem)]">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-4 px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500">
            <p>&copy; {new Date().getFullYear()} Email Blaster. All rights reserved.</p>
            <a
              href="https://ahmedammar.dev?blaster"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-200 hover:bg-indigo-100 text-gray-600 hover:text-indigo-600 rounded-md transition-colors"
            >
              <Code className="h-4 w-4" />
              Developer
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
