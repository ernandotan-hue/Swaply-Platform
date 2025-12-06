import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import SearchPage from './pages/Search';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import AddSkill from './pages/AddSkill';
import Projects from './pages/Projects';
import AddProject from './pages/AddProject';
import SwapProgress from './pages/SwapProgress';
import CompleteSwap from './pages/CompleteSwap';
import ReviewProject from './pages/ReviewProject';
import CollaborationWorkspace from './components/CollaborationWorkspace';
import { store } from './services/mockStore';
import { UserPlus, LogIn, Mail, Lock, User as UserIcon, MapPin, Loader } from 'lucide-react';

const AuthPage: React.FC = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        location: '',
        bio: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                const result = await store.login(formData.email, formData.password);
                if (result.success) {
                    navigate('/');
                } else {
                    setError(result.message || 'Login failed');
                }
            } else {
                if (!formData.name || !formData.email || !formData.password) {
                    setError('Please fill in all required fields.');
                    setLoading(false);
                    return;
                }
                
                // Directly call registerWithPassword as it is available in StoreService
                await store.registerWithPassword({
                    name: formData.name,
                    email: formData.email,
                    location: formData.location || 'Unknown',
                    bio: formData.bio || 'New member.'
                }, formData.password);
                
                navigate('/');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl flex overflow-hidden min-h-[600px] border border-slate-100">
                <div className="hidden md:flex w-1/2 bg-indigo-600 p-12 flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10 text-white">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-indigo-600 font-bold text-2xl mb-8">S</div>
                        <h1 className="text-4xl font-bold mb-6">Exchange Skills.<br/>Grow Together.</h1>
                        <p className="text-indigo-100 text-lg">Join a community of 10,000+ swappers.</p>
                    </div>
                    {/* Decor */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-3xl -mr-16 -mt-16 opacity-50"></div>
                </div>

                <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
                    <p className="text-slate-500 mb-8">{isLogin ? 'Enter your details.' : 'Start your journey.'}</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Location</label>
                                    <input 
                                        type="text" 
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                                        placeholder="New York, USA"
                                        value={formData.location}
                                        onChange={e => setFormData({...formData, location: e.target.value})}
                                    />
                                </div>
                            </>
                        )}
                        
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                            <input 
                                type="email" 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                                placeholder="name@example.com"
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                            <input 
                                type="password" 
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={e => setFormData({...formData, password: e.target.value})}
                            />
                        </div>

                        {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

                        <button 
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2 mt-4"
                        >
                            {loading ? <Loader className="w-5 h-5 animate-spin" /> : (isLogin ? <><LogIn className="w-5 h-5" /> Sign In</> : <><UserPlus className="w-5 h-5" /> Create Account</>)}
                        </button>
                    </form>
                    <div className="mt-8 text-center">
                        <p className="text-slate-500 text-sm">
                            <button onClick={() => setIsLogin(!isLogin)} className="font-bold text-indigo-600 hover:text-indigo-800 transition">
                                {isLogin ? 'Create an account' : 'Log in instead'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState(store.getCurrentUser());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Subscribe to auth changes
        const unsubscribe = store.subscribe((u: any) => {
            setUser(u);
            setLoading(false);
        });
        // Initial check
        if (store.getCurrentUser()) {
             setLoading(false);
        } else {
            // Give auth a moment to initialize if needed
             setTimeout(() => setLoading(false), 1000); 
        }
        return unsubscribe;
    }, []);

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-indigo-600" /></div>;
    if (!user) return <Navigate to="/login" replace />;
    return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/search" element={<Layout><SearchPage /></Layout>} />
        <Route path="/projects" element={<Layout><Projects /></Layout>} />

        <Route path="/progress" element={<ProtectedRoute><Layout><SwapProgress /></Layout></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Layout><Chat /></Layout></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
        <Route path="/add-skill" element={<ProtectedRoute><Layout><AddSkill /></Layout></ProtectedRoute>} />
        <Route path="/add-project" element={<ProtectedRoute><Layout><AddProject /></Layout></ProtectedRoute>} />
        <Route path="/complete-swap/:swapId" element={<ProtectedRoute><Layout><CompleteSwap /></Layout></ProtectedRoute>} />
        <Route path="/review-project/:swapId" element={<ProtectedRoute><Layout><ReviewProject /></Layout></ProtectedRoute>} />
        <Route path="/workspace/:swapId" element={<ProtectedRoute><CollaborationWorkspace /></ProtectedRoute>} />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;