import React, { useState, useEffect } from 'react';
import { store } from '../services/mockStore';
import { Swap, SwapStatus, SwapType, User, Skill, Project } from '../types';
import { Clock, CheckCircle, XCircle, ArrowRight, Layout, MessageSquare, Briefcase, Calendar, FolderOpen, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SwapProgress: React.FC = () => {
  const currentUser = store.getCurrentUser();
  const navigate = useNavigate();
  
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'history'>('active');
  
  // Data caches
  const [users, setUsers] = useState<Record<string, User>>({});
  const [skills, setSkills] = useState<Record<string, Skill>>({});
  const [projects, setProjects] = useState<Record<string, Project>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
        const fetchedSwaps = await store.getSwapsForUser(currentUser.id);
        setSwaps(fetchedSwaps);

        const userIds = new Set<string>();
        const skillIds = new Set<string>();
        const projectIds = new Set<string>();

        fetchedSwaps.forEach(s => {
            userIds.add(s.requesterId);
            userIds.add(s.receiverId);
            if (s.offeredSkillId) skillIds.add(s.offeredSkillId);
            if (s.requestedSkillId) skillIds.add(s.requestedSkillId);
            if (s.offeredProjectId) projectIds.add(s.offeredProjectId);
            if (s.requestedProjectId) projectIds.add(s.requestedProjectId);
        });

        const newUsers: Record<string, User> = {};
        await Promise.all(Array.from(userIds).map(async (uid) => {
            const u = await store.getUserById(uid);
            if (u) newUsers[uid] = u;
        }));

        const newSkills: Record<string, Skill> = {};
        await Promise.all(Array.from(skillIds).map(async (sid) => {
            const s = await store.getSkillById(sid);
            if (s) newSkills[sid] = s;
        }));

        const newProjects: Record<string, Project> = {};
        await Promise.all(Array.from(projectIds).map(async (pid) => {
            const p = await store.getProjectById(pid);
            if (p) newProjects[pid] = p;
        }));

        setUsers(newUsers);
        setSkills(newSkills);
        setProjects(newProjects);
    } catch (e) {
        console.error("Failed to fetch swap progress data", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  if (!currentUser) return <div>Please login.</div>;

  // Active includes ACCEPTED and IN_REVIEW
  const activeSwaps = swaps.filter(s => s.status === SwapStatus.ACCEPTED || s.status === SwapStatus.IN_REVIEW);
  const pendingSwaps = swaps.filter(s => s.status === SwapStatus.PENDING);
  const historySwaps = swaps.filter(s => s.status === SwapStatus.COMPLETED || s.status === SwapStatus.DECLINED || s.status === SwapStatus.CANCELLED);

  const getPartner = (swap: Swap) => {
      const id = swap.requesterId === currentUser.id ? swap.receiverId : swap.requesterId;
      return users[id];
  }

  const getMyRole = (swap: Swap) => {
      return swap.requesterId === currentUser.id ? 'requester' : 'receiver';
  }

  const handleDecline = async (id: string) => {
      await store.declineSwap(id);
      fetchData();
  };

  const handleAccept = async (id: string) => {
      await store.acceptSwap(id);
      fetchData();
      setActiveTab('active');
  };

  if (loading && swaps.length === 0) return <div className="p-8 text-center">Loading swaps...</div>;

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-800">Swap Progress</h1>
                <p className="text-slate-500 mt-1">Manage your exchanges, track milestones, and collaborate.</p>
            </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white/20 rounded-lg"><Layout className="w-6 h-6" /></div>
                    <span className="text-2xl font-bold">{activeSwaps.length}</span>
                </div>
                <h3 className="font-semibold opacity-90">Active Swaps</h3>
                <p className="text-sm opacity-70 mt-1">Currently in progress</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Clock className="w-6 h-6" /></div>
                    <span className="text-2xl font-bold text-slate-800">{pendingSwaps.length}</span>
                </div>
                <h3 className="font-semibold text-slate-700">Pending Requests</h3>
                <p className="text-sm text-slate-500 mt-1">Waiting for action</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-green-100 text-green-600 rounded-lg"><CheckCircle className="w-6 h-6" /></div>
                    <span className="text-2xl font-bold text-slate-800">{historySwaps.filter(s => s.status === SwapStatus.COMPLETED).length}</span>
                </div>
                <h3 className="font-semibold text-slate-700">Completed</h3>
                <p className="text-sm text-slate-500 mt-1">Lifetime swaps finished</p>
            </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
            <div className="flex gap-8">
                <button 
                    onClick={() => setActiveTab('active')}
                    className={`pb-4 px-2 text-sm font-bold transition border-b-2 ${activeTab === 'active' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    In Progress ({activeSwaps.length})
                </button>
                <button 
                    onClick={() => setActiveTab('pending')}
                    className={`pb-4 px-2 text-sm font-bold transition border-b-2 ${activeTab === 'pending' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    Pending Requests ({pendingSwaps.length})
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`pb-4 px-2 text-sm font-bold transition border-b-2 ${activeTab === 'history' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                >
                    History
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="space-y-4">
            {(activeTab === 'active' ? activeSwaps : activeTab === 'pending' ? pendingSwaps : historySwaps).length === 0 && (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <p className="text-slate-500">No swaps found in this category.</p>
                </div>
            )}

            {(activeTab === 'active' ? activeSwaps : activeTab === 'pending' ? pendingSwaps : historySwaps).map(swap => {
                const partner = getPartner(swap);
                const isRequester = getMyRole(swap) === 'requester';
                
                let offeredTitle = "", requestedTitle = "";
                if (swap.type === SwapType.SKILL) {
                     offeredTitle = skills[swap.offeredSkillId!]?.title || "Skill";
                     requestedTitle = skills[swap.requestedSkillId!]?.title || "Skill";
                } else {
                     offeredTitle = projects[swap.offeredProjectId!]?.title || "Project";
                     requestedTitle = projects[swap.requestedProjectId!]?.title || "Project";
                }

                const showReviewButton = swap.status === SwapStatus.IN_REVIEW && isRequester;
                const showWaitingStatus = swap.status === SwapStatus.IN_REVIEW && !isRequester;

                return (
                    <div key={swap.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-6 items-center">
                        {/* Partner Info */}
                        <div className="flex items-center gap-4 w-full md:w-1/4">
                            <img src={partner?.avatar} className="w-14 h-14 rounded-full object-cover border-2 border-slate-100" alt={partner?.name} />
                            <div>
                                <h3 className="font-bold text-slate-800">{partner?.name}</h3>
                                <p className="text-xs text-slate-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> Started {new Date(swap.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* Swap Details */}
                        <div className="flex-1 w-full bg-slate-50 rounded-xl p-4 flex flex-col md:flex-row items-center gap-4 relative">
                            {swap.type === SwapType.PROJECT && (
                                <div className="absolute top-2 right-2">
                                     <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">PROJECT</span>
                                </div>
                            )}
                            <div className="flex-1 text-center md:text-left">
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">You Give</p>
                                <p className="font-semibold text-slate-800 text-sm">
                                    {isRequester ? offeredTitle : requestedTitle}
                                </p>
                            </div>
                            
                            <div className="bg-white p-2 rounded-full shadow-sm z-10">
                                <ArrowRight className="w-4 h-4 text-slate-400" />
                            </div>

                            <div className="flex-1 text-center md:text-right">
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">You Get</p>
                                <p className="font-semibold text-indigo-700 text-sm">
                                    {isRequester ? requestedTitle : offeredTitle}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="w-full md:w-auto flex flex-col gap-2 min-w-[140px]">
                            {activeTab === 'active' && (
                                <>
                                    {/* Workspace (Skills only) */}
                                    {swap.type === SwapType.SKILL && swap.status === SwapStatus.ACCEPTED && (
                                        <button 
                                            onClick={() => navigate(`/workspace/${swap.id}`)}
                                            className="w-full py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                                        >
                                            <Briefcase className="w-4 h-4" /> Workspace
                                        </button>
                                    )}

                                    {/* Project Deadline Info */}
                                    {swap.type === SwapType.PROJECT && (
                                        <div className="text-xs text-center text-slate-500 mb-1">
                                            Deadline: {swap.deadline ? new Date(swap.deadline).toLocaleDateString() : 'N/A'}
                                        </div>
                                    )}
                                    
                                    {/* Chat Button */}
                                    <button 
                                        onClick={() => navigate('/messages')}
                                        className="w-full py-2 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-lg hover:bg-slate-50 transition flex items-center justify-center gap-2"
                                    >
                                        <MessageSquare className="w-4 h-4" /> Chat
                                    </button>

                                    {/* Complete / Review / Waiting Logic */}
                                    {swap.status === SwapStatus.ACCEPTED && (
                                        <button 
                                            onClick={() => navigate(`/complete-swap/${swap.id}`)}
                                            className="w-full py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle className="w-4 h-4" /> 
                                            {swap.type === SwapType.PROJECT ? "Submit" : "Complete"}
                                        </button>
                                    )}

                                    {showReviewButton && (
                                        <button 
                                            onClick={() => navigate(`/review-project/${swap.id}`)}
                                            className="w-full py-2 bg-amber-500 text-white text-sm font-bold rounded-lg hover:bg-amber-600 transition flex items-center justify-center gap-2"
                                        >
                                            <Eye className="w-4 h-4" /> Review
                                        </button>
                                    )}

                                    {showWaitingStatus && (
                                        <div className="w-full py-2 bg-slate-100 text-slate-500 text-xs font-bold rounded-lg flex items-center justify-center gap-2 text-center">
                                            <Clock className="w-4 h-4" /> Waiting for Review
                                        </div>
                                    )}
                                </>
                            )}
                            
                            {activeTab === 'pending' && (
                                <>
                                    {getMyRole(swap) === 'requester' ? (
                                        <div className="w-full py-2 bg-slate-100 text-slate-500 text-xs font-bold rounded-lg text-center">
                                            Request Sent
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => handleDecline(swap.id)}
                                                className="flex-1 py-2 bg-white border border-slate-200 text-slate-500 text-sm font-bold rounded-lg hover:bg-slate-50 transition"
                                            >
                                                Decline
                                            </button>
                                            <button 
                                                onClick={() => handleAccept(swap.id)}
                                                className="flex-1 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition shadow-md"
                                            >
                                                Accept
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}

                            {activeTab === 'history' && (
                                <div className={`w-full py-2 text-xs font-bold rounded-lg text-center ${
                                    swap.status === SwapStatus.COMPLETED ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {swap.status}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export default SwapProgress;