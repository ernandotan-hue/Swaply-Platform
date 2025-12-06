
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { store } from '../services/mockStore';
import { Download, Star, CheckCircle, ChevronLeft, FileText, AlertTriangle } from 'lucide-react';
import { SwapStatus, Swap, User } from '../types';

const ReviewProject: React.FC = () => {
    const { swapId } = useParams();
    const navigate = useNavigate();
    const currentUser = store.getCurrentUser();
    
    const [swap, setSwap] = useState<Swap | null>(null);
    const [partner, setPartner] = useState<User | null>(null);
    const [loadingData, setLoadingData] = useState(true);

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
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
            }
            setLoadingData(false);
        };
        load();
    }, [currentUser, swapId]);

    if (!currentUser || !swapId) return <div>Invalid request</div>;
    if (loadingData) return <div className="p-8 text-center">Loading...</div>;
    
    if (!swap || swap.status !== SwapStatus.IN_REVIEW) return <div className="p-8">This swap is not ready for review.</div>;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0) return;

        setSubmitting(true);
        setTimeout(() => {
            store.submitReview(swap.id, rating, comment);
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
                <h1 className="text-2xl font-bold text-slate-800">Review Project</h1>
            </div>

            <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                    <h3 className="font-bold text-amber-800 text-sm">Action Required</h3>
                    <p className="text-xs text-amber-700 mt-1">
                        {partner?.name} has submitted the project files. Please review them and complete the swap.
                    </p>
                </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 space-y-8">
                
                {/* File Download Section */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800">1. Download & Inspect</h2>
                    <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                             <div className="p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                 <FileText className="w-6 h-6 text-indigo-600" />
                             </div>
                             <div>
                                 <p className="font-bold text-slate-800 text-sm">Project Submission</p>
                                 <p className="text-xs text-slate-500">Uploaded {new Date(swap.updatedAt).toLocaleDateString()}</p>
                             </div>
                         </div>
                         <a 
                            href={swap.completionProof} 
                            download="project_file" 
                            target="_blank"
                            rel="noreferrer"
                            className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 font-bold text-xs rounded-lg hover:bg-indigo-50 transition flex items-center gap-2"
                         >
                             <Download className="w-4 h-4" /> Download
                         </a>
                    </div>
                    {swap.completionNote && (
                        <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-600 italic border border-slate-100">
                            "{swap.completionNote}"
                        </div>
                    )}
                </div>

                <div className="w-full h-px bg-slate-100"></div>

                {/* Rating Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <h2 className="text-lg font-bold text-slate-800">2. Rate & Approve</h2>
                    
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Rate your experience</label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className={`p-1 transition ${rating >= star ? 'scale-110' : 'hover:scale-110'}`}
                                >
                                    <Star 
                                        className={`w-8 h-8 ${rating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-200 fill-slate-50'}`} 
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Leave a review (Optional)</label>
                        <textarea 
                            rows={3}
                            placeholder="Great work! Delivered exactly what I needed..."
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition resize-none"
                            value={comment}
                            onChange={e => setComment(e.target.value)}
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={submitting || rating === 0}
                        className={`w-full py-4 text-white rounded-xl font-bold transition shadow-lg flex items-center justify-center gap-2 ${
                            rating === 0 ? 'bg-slate-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-green-200'
                        }`}
                    >
                        {submitting ? 'Finalizing...' : (
                            <>
                                <CheckCircle className="w-5 h-5" /> Approve & Complete Swap
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ReviewProject;