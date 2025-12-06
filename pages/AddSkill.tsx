import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, ChevronLeft, CheckCircle, Loader } from 'lucide-react';
import { store } from '../services/mockStore';
import { SkillCategory, SkillLevel } from '../types';

const AddSkill: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  const [formData, setFormData] = useState({
      title: '',
      description: '',
      category: SkillCategory.OTHER,
      level: SkillLevel.BEGINNER,
      experience: 0
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setImageFile(file);
          setPreviewUrl(URL.createObjectURL(file));
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const user = store.getCurrentUser();
      if (!user) return;

      setLoading(true);
      
      try {
          let imageUrl = 'https://picsum.photos/400/300';
          
          if (imageFile) {
              const path = `skills/${user.id}/${Date.now()}_${imageFile.name}`;
              imageUrl = await store.uploadFile(imageFile, path);
          }

          await store.addSkill(user.id, {
              ...formData,
              image: imageUrl
          });
          
          navigate('/profile');
      } catch (error) {
          console.error("Failed to add skill:", error);
          alert("Could not add skill. Check your connection or permissions.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">
                <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-slate-800">Add New Skill</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Skill Title</label>
                <input 
                    type="text" 
                    required
                    placeholder="e.g. Advanced Photography"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                    <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value as SkillCategory})}
                    >
                        {Object.values(SkillCategory).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
                <div>
                     <label className="block text-sm font-semibold text-slate-700 mb-2">Skill Level</label>
                     <select 
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={formData.level}
                        onChange={e => setFormData({...formData, level: e.target.value as SkillLevel})}
                     >
                        {Object.values(SkillLevel).map(l => <option key={l} value={l}>{l}</option>)}
                     </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Years of Experience</label>
                <input 
                    type="number" 
                    min="0"
                    max="50"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
                    value={formData.experience}
                    onChange={e => setFormData({...formData, experience: parseInt(e.target.value)})}
                />
            </div>

            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                <textarea 
                    required
                    rows={4}
                    placeholder="Describe what you can offer, your teaching style, or specific techniques..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                />
            </div>

            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Proof / Portfolio Image</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-slate-50 transition cursor-pointer relative overflow-hidden group">
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    {previewUrl ? (
                        <div className="relative">
                            <img src={previewUrl} className="h-48 w-full object-cover rounded-lg" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                <span className="text-white font-medium">Click to change</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                            <Upload className="w-8 h-8 text-slate-300" />
                            <span>Click to upload verification image</span>
                            <span className="text-xs">Certificates, work samples, etc.</span>
                        </div>
                    )}
                </div>
                <p className="text-xs text-amber-600 mt-2">Note: All skills require admin verification before being publicly visible.</p>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
            >
                {loading ? <><Loader className="w-5 h-5 animate-spin" /> Uploading & Saving...</> : (
                    <>
                        <CheckCircle className="w-5 h-5" /> Submit for Verification
                    </>
                )}
            </button>

        </form>
    </div>
  );
};

export default AddSkill;