
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { store } from '../services/mockStore';
import { Upload, CheckCircle, ChevronLeft, AlertCircle, FileText } from 'lucide-react';
import { SwapType, Swap, User } from '../types';

const CompleteSwap: React.FC = () => {
    const { swapId } = useParams();
    const navigate = useNavigate();
    const currentUser = store.getCurrentUser();
    
    const [swap, setSwap] = useState<Swap | null>(null);
    const [partner, setPartner] = useState<User | null>(null);
    const [offeredTitle, setOfferedTitle] = useState("");
    const [requestedTitle, setRequestedTitle] = useState("");
    const [loadingData, setLoadingData] = useState(true);

    const [proofImage, setProofImage] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const load = async () => {
            if (!currentUser || !swapId) return;
            const swaps = await store.getSwapsForUser(currentUser.id);
            const s = swaps.find(i => i.id === swapId);
            setSwap(s || null);

            if (s) {
                const pid = s.requesterId === currentUser.id ? s.receiverId : s.requesterId;
                const p = await store.getUserById(pid);
                setPartner(p || null);

                if (s.type === SwapType.PROJECT) {
                    const p1 = s.offeredProjectId ? await store.getProjectById(s.offeredProjectId) : null;
                    const p2 = s.requestedProjectId ? await store.getProjectById(s.requestedProjectId) : null;
                    setOfferedTitle(p1?.title || "Project");
                    setRequestedTitle(p2?.title || "Project");
                } else {
                    const s1 = s.offeredSkillId ? await store.getSkillById(s.offeredSkillId) : null;
                    const s2 = s.requestedSkillId ? await store.getSkillById(s.requestedSkillId) : null;
                    setOfferedTitle(s1?.title || "Skill");
                    setRequestedTitle(s2?.title || "Skill");
                }
            }
            setLoadingData(false);
        };
        load();
    }, [currentUser, swapId]);

    if (!currentUser || !swapId) return <div>Invalid request</div>;
    if (loadingData) return <div className="p-8 text-center">Loading...</div>;
    if (!swap) return <div>Swap not found</div>;

    const isProject = swap.type === SwapType.PROJECT;

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProofImage(URL.createObjectURL(file));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!proofImage) return;

        setSubmitting(true);
        setTimeout(() => {
            store.completeSwap(swap.id, proofImage, note);
            setSubmitting(false);
            navigate('/progress');
        }, 1500);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-bold text-slate-800">
                    {isProject ? "Submit Project" : "Complete Swap"}
                </h1>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div>
                    <h3 className="font-bold text-indigo-800 text-sm">
                        {isProject ? "Ready to deliver?" : "Verify your exchange"}
                    </h3>
                    <p className="text-xs text-indigo-700 mt-1">
                        {isProject 
                            ? "Upload your project files here. Once submitted, your partner will review them before the swap is finalized." 
                            : "To maintain a high-trust community, we require proof that the skill exchange took place. This could be a screenshot of a call, etc."}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                
                {/* Summary Card */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Swap Summary</p>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-slate-800">{offeredTitle}</p>
                            <p className="text-xs text-slate-500">You offered</p>
                        </div>
                        <div className="text-slate-300">↔</div>
                        <div className="text-right">
                            <p className="font-bold text-slate-800">{requestedTitle}</p>
                            <p className="text-xs text-slate-500">From {partner?.name}</p>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        {isProject ? "Upload Project File (ZIP/PDF)" : "Upload Proof (Required)"}
                    </label>
                    <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-slate-50 transition cursor-pointer relative overflow-hidden group">
                        <input required type="file" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        {proofImage ? (
                            <div className="relative flex flex-col items-center justify-center h-48 bg-slate-100 rounded-lg">
                                {isProject ? (
                                    <>
                                        <FileText className="w-12 h-12 text-indigo-500 mb-2" />
                                        <span className="font-bold text-slate-700">File Ready to Upload</span>
                                    </>
                                ) : (
                                    <img src={proofImage} className="h-48 w-full object-cover rounded-lg" />
                                )}
                                <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                    <span className="text-slate-800 bg-white/80 px-3 py-1 rounded-full text-xs font-bold shadow-sm">Click to change</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                <Upload className="w-8 h-8 text-slate-300" />
                                <span>{isProject ? "Click to upload project files" : "Click to upload screenshot/photo"}</span>
                                <span className="text-xs text-slate-400">Supported: {isProject ? "ZIP, RAR, PDF" : "JPG, PNG"}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                        {isProject ? "Submission Note" : "Reflection Note"}
                    </label>
                    <textarea 
                        rows={4}
                        placeholder={isProject ? "Here are the files you requested. Let me know if..." : "How did it go? What did you learn?"}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                    />
                </div>

                <button 
                    type="submit" 
                    disabled={submitting || !proofImage}
                    className={`w-full py-4 text-white rounded-xl font-bold transition shadow-lg flex items-center justify-center gap-2 ${
                        !proofImage ? 'bg-slate-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-green-200'
                    }`}
                >
                    {submitting ? 'Processing...' : (
                        <>
                            <CheckCircle className="w-5 h-5" /> 
                            {isProject ? "Submit for Review" : "Confirm Completion"}
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

export default CompleteSwap;