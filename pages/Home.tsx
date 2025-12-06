
import React, { useEffect, useState } from 'react';
import { ArrowRight, Star, Zap, LogIn, Twitter, Instagram, Linkedin, Globe, Briefcase, Loader } from 'lucide-react';
import { store } from '../services/mockStore';
import { SkillCategory, Skill, User } from '../types';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const currentUser = store.getCurrentUser();

  useEffect(() => {
    const fetchData = async () => {
        try {
            const fetchedSkills = await store.getSkills();
            setSkills(fetchedSkills);
            
            // Fetch users for the skills
            const userIds = Array.from(new Set(fetchedSkills.map(s => s.userId)));
            const userMap: Record<string, User> = {};
            await Promise.all(userIds.map(async (uid) => {
                const u = await store.getUserById(uid);
                if (u) userMap[uid] = u;
            }));
            setUsers(userMap);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
  }, []);

  const featuredSkills = skills.slice(0, 4);

  return (
    <div className="space-y-8 animate-fade-in flex flex-col min-h-[80vh]">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-8 md:p-12 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold mb-4 border border-white/30">
            ✨ AI-Powered Matching
          </span>
          <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight">
            Exchange Skills, <br/> Grow Together.
          </h1>
          <p className="text-indigo-100 text-lg mb-8 max-w-lg">
            Swaply connects you with experts willing to trade their talent for yours. No money needed, just pure value exchange.
          </p>
          <div className="flex gap-4">
            {currentUser ? (
              <Link to="/search" className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition shadow-lg">
                Find a Swap
              </Link>
            ) : (
              <>
                <Link to="/login" className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition shadow-lg flex items-center gap-2">
                   Get Started
                </Link>
                <Link to="/login" className="px-6 py-3 rounded-xl font-bold text-white border border-white/30 hover:bg-white/10 transition flex items-center gap-2">
                   <LogIn className="w-5 h-5" /> Sign In
                </Link>
              </>
            )}
          </div>
        </div>
        
        {/* Decorative Circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 right-20 w-40 h-40 bg-indigo-400/20 rounded-full blur-2xl"></div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
            <h2 className="text-2xl font-bold text-slate-800">Explore Categories</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Object.values(SkillCategory).map((cat) => (
            <Link to={`/search?cat=${cat}`} key={cat} className="group bg-white p-4 rounded-2xl shadow-sm hover:shadow-md border border-slate-100 transition-all text-center">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <span className="font-semibold text-slate-700 text-sm">{cat}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Featured Skills */}
      <div className="space-y-4 flex-1">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">Featured Swaps</h2>
          <Link to="/search" className="text-indigo-600 font-medium flex items-center gap-1 hover:underline">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {loading ? (
             <div className="text-center py-10"><Loader className="w-8 h-8 animate-spin mx-auto text-indigo-500"/></div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredSkills.map((skill) => {
                const owner = users[skill.userId];
                return (
                <div key={skill.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all group">
                    <div className="relative h-48 overflow-hidden">
                    <img src={skill.image} alt={skill.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-slate-700 shadow-sm">
                        {skill.category}
                    </div>
                    </div>
                    <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <img src={owner?.avatar || 'https://via.placeholder.com/32'} alt={owner?.name} className="w-8 h-8 rounded-full border border-slate-100" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{owner?.name || 'Unknown User'}</p>
                            {owner?.jobTitle ? (
                                <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                                    <Briefcase className="w-3 h-3" /> {owner.jobTitle}
                                </p>
                            ) : (
                                <div className="flex items-center gap-1 text-xs text-amber-500">
                                    <Star className="w-3 h-3 fill-current" />
                                    <span>{owner?.rating || 0}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <h3 className="font-bold text-slate-800 mb-1 line-clamp-1">{skill.title}</h3>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-4">{skill.description}</p>
                    
                    <Link to={`/search?skill=${skill.id}`} className="block w-full text-center bg-indigo-50 text-indigo-700 font-semibold py-2 rounded-lg hover:bg-indigo-100 transition-colors">
                        Request Swap
                    </Link>
                    </div>
                </div>
                );
            })}
            </div>
        )}
      </div>

      <footer className="mt-12 border-t border-slate-200 pt-10 pb-6 text-slate-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              <div className="col-span-1 md:col-span-1">
                   <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">S</div>
                        <h2 className="text-xl font-bold text-slate-800">Swaply</h2>
                   </div>
                   <p className="text-sm mb-4">The #1 platform for bartering skills.</p>
              </div>
          </div>
          <p className="text-xs text-center">&copy; {new Date().getFullYear()} Swaply Inc.</p>
      </footer>
    </div>
  );
};

export default Home;
