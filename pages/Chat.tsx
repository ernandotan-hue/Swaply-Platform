
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Image as ImageIcon, Paperclip, MoreVertical, Phone, Video, Check, CheckCheck, Smile, Sparkles, MessageSquare, Briefcase, Award, ShieldAlert, CheckCircle, FolderOpen, Clock, ArrowLeft } from 'lucide-react';
import { store } from '../services/mockStore';
import { Swap, Message, SwapStatus, SwapType, User } from '../types';
import { generateIcebreaker } from '../services/geminiService';

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = store.getCurrentUser();
  const [activeSwap, setActiveSwap] = useState<Swap | null>(null);
  const [messageText, setMessageText] = useState('');
  const [mySwaps, setMySwaps] = useState<Swap[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (currentUser) {
      store.getSwapsForUser(currentUser.id).then(async (swaps) => {
          setMySwaps(swaps);
          
          // Pre-fetch users
          const uIds = new Set<string>();
          swaps.forEach(s => { uIds.add(s.requesterId); uIds.add(s.receiverId); });
          const userMap: Record<string, User> = {};
          await Promise.all(Array.from(uIds).map(async uid => {
              const u = await store.getUserById(uid);
              if (u) userMap[uid] = u;
          }));
          setUsers(userMap);

          if (swaps.length > 0 && !activeSwap) {
            const sorted = [...swaps].sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            setActiveSwap(sorted[0]);
          } else if (activeSwap) {
              const found = swaps.find(s => s.id === activeSwap.id);
              if (found) setActiveSwap(found);
          }
      });
    }
  }, [currentUser, refresh]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeSwap?.messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeSwap || !currentUser) return;
    await store.sendMessage(activeSwap.id, currentUser.id, messageText);
    setMessageText('');
    setRefresh(r => r + 1);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAiIcebreaker = async () => {
      if (!activeSwap || !currentUser) return;
      setAiLoading(true);
      
      let myOffer = "Skill", theirOffer = "Skill";
      const suggestion = await generateIcebreaker(myOffer, theirOffer);
      setMessageText(suggestion);
      setAiLoading(false);
  };

  const handleAcceptSwap = async (swapId: string) => {
      await store.acceptSwap(swapId);
      setRefresh(r => r + 1);
  };

  const handleDeclineSwap = async (swapId: string) => {
      await store.declineSwap(swapId);
      setRefresh(r => r + 1);
  };

  const handleCompleteSwap = (swapId: string) => {
      navigate(`/complete-swap/${swapId}`);
  };

  if (!currentUser) return <div className="p-8 text-center text-slate-500">Please login to view messages.</div>;

  return (
    <div className="flex h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
      {/* Sidebar List */}
      <div className={`w-full md:w-80 border-r border-slate-200 flex flex-col ${activeSwap ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-800">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {mySwaps.length === 0 ? (
             <div className="p-4 text-center text-slate-400 text-sm mt-10">No active swaps yet.</div>
          ) : (
            mySwaps.map(swap => {
                const otherUserId = swap.requesterId === currentUser.id ? swap.receiverId : swap.requesterId;
                const otherUser = users[otherUserId];
                const lastMsg = swap.messages[swap.messages.length - 1];
                
                return (
                    <div 
                        key={swap.id}
                        onClick={() => setActiveSwap(swap)}
                        className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-50 ${activeSwap?.id === swap.id ? 'bg-indigo-50/50' : ''}`}
                    >
                        <div className="relative">
                            <img src={otherUser?.avatar || 'https://via.placeholder.com/40'} alt={otherUser?.name} className="w-12 h-12 rounded-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                                <h3 className="font-semibold text-slate-800 truncate">{otherUser?.name || 'Unknown'}</h3>
                                <span className="text-xs text-slate-400">{lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                            </div>
                            <div className="flex items-center gap-1 mb-1">
                                {swap.type === SwapType.PROJECT && <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded">PROJ</span>}
                            </div>
                            <p className="text-sm text-slate-500 truncate">
                                {lastMsg ? (
                                    lastMsg.type === 'system' ? '🔔 System Notification' : 
                                    lastMsg.type === 'swap_request' ? '📄 Swap Request' :
                                    lastMsg.type === 'image' ? '📷 Image' : lastMsg.text
                                ) : 'Start chatting!'}
                            </p>
                        </div>
                    </div>
                );
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      {activeSwap ? (
        <div className={`flex-1 flex flex-col ${!activeSwap ? 'hidden md:flex' : 'flex'}`}>
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white z-10 shadow-sm">
                <div className="flex items-center gap-3">
                    <button onClick={() => setActiveSwap(null)} className="md:hidden text-slate-500 hover:text-slate-800">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    {(() => {
                        const otherUserId = activeSwap.requesterId === currentUser.id ? activeSwap.receiverId : activeSwap.requesterId;
                        const otherUser = users[otherUserId];
                        return (
                            <>
                                <img src={otherUser?.avatar || 'https://via.placeholder.com/40'} alt="" className="w-10 h-10 rounded-full object-cover" />
                                <div>
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        {otherUser?.name}
                                        {activeSwap.status === SwapStatus.ACCEPTED && (
                                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">Active</span>
                                        )}
                                        {activeSwap.status === SwapStatus.COMPLETED && (
                                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">Completed</span>
                                        )}
                                    </h3>
                                </div>
                            </>
                        )
                    })()}
                </div>
                <div className="flex items-center gap-4">
                    {activeSwap.status === SwapStatus.ACCEPTED && (
                        <button 
                            onClick={() => handleCompleteSwap(activeSwap.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 shadow-md"
                        >
                            <CheckCircle className="w-3 h-3" /> Complete Swap
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5]/30 bg-opacity-50 relative">
                
                {activeSwap.messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;
                    const isSystem = msg.type === 'system';
                    const isSwapRequest = msg.type === 'swap_request';

                    if (isSystem) {
                        return (
                            <div key={msg.id} className="flex justify-center my-4">
                                <div className="bg-slate-200/80 text-slate-600 text-xs py-1.5 px-4 rounded-full font-medium shadow-sm">
                                    {msg.text}
                                </div>
                            </div>
                        );
                    }

                    if (isSwapRequest) {
                        // In full firestore mode, fetching skills for every message is overkill
                        // Simplified view for swap request card
                        const isReceiver = currentUser.id === activeSwap.receiverId;
                        return (
                            <div key={msg.id} className="flex justify-center my-6">
                                <div className="bg-white border border-indigo-100 rounded-2xl shadow-lg p-5 max-w-sm w-full relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500"></div>
                                    <h4 className="font-bold text-slate-800 mb-2">New Swap Request</h4>
                                    <p className="text-xs text-slate-500 mb-4">Check details in your dashboard</p>

                                    {isReceiver && activeSwap.status === SwapStatus.PENDING && (
                                        <div className="pt-3 border-t border-slate-50 flex gap-2">
                                            <button 
                                                onClick={() => handleDeclineSwap(activeSwap.id)}
                                                className="flex-1 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium transition"
                                            >
                                                Decline
                                            </button>
                                            <button 
                                                onClick={() => handleAcceptSwap(activeSwap.id)}
                                                className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-md"
                                            >
                                                Accept Swap
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] md:max-w-[60%] rounded-lg p-3 shadow-sm relative group ${isMe ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                                <p className="text-slate-800 text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                <div className="flex justify-end items-center gap-1 mt-1">
                                    <span className="text-[10px] text-slate-500">
                                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            {activeSwap.status === SwapStatus.COMPLETED ? (
                <div className="p-4 bg-slate-50 text-center border-t border-slate-200">
                    <p className="text-sm font-bold text-green-600 flex items-center justify-center gap-2">
                        <Award className="w-5 h-5" /> Swap Completed!
                    </p>
                </div>
            ) : (
                <div className="p-3 bg-white border-t border-slate-200 flex items-end gap-2">
                    <div className="flex-1 bg-slate-100 rounded-2xl flex items-center px-4 py-2 min-h-[44px]">
                        <textarea
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Type a message"
                            className="w-full bg-transparent border-none outline-none text-slate-800 resize-none h-6 text-sm py-1 no-scrollbar"
                            rows={1}
                        />
                    </div>
                    <button 
                        onClick={handleSendMessage}
                        className="p-3 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition shadow-md flex items-center justify-center"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center flex-col bg-slate-50 text-slate-400">
            <MessageSquare className="w-10 h-10 text-slate-400 mb-4" />
            <h3 className="text-lg font-medium text-slate-600">Select a chat</h3>
        </div>
      )}
    </div>
  );
};

export default Chat;