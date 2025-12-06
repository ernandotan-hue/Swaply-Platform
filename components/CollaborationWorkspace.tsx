
import React, { useState, useRef, useEffect } from 'react';
import { X, PenTool, Eraser, MousePointer2, FileText, Grid3X3, Type, Trash2, Download, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { store } from '../services/mockStore';
import { Swap, User } from '../types';

const CollaborationWorkspace: React.FC = () => {
  const { swapId } = useParams();
  const navigate = useNavigate();
  const currentUser = store.getCurrentUser();
  
  const [activeTool, setActiveTool] = useState<'whiteboard' | 'docs' | 'sheets'>('whiteboard');
  const [drawingTool, setDrawingTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState('#4f46e5');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  // Data fetching
  const [swap, setSwap] = useState<Swap | null>(null);
  const [partner, setPartner] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
        if (!currentUser || !swapId) {
            setLoading(false);
            return;
        }
        
        const swaps = await store.getSwapsForUser(currentUser.id);
        const foundSwap = swaps.find(s => s.id === swapId);
        setSwap(foundSwap || null);

        if (foundSwap) {
            const partnerId = foundSwap.requesterId === currentUser.id ? foundSwap.receiverId : foundSwap.requesterId;
            const p = await store.getUserById(partnerId);
            setPartner(p || null);
        }
        setLoading(false);
    };
    fetchData();
  }, [currentUser, swapId]);

  const partnerName = partner?.name || 'Partner';

  // Docs state
  const [docContent, setDocContent] = useState(`## Shared Notes with ${partnerName}\n\n- Start typing here to collaborate...\n- Goals for today:\n  1. `);

  // Sheets state
  const [gridData, setGridData] = useState<string[][]>(Array(20).fill(Array(8).fill('')));

  useEffect(() => {
    // Canvas setup
    if (activeTool === 'whiteboard' && canvasRef.current) {
        const canvas = canvasRef.current;
        const dpr = window.devicePixelRatio || 1;
        // Delay slightly to ensure layout is computed
        setTimeout(() => {
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            
            const context = canvas.getContext('2d');
            if (context) {
                context.scale(dpr, dpr);
                context.lineCap = 'round';
                context.strokeStyle = color;
                context.lineWidth = 3;
                contextRef.current = context;
            }
        }, 10);
    }
  }, [activeTool]);

  useEffect(() => {
    if (contextRef.current) {
        contextRef.current.strokeStyle = drawingTool === 'eraser' ? '#ffffff' : color;
        contextRef.current.lineWidth = drawingTool === 'eraser' ? 20 : 3;
    }
  }, [color, drawingTool]);

  const startDrawing = ({ nativeEvent }: React.MouseEvent) => {
    if (!contextRef.current) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);
    setIsDrawing(true);
  };

  const finishDrawing = () => {
    if (!contextRef.current) return;
    contextRef.current.closePath();
    setIsDrawing(false);
  };

  const draw = ({ nativeEvent }: React.MouseEvent) => {
    if (!isDrawing || !contextRef.current) return;
    const { offsetX, offsetY } = nativeEvent;
    contextRef.current.lineTo(offsetX, offsetY);
    contextRef.current.stroke();
  };

  const clearCanvas = () => {
      if (canvasRef.current && contextRef.current) {
          contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
  };

  const handleGridChange = (rowIndex: number, colIndex: number, value: string) => {
      const newData = gridData.map((row, r) => {
          if (r !== rowIndex) return row;
          return row.map((cell, c) => c === colIndex ? value : cell);
      });
      setGridData(newData);
  };

  if (!currentUser || !swap) {
      if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
      
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
              <div className="text-center">
                  <h2 className="text-xl font-bold text-slate-800">Workspace Not Found</h2>
                  <button onClick={() => navigate('/progress')} className="mt-4 text-indigo-600 font-bold hover:underline">Return to Dashboard</button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col animate-fade-in">
        
        {/* Header */}
        <header className="bg-slate-900 text-white h-16 flex justify-between items-center px-6 shadow-md z-50">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/progress')} className="p-2 hover:bg-white/10 rounded-full transition text-slate-400 hover:text-white">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="h-6 w-px bg-slate-700 mx-2"></div>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm">
                        {partnerName.charAt(0)}
                    </div>
                    <div>
                        <h2 className="font-bold text-sm leading-tight">{partnerName}</h2>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            <span className="text-xs text-slate-400">Live Connection</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex bg-slate-800 rounded-lg p-1">
                <button 
                    onClick={() => setActiveTool('whiteboard')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeTool === 'whiteboard' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                    <PenTool className="w-4 h-4" /> Whiteboard
                </button>
                <button 
                    onClick={() => setActiveTool('docs')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeTool === 'docs' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                    <FileText className="w-4 h-4" /> Docs
                </button>
                <button 
                    onClick={() => setActiveTool('sheets')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium flex items-center gap-2 transition ${activeTool === 'sheets' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                    <Grid3X3 className="w-4 h-4" /> Sheets
                </button>
            </div>

            <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition">
                <Download className="w-4 h-4" /> Export
            </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative">
            
            {/* WHITEBOARD TOOLBAR */}
            {activeTool === 'whiteboard' && (
                <div className="absolute top-6 left-6 z-10 bg-white p-2 rounded-xl shadow-xl border border-slate-200 flex flex-col gap-2">
                    <button 
                        onClick={() => setDrawingTool('pen')}
                        className={`p-3 rounded-lg transition ${drawingTool === 'pen' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                        title="Pen"
                    >
                        <PenTool className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => setDrawingTool('eraser')}
                        className={`p-3 rounded-lg transition ${drawingTool === 'eraser' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}
                        title="Eraser"
                    >
                        <Eraser className="w-5 h-5" />
                    </button>
                    <div className="w-full h-px bg-slate-200 my-1"></div>
                    <div className="flex flex-col gap-2 p-1">
                        {['#4f46e5', '#ef4444', '#10b981', '#000000'].map(c => (
                            <button 
                                key={c} 
                                onClick={() => { setColor(c); setDrawingTool('pen'); }}
                                className={`w-6 h-6 rounded-full border-2 transition ${color === c && drawingTool === 'pen' ? 'border-slate-800 scale-125' : 'border-transparent hover:scale-110'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                    <div className="w-full h-px bg-slate-200 my-1"></div>
                    <button onClick={clearCanvas} className="p-3 text-red-500 hover:bg-red-50 rounded-lg transition" title="Clear All">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* WHITEBOARD CANVAS */}
            {activeTool === 'whiteboard' && (
                <div className="w-full h-full bg-white shadow-inner">
                    <canvas 
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseUp={finishDrawing}
                        onMouseLeave={finishDrawing}
                        onMouseMove={draw}
                        className="w-full h-full cursor-crosshair touch-none block"
                    />
                </div>
            )}

            {/* DOCS EDITOR */}
            {activeTool === 'docs' && (
                <div className="w-full h-full p-8 overflow-auto bg-slate-100">
                    <div className="bg-white max-w-4xl mx-auto min-h-[800px] shadow-sm border border-slate-200 rounded-xl overflow-hidden flex flex-col">
                        <div className="border-b border-slate-100 p-2 flex gap-2 bg-slate-50 sticky top-0">
                            <div className="flex gap-1">
                                <button className="p-1.5 hover:bg-slate-200 rounded"><Type className="w-4 h-4 text-slate-600" /></button>
                                {/* Add more dummy toolbar items for realism */}
                                <button className="p-1.5 hover:bg-slate-200 rounded font-bold text-slate-600 text-xs w-6">B</button>
                                <button className="p-1.5 hover:bg-slate-200 rounded italic text-slate-600 text-xs w-6">I</button>
                            </div>
                            <div className="w-px bg-slate-300 h-6 my-auto"></div>
                            <span className="text-xs text-slate-400 my-auto px-2">Auto-saved just now</span>
                        </div>
                        <textarea 
                            value={docContent}
                            onChange={(e) => setDocContent(e.target.value)}
                            className="flex-1 w-full p-12 outline-none resize-none font-mono text-slate-900 bg-white leading-relaxed text-base"
                            style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                        />
                    </div>
                </div>
            )}

            {/* SPREADSHEET */}
            {activeTool === 'sheets' && (
                <div className="w-full h-full overflow-auto bg-white">
                    <table className="w-full border-collapse bg-white">
                        <thead>
                            <tr>
                                <th className="w-10 bg-slate-50 border border-slate-200 sticky top-0 left-0 z-20"></th>
                                {['A','B','C','D','E','F','G','H'].map(l => (
                                    <th key={l} className="bg-slate-50 border border-slate-200 p-2 text-sm font-semibold text-slate-600 w-32 sticky top-0 z-10">{l}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {gridData.map((row, rIndex) => (
                                <tr key={rIndex}>
                                    <td className="bg-slate-50 border border-slate-200 text-center text-xs text-slate-400 font-medium sticky left-0 z-10">{rIndex + 1}</td>
                                    {row.map((cell, cIndex) => (
                                        <td key={`${rIndex}-${cIndex}`} className="border border-slate-200 p-0 bg-white">
                                            <input 
                                                type="text" 
                                                value={cell}
                                                onChange={(e) => handleGridChange(rIndex, cIndex, e.target.value)}
                                                className="w-full h-full p-2 outline-none focus:bg-indigo-50 focus:border-indigo-500 focus:border-2 transition text-sm text-slate-900 bg-white"
                                                style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

        </div>
    </div>
  );
};

export default CollaborationWorkspace;