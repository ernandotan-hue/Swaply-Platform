
import React, { useState, useEffect } from 'react';
import { Search as SearchIcon, Filter, MapPin, SlidersHorizontal, ArrowLeftRight, Briefcase, Loader, Sparkles } from 'lucide-react';
import { store } from '../services/mockStore';
import { Skill, SkillCategory, User } from '../types';
import { useLocation, useNavigate } from 'react-router-dom';
import { findSmartMatches } from '../services/geminiService';

const SearchPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [results, setResults] = useState<Skill[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState<Skill | null>(null);
  
  // New state for handling user's available skills for swap
  const [mySkills, setMySkills] = useState<Skill[]>([]);
  const [selectedMySkillId, setSelectedMySkillId] = useState<string>('');
  const [skillsLoading, setSkillsLoading] = useState(false);

  const currentUser = store.getCurrentUser();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get('cat');
    const skillId = params.get('skill');
    
    if (cat) setSelectedCategory(cat);
    filterResults(query, cat || 'All');

    if (skillId) {
        store.getSkillById(skillId).then(skill => {
             if (skill) setShowSwapModal(skill);
        });
    }
  }, [location.search]);

  // Fetch current user's skills when modal opens
  useEffect(() => {
      if (showSwapModal && currentUser) {
          setSkillsLoading(true);
          store.getUserSkills(currentUser.id).then(skills => {
              setMySkills(skills);
              if (skills.length > 0) {
                  setSelectedMySkillId(skills[0].id);
              }
              setSkillsLoading(false);
          });
      }
  }, [showSwapModal, currentUser]);

  const filterResults = async (q: string, cat: string) => {
    setLoading(true);
    try {
        let allSkills = await store.getSkills();

        if (cat !== 'All') {
            allSkills = allSkills.filter(s => s.category === cat);
        }

        if (q) {
            allSkills = allSkills.filter(s => 
                s.title.toLowerCase().includes(q.toLowerCase()) || 
                s.description.toLowerCase().includes(q.toLowerCase())
            );
        }

        setResults(allSkills);
        await fetchUsersForSkills(allSkills);

    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const fetchUsersForSkills = async (skillsToFetch: Skill[]) => {
      const userIds = Array.from(new Set(skillsToFetch.map(s => s.userId)));
      const userMap: Record<string, User> = { ...users }; // Start with existing cache
      let hasUpdates = false;
      
      await Promise.all(userIds.map(async (uid) => {
          if (!userMap[uid]) {
              const u = await store.getUserById(uid);
              if (u) {
                  userMap[uid] = u;
                  hasUpdates = true;
              }
          }
      }));
      
      if (hasUpdates) setUsers(userMap);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    filterResults(query, selectedCategory);
  };

  const handleSmartMatch = async () => {
      if (!query.trim()) {
          alert("Please enter what you're looking for first.");
          return;
      }
      
      setAiLoading(true);
      try {
          const allSkills = await store.getSkills();
          // Pass titles for AI to match against
          const skillTitles = allSkills.map(s => s.title);
          const matchedTitles = await findSmartMatches(query, skillTitles);
          
          if (matchedTitles && matchedTitles.length > 0) {
              const aiFiltered = allSkills.filter(s => matchedTitles.includes(s.title));
              setResults(aiFiltered);
              await fetchUsersForSkills(aiFiltered);
          } else {
              setResults([]);
          }
      } catch (e) {
          console.error("AI Match failed", e);
          // Fallback to normal search
          filterResults(query, selectedCategory);
      } finally {
          setAiLoading(false);
      }
  };

  const handleSendRequest = async (targetSkill: Skill) => {
      if (!currentUser) {
          navigate('/login');
          return;
      }
      if (currentUser.coins < 1) {
          if (confirm("You need 1 coin to initiate a swap.")) {
              navigate('/profile');
          }
          return;
      }
      
      if (mySkills.length === 0) {
          alert("Please add a skill to your profile first.");
          navigate('/add-skill');
          return;
      }
      
      const myOfferId = selectedMySkillId || mySkills[0].id;

      const result = await store.createSwapRequest(currentUser.id, targetSkill.userId, targetSkill.id, myOfferId);
      
      if (!result) {
          alert("Failed to create swap. Check your coins.");
          return;
      }

      setShowSwapModal(null);
      // Pass the swap ID to the messages page so it opens this specific chat
      navigate('/messages', { state: { highlightSwapId: result.id } });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Explore Skills</h1>
        {currentUser && (
            <div className="bg-indigo-50 dark:bg-indigo-900/30 px-4 py-2 rounded-full text-sm font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-2 border border-indigo-100 dark:border-indigo-800">
                <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] text-yellow-800 border border-yellow-500 shadow-sm">$</div>
                {currentUser.coins} Coins Available
            </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="What do you want to learn? (e.g., 'Guitar lessons')" 
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition dark:text-white"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 dark:text-white font-medium"
            value={selectedCategory}
            onChange={(e) => {
                setSelectedCategory(e.target.value);
                filterResults(query, e.target.value);
            }}
          >
            <option value="All">All Categories</option>
            {Object.values(SkillCategory).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          
          <button type="submit" className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition shadow-md">
            Search
          </button>
          
          <button 
             type="button" 
             onClick={handleSmartMatch}
             disabled={aiLoading}
             className="px-6 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-bold rounded-xl hover:from-violet-600 hover:to-fuchsia-600 transition shadow-md flex items-center gap-2 whitespace-nowrap disabled:opacity-70"
          >
            {aiLoading ? <Loader className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            AI Match
          </button>
        </form>
      </div>

      {loading || aiLoading ? (
          <div className="text-center py-20">
              <div className="animate-spin w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full mx-auto mb-4"></div>
              <p className="text-slate-500 dark:text-slate-400">
                  {aiLoading ? "Consulting AI for smart matches..." : "Finding best matches..."}
              </p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map(skill => {
                const owner = users[skill.userId];
                return (
                    <div key={skill.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-lg transition-all flex flex-col">
                        <div className="relative h-48">
                            <img src={skill.image} alt={skill.title} className="w-full h-full object-cover" />
                            <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200">
                                {skill.category}
                            </div>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white line-clamp-1">{skill.title}</h3>
                            </div>
                            <div className="flex gap-2 mb-3">
                                <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-medium">{skill.level}</span>
                                <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-medium">{skill.experience}y Exp</span>
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 mb-4 flex-1">{skill.description}</p>
                            
                            <div className="flex items-center gap-3 mb-4 pt-4 border-t border-slate-50 dark:border-slate-700">
                                <img src={owner?.avatar} alt={owner?.name} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700" />
                                <div>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{owner?.name}</p>
                                    <div className="flex items-center gap-2">
                                         {owner?.jobTitle && (
                                            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-0.5 max-w-[120px] truncate">
                                                <Briefcase className="w-3 h-3" /> {owner.jobTitle}
                                            </span>
                                         )}
                                         <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                                            <MapPin className="w-3 h-3" /> {owner?.location}
                                         </p>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={() => setShowSwapModal(skill)}
                                className="w-full py-2.5 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl font-medium hover:bg-slate-800 dark:hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                            >
                                <ArrowLeftRight className="w-4 h-4" /> Request Swap
                            </button>
                        </div>
                    </div>
                );
            })}
            {results.length === 0 && (
                <div className="col-span-full text-center py-10 text-slate-500 dark:text-slate-400">
                    No skills found matching your criteria. Try a broader search or use AI Match.
                </div>
            )}
          </div>
      )}

      {showSwapModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in border border-slate-200 dark:border-slate-800">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Initiate Swap</h2>
                    <button onClick={() => setShowSwapModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 p-4 rounded-xl flex justify-between items-center">
                        <div>
                            <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase">Cost to swap</p>
                            <p className="text-lg font-bold text-indigo-900 dark:text-indigo-200">1 Coin</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Your Balance</p>
                            <p className={`text-lg font-bold ${currentUser && currentUser.coins > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                {currentUser?.coins || 0} Coins
                            </p>
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">You Want</p>
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                            <img src={showSwapModal.image} className="w-14 h-14 rounded-lg object-cover bg-slate-100 dark:bg-slate-700" />
                            <div>
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm">{showSwapModal.title}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">by {users[showSwapModal.userId]?.name}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-center -my-2 relative z-10">
                        <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-full border border-white dark:border-slate-800">
                            <ArrowLeftRight className="w-5 h-5 text-slate-500 dark:text-slate-300" />
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">You Offer</p>
                        {skillsLoading ? (
                            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 p-3">
                                <Loader className="w-4 h-4 animate-spin" /> Loading your skills...
                            </div>
                        ) : mySkills.length > 0 ? (
                             <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                 <select 
                                    className="w-full bg-transparent outline-none font-bold text-slate-800 dark:text-white text-sm"
                                    value={selectedMySkillId}
                                    onChange={(e) => setSelectedMySkillId(e.target.value)}
                                 >
                                    {mySkills.map(skill => (
                                        <option key={skill.id} value={skill.id}>{skill.title} ({skill.level})</option>
                                    ))}
                                 </select>
                             </div>
                        ) : (
                             <div className="p-4 border-2 border-dashed border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10 rounded-xl text-center">
                                 <p className="text-red-600 dark:text-red-400 text-sm font-bold mb-1">No skills found</p>
                                 <button onClick={() => navigate('/add-skill')} className="text-xs text-indigo-600 dark:text-indigo-400 underline">Add a skill first</button>
                             </div>
                        )}
                    </div>
                </div>
                <div className="p-6 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                    <button onClick={() => setShowSwapModal(null)} className="flex-1 py-3 font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition">Cancel</button>
                    <button 
                        onClick={() => handleSendRequest(showSwapModal)}
                        disabled={!currentUser || currentUser.coins < 1 || mySkills.length === 0}
                        className={`flex-1 py-3 font-bold text-white rounded-xl transition shadow-lg flex items-center justify-center gap-2 ${
                            currentUser && currentUser.coins > 0 && mySkills.length > 0
                            ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none' 
                            : 'bg-slate-400 cursor-not-allowed'
                        }`}
                    >
                        Confirm (-1 Coin)
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default SearchPage;
