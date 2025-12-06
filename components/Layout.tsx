import React, { useEffect, useState } from 'react';
import { Home, MessageSquare, User, Search, PlusCircle, LogOut, LogIn, BarChart3, Briefcase, Cloud, Database } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { store } from '../services/mockStore';
import { isConfigured } from '../services/firebaseConfig';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(store.getCurrentUser());

  useEffect(() => {
      const unsub = store.subscribe((u: any) => setCurrentUser(u));
      return unsub;
  }, []);

  const isActive = (path: string) => location.pathname === path;

  // Filter nav items for guests
  const allNavItems = [
    { icon: Home, label: 'Home', path: '/', public: true },
    { icon: Search, label: 'Explore Skills', path: '/search', public: true },
    { icon: Briefcase, label: 'Project Swap', path: '/projects', public: true },
    { icon: BarChart3, label: 'My Progress', path: '/progress', public: false },
    { icon: MessageSquare, label: 'Messages', path: '/messages', public: false },
    { icon: User, label: 'Profile', path: '/profile', public: false },
  ];

  const navItems = currentUser 
    ? allNavItems 
    : allNavItems.filter(item => item.public);

  const handleLogout = async () => {
      await store.logout();
      navigate('/login');
  };

  const handleLogin = () => {
      navigate('/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0 z-50">
        <div className="p-6">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">S</div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Swaply</h1>
            </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                isActive(item.path)
                  ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
          
          <div className="pt-4 mt-4 border-t border-slate-100">
             <Link 
                to={currentUser ? "/add-skill" : "/login"}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive('/add-skill') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
             >
                 <PlusCircle className="w-5 h-5" />
                 Add Skill
             </Link>
             <Link 
                to={currentUser ? "/add-project" : "/login"}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${isActive('/add-project') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
             >
                 <Briefcase className="w-5 h-5" />
                 Add Project
             </Link>
          </div>
        </nav>

        <div className="px-6 py-2">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold ${isConfigured ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                {isConfigured ? <Cloud className="w-3 h-3" /> : <Database className="w-3 h-3" />}
                {isConfigured ? 'Connected to Cloud' : 'Demo Mode (Local)'}
            </div>
        </div>

        <div className="p-4">
             {currentUser ? (
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full text-left text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200 font-medium"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>
             ) : (
                <button 
                    onClick={handleLogin}
                    className="flex items-center gap-3 px-4 py-3 w-full text-left text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all duration-200 font-bold"
                >
                    <LogIn className="w-5 h-5" />
                    Sign In
                </button>
             )}
        </div>

        {currentUser && (
            <div className="p-4 border-t border-slate-100">
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer">
                    <img src={currentUser.avatar} alt="Me" className="w-10 h-10 rounded-full object-cover" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{currentUser.name}</p>
                        <p className="text-xs text-slate-500 truncate">{currentUser.points} pts</p>
                    </div>
                </div>
            </div>
        )}
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 z-50 flex justify-between items-center">
         <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">S</div>
            <h1 className="text-xl font-bold text-slate-800">Swaply</h1>
        </div>
        {currentUser ? (
            <Link to="/profile">
                <img src={currentUser.avatar} alt="Profile" className="w-8 h-8 rounded-full border border-slate-200" />
            </Link>
        ) : (
            <Link to="/login" className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">
                Sign In
            </Link>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 md:p-8 pt-20 pb-24 px-4 md:pt-8 md:pb-8 max-w-7xl mx-auto w-full">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 flex justify-between items-center z-50 safe-area-bottom">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center gap-1 ${
              isActive(item.path) ? 'text-indigo-600' : 'text-slate-400'
            }`}
          >
            <item.icon className={`w-6 h-6 ${isActive(item.path) ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
         {currentUser ? (
             <button onClick={handleLogout} className="flex flex-col items-center gap-1 text-slate-400">
                <LogOut className="w-6 h-6" />
                 <span className="text-[10px] font-medium">Exit</span>
             </button>
         ) : (
             <Link to="/login" className="flex flex-col items-center gap-1 text-indigo-600">
                <LogIn className="w-6 h-6" />
                 <span className="text-[10px] font-medium">Log In</span>
             </Link>
         )}
      </nav>
    </div>
  );
};

export default Layout;