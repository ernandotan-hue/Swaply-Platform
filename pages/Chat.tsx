
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Image as ImageIcon, Paperclip, MoreVertical, Phone, Video, Check, CheckCheck, Smile, Sparkles, MessageSquare, Briefcase, Award, ShieldAlert, CheckCircle, FolderOpen, Clock, ArrowLeft, RefreshCw } from 'lucide-react';
import { store } from '../services/mockStore';
import { Swap, Message, SwapStatus, SwapType, User, Skill, Project } from '../types';
import { generateIcebreaker } from '../services/geminiService';

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = store.getCurrentUser();
  const [activeSwap, setActiveSwap] = useState<Swap | null>(null);
  const [messageText, setMessageText] = useState('');
  const [mySwaps, setMySwaps] = useState<Swap[]>([]);
  
  // Cache for related data
  const [users, setUsers] = useState<Record<string, User>>({});
  const [skills, setSkills] = useState<Record<string, Skill>>({});
  const [projects, setProjects] = useState<Record<string, Project>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (currentUser) {
      store.getSwapsForUser(currentUser.id).then(async (swaps) => {
          // Sort by latest update
          const sortedSwaps = [...swaps].sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
          setMySwaps(sortedSwaps);
          
          // Pre-fetch Users, Skills, and Projects for context
          const uIds = new Set<string>();
          const sIds = new Set<string>();
          const pIds = new Set<string>();

          sortedSwaps.forEach(s => { 
              uIds.add(s.requesterId); 
              uIds.add(s.receiverId); 
              if (s.offeredSkillId) sIds.add(s.offeredSkillId);
              if (s.requestedSkillId) sIds.add(s.requestedSkillId);
              if (s.offeredProjectId) pIds.add(s.offeredProjectId);
              if (s.requestedProjectId) pIds.add(s.requestedProjectId);
          });

          // Fetch Users
          const userMap: Record<string, User> = {};
          await Promise.all(Array.from(uIds).map(async uid => {
              if (users[uid]) return; // Skip if already loaded
              const u = await store.getUserById(uid);
              if (u) userMap[uid] = u;
          }));
          setUsers(prev => ({ ...prev, ...userMap }));

          // Fetch Skills
          const skillMap: Record<string, Skill> = {};
          await Promise.all(Array.from(sIds).map(async sid => {
              if (skills[sid]) return;
              const s = await store.getSkillById(sid);
              if (s) skillMap[sid] = s;
          }));
          setSkills(prev => ({ ...prev, ...skillMap }));

          // Fetch Projects
          const projectMap: Record<string, Project> = {};
          await Promise.all(Array.from(pIds).map(async pid => {
              if (projects[pid]) return;
              const p = await store.getProjectById(pid);
              if (p) projectMap[pid] = p;
          }));
          setProjects(prev => ({ ...prev, ...projectMap }));

          // Handle Active Swap selection / updates
          if (sortedSwaps.length > 0 && !activeSwap) {
             // Auto-select first if none selected
             // Don't auto-select on mobile to allow viewing list
             if (window.innerWidth >= 768) {
                 setActiveSwap(sortedSwaps[0]);
             }
          } else if (activeSwap) {
              // Update the active swap object with new data (e.g. new messages)
              const found = sortedSwaps.find(s => s.id === activeSwap.id);
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
  }, [activeSwap?.messages, activeSwap?.id]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeSwap || !currentUser) return;
    
    const textToSend = messageText;
    setMessageText(''); // Clear input immediately
    setSending(true);

    // Optimistic Update: Add message to UI immediately before server confirmation
    const optimisticMessage: Message = {
        id: `temp_${Date.now()}`,
        senderId: currentUser.id,
        text: textToSend,
        timestamp: new Date(),
        type: 'text',
        status: 'sent'
    };
    
    const prevSwapState = { ...activeSwap };
    const optimisticSwap = {
        ...activeSwap,
        messages: [...activeSwap.messages, optimisticMessage],
        updatedAt: new Date()
    };
    setActiveSwap(optimisticSwap);

    try {
        await store.sendMessage(activeSwap.id, currentUser.id, textToSend);
        setRefresh(r => r + 1); // Trigger re-fetch to get 'real' data state
    } catch (e) {
        console.error("Failed to send message", e);
        alert("Failed to send message. Please try again.");
        setActiveSwap(prevSwapState); // Revert on failure
        setMessageText(textToSend); // Restore text
    } finally {
        setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getSwapTitle = (swap: Swap) => {
      // Determines a descriptive title for the swap (e.g. "React Tutoring")
      if (swap.type === SwapType.SKILL) {
          // If I am requester, I want the requested skill. If I am receiver, I offered the skill.
          // Let's just show the primary topic.
          const skillId = swap.requestedSkillId || swap.offeredSkillId;
          return skills[skillId!]?.title || "Unknown Skill";
      } else {
          const projId = swap.requestedProjectId || swap.offeredProjectId;
          return projects[projId!]?.title || "Unknown Project";
      }
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

  if (!currentUser) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Please login to view messages.</div>;

  return (
    <div className="flex h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
      {/* Sidebar List */}
      <div className={`w-full md:w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col ${activeSwap ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 dark:text-white">Messages</h2>
          <button onClick={() => setRefresh(r => r+1)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition">
              <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {mySwaps.length === 0 ? (
             <div className="p-4 text-center text-slate-400 text-sm mt-10">No active swaps yet.</div>
          ) : (
            mySwaps.map(swap => {
                const otherUserId = swap.requesterId === currentUser.id ? swap.receiverId : swap.requesterId;
                const otherUser = users[otherUserId];
                const lastMsg = swap.messages[swap.messages.length - 1];
                const swapTitle = getSwapTitle(swap);
                
                return (
                    <div 
                        key={swap.id}
                        onClick={() => setActiveSwap(swap)}
                        className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800 ${activeSwap?.id === swap.id ? 'bg-indigo-50/50 dark:bg-slate-800 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'}`}
                    >
                        <div className="relative">
                            <img src={otherUser?.avatar || 'https://via.placeholder.com/40'} alt={otherUser?.name} className="w-12 h-12 rounded-full object-cover bg-slate-200 dark:bg-slate-700" />
                            {otherUser?.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <h3 className="font-semibold text-slate-800 dark:text-white truncate text-sm">{otherUser?.name || 'Unknown'}</h3>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                            </div>
                            
                            {/* Context Label */}
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium truncate max-w-[140px] ${
                                    swap.type === SwapType.PROJECT 
                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' 
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                }`}>
                                    {swapTitle}
                                </span>
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {lastMsg ? (
                                    lastMsg.type === 'system' ? '🔔 ' + lastMsg.text : 
                                    lastMsg.type === 'swap_request' ? '📄 Swap Request' :
                                    lastMsg.senderId === currentUser.id ? `You: ${lastMsg.text}` : lastMsg.text
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
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10 shadow-sm h-[72px]">
                <div className="flex items-center gap-3">
                    <button onClick={() => setActiveSwap(null)} className="md:hidden text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    {(() => {
                        const otherUserId = activeSwap.requesterId === currentUser.id ? activeSwap.receiverId : activeSwap.requesterId;
                        const otherUser = users[otherUserId];
                        const title = getSwapTitle(activeSwap);
                        return (
                            <>
                                <img src={otherUser?.avatar || 'https://via.placeholder.com/40'} alt="" className="w-10 h-10 rounded-full object-cover bg-slate-200 dark:bg-slate-700" />
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 text-sm md:text-base">
                                        {otherUser?.name}
                                        <span className="text-slate-300 dark:text-slate-600">•</span>
                                        <span className="text-indigo-600 dark:text-indigo-400 truncate max-w-[120px] md:max-w-xs">{title}</span>
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                            activeSwap.status === SwapStatus.ACCEPTED 
                                            ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' 
                                            : activeSwap.status === SwapStatus.PENDING
                                            ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                                        }`}>
                                            {activeSwap.status}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )
                    })()}
                </div>
                <div className="flex items-center gap-4">
                    {activeSwap.status === SwapStatus.ACCEPTED && (
                        <button 
                            onClick={() => handleCompleteSwap(activeSwap.id)}
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 md:px-4 rounded-full text-xs font-bold transition flex items-center gap-1 shadow-md whitespace-nowrap"
                        >
                            <CheckCircle className="w-3 h-3" /> <span className="hidden md:inline">Complete Swap</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5]/30 dark:bg-slate-950 bg-opacity-50 relative">
                
                {activeSwap.messages.map((msg, idx) => {
                    const isMe = msg.senderId === currentUser.id;
                    const isSystem = msg.type === 'system';
                    const isSwapRequest = msg.type === 'swap_request';
                    
                    // Simple grouping by sender
                    const prevMsg = activeSwap.messages[idx - 1];
                    const isSequence = prevMsg && prevMsg.senderId === msg.senderId && !isSystem && prevMsg.type !== 'system' && (new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() < 60000);

                    if (isSystem) {
                        return (
                            <div key={msg.id} className="flex justify-center my-4">
                                <div className="bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs py-1.5 px-4 rounded-full font-medium shadow-sm border border-slate-300/50 dark:border-slate-700">
                                    {msg.text}
                                </div>
                            </div>
                        );
                    }

                    if (isSwapRequest) {
                        const isReceiver = currentUser.id === activeSwap.receiverId;
                        return (
                            <div key={msg.id} className="flex justify-center my-6">
                                <div className="bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 rounded-2xl shadow-lg p-5 max-w-sm w-full relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500"></div>
                                    <h4 className="font-bold text-slate-800 dark:text-white mb-2">New Swap Request</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">A new barter proposal has been initiated.</p>

                                    {isReceiver && activeSwap.status === SwapStatus.PENDING && (
                                        <div className="pt-3 border-t border-slate-50 dark:border-slate-700 flex gap-2">
                                            <button 
                                                onClick={() => handleDeclineSwap(activeSwap.id)}
                                                className="flex-1 py-2 text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition"
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
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isSequence ? 'mt-1' : 'mt-3'}`}>
                            <div className={`max-w-[80%] md:max-w-[60%] rounded-2xl px-4 py-2.5 shadow-sm relative group text-sm ${
                                isMe 
                                ? 'bg-indigo-600 text-white rounded-tr-none' 
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white rounded-tl-none border border-slate-100 dark:border-slate-700'
                            }`}>
                                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end text-indigo-200' : 'justify-start text-slate-400'}`}>
                                    <span className="text-[10px]">
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
                <div className="p-4 bg-slate-50 dark:bg-slate-900 text-center border-t border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-bold text-green-600 dark:text-green-400 flex items-center justify-center gap-2">
                        <Award className="w-5 h-5" /> Swap Completed!
                    </p>
                </div>
            ) : (
                <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-end gap-2">
                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center px-4 py-2 min-h-[44px]">
                        <textarea
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Type a message..."
                            className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-white resize-none h-6 text-sm py-1 no-scrollbar placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            rows={1}
                        />
                    </div>
                    <button 
                        onClick={handleSendMessage}
                        disabled={!messageText.trim()}
                        className={`p-3 rounded-full transition shadow-md flex items-center justify-center ${
                            messageText.trim() 
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                            : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                        }`}
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center flex-col bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 p-8 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6">
                <MessageSquare className="w-10 h-10 text-indigo-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Your Conversations</h3>
            <p className="max-w-xs text-sm">Select a chat from the sidebar to continue swapping skills or projects.</p>
        </div>
      )}
    </div>
  );
};

export default Chat;
