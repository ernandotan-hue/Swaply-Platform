
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Send, MessageSquare, ArrowLeft, RefreshCw, Award, CheckCircle } from 'lucide-react';
import { store } from '../services/mockStore';
import { Swap, Message, SwapStatus, User, SwapType, Skill, Project } from '../types';

// Interface for a grouped conversation with a specific user
interface Conversation {
    partnerId: string;
    partner: User | null;
    messages: Message[];
    swaps: Swap[]; // All swaps with this person
    lastMessageTime: Date;
    latestSwapId: string; // The ID of the most recent swap to attach new messages to
}

const Chat: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = store.getCurrentUser();
  
  // Conversations grouped by User ID
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePartnerId, setActivePartnerId] = useState<string | null>(null);
  
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sending, setSending] = useState(false);
  const [refresh, setRefresh] = useState(0);

  // Load all swaps and group them by user
  useEffect(() => {
    if (currentUser) {
      store.getSwapsForUser(currentUser.id).then(async (allSwaps) => {
          
          const groups: Record<string, Swap[]> = {};
          const userIds = new Set<string>();

          // Group swaps by the OTHER user
          allSwaps.forEach(s => {
              const partnerId = s.requesterId === currentUser.id ? s.receiverId : s.requesterId;
              if (!groups[partnerId]) groups[partnerId] = [];
              groups[partnerId].push(s);
              userIds.add(partnerId);
          });

          // Fetch user details
          const users: Record<string, User> = {};
          await Promise.all(Array.from(userIds).map(async uid => {
              const u = await store.getUserById(uid);
              if (u) users[uid] = u;
          }));

          // Construct Conversation objects
          const convos: Conversation[] = Object.keys(groups).map(partnerId => {
              const userSwaps = groups[partnerId];
              
              // Sort swaps by update time to find the latest context
              userSwaps.sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
              const latestSwap = userSwaps[0];

              // Aggregate all messages and sort chronologically
              let allMessages: Message[] = [];
              userSwaps.forEach(s => {
                  allMessages = [...allMessages, ...s.messages];
              });
              allMessages.sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

              const lastMsg = allMessages.length > 0 ? allMessages[allMessages.length - 1] : null;

              return {
                  partnerId,
                  partner: users[partnerId] || null,
                  messages: allMessages,
                  swaps: userSwaps,
                  lastMessageTime: lastMsg ? new Date(lastMsg.timestamp) : new Date(latestSwap.updatedAt),
                  latestSwapId: latestSwap.id
              };
          });

          // Sort conversations by most recent activity
          convos.sort((a,b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());
          setConversations(convos);

          // Handle navigation from other pages (e.g. "Request Swap" button)
          const state = location.state as { highlightSwapId?: string } | null;
          if (state?.highlightSwapId && !activePartnerId) {
             const targetSwap = allSwaps.find(s => s.id === state.highlightSwapId);
             if (targetSwap) {
                 const partnerId = targetSwap.requesterId === currentUser.id ? targetSwap.receiverId : targetSwap.requesterId;
                 setActivePartnerId(partnerId);
             }
          } else if (convos.length > 0 && !activePartnerId && window.innerWidth >= 768) {
              // Auto-select first on desktop if none selected
              setActivePartnerId(convos[0].partnerId);
          }
      });
    }
  }, [currentUser, refresh, location.state]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const activeConversation = conversations.find(c => c.partnerId === activePartnerId);

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeConversation || !currentUser) return;
    
    const textToSend = messageText;
    setMessageText(''); 
    setSending(true);

    // Optimistic Update in UI
    const optimisticMessage: Message = {
        id: `temp_${Date.now()}`,
        senderId: currentUser.id,
        text: textToSend,
        timestamp: new Date(),
        type: 'text',
        status: 'sent'
    };
    
    // Temporarily add to local state for instant feedback
    const updatedConvo = { ...activeConversation, messages: [...activeConversation.messages, optimisticMessage] };
    const updatedConvos = conversations.map(c => c.partnerId === activeConversation.partnerId ? updatedConvo : c);
    setConversations(updatedConvos);

    try {
        // We attach the message to the LATEST swap to ensure it's recorded in the DB against a valid transaction
        // In a real relational DB, this would go to a 'chats' table, but here we append to the most relevant Swap document.
        await store.sendMessage(activeConversation.latestSwapId, currentUser.id, textToSend);
        setTimeout(() => setRefresh(r => r + 1), 500);
    } catch (e) {
        console.error("Failed to send", e);
        alert("Failed to send message");
        setRefresh(r => r + 1); // Revert
        setMessageText(textToSend);
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

  // Helper to show context about what's currently being swapped
  const getActiveContext = (convo: Conversation) => {
      // Find a swap that is NOT completed/declined/cancelled
      const active = convo.swaps.find(s => 
          s.status === SwapStatus.ACCEPTED || 
          s.status === SwapStatus.IN_REVIEW || 
          s.status === SwapStatus.WAITING_VERIFICATION || 
          s.status === SwapStatus.PENDING
      );
      
      if (active) {
         // Need to fetch skill titles (omitted for brevity, just showing status type)
         return {
             type: 'active',
             status: active.status,
             isProject: active.type === SwapType.PROJECT
         };
      }
      return null;
  };

  if (!currentUser) return <div className="p-8 text-center text-slate-500">Please login.</div>;

  return (
    <div className="flex h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800">
      
      {/* Sidebar - LIST OF PEOPLE */}
      <div className={`w-full md:w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
          <h2 className="font-bold text-slate-800 dark:text-white">Messages</h2>
          <button onClick={() => setRefresh(r => r+1)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition">
              <RefreshCw className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
             <div className="p-4 text-center text-slate-400 text-sm mt-10">No messages yet.</div>
          ) : (
            conversations.map(convo => {
                const lastMsg = convo.messages[convo.messages.length - 1];
                const context = getActiveContext(convo);
                
                return (
                    <div 
                        key={convo.partnerId}
                        onClick={() => setActivePartnerId(convo.partnerId)}
                        className={`p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-50 dark:border-slate-800 ${activeConversation?.partnerId === convo.partnerId ? 'bg-indigo-50/50 dark:bg-slate-800 border-l-4 border-l-indigo-500' : 'border-l-4 border-l-transparent'}`}
                    >
                        <div className="relative">
                            <img src={convo.partner?.avatar || 'https://via.placeholder.com/40'} className="w-12 h-12 rounded-full object-cover bg-slate-200 dark:bg-slate-700" />
                            {convo.partner?.isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full"></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-0.5">
                                <h3 className="font-semibold text-slate-800 dark:text-white truncate text-sm">{convo.partner?.name || 'Unknown'}</h3>
                                <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                            </div>
                            
                            {/* Context Pill */}
                            {context && (
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium truncate ${
                                        context.status === SwapStatus.ACCEPTED ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {context.status === SwapStatus.PENDING ? 'Request Pending' : 'Swap Active'}
                                    </span>
                                </div>
                            )}

                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {lastMsg ? (
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

      {/* Chat Area - UNIFIED TIMELINE */}
      {activeConversation ? (
        <div className={`flex-1 flex flex-col ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
            
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10 shadow-sm h-[72px]">
                <div className="flex items-center gap-3">
                    <button onClick={() => setActivePartnerId(null)} className="md:hidden text-slate-500 hover:text-slate-800">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <img src={activeConversation.partner?.avatar} className="w-10 h-10 rounded-full object-cover bg-slate-200" />
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white text-sm md:text-base">
                            {activeConversation.partner?.name}
                        </h3>
                        {/* Show if there's an active swap */}
                        {(() => {
                            const ctx = getActiveContext(activeConversation);
                            if (ctx) {
                                return <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Active Swap in Progress</p>;
                            } else {
                                return <p className="text-xs text-slate-400">History Mode</p>;
                            }
                        })()}
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#e5ddd5]/30 dark:bg-slate-950 bg-opacity-50 relative">
                
                {/* Unified timeline of messages from ALL swaps with this person */}
                {activeConversation.messages.map((msg, idx) => {
                    const isMe = msg.senderId === currentUser.id;
                    const isSystem = msg.type === 'system';
                    const isSwapRequest = msg.type === 'swap_request';
                    
                    const prevMsg = activeConversation.messages[idx - 1];
                    const isSequence = prevMsg && prevMsg.senderId === msg.senderId && !isSystem && prevMsg.type !== 'system' && (new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime() < 60000);

                    if (isSystem) {
                        return (
                            <div key={msg.id} className="flex justify-center my-4">
                                <div className="bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs py-1.5 px-4 rounded-full font-medium shadow-sm">
                                    {msg.text}
                                </div>
                            </div>
                        );
                    }

                    if (isSwapRequest) {
                        return (
                            <div key={msg.id} className="flex justify-center my-6">
                                <div className="bg-white dark:bg-slate-800 border border-indigo-100 dark:border-slate-700 rounded-2xl shadow-lg p-5 max-w-sm w-full">
                                    <h4 className="font-bold text-slate-800 dark:text-white mb-2">Swap Request</h4>
                                    <p className="text-xs text-slate-500 mb-2">A request was made at {new Date(msg.timestamp).toLocaleDateString()}</p>
                                    <button 
                                        onClick={() => navigate('/progress')}
                                        className="w-full py-2 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-lg hover:bg-indigo-100 transition"
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isSequence ? 'mt-1' : 'mt-3'}`}>
                            <div className={`max-w-[80%] md:max-w-[60%] rounded-2xl px-4 py-2.5 shadow-sm relative text-sm ${
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

            {/* Input Area - Always available, even if swaps are completed */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-end gap-2">
                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center px-4 py-2 min-h-[44px]">
                    <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type a message..."
                        className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-white resize-none h-6 text-sm py-1 no-scrollbar placeholder:text-slate-400"
                        rows={1}
                    />
                </div>
                <button 
                    type="button"
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
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center flex-col bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-500 p-8 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center mb-6">
                <MessageSquare className="w-10 h-10 text-indigo-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">Your Conversations</h3>
            <p className="max-w-xs text-sm">Select a person to chat with. All your history is kept in one place.</p>
        </div>
      )}
    </div>
  );
};

export default Chat;
