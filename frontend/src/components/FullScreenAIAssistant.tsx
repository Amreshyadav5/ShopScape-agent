import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Plus,
  ShoppingBag,
  Package,
  ArrowLeft,
  Star,
  CheckCircle2,
  Trash2,
  CreditCard,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Search,
  Scale,
  DollarSign,
  Truck,
  Leaf,
  AlertCircle,
  Menu,
  X
} from 'lucide-react';
import type {
  Product,
  Cart,
  User as UserType,
  AgentChatMessage,
  OrderProposal
} from '../types';
import { api } from '../api';

interface FullScreenAIAssistantProps {
  user: UserType | null;
  currencySymbol: string;
  cart: Cart | null;
  onAddToCart: (product: any, quantity?: number) => void;
  onUpdateCartQuantity: (itemId: number, quantity: number) => void;
  onRemoveCartItem: (itemId: number) => void;
  onSelectProduct: (product: Product) => void;
  onProceedToCheckout: () => void;
  onBackToStore: () => void;
  onNavigateToCatalog: () => void;
  onNavigateToOrders: () => void;
  onRefreshCart: () => void;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
}

interface SavedSession {
  id: string;
  title: string;
  date: string;
  timestamp: number;
  messages: AgentChatMessage[];
}

export const FullScreenAIAssistant: React.FC<FullScreenAIAssistantProps> = ({
  user,
  currencySymbol,
  cart,
  onAddToCart,
  onUpdateCartQuantity,
  onRemoveCartItem,
  onSelectProduct,
  onProceedToCheckout,
  onBackToStore,
  onNavigateToCatalog,
  onNavigateToOrders,
  onRefreshCart,
  initialPrompt,
  onClearInitialPrompt,
}) => {
  // Sidebar & Layout State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(true);

  // Chat State
  const [sessionId, setSessionId] = useState<string>(() => {
    return 'session_' + Math.random().toString(36).substring(2, 9);
  });
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // History State
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);

  // Cart Toast Notification
  const [cartToast, setCartToast] = useState<{ show: boolean; message: string; subtotal?: number }>({
    show: false,
    message: '',
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load Sessions from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('shopease_ai_sessions');
      if (stored) {
        setSavedSessions(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save Sessions to localStorage
  const persistSession = (currentMessages: AgentChatMessage[]) => {
    if (currentMessages.length === 0) return;
    const firstUserMsg = currentMessages.find(m => m.role === 'user')?.content || 'Shopping Assistant';
    const title = firstUserMsg.length > 32 ? firstUserMsg.substring(0, 32) + '...' : firstUserMsg;
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    setSavedSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      const updatedSession: SavedSession = {
        id: sessionId,
        title,
        date: dateStr,
        timestamp: Date.now(),
        messages: currentMessages,
      };
      const newList = [updatedSession, ...filtered].slice(0, 20);
      try {
        localStorage.setItem('shopease_ai_sessions', JSON.stringify(newList));
      } catch {
        // ignore
      }
      return newList;
    });
  };

  // Scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    chatEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Handle Initial Prompt if passed from another view
  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSendMessage(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt]);

  // Adjust textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [inputValue]);

  // Trigger Toast Notification
  const showToast = (message: string, subtotal?: number) => {
    setCartToast({ show: true, message, subtotal });
    setTimeout(() => {
      setCartToast(prev => ({ ...prev, show: false }));
    }, 3800);
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    setErrorMsg(null);
    const userMsg: AgentChatMessage = {
      id: 'msg_' + Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);

    try {
      const res = await api.agentChat(text);
      const assistantMsg: AgentChatMessage = {
        id: 'msg_' + (Date.now() + 1),
        role: 'assistant',
        content: res.reply || 'Here is what I found for you.',
        recommended_products: res.recommended_products,
        order_proposal: res.order_proposal,
        cart_summary: res.cart_summary,
        comparison: res.comparison,
        navigate_to: res.navigate_to,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);
      persistSession(finalMessages);

      if (res.cart_updated) {
        onRefreshCart();
        showToast('Cart updated successfully!', res.cart_summary?.subtotal);
      }

      // Check if server requested navigation (e.g. checkout)
      if (res.navigate_to === 'checkout') {
        setTimeout(() => {
          onProceedToCheckout();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to connect to AI assistant. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // New Chat action
  const handleNewChat = () => {
    const newId = 'session_' + Math.random().toString(36).substring(2, 9);
    setSessionId(newId);
    setMessages([]);
    setErrorMsg(null);
    setInputValue('');
  };

  // Switch to Saved Session
  const handleSelectSession = (sess: SavedSession) => {
    setSessionId(sess.id);
    setMessages(sess.messages || []);
    setErrorMsg(null);
    setIsMobileSidebarOpen(false);
  };

  // Confirm Order Proposal
  const handleConfirmOrderProposal = async (proposal: OrderProposal) => {
    try {
      await onAddToCart({
        id: proposal.product_id,
        name: proposal.product_name,
        price: proposal.unit_price,
        image_url: proposal.image_url,
      }, proposal.quantity);

      showToast(`Added ${proposal.quantity}x ${proposal.product_name} to cart!`, proposal.subtotal);
      onRefreshCart();

      // Update message proposal state in local messages
      setMessages(prev => prev.map(m => {
        if (m.order_proposal && m.order_proposal.product_id === proposal.product_id) {
          return {
            ...m,
            order_proposal: { ...m.order_proposal, status: 'confirmed' }
          };
        }
        return m;
      }));

      // Send follow-up confirmation note to AI
      handleSendMessage(`Confirm add to cart: ${proposal.quantity}x ${proposal.product_name}`);
    } catch (e: any) {
      showToast(`Failed to add: ${e.message}`);
    }
  };

  // Cancel Order Proposal
  const handleCancelOrderProposal = (proposal: OrderProposal) => {
    setMessages(prev => prev.map(m => {
      if (m.order_proposal && m.order_proposal.product_id === proposal.product_id) {
        return {
          ...m,
          order_proposal: { ...m.order_proposal, status: 'cancelled' }
        };
      }
      return m;
    }));
  };

  // Group Saved Sessions by Date
  const groupSessionsByDate = () => {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    const groups: { today: SavedSession[]; yesterday: SavedSession[]; earlier: SavedSession[] } = {
      today: [],
      yesterday: [],
      earlier: []
    };

    savedSessions.forEach(s => {
      const sDate = new Date(s.timestamp).toDateString();
      if (sDate === today) {
        groups.today.push(s);
      } else if (sDate === yesterday) {
        groups.yesterday.push(s);
      } else {
        groups.earlier.push(s);
      }
    });

    return groups;
  };

  const sessionGroups = groupSessionsByDate();

  // Suggestion Cards on Welcome Screen
  const suggestionCards = [
    {
      title: 'Find products within budget',
      desc: '“Find organic groceries and pantry items under ₹500”',
      icon: <DollarSign style={{ width: '18px', height: '18px', color: '#16a34a' }} />,
      prompt: 'Find organic groceries and pantry items under ₹500 with high customer ratings',
    },
    {
      title: 'Compare two products',
      desc: '“Compare Kashmiri Acacia Honey with Raw Wildflower Honey”',
      icon: <Scale style={{ width: '18px', height: '18px', color: '#2563eb' }} />,
      prompt: 'Compare Kashmiri Acacia Honey with Raw Wildflower Honey in terms of taste, price, and health benefits',
    },
    {
      title: 'Discover organic groceries',
      desc: '“Show me fresh organic sabji and farm vegetables”',
      icon: <Leaf style={{ width: '18px', height: '18px', color: '#059669' }} />,
      prompt: 'Show me fresh organic sabji and farm vegetables currently available in stock',
    },
    {
      title: 'Track my recent order',
      desc: '“Check delivery status of my latest purchase”',
      icon: <Truck style={{ width: '18px', height: '18px', color: '#d97706' }} />,
      prompt: 'Track my recent order and show delivery status',
    },
  ];

  // Quick Chips above Composer
  const quickChips = [
    'Organic honey under ₹800',
    'Farm fresh red tomatoes',
    'Compare olive oil & coconut oil',
    'What is my cart total?',
    'Proceed to checkout',
  ];

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: '#8c8376',
      color: '#1f2421',
      fontFamily: 'var(--font-body, system-ui, -apple-system, sans-serif)',
      position: 'relative',
    }}>

      {/* ============================================================== */}
      {/* 1. LEFT SIDEBAR (Desktop ~260px & Mobile Drawer) */}
      {/* ============================================================== */}
      <aside
        style={{
          width: isSidebarOpen ? '260px' : '0px',
          minWidth: isSidebarOpen ? '260px' : '0px',
          background: '#f8f6f1',
          borderRight: '1px solid rgba(135, 126, 114, 0.22)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.25s ease, min-width 0.25s ease',
          overflow: 'hidden',
          zIndex: 30,
        }}
        className="hidden md:flex"
      >
        {/* Brand & New Chat */}
        <div style={{ padding: '1.125rem 1rem', borderBottom: '1px solid #f0f2ee' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div
              onClick={onBackToStore}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
              title="Return to ShopScape Storefront"
            >
              <div style={{
                width: '30px', height: '30px',
                background: 'var(--green-600, #2d7a38)',
                borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff',
              }}>
                <ShoppingBag style={{ width: '16px', height: '16px' }} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#1f2421', lineHeight: 1.1 }}>
                  ShopScape AI
                </div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--green-600, #2d7a38)', fontWeight: 500 }}>
                  Smart Shopping Agent
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsSidebarOpen(false)}
              title="Collapse sidebar"
              style={{
                background: 'none',
                border: 'none',
                color: '#71767b',
                cursor: 'pointer',
                padding: '0.25rem',
                borderRadius: '4px',
              }}
            >
              <PanelLeftClose style={{ width: '18px', height: '18px' }} />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.55rem 0.875rem',
              background: '#f4f6f3',
              color: '#1f2421',
              border: '1px solid #e2e6e0',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#eaf0e8';
              e.currentTarget.style.borderColor = '#cdd8ca';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#f4f6f3';
              e.currentTarget.style.borderColor = '#e2e6e0';
            }}
          >
            <Plus style={{ width: '15px', height: '15px', color: 'var(--green-600, #2d7a38)' }} />
            New Chat
          </button>
        </div>

        {/* Shortcuts Section */}
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f0f2ee' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c9196', marginBottom: '0.5rem' }}>
            Storefront Shortcuts
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <button
              onClick={onNavigateToCatalog}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.4rem 0.5rem', width: '100%', textAlign: 'left',
                background: 'none', border: 'none', borderRadius: '6px',
                fontSize: '0.8125rem', color: '#3f4448', cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f4f6f3'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Search style={{ width: '14px', height: '14px', color: 'var(--green-600, #2d7a38)' }} />
              Discover Products
            </button>
            <button
              onClick={onNavigateToOrders}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.4rem 0.5rem', width: '100%', textAlign: 'left',
                background: 'none', border: 'none', borderRadius: '6px',
                fontSize: '0.8125rem', color: '#3f4448', cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f4f6f3'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <Package style={{ width: '14px', height: '14px', color: '#2563eb' }} />
              My Orders & Tracking
            </button>
            <button
              onClick={() => setIsContextPanelOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.4rem 0.5rem', width: '100%', textAlign: 'left',
                background: 'none', border: 'none', borderRadius: '6px',
                fontSize: '0.8125rem', color: '#3f4448', cursor: 'pointer',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f4f6f3'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <ShoppingBag style={{ width: '14px', height: '14px', color: '#d97706' }} />
                My Shopping Cart
              </div>
              {cart && cart.items.length > 0 && (
                <span style={{
                  background: 'var(--green-600, #2d7a38)', color: '#fff',
                  borderRadius: '999px', fontSize: '0.6875rem', fontWeight: 600,
                  padding: '0.1rem 0.45rem',
                }}>
                  {cart.items.reduce((s, it) => s + it.quantity, 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* History Grouped by Date */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#8c9196', marginBottom: '0.5rem' }}>
            Recent Conversations
          </div>

          {savedSessions.length === 0 ? (
            <div style={{ fontSize: '0.75rem', color: '#a0a5aa', padding: '0.5rem 0' }}>
              No previous chats yet. Your shopping history will appear here.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {sessionGroups.today.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#9aa0a6', marginBottom: '0.25rem' }}>
                    Today
                  </div>
                  {sessionGroups.today.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSession(s)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '0.45rem 0.5rem',
                        borderRadius: '6px', border: 'none',
                        background: sessionId === s.id ? '#eef4ed' : 'transparent',
                        color: sessionId === s.id ? 'var(--green-700, #1e5627)' : '#33373b',
                        fontWeight: sessionId === s.id ? 600 : 400,
                        fontSize: '0.8125rem', cursor: 'pointer',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        marginBottom: '0.125rem',
                      }}
                      onMouseEnter={e => {
                        if (sessionId !== s.id) e.currentTarget.style.background = '#f7f8f6';
                      }}
                      onMouseLeave={e => {
                        if (sessionId !== s.id) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              )}

              {sessionGroups.yesterday.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#9aa0a6', marginBottom: '0.25rem' }}>
                    Yesterday
                  </div>
                  {sessionGroups.yesterday.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSession(s)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '0.45rem 0.5rem',
                        borderRadius: '6px', border: 'none',
                        background: sessionId === s.id ? '#eef4ed' : 'transparent',
                        color: sessionId === s.id ? 'var(--green-700, #1e5627)' : '#33373b',
                        fontWeight: sessionId === s.id ? 600 : 400,
                        fontSize: '0.8125rem', cursor: 'pointer',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        marginBottom: '0.125rem',
                      }}
                      onMouseEnter={e => {
                        if (sessionId !== s.id) e.currentTarget.style.background = '#f7f8f6';
                      }}
                      onMouseLeave={e => {
                        if (sessionId !== s.id) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              )}

              {sessionGroups.earlier.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#9aa0a6', marginBottom: '0.25rem' }}>
                    Previous 7 Days
                  </div>
                  {sessionGroups.earlier.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSession(s)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '0.45rem 0.5rem',
                        borderRadius: '6px', border: 'none',
                        background: sessionId === s.id ? '#eef4ed' : 'transparent',
                        color: sessionId === s.id ? 'var(--green-700, #1e5627)' : '#33373b',
                        fontWeight: sessionId === s.id ? 600 : 400,
                        fontSize: '0.8125rem', cursor: 'pointer',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        marginBottom: '0.125rem',
                      }}
                      onMouseEnter={e => {
                        if (sessionId !== s.id) e.currentTarget.style.background = '#f7f8f6';
                      }}
                      onMouseLeave={e => {
                        if (sessionId !== s.id) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {s.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile & Back to Store Bottom Bar */}
        <div style={{
          padding: '0.875rem 1rem',
          borderTop: '1px solid #f0f2ee',
          background: '#fafbfa',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div style={{
              width: '28px', height: '28px',
              borderRadius: '999px',
              background: 'var(--green-100, #e0efdf)',
              color: 'var(--green-700, #1e5627)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 600, fontSize: '0.75rem',
            }}>
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'G'}
            </div>
            <div style={{ fontSize: '0.75rem', lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600, color: '#1f2421' }}>
                {user?.full_name || 'Guest Shopper'}
              </div>
              <div style={{ fontSize: '0.6875rem', color: '#71767b' }}>
                {user?.role === 'admin' ? 'Store Administrator' : 'Verified Buyer'}
              </div>
            </div>
          </div>

          <button
            onClick={onBackToStore}
            title="Exit assistant to store"
            style={{
              background: 'none', border: 'none',
              color: '#555b62', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.25rem',
              fontSize: '0.75rem', fontWeight: 500,
              padding: '0.3rem 0.5rem', borderRadius: '4px',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#edf2ec'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <ArrowLeft style={{ width: '13px', height: '13px' }} />
            Store
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.3)',
            zIndex: 40,
          }}
          className="md:hidden"
        />
      )}

      {/* Mobile Drawer Content */}
      {isMobileSidebarOpen && (
        <div
          style={{
            position: 'fixed', top: 0, bottom: 0, left: 0,
            width: '280px', background: '#fff',
            zIndex: 50, display: 'flex', flexDirection: 'column',
            boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
          }}
          className="md:hidden"
        >
          <div style={{ padding: '1rem', borderBottom: '1px solid #f0f2ee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 600, fontSize: '1rem', color: '#1f2421' }}>ShopScape AI</div>
            <button onClick={() => setIsMobileSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
              <X style={{ width: '20px', height: '20px', color: '#555b62' }} />
            </button>
          </div>
          <div style={{ padding: '0.75rem 1rem' }}>
            <button
              onClick={() => { handleNewChat(); setIsMobileSidebarOpen(false); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.5rem', padding: '0.5rem', background: '#f4f6f3',
                borderRadius: '8px', border: '1px solid #e2e6e0', fontSize: '0.8125rem', fontWeight: 500,
              }}
            >
              <Plus style={{ width: '15px', height: '15px' }} /> New Chat
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#8c9196', marginBottom: '0.5rem' }}>Recent Chats</div>
            {savedSessions.map(s => (
              <button
                key={s.id}
                onClick={() => handleSelectSession(s)}
                style={{
                  width: '100%', textAlign: 'left', padding: '0.5rem',
                  borderRadius: '6px', border: 'none', background: 'transparent',
                  fontSize: '0.8125rem', color: '#33373b', cursor: 'pointer',
                }}
              >
                {s.title}
              </button>
            ))}
          </div>
          <div style={{ padding: '1rem', borderTop: '1px solid #f0f2ee' }}>
            <button
              onClick={onBackToStore}
              style={{
                width: '100%', padding: '0.5rem', background: 'var(--green-600, #2d7a38)',
                color: '#fff', borderRadius: '6px', border: 'none', fontWeight: 500, fontSize: '0.8125rem',
              }}
            >
              Back to Storefront
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. MAIN CONVERSATION AREA */}
      {/* ============================================================== */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minWidth: 0,
        position: 'relative',
        backgroundColor: '#b8b0a5',
        backgroundImage: `linear-gradient(rgba(247, 245, 240, 0.12), rgba(247, 245, 240, 0.18)), url('/agent-wall-texture.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
      }}>

        {/* Top Navbar Header */}
        <header style={{
          height: '56px',
          borderBottom: '1px solid rgba(135, 126, 114, 0.22)',
          background: 'rgba(255, 255, 255, 0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 1.25rem',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                title="Expand sidebar"
                style={{
                  background: 'none', border: 'none', color: '#555b62',
                  cursor: 'pointer', padding: '0.3rem', borderRadius: '4px',
                }}
                className="hidden md:block"
              >
                <PanelLeftOpen style={{ width: '18px', height: '18px' }} />
              </button>
            )}

            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              style={{ background: 'none', border: 'none', color: '#555b62', cursor: 'pointer' }}
              className="md:hidden"
            >
              <Menu style={{ width: '20px', height: '20px' }} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                fontFamily: 'var(--font-display, inherit)',
                fontWeight: 600,
                fontSize: '1rem',
                color: '#1f2421',
              }}>
                ShopScape Assistant
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <button
              onClick={onBackToStore}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem', fontWeight: 500,
                color: '#4a5157',
                background: '#f4f6f3',
                border: '1px solid #e2e6e0',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft style={{ width: '12px', height: '12px' }} />
              Exit to Store
            </button>

            <button
              onClick={() => setIsContextPanelOpen(!isContextPanelOpen)}
              title={isContextPanelOpen ? 'Hide Shopping Context' : 'Show Shopping Context'}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.35rem 0.75rem',
                fontSize: '0.75rem', fontWeight: 500,
                color: isContextPanelOpen ? 'var(--green-700, #1e5627)' : '#4a5157',
                background: isContextPanelOpen ? 'var(--green-50, #eff7ed)' : '#f4f6f3',
                border: '1px solid',
                borderColor: isContextPanelOpen ? 'var(--green-200, #c8e4c4)' : '#e2e6e0',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
              className="hidden lg:flex"
            >
              {isContextPanelOpen ? (
                <PanelRightClose style={{ width: '14px', height: '14px' }} />
              ) : (
                <PanelRightOpen style={{ width: '14px', height: '14px' }} />
              )}
              Shopping Bag ({cart?.items ? cart.items.reduce((s, it) => s + it.quantity, 0) : 0})
            </button>
          </div>
        </header>

        {/* Conversation Stream Scroll Container */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '1.5rem 1rem 8rem 1rem',
        }}>
          <div style={{ width: '100%', maxWidth: '850px' }}>

            {/* WELCOME SCREEN (When messages list is empty) */}
            {messages.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '3rem 1rem 1.5rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}>
                <div style={{
                  width: '56px', height: '56px',
                  borderRadius: '14px',
                  background: 'var(--green-600, #2d7a38)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(45, 122, 56, 0.25)',
                  marginBottom: '1.25rem',
                  color: '#fff',
                }}>
                  <ShoppingBag style={{ width: '28px', height: '28px' }} />
                </div>

                <h1 style={{
                  fontFamily: 'var(--font-display, inherit)',
                  fontSize: '1.875rem',
                  fontWeight: 600,
                  color: '#1f2421',
                  letterSpacing: '-0.02em',
                  marginBottom: '0.5rem',
                }}>
                  What are you shopping for today?
                </h1>

                <p style={{
                  fontSize: '0.9375rem',
                  color: '#2e382b',
                  fontWeight: 500,
                  maxWidth: '520px',
                  lineHeight: 1.55,
                  marginBottom: '2.5rem',
                }}>
                  Discover products, compare options, and shop smarter with ShopScape.
                  Order directly through chat with real inventory and verified farm pricing.
                </p>

                {/* 4 Clean Suggestion Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '0.875rem',
                  width: '100%',
                  textAlign: 'left',
                }}>
                  {suggestionCards.map((card, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(card.prompt)}
                      style={{
                        padding: '1.125rem',
                        background: 'rgba(255, 255, 255, 0.92)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid rgba(215, 208, 196, 0.9)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.375rem',
                        transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
                        boxShadow: '0 4px 14px rgba(40, 35, 30, 0.05)',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--green-600, #2d7a38)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 18px rgba(45, 122, 56, 0.12)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(215, 208, 196, 0.9)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 14px rgba(40, 35, 30, 0.05)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1f2421' }}>
                          {card.title}
                        </span>
                        {card.icon}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#71767b', lineHeight: 1.4 }}>
                        {card.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* MESSAGE STREAM */}
            {messages.map((msg, index) => (
              <div
                key={msg.id || index}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: '1.75rem',
                  width: '100%',
                }}
              >
                {/* Message Header / Role tag */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.375rem',
                  padding: '0 0.25rem',
                }}>
                  {msg.role === 'assistant' ? (
                    <>
                      <div style={{
                        width: '20px', height: '20px',
                        borderRadius: '4px',
                        background: 'var(--green-600, #2d7a38)',
                        color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <ShoppingBag style={{ width: '11px', height: '11px' }} />
                      </div>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1f2421' }}>
                        ShopScape AI
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#888f95' }}>
                      You
                    </span>
                  )}
                  {msg.timestamp && (
                    <span style={{ fontSize: '0.6875rem', color: '#a0a5aa' }}>
                      {msg.timestamp}
                    </span>
                  )}
                </div>

                {/* Message Bubble Content */}
                <div
                  style={{
                    maxWidth: msg.role === 'user' ? '80%' : '100%',
                    width: msg.role === 'assistant' ? '100%' : 'auto',
                    padding: msg.role === 'user' ? '0.75rem 1.125rem' : '0.875rem 1.125rem',
                    background: msg.role === 'user' ? '#1c3620' : 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: msg.role === 'assistant' ? 'blur(8px)' : 'none',
                    WebkitBackdropFilter: msg.role === 'assistant' ? 'blur(8px)' : 'none',
                    border: msg.role === 'user' ? '1px solid #142a17' : '1px solid rgba(215, 208, 196, 0.9)',
                    borderRadius: msg.role === 'user' ? '16px 16px 3px 16px' : '12px',
                    boxShadow: msg.role === 'user' ? '0 2px 8px rgba(20, 40, 20, 0.15)' : '0 2px 10px rgba(40, 35, 30, 0.05)',
                    color: msg.role === 'user' ? '#ffffff' : '#1f2421',
                    fontSize: '0.90625rem',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.content}
                </div>

                {/* ====================================================== */}
                {/* INTERACTIVE ORDER PROPOSAL CARD (CRITICAL FEATURE) */}
                {/* ====================================================== */}
                {msg.order_proposal && (
                  <div style={{
                    marginTop: '0.875rem',
                    width: '100%',
                    maxWidth: '560px',
                    background: '#ffffff',
                    border: '1px solid var(--green-300, #a9d4a4)',
                    borderRadius: '10px',
                    padding: '1rem',
                    boxShadow: '0 4px 14px rgba(45, 122, 56, 0.08)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                        <Package style={{ width: '16px', height: '16px', color: 'var(--green-600, #2d7a38)' }} />
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1f2421' }}>
                          Natural Language Order Proposal
                        </span>
                      </div>
                      <span style={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        background: msg.order_proposal.status === 'confirmed' ? '#dcfce7' : '#fef3c7',
                        color: msg.order_proposal.status === 'confirmed' ? '#15803d' : '#b45309',
                      }}>
                        {msg.order_proposal.status === 'confirmed' ? '✓ Added to Cart' : 'Pending Confirmation'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.875rem', marginBottom: '0.875rem', alignItems: 'center' }}>
                      {msg.order_proposal.image_url ? (
                        <img
                          src={msg.order_proposal.image_url}
                          alt={msg.order_proposal.product_name}
                          style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #e8ebe6' }}
                        />
                      ) : (
                        <div style={{ width: '56px', height: '56px', background: '#f4f6f3', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ShoppingBag style={{ width: '22px', height: '22px', color: '#9aa0a6' }} />
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#1f2421' }}>
                          {msg.order_proposal.product_name}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: '#656b70', marginTop: '0.125rem' }}>
                          Quantity: <strong>{msg.order_proposal.quantity}</strong> · Unit Price: <strong>{currencySymbol}{msg.order_proposal.unit_price.toFixed(2)}</strong>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--green-700, #1e5627)', marginTop: '0.125rem', fontWeight: 500 }}>
                          Estimated Delivery: {msg.order_proposal.estimated_delivery || 'Tomorrow by 2 PM'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.6875rem', color: '#71767b' }}>Subtotal</div>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1f2421' }}>
                          {currencySymbol}{msg.order_proposal.subtotal.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {msg.order_proposal.status === 'pending_confirmation' ? (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button
                          onClick={() => handleConfirmOrderProposal(msg.order_proposal!)}
                          style={{
                            flex: 2,
                            padding: '0.5rem 0.875rem',
                            background: 'var(--green-600, #2d7a38)',
                            color: '#ffffff',
                            borderRadius: '6px',
                            border: 'none',
                            fontWeight: 600,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.375rem',
                            boxShadow: '0 2px 6px rgba(45, 122, 56, 0.2)',
                          }}
                        >
                          <CheckCircle2 style={{ width: '15px', height: '15px' }} />
                          Confirm Add to Cart
                        </button>
                        <button
                          onClick={() => handleCancelOrderProposal(msg.order_proposal!)}
                          style={{
                            flex: 1,
                            padding: '0.5rem 0.75rem',
                            background: '#f4f6f3',
                            color: '#555b62',
                            borderRadius: '6px',
                            border: '1px solid #e2e6e0',
                            fontWeight: 500,
                            fontSize: '0.8125rem',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '6px',
                        padding: '0.5rem 0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        <span style={{ fontSize: '0.8125rem', color: '#166534', fontWeight: 500 }}>
                          Item added to your shopping basket!
                        </span>
                        <button
                          onClick={onProceedToCheckout}
                          style={{
                            background: 'var(--green-600, #2d7a38)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.25rem 0.625rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Proceed to Checkout →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ====================================================== */}
                {/* EMBEDDED PRODUCT COMPARISON CARD */}
                {/* ====================================================== */}
                {msg.comparison && (() => {
                  const comp = msg.comparison;
                  return (
                    <div style={{
                      marginTop: '0.875rem',
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid #e2e6e0',
                      borderRadius: '10px',
                      padding: '1rem',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginBottom: '0.75rem' }}>
                        <Scale style={{ width: '16px', height: '16px', color: '#2563eb' }} />
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1f2421' }}>
                          Product Comparison Summary
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.875rem' }}>
                        {/* Item A */}
                        <div style={{
                          padding: '0.75rem',
                          background: '#fcfdfb',
                          border: '1px solid #e8ebe6',
                          borderRadius: '8px',
                        }}>
                          {comp.item_a.image_url && (
                            <img
                              src={comp.item_a.image_url}
                              alt={comp.item_a.name}
                              style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px', marginBottom: '0.5rem' }}
                            />
                          )}
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1f2421' }}>
                            {comp.item_a.name}
                          </div>
                          <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--green-700, #1e5627)', margin: '0.25rem 0' }}>
                            {currencySymbol}{comp.item_a.price.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#71767b', marginBottom: '0.5rem' }}>
                            Rating: ★{comp.item_a.rating} ({comp.item_a.review_count} reviews)
                          </div>
                          <button
                            onClick={() => onAddToCart({
                              id: comp.item_a.id,
                              name: comp.item_a.name,
                              price: comp.item_a.price,
                              image_url: comp.item_a.image_url,
                            }, 1)}
                            style={{
                              width: '100%',
                              padding: '0.4rem',
                              background: 'var(--green-600, #2d7a38)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Add Option A to Cart
                          </button>
                        </div>

                        {/* Item B */}
                        <div style={{
                          padding: '0.75rem',
                          background: '#fcfdfb',
                          border: '1px solid #e8ebe6',
                          borderRadius: '8px',
                        }}>
                          {comp.item_b.image_url && (
                            <img
                              src={comp.item_b.image_url}
                              alt={comp.item_b.name}
                              style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px', marginBottom: '0.5rem' }}
                            />
                          )}
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1f2421' }}>
                            {comp.item_b.name}
                          </div>
                          <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--green-700, #1e5627)', margin: '0.25rem 0' }}>
                            {currencySymbol}{comp.item_b.price.toFixed(2)}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#71767b', marginBottom: '0.5rem' }}>
                            Rating: ★{comp.item_b.rating} ({comp.item_b.review_count} reviews)
                          </div>
                          <button
                            onClick={() => onAddToCart({
                              id: comp.item_b.id,
                              name: comp.item_b.name,
                              price: comp.item_b.price,
                              image_url: comp.item_b.image_url,
                            }, 1)}
                            style={{
                              width: '100%',
                              padding: '0.4rem',
                              background: 'var(--green-600, #2d7a38)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Add Option B to Cart
                          </button>
                        </div>
                      </div>

                      <div style={{
                        fontSize: '0.75rem',
                        color: '#4b5563',
                        background: '#f4f6f8',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        lineHeight: 1.4,
                      }}>
                        <strong>AI Recommendation:</strong> {comp.verdict}
                      </div>
                    </div>
                  );
                })()}

                {/* ====================================================== */}
                {/* EMBEDDED PRODUCT RECOMMENDATION CARDS (GRID) */}
                {/* ====================================================== */}
                {msg.recommended_products && msg.recommended_products.length > 0 && (
                  <div style={{
                    marginTop: '0.875rem',
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                    gap: '0.875rem',
                  }}>
                    {msg.recommended_products.map((prod) => (
                      <div
                        key={prod.id}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e8ebe6',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                          transition: 'border-color 0.15s, box-shadow 0.15s',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'var(--green-400, #69b662)';
                          e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.06)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#e8ebe6';
                          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)';
                        }}
                      >
                        {/* Thumbnail */}
                        <div
                          style={{
                            height: '130px',
                            background: '#f8faf7',
                            overflow: 'hidden',
                            position: 'relative',
                            cursor: 'pointer',
                          }}
                          onClick={() => onSelectProduct(prod as any)}
                        >
                          {prod.image_url ? (
                            <img
                              src={prod.image_url}
                              alt={prod.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <ShoppingBag style={{ width: '28px', height: '28px', color: '#c0c5b9' }} />
                            </div>
                          )}
                          {prod.is_organic && (
                            <span style={{
                              position: 'absolute', top: '6px', left: '6px',
                              background: '#ffffff', color: 'var(--green-700, #1e5627)',
                              border: '1px solid var(--green-200, #c8e4c4)',
                              borderRadius: '4px', fontSize: '0.625rem', fontWeight: 600,
                              padding: '0.1rem 0.35rem', display: 'flex', alignItems: 'center', gap: '0.2rem',
                            }}>
                              <Leaf style={{ width: '9px', height: '9px' }} />
                              Organic
                            </span>
                          )}
                        </div>

                        {/* Details */}
                        <div style={{ padding: '0.75rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <h4
                            onClick={() => onSelectProduct(prod as any)}
                            style={{
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              color: '#1f2421',
                              margin: '0 0 0.25rem 0',
                              lineHeight: 1.3,
                              cursor: 'pointer',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {prod.name}
                          </h4>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.5rem' }}>
                            <Star style={{ width: '12px', height: '12px', color: '#f59e0b', fill: '#f59e0b' }} />
                            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#33373b' }}>
                              {prod.rating || 4.8}
                            </span>
                            <span style={{ fontSize: '0.6875rem', color: '#888f95' }}>
                              ({prod.review_count || 4})
                            </span>
                          </div>

                          <div style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'space-between',
                            marginTop: 'auto',
                            marginBottom: '0.625rem',
                          }}>
                            <span style={{
                              fontSize: '0.9375rem',
                              fontWeight: 700,
                              color: 'var(--green-700, #1e5627)',
                            }}>
                              {currencySymbol}{prod.price.toFixed(2)}
                            </span>
                            <span style={{ fontSize: '0.625rem', color: '#16a34a', fontWeight: 500 }}>
                              In Stock
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: '0.375rem' }}>
                            <button
                              onClick={() => {
                                onAddToCart(prod as any, 1);
                                showToast(`Added ${prod.name} to cart!`);
                              }}
                              style={{
                                flex: 1,
                                padding: '0.375rem 0.5rem',
                                background: 'var(--green-600, #2d7a38)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '5px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'background 0.15s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--green-700, #1e5627)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'var(--green-600, #2d7a38)'}
                            >
                              Add to Cart
                            </button>
                            <button
                              onClick={() => onSelectProduct(prod as any)}
                              title="Inspect full specifications & verified reviews"
                              style={{
                                padding: '0.375rem 0.5rem',
                                background: '#f4f6f3',
                                color: '#555b62',
                                border: '1px solid #e2e6e0',
                                borderRadius: '5px',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                              }}
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {loading && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.625rem',
                padding: '0.75rem 1rem',
                background: '#ffffff',
                border: '1px solid #e8ebe6',
                borderRadius: '8px',
                width: 'fit-content',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                marginBottom: '1rem',
              }}>
                <div style={{
                  width: '18px', height: '18px',
                  borderRadius: '4px',
                  background: 'var(--green-600, #2d7a38)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff',
                }}>
                  <RefreshCw style={{ width: '11px', height: '11px', animation: 'spin 1s linear infinite' }} />
                </div>
                <span style={{ fontSize: '0.8125rem', color: '#656b70', fontWeight: 500 }}>
                  ShopScape is consulting the verified product catalog...
                </span>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div style={{
                padding: '0.75rem 1rem',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#b91c1c',
                fontSize: '0.8125rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle style={{ width: '16px', height: '16px' }} />
                  <span>{errorMsg}</span>
                </div>
                <button
                  onClick={() => handleSendMessage()}
                  style={{
                    background: '#fff', border: '1px solid #fca5a5',
                    borderRadius: '4px', padding: '0.2rem 0.5rem',
                    fontSize: '0.75rem', fontWeight: 600, color: '#b91c1c',
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* ============================================================== */}
        {/* MESSAGE COMPOSER (Bottom-aligned, ChatGPT-Style) */}
        {/* ============================================================== */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(236, 231, 222, 0.96) 72%, rgba(236, 231, 222, 0) 100%)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          padding: '1.25rem 1rem 1.25rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 20,
        }}>
          <div style={{ width: '100%', maxWidth: '850px' }}>

            {/* Quick Suggestion Chips */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.375rem',
              overflowX: 'auto',
              paddingBottom: '0.5rem',
              scrollbarWidth: 'none',
              marginBottom: '0.25rem',
            }}>
              {quickChips.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(chip)}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '0.25rem 0.625rem',
                    fontSize: '0.75rem',
                    color: '#3d443e',
                    background: 'rgba(255, 255, 255, 0.94)',
                    border: '1px solid rgba(175, 166, 152, 0.65)',
                    borderRadius: '999px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(40, 35, 30, 0.05)',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--green-600, #2d7a38)';
                    e.currentTarget.style.background = '#f7faf6';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(175, 166, 152, 0.65)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.94)';
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Container */}
            <div style={{
              display: 'flex',
              alignItems: 'flex-end',
              background: '#ffffff',
              border: '1px solid rgba(150, 140, 126, 0.65)',
              borderRadius: '14px',
              padding: '0.5rem 0.75rem',
              boxShadow: '0 4px 18px rgba(40, 35, 30, 0.09)',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}>
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask ShopScape anything about products or shopping (e.g. 'Order 2 packs of tomatoes')…"
                style={{
                  flex: 1,
                  border: 'none',
                  outline: 'none',
                  resize: 'none',
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  maxHeight: '160px',
                  background: 'transparent',
                  color: '#1f2421',
                  fontFamily: 'inherit',
                  padding: '0.25rem 0',
                }}
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || loading}
                title="Send message (Enter)"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: inputValue.trim() && !loading ? 'var(--green-600, #2d7a38)' : '#e5e7eb',
                  color: inputValue.trim() && !loading ? '#ffffff' : '#9ca3af',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: inputValue.trim() && !loading ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                  flexShrink: 0,
                  marginLeft: '0.5rem',
                }}
              >
                <Send style={{ width: '15px', height: '15px' }} />
              </button>
            </div>

            <div style={{
              textAlign: 'center',
              fontSize: '0.6875rem',
              color: '#8c9196',
              marginTop: '0.375rem',
            }}>
              ShopScape AI searches real catalog stock & verified store prices. Press Enter to send, Shift+Enter for new line.
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. RIGHT SHOPPING CONTEXT PANEL (Collapsible Context Drawer) */}
      {/* ============================================================== */}
      {isContextPanelOpen && (
        <aside
          style={{
            width: '310px',
            minWidth: '310px',
            background: '#f8f6f1',
            borderLeft: '1px solid rgba(135, 126, 114, 0.22)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 25,
          }}
          className="hidden lg:flex"
        >
          {/* Panel Header */}
          <div style={{
            padding: '1rem',
            borderBottom: '1px solid #f0f2ee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShoppingBag style={{ width: '16px', height: '16px', color: 'var(--green-600, #2d7a38)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1f2421' }}>
                Shopping Cart Context
              </span>
            </div>
            <button
              onClick={() => setIsContextPanelOpen(false)}
              title="Close panel"
              style={{ background: 'none', border: 'none', color: '#71767b', cursor: 'pointer' }}
            >
              <PanelRightClose style={{ width: '16px', height: '16px' }} />
            </button>
          </div>

          {/* Cart Contents */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {(!cart || cart.items.length === 0) ? (
              <div style={{
                textAlign: 'center',
                padding: '2.5rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}>
                <ShoppingBag style={{ width: '36px', height: '36px', color: '#c0c5b9', marginBottom: '0.75rem' }} />
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1f2421', marginBottom: '0.25rem' }}>
                  Your cart is empty
                </div>
                <div style={{ fontSize: '0.75rem', color: '#71767b', lineHeight: 1.4 }}>
                  Ask the assistant to add groceries or apparel, or click Add to Cart on any product.
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: '#8c9196', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  Items in Basket ({cart.items.reduce((s, it) => s + it.quantity, 0)})
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {cart.items.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.625rem',
                        padding: '0.5rem',
                        background: '#fcfdfb',
                        border: '1px solid #eef0eb',
                        borderRadius: '6px',
                      }}
                    >
                      {item.product_image ? (
                        <img
                          src={item.product_image}
                          alt={item.product_name}
                          style={{ width: '42px', height: '42px', objectFit: 'cover', borderRadius: '4px' }}
                        />
                      ) : (
                        <div style={{ width: '42px', height: '42px', background: '#eef2ec', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ShoppingBag style={{ width: '16px', height: '16px', color: '#8c9196' }} />
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontWeight: 600, fontSize: '0.75rem', color: '#1f2421',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>
                          {item.product_name}
                        </div>
                        <div style={{ fontSize: '0.6875rem', color: '#656b70', marginTop: '0.125rem' }}>
                          {currencySymbol}{item.unit_price.toFixed(2)} × {item.quantity}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#1f2421' }}>
                          {currencySymbol}{item.total_price.toFixed(2)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                          <button
                            onClick={() => onUpdateCartQuantity(item.id, Math.max(1, item.quantity - 1))}
                            style={{ width: '18px', height: '18px', background: '#eef0eb', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 700 }}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '0.6875rem', minWidth: '12px', textAlign: 'center' }}>
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateCartQuantity(item.id, item.quantity + 1)}
                            style={{ width: '18px', height: '18px', background: '#eef0eb', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.6875rem', fontWeight: 700 }}
                          >
                            +
                          </button>
                          <button
                            onClick={() => onRemoveCartItem(item.id)}
                            title="Remove"
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.1rem', marginLeft: '0.125rem' }}
                          >
                            <Trash2 style={{ width: '12px', height: '12px' }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Checkout & Subtotal Summary Footer */}
          {cart && cart.items.length > 0 && (
            <div style={{
              padding: '1rem',
              borderTop: '1px solid #f0f2ee',
              background: '#fafbfa',
            }}>
              {/* Free shipping bar */}
              {cart.subtotal < 999 && (
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: '#656b70', marginBottom: '0.25rem' }}>
                    <span>Free Delivery Goal</span>
                    <span>Add {currencySymbol}{(999 - cart.subtotal).toFixed(2)} more</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: '#e5e7eb', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min(100, (cart.subtotal / 999) * 100)}%`,
                      height: '100%',
                      background: 'var(--green-500, #389e46)',
                    }} />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#656b70' }}>Subtotal</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1f2421' }}>
                  {currencySymbol}{cart.subtotal.toFixed(2)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#656b70' }}>Shipping</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: cart.shipping_fee === 0 ? 'var(--green-600, #2d7a38)' : '#1f2421' }}>
                  {cart.shipping_fee === 0 ? 'FREE' : `${currencySymbol}${cart.shipping_fee.toFixed(2)}`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', paddingTop: '0.5rem', borderTop: '1px solid #eef0eb' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#1f2421' }}>Total</span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--green-700, #1e5627)' }}>
                  {currencySymbol}{cart.total_amount.toFixed(2)}
                </span>
              </div>

              <button
                onClick={onProceedToCheckout}
                style={{
                  width: '100%',
                  padding: '0.625rem',
                  background: 'var(--green-600, #2d7a38)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.375rem',
                  boxShadow: '0 2px 6px rgba(45, 122, 56, 0.2)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--green-700, #1e5627)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--green-600, #2d7a38)'}
              >
                <CreditCard style={{ width: '15px', height: '15px' }} />
                Proceed to Checkout
              </button>
            </div>
          )}
        </aside>
      )}

      {/* ============================================================== */}
      {/* FLOATING TOAST NOTIFICATION */}
      {/* ============================================================== */}
      {cartToast.show && (
        <div style={{
          position: 'fixed',
          bottom: '5.5rem',
          right: '1.5rem',
          zIndex: 60,
          background: '#1f2421',
          color: '#ffffff',
          padding: '0.75rem 1.125rem',
          borderRadius: '8px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          fontSize: '0.8125rem',
          animation: 'fadeIn 0.2s ease',
        }}>
          <CheckCircle2 style={{ width: '16px', height: '16px', color: '#4ade80' }} />
          <span>{cartToast.message}</span>
          <button
            onClick={onProceedToCheckout}
            style={{
              background: 'var(--green-600, #2d7a38)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '0.2rem 0.5rem',
              fontSize: '0.6875rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginLeft: '0.375rem',
            }}
          >
            Checkout
          </button>
        </div>
      )}
    </div>
  );
};
