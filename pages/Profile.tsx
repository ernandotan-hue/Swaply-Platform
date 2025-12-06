import React, { useState, useEffect } from 'react';
import { store } from '../services/mockStore';
import { MapPin, Star, Clock, Plus, Settings, Trophy, ShieldCheck, Award, Wallet, Timer, ShoppingCart, X, Check, Edit2, Camera, Briefcase, Loader } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skill, SkillStatus } from '../types';

const Profile: React.FC = () => {
  const [currentUser, setCurrentUser] = useState(store.getCurrentUser());
  const [showShop, setShowShop] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [buying, setBuying] = useState(false);
  const [userSkills, setUserSkills] = useState<Skill[]>([]);
  
  // Edit State
  const [saving, setSaving] = useState(false);
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [editForm, setEditForm] = useState({
      name: '',
      jobTitle: '',
      location: '',
      bio: '',
      avatar: ''
  });

  // Subscribe to changes
  useEffect(() => {
      const unsub = store.subscribe((u: any) => setCurrentUser(u));
      return unsub;
  }, []);

  // Fetch skills
  useEffect(() => {
      const fetchSkills = async () => {
          if (currentUser) {
              const s = await store.getUserSkills(currentUser.id);
              setUserSkills(s);
          }
      };
      fetchSkills();
  }, [currentUser, showEditProfile]);

  // Load user data into edit form when modal opens
  useEffect(() => {
      if (currentUser) {
          setEditForm({
              name: currentUser.name,
              jobTitle: currentUser.jobTitle || '',
              location: currentUser.location,
              bio: currentUser.bio,
              avatar: currentUser.avatar
          });
      }
  }, [currentUser, showEditProfile]);

  if (!currentUser) return <div>Please login.</div>;

  const handleVerify = async (skillId: string) => {
      await store.verifySkill(skillId);
      if (currentUser) {
          const s = await store.getUserSkills(currentUser.id);
          setUserSkills(s);
      }
  };

  const handleBuyCoin = (amount: number) => {
      setBuying(true);
      setTimeout(async () => {
          await store.addCoins(amount);
          setBuying(false);
          setShowShop(false);
          alert(`Successfully purchased ${amount} Coin(s)!`);
      }, 1500);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setNewAvatarFile(file);
          // Show local preview immediately
          setEditForm({ ...editForm, avatar: URL.createObjectURL(file) });
      }
  };

  const saveProfile = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      
      try {
          let avatarUrl = editForm.avatar;
          // If a new file was selected, upload it first
          if (newAvatarFile) {
              const path = `avatars/${currentUser.id}/${Date.now()}_${newAvatarFile.name}`;
              avatarUrl = await store.uploadFile(newAvatarFile, path);
          }

          await store.updateUser(currentUser.id, {
              name: editForm.name,
              jobTitle: editForm.jobTitle,
              location: editForm.location,
              bio: editForm.bio,
              avatar: avatarUrl
          });
          setShowEditProfile(false);
      } catch (e) {
          console.error("Save failed", e);
          alert("Failed to save profile.");
      } finally {
          setSaving(false);
      }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-in pb-10">
        {/* Gamified Header */}
        <div className="relative group">
            <div className="h-48 bg-gradient-to-r from-slate-800 to-indigo-900 rounded-3xl overflow-hidden relative">
                <img src="https://picsum.photos/1000/300" className="w-full h-full object-cover opacity-40" />
                <div className="absolute top-4 right-4 flex gap-2">
                    <button 
                        onClick={() => setShowEditProfile(true)}
                        className="bg-white/20 backdrop-blur-md px-3 py-2 rounded-full text-white font-bold flex items-center gap-2 hover:bg-white/30 transition"
                    >
                        <Edit2 className="w-4 h-4" /> Edit Profile
                    </button>
                    <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-full text-white font-bold flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-yellow-300" />
                        {currentUser.points || 0} Pts
                    </div>
                </div>
            </div>
            <div className="absolute -bottom-16 left-8 flex items-end gap-6">
                <div className="p-1 bg-white rounded-full relative">
                    <img src={currentUser.avatar} className="w-32 h-32 rounded-full border-4 border-white object-cover" />
                </div>
                <div className="mb-4 text-slate-800 drop-shadow-sm md:text-white md:drop-shadow-md">
                     <h1 className="text-3xl font-bold">{currentUser.name}</h1>
                     {currentUser.jobTitle && (
                         <p className="font-semibold opacity-90 text-lg flex items-center gap-2 mb-1">
                             <Briefcase className="w-4 h-4" /> {currentUser.jobTitle}
                         </p>
                     )}
                     <p className="opacity-80 text-sm flex items-center gap-1"><MapPin className="w-4 h-4" /> {currentUser.location}</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16">
            {/* Left Sidebar */}
            <div className="space-y-6">
                {/* Coin Wallet Card */}
                <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2 opacity-90">
                            <Wallet className="w-5 h-5" />
                            <span className="text-sm font-semibold">My Wallet</span>
                        </div>
                        <h2 className="text-4xl font-bold mb-4">{currentUser.coins} <span className="text-lg font-normal opacity-80">Coins</span></h2>
                        
                        <button 
                            onClick={() => setShowShop(true)}
                            className="w-full py-2 bg-white text-indigo-700 font-bold rounded-xl shadow-md hover:bg-indigo-50 transition flex items-center justify-center gap-2"
                        >
                            <ShoppingCart className="w-4 h-4" /> Top Up
                        </button>
                    </div>
                    {/* Decor */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-8 -mt-8 blur-2xl"></div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2 mb-4">
                        <Star className="w-5 h-5 text-amber-500 fill-current" />
                        <span className="text-2xl font-bold text-slate-800">{currentUser.rating}</span>
                        <span className="text-slate-400 text-sm">({currentUser.reviewCount} reviews)</span>
                    </div>
                    
                    <h3 className="font-bold text-slate-800 mb-2">About Me</h3>
                    <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{currentUser.bio}</p>
                </div>
                
                {/* Badges Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Award className="w-4 h-4 text-indigo-500" /> Badges
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {currentUser.badges && currentUser.badges.length > 0 ? currentUser.badges.map((badge, i) => (
                            <span key={i} className="px-3 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-xs font-bold flex items-center gap-1">
                                🏅 {badge}
                            </span>
                        )) : (
                            <p className="text-sm text-slate-400 italic">No badges earned yet.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="md:col-span-2 space-y-6">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-slate-800">My Skills & Offers</h2>
                    <Link to="/add-skill" className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition shadow-lg">
                        <Plus className="w-4 h-4" /> Add New Skill
                    </Link>
                </div>

                <div className="grid grid-cols-1 gap-4">
                     {userSkills.length > 0 ? (
                        userSkills.map(skill => (
                            <div key={skill.id} className="bg-white p-4 rounded-xl border border-slate-100 flex gap-4 items-center shadow-sm">
                                <img src={skill.image} alt={skill.title} className="w-20 h-20 rounded-lg object-cover bg-slate-100" />
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-slate-800">{skill.title}</h3>
                                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                                            skill.status === SkillStatus.VERIFIED ? 'bg-green-100 text-green-700' : 
                                            skill.status === SkillStatus.REJECTED ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {skill.status}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 line-clamp-1">{skill.description}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-xs bg-slate-50 px-2 py-1 rounded text-slate-600">{skill.category}</span>
                                        <span className="text-xs bg-slate-50 px-2 py-1 rounded text-slate-600">{skill.level}</span>
                                    </div>
                                </div>
                                {skill.status === SkillStatus.PENDING && (
                                    <button 
                                        onClick={() => handleVerify(skill.id)}
                                        className="text-xs bg-indigo-50 text-indigo-600 px-3 py-2 rounded-lg font-bold hover:bg-indigo-100 transition whitespace-nowrap"
                                    >
                                        Verify (Demo)
                                    </button>
                                )}
                            </div>
                        ))
                     ) : (
                        <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <p className="text-slate-500 mb-4">You haven't added any skills yet.</p>
                            <Link to="/add-skill" className="text-indigo-600 font-bold hover:underline">Add your first skill</Link>
                        </div>
                     )}
                </div>
            </div>
        </div>

        {/* Edit Profile Modal */}
        {showEditProfile && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden animate-fade-in shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h2 className="text-xl font-bold text-slate-800">Edit Profile</h2>
                        <button onClick={() => setShowEditProfile(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={saveProfile} className="p-6 space-y-6 overflow-y-auto">
                        {/* Avatar Upload */}
                        <div className="flex flex-col items-center">
                            <div className="relative group cursor-pointer">
                                <img src={editForm.avatar} className="w-24 h-24 rounded-full object-cover border-4 border-slate-100" />
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                    <Camera className="w-8 h-8 text-white" />
                                </div>
                                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Click to change photo</p>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                            <input 
                                type="text" 
                                required
                                value={editForm.name}
                                onChange={e => setEditForm({...editForm, name: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Job Title / Professional Headline</label>
                            <input 
                                type="text" 
                                placeholder="e.g. Senior Product Designer"
                                value={editForm.jobTitle}
                                onChange={e => setEditForm({...editForm, jobTitle: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Location</label>
                            <input 
                                type="text" 
                                value={editForm.location}
                                onChange={e => setEditForm({...editForm, location: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Bio / About Me</label>
                            <textarea 
                                rows={4}
                                placeholder="Tell us about yourself..."
                                value={editForm.bio}
                                onChange={e => setEditForm({...editForm, bio: e.target.value})}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                            />
                        </div>
                        
                        <button 
                            type="submit" 
                            disabled={saving}
                            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2"
                        >
                            {saving ? <><Loader className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
                        </button>
                    </form>
                </div>
            </div>
        )}

        {/* Shop Modal */}
        {showShop && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden animate-fade-in shadow-2xl">
                    <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold">Swaply Shop</h2>
                            <p className="text-indigo-100 text-sm">Purchase coins to start swapping</p>
                        </div>
                        <button onClick={() => setShowShop(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="p-6 space-y-4">
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-amber-300 transition group" onClick={() => !buying && handleBuyCoin(1)}>
                            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                                <span className="text-2xl">🪙</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-800">1 Coin</h3>
                                <p className="text-xs text-slate-500">Perfect for one swap</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-indigo-600">Rp 15.000</p>
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 cursor-pointer hover:border-indigo-300 transition group" onClick={() => !buying && handleBuyCoin(5)}>
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                                <span className="text-2xl">💰</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-slate-800">5 Coins</h3>
                                <p className="text-xs text-slate-500">Best value pack</p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-indigo-600">Rp 75.000</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50 text-center text-xs text-slate-400 border-t border-slate-100">
                        {buying ? (
                            <span className="flex items-center justify-center gap-2 text-indigo-600 font-bold">
                                <span className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-600 border-t-transparent"></span>
                                Processing Payment...
                            </span>
                        ) : (
                            "Secure Payment via MockGateway™"
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Profile;