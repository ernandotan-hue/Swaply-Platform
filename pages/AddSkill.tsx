
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, CheckCircle, Loader, Image as ImageIcon, Check, AlertCircle, UploadCloud, FileText } from 'lucide-react';
import { store } from '../services/mockStore';
import { SkillCategory, SkillLevel } from '../types';

const PRESET_IMAGES = [
  { id: 'tech', url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80', label: 'Tech' },
  { id: 'design', url: 'https://images.unsplash.com/photo-1544531586-fde5298cdd40?w=800&q=80', label: 'Design' },
  { id: 'music', url: 'https://images.unsplash.com/photo-1516062423079-7ca13cdc7f5a?w=800&q=80', label: 'Music' },
  { id: 'business', url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80', label: 'Business' },
  { id: 'lifestyle', url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80', label: 'Lifestyle' },
  { id: 'language', url: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=800&q=80', label: 'Language' },
  { id: 'art', url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80', label: 'Art' },
  { id: 'other', url: 'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=800&q=80', label: 'Other' },
];

const AddSkill: React.FC = () => {
  const navigate = useNavigate();
  const { skillId } = useParams(); // Check if we are editing
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!skillId);
  const [selectedImage, setSelectedImage] = useState(PRESET_IMAGES[0].url);
  const [verificationFile, setVerificationFile] = useState<File | null>(null);
  const [existingVerificationUrl, setExistingVerificationUrl] = useState('');
  
  const [formData, setFormData] = useState({
      title: '',
      description: '',
      category: SkillCategory.OTHER,
      level: SkillLevel.BEGINNER,
      experience: 0
  });

  // Load existing data if editing
  useEffect(() => {
      if (skillId) {
          store.getSkillById(skillId).then(skill => {
              if (skill) {
                  setFormData({
                      title: skill.title,
                      description: skill.description,
                      category: skill.category,
                      level: skill.level,
                      experience: skill.experience
                  });
                  setSelectedImage(skill.image);
                  setExistingVerificationUrl(skill.verificationFileUrl || '');
              }
              setInitialLoading(false);
          });
      }
  }, [skillId]);

  const handleVerificationFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setVerificationFile(file);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const user = store.getCurrentUser();
      if (!user) return;

      setLoading(true);
      
      try {
          // Handle file upload
          let vFileUrl = existingVerificationUrl;
          if (verificationFile) {
              const path = `verifications/${user.id}/${Date.now()}_${verificationFile.name}`;
              vFileUrl = await store.uploadFile(verificationFile, path);
          }

          if (skillId) {
              // Update existing skill
              if (confirm("Note: Updating your skill will reset its status to 'Pending Verification'. Continue?")) {
                  await store.updateSkill(skillId, {
                      ...formData,
                      image: selectedImage,
                      verificationFileUrl: vFileUrl
                  });
              } else {
                  setLoading(false);
                  return;
              }
          } else {
              // Create new skill
              await store.addSkill(user.id, {
                  ...formData,
                  image: selectedImage,
                  verificationFileUrl: vFileUrl
              });
          }
          
          navigate('/profile');
      } catch (error) {
          console.error("Failed to save skill:", error);
          alert("Could not save skill. Check your connection or permissions.");
      } finally {
          setLoading(false);
      }
  };

  if (initialLoading) return <div className="flex h-screen items-center justify-center"><Loader className="w-8 h-8 animate-spin text-indigo-600" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-10">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition">
                <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{skillId ? 'Edit Skill' : 'Add New Skill'}</h1>
        </div>

        {skillId && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 p-4 rounded-xl flex gap-3 text-amber-800 dark:text-amber-200">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">Editing this skill will require it to be re-verified by an admin before it appears in public searches again.</p>
            </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-8">
            
            <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Choose a Background Cover</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {PRESET_IMAGES.map((img) => (
                        <div 
                            key={img.id}
                            onClick={() => setSelectedImage(img.url)}
                            className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer group border-2 transition-all ${selectedImage === img.url ? 'border-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-900' : 'border-transparent hover:border-slate-300 dark:hover:border-slate-600'}`}
                        >
                            <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${selectedImage === img.url ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                {selectedImage === img.url && <CheckCircle className="w-8 h-8 text-white drop-shadow-md" />}
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <span className="text-xs font-bold text-white">{img.label}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 my-6"></div>

            <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Skill Title</label>
                <input 
                    type="text" 
                    required
                    placeholder="e.g. Advanced Photography"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-slate-900 dark:text-white placeholder-slate-400"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Category</label>
                    <div className="relative">
                        <select 
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white appearance-none cursor-pointer"
                            value={formData.category}
                            onChange={e => setFormData({...formData, category: e.target.value as SkillCategory})}
                        >
                            {Object.values(SkillCategory).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                    </div>
                </div>
                <div>
                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Skill Level</label>
                     <div className="relative">
                        <select 
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-white appearance-none cursor-pointer"
                            value={formData.level}
                            onChange={e => setFormData({...formData, level: e.target.value as SkillLevel})}
                        >
                            {Object.values(SkillLevel).map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                     </div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Years of Experience</label>
                <input 
                    type="number" 
                    min="0"
                    max="50"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-slate-900 dark:text-white"
                    value={formData.experience}
                    onChange={e => setFormData({...formData, experience: parseInt(e.target.value)})}
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Description</label>
                <textarea 
                    required
                    rows={4}
                    placeholder="Describe what you can offer, your teaching style, or specific techniques..."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none text-slate-900 dark:text-white placeholder-slate-400"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                />
            </div>

            <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Verification Proof</label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer flex flex-col items-center gap-2 relative">
                    <input 
                        type="file" 
                        onChange={handleVerificationFileUpload} 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        accept="image/*,.pdf"
                        required={!skillId && !existingVerificationUrl} 
                    />
                    {verificationFile ? (
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                            <FileText className="w-8 h-8" />
                            <span>{verificationFile.name}</span>
                        </div>
                    ) : existingVerificationUrl ? (
                         <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-bold">
                            <CheckCircle className="w-8 h-8" />
                            <span>File Uploaded (Click to change)</span>
                        </div>
                    ) : (
                        <>
                            <UploadCloud className="w-8 h-8 text-slate-300 dark:text-slate-500" />
                            <span className="text-slate-500 dark:text-slate-400">Upload certificate or proof of work</span>
                            <span className="text-xs text-slate-400 dark:text-slate-600">PDF, JPG, PNG (Required)</span>
                        </>
                    )}
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2"
            >
                {loading ? <><Loader className="w-5 h-5 animate-spin" /> {skillId ? 'Updating...' : 'Publishing...'}</> : (
                    <>
                        <CheckCircle className="w-5 h-5" /> {skillId ? 'Update Skill' : 'Publish Skill'}
                    </>
                )}
            </button>

        </form>
    </div>
  );
};

export default AddSkill;
