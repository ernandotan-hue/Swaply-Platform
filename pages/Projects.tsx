
import React, { useState, useEffect } from 'react';
import { store } from '../services/mockStore';
import { Project, SkillCategory, User } from '../types';
import { Search, MapPin, Briefcase, Calendar, FolderOpen, ArrowLeftRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Projects: React.FC = () => {
    const navigate = useNavigate();
    const currentUser = store.getCurrentUser();
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<Record<string, User>>({});
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [showSwapModal, setShowSwapModal] = useState<Project | null>(null);
    const [mySelectedProject, setMySelectedProject] = useState<string>('');
    const [deadline, setDeadline] = useState<string>('');

    useEffect(() => {
        store.getProjects().then(async (fetched) => {
            setProjects(fetched);
            const userIds = Array.from(new Set(fetched.map(p => p.userId)));
            const uMap: Record<string, User> = {};
            await Promise.all(userIds.map(async uid => {
                 const u = await store.getUserById(uid);
                 if (u) uMap[uid] = u;
            }));
            setUsers(uMap);
        });
    }, []);

    const filteredProjects = selectedCategory === 'All' 
        ? projects 
        : projects.filter(p => p.category === selectedCategory);

    const handleSwapRequest = (targetProject: Project) => {
        if (!currentUser) {
            navigate('/login');
            return;
        }
        if (currentUser.coins < 1) {
            alert("Insufficient coins.");
            return;
        }
        if (targetProject.userId === currentUser.id) {
            alert("You cannot swap with yourself.");
            return;
        }
        setShowSwapModal(targetProject);
        // Note: 'currentUser.projects' might not be populated in this lite version of migration
        // In a real app, ensure we fetch the current user's projects too.
    };

    const confirmSwap = async () => {
        if (!currentUser || !showSwapModal) return;
        if (!deadline) {
            alert("Please set a deadline.");
            return;
        }
        
        // Simple mock for my project ID since we didn't implement fetching my projects fully in this view yet
        const myProjectId = "temp_project_id"; 

        const result = await store.createProjectSwapRequest(
            currentUser.id,
            showSwapModal.userId,
            showSwapModal.id,
            myProjectId,
            new Date(deadline)
        );

        if (result) {
            setShowSwapModal(null);
            navigate('/messages');
        } else {
            alert("Failed to create swap. Check coins.");
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
             <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Project Market</h1>
                    <p className="text-slate-500">Trade completed projects, templates, and resources.</p>
                </div>
                <div className="flex items-center gap-3">
                    {currentUser && (
                        <div className="bg-indigo-50 px-4 py-2 rounded-full text-sm font-bold text-indigo-700 flex items-center gap-2 border border-indigo-100">
                            <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] text-yellow-800 border border-yellow-500 shadow-sm">$</div>
                            {currentUser.coins} Coins
                        </div>
                    )}
                    <button onClick={() => navigate('/add-project')} className="bg-slate-900 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-slate-800 transition">
                        + Post Project
                    </button>
                </div>
            </div>

            {/* Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                <button 
                    onClick={() => setSelectedCategory('All')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${selectedCategory === 'All' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                    All
                </button>
                {Object.values(SkillCategory).map(c => (
                     <button 
                        key={c}
                        onClick={() => setSelectedCategory(c)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${selectedCategory === c ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        {c}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map(project => {
                    const owner = users[project.userId];
                    return (
                        <div key={project.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg transition">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                                    <FolderOpen className="w-6 h-6" />
                                </div>
                                <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded-lg">{project.category}</span>
                            </div>
                            
                            <h3 className="font-bold text-lg text-slate-800 mb-2">{project.title}</h3>
                            <p className="text-sm text-slate-500 line-clamp-2 mb-4">{project.description}</p>
                            
                            <div className="bg-slate-50 p-3 rounded-lg mb-4">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Requirements</p>
                                <p className="text-xs text-slate-600 line-clamp-2">{project.requirements}</p>
                            </div>

                            <div className="flex items-center gap-3 mb-6">
                                <img src={owner?.avatar || 'https://via.placeholder.com/32'} className="w-8 h-8 rounded-full" />
                                <div className="text-xs">
                                    <p className="font-bold text-slate-800">{owner?.name || 'User'}</p>
                                    <p className="text-slate-500">{new Date(project.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>

                            <button 
                                onClick={() => handleSwapRequest(project)}
                                className="w-full py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                            >
                                <ArrowLeftRight className="w-4 h-4" /> Swap Project
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {showSwapModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 animate-fade-in space-y-4">
                        <h2 className="text-xl font-bold text-slate-800">Swap Project</h2>
                        
                        <div className="p-3 bg-indigo-50 text-indigo-800 text-sm rounded-xl">
                            You are requesting <strong>{showSwapModal.title}</strong>. This will cost <strong>1 Coin</strong>.
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Deadline</label>
                            <input 
                                type="date" 
                                className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-indigo-500"
                                value={deadline}
                                onChange={e => setDeadline(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button onClick={() => setShowSwapModal(null)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-xl">Cancel</button>
                            <button onClick={confirmSwap} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">Send Request</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Projects;
