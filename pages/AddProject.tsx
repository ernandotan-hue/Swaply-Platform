
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FolderPlus, UploadCloud, Loader } from 'lucide-react';
import { store } from '../services/mockStore';
import { SkillCategory } from '../types';

const AddProject: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [projectFile, setProjectFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState({
      title: '',
      description: '',
      requirements: '',
      category: SkillCategory.OTHER
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setProjectFile(file);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const user = store.getCurrentUser();
      if (!user) return;

      setLoading(true);

      try {
          let fileUrl = '#';
          if (projectFile) {
              const path = `projects/${user.id}/${Date.now()}_${projectFile.name}`;
              fileUrl = await store.uploadFile(projectFile, path);
          }

          await store.addProject(user.id, {
              ...formData,
              fileUrl: fileUrl
          });
          
          navigate('/projects');
      } catch (error) {
          console.error("Failed to add project:", error);
          alert("Could not post project. Check your permissions.");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition">
                <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Add Project</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 space-y-6">
            
            <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Project Title</label>
                <input 
                    type="text" 
                    required
                    placeholder="e.g. E-Commerce Website Template"
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition text-slate-900 dark:text-white placeholder-slate-400"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                />
            </div>

            <div>
                 <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Category</label>
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
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Description</label>
                <textarea 
                    required
                    rows={4}
                    placeholder="Describe the project, what technologies were used, etc."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none text-slate-900 dark:text-white placeholder-slate-400"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                />
            </div>

            <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Requirements / What you want in return</label>
                <textarea 
                    required
                    rows={2}
                    placeholder="e.g. I want to swap this for a Python script or a logo design."
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none text-slate-900 dark:text-white placeholder-slate-400"
                    value={formData.requirements}
                    onChange={e => setFormData({...formData, requirements: e.target.value})}
                />
            </div>

            <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Project Files</label>
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-800 transition cursor-pointer flex flex-col items-center gap-2 relative">
                    <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {projectFile ? (
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
                            <UploadCloud className="w-8 h-8" />
                            <span>{projectFile.name}</span>
                        </div>
                    ) : (
                        <>
                            <UploadCloud className="w-8 h-8 text-slate-300 dark:text-slate-500" />
                            <span className="text-slate-500 dark:text-slate-400">Click to upload .zip, .pdf, or .docx</span>
                            <span className="text-xs text-slate-400 dark:text-slate-600">Supported formats for download by partner</span>
                        </>
                    )}
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center gap-2"
            >
                {loading ? <><Loader className="w-5 h-5 animate-spin" /> Uploading...</> : (
                    <>
                        <FolderPlus className="w-5 h-5" /> Post Project
                    </>
                )}
            </button>

        </form>
    </div>
  );
};

export default AddProject;
