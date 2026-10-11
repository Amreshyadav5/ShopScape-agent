import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  ShoppingCart,
  ArrowRight,
  RotateCcw,
  Bot,
  Minus,
  Maximize2,
  Star,
  Eye,
  RefreshCw,
  ShoppingBag,
  Check,
} from 'lucide-react';
import type { Product, AgentChatMessage, AgentProductCard, User } from '../types';
import { api } from '../api';
import { formatPrice, resolveImageUrl } from '../utils';

interface AIAssistantDrawerProps {
  isOpen: boolean;
  currencySymbol?: string;
  user?: User | null;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
  onCartUpdated?: () => void;
  onProceedToCheckout?: () => void;
}

interface CartNotification {
  productName: string;
  price: number;
  imageUrl?: string;
  quantity: number;
}

export const AIAssistantDrawer: React.FC<AIAssistantDrawerProps> = ({
  isOpen,
  currencySymbol = '₹',
  onClose,
  onSelectProduct,
  onAddToCart,
  initialPrompt,
  onClearInitialPrompt,
  onCartUpdated,
  onProceedToCheckout,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  // Default ChatGPT-style friendly welcome message without asterisks
  const defaultWelcomeMessage: AgentChatMessage = {
    role: 'assistant',
    content:
      "Hi there! Welcome to ShopScape.\n\nLooking for something specific? I can help you discover farm-fresh sabji and vegetables, stylish shirts, pants and shoes, chilled drinks and juices, smart electronics, or pure organic pantry essentials.\n\nWhat would you like to explore today?",
  };

  const [messages, setMessages] = useState<AgentChatMessage[]>([defaultWelcomeMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [cartNotification, setCartNotification] = useState<CartNotification | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [isOpen, messages, isMinimized, cartNotification]);

  // Handle external prompts
  useEffect(() => {
    if (initialPrompt && isOpen) {
      setIsMinimized(false);
      handleSendMessage(initialPrompt);
      if (onClearInitialPrompt) onClearInitialPrompt();
    }
  }, [initialPrompt, isOpen]);

  // Clean raw asterisks from text to guarantee clean ChatGPT-style rendering
  const sanitizeText = (text: string): string => {
    if (!text) return '';
    return text.replace(/\*\*/g, '').replace(/\*/g, '');
  };

  // Trigger rich cart notification pop-up
  const showCartPopup = (name: string, price: number, imageUrl?: string, quantity: number = 1) => {
    setCartNotification({
      productName: name,
      price,
      imageUrl,
      quantity,
    });

    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setCartNotification((curr) => (curr?.productName === name ? null : curr));
    }, 6000);
  };

  // Add product to cart with immediate pop-up notification
  const handleAddProductToCart = (prod: Product | AgentProductCard) => {
    const fullProd: Product = {
      id: prod.id,
      name: prod.name,
      price: prod.price,
      is_organic: prod.is_organic,
      stock_quantity:
        'stock_quantity' in prod && typeof prod.stock_quantity === 'number'
          ? prod.stock_quantity
          : 25,
      is_featured: false,
      is_active: true,
      average_rating:
        'average_rating' in prod && typeof prod.average_rating === 'number'
          ? prod.average_rating
          : 'rating' in prod && typeof (prod as any).rating === 'number'
          ? (prod as any).rating
          : 4.8,
      review_count:
        'review_count' in prod && typeof (prod as any).review_count === 'number'
          ? (prod as any).review_count
          : 24,
      image_url: prod.image_url,
      category: prod.category || 'Pantry',
      description: prod.description,
    };

    onAddToCart(fullProd);
    showCartPopup(prod.name, prod.price, prod.image_url, 1);
    if (onCartUpdated) onCartUpdated();
  };

  // Chat message sending
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const newMessages: AgentChatMessage[] = [
      ...messages,
      { role: 'user', content: query },
    ];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await api.agentChat(query);
      const cleanReply = sanitizeText(response.reply);
      const recommended = response.recommended_products || response.products || [];

      // If AI executed "buy this" and added to cart, show the pop-up notification
      if (response.cart_updated) {
        if (recommended.length > 0) {
          const added = recommended[0];
          showCartPopup(added.name, added.price, added.image_url, 1);
        } else {
          showCartPopup('Selected Item', 0, undefined, 1);
        }
        if (onCartUpdated) onCartUpdated();
      }

      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: cleanReply || 'Here are the options I found in our store catalog:',
          recommended_products: recommended,
        },
      ]);
    } catch (err: any) {
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content:
            "I'm here to help, but I had a temporary issue connecting to the store catalog. Please try asking again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([defaultWelcomeMessage]);
    setCartNotification(null);
    setInput('');
  };

  if (!isOpen) return null;

  // Minimized Widget
  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 animate-fade-in">
        <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-3 flex items-center gap-3 w-80">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-slate-900 truncate">ShopScape AI</h4>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Ready to help
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Expand Assistant"
              aria-label="Expand Assistant"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title="Close Assistant"
              aria-label="Close Assistant"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/20 backdrop-blur-[2px] transition-opacity animate-fade-in flex justify-end">
      {/* Backdrop click to dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* ChatGPT-style Floating Assistant Panel */}
      <div className="relative w-full sm:w-[560px] max-w-full h-full sm:h-[min(90vh,760px)] sm:my-auto sm:mr-5 bg-white sm:rounded-2xl border-l sm:border border-slate-200/90 shadow-2xl flex flex-col overflow-hidden text-slate-800 z-10 transition-all">
        
        {/* ============================================================ */}
        {/* 1. MINIMALIST CHATGPT-STYLE HEADER */}
        {/* ============================================================ */}
        <header className="px-4 py-3 bg-white border-b border-slate-200/80 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-slate-900 leading-tight">
                  ShopScape AI
                </h3>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-none mt-0.5">
                Intelligent Organic Shopping Assistant
              </p>
            </div>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              onClick={handleResetChat}
              title="New Chat"
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="New chat"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              title="Minimize"
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Minimize"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              title="Close"
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors ml-0.5"
              aria-label="Close"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </header>

        {/* ============================================================ */}
        {/* PROMINENT ADD-TO-CART NOTIFICATION POPUP */}
        {/* ============================================================ */}
        {cartNotification && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50/95 border border-emerald-300 rounded-2xl shadow-md flex items-center justify-between gap-3 animate-fade-in z-20 flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-emerald-950">
                    Added to your cart!
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-200 text-emerald-900">
                    Ready to buy
                  </span>
                </div>
                <p className="text-xs text-emerald-800 font-medium truncate mt-0.5">
                  {cartNotification.quantity}x {cartNotification.productName}{' '}
                  {cartNotification.price > 0 && (
                    <span className="font-bold">
                      ({formatPrice(cartNotification.price, currencySymbol)})
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {onProceedToCheckout && (
                <button
                  onClick={() => {
                    setCartNotification(null);
                    onProceedToCheckout();
                  }}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-colors"
                >
                  <span>Checkout</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setCartNotification(null)}
                className="p-1 text-emerald-700 hover:text-emerald-900 rounded-lg hover:bg-emerald-100 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* 2. CHAT STREAM (Generous, clean, ChatGPT-style, no asterisks) */}
        {/* ============================================================ */}
        <div className="flex-1 p-4 space-y-5 overflow-y-auto bg-slate-50/50">
          {messages.map((msg, idx) => {
            const isAssistant = msg.role === 'assistant';
            const isFirstWelcome = idx === 0 && isAssistant;

            return (
              <div
                key={idx}
                className={`flex flex-col ${
                  isAssistant ? 'items-start' : 'items-end'
                } animate-fade-in`}
              >
                <div className="flex items-start gap-2.5 max-w-[92%]">
                  {isAssistant && (
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isAssistant
                        ? 'bg-white text-slate-800 border border-slate-200/80 shadow-xs'
                        : 'bg-slate-900 text-white shadow-xs'
                    }`}
                  >
                    {/* Message Text: Clean, friendly, no raw asterisks */}
                    <div className="whitespace-pre-line space-y-2">
                      {sanitizeText(msg.content)}
                    </div>

                    {/* Quick Shortcut Buttons under first welcome message */}
                    {isFirstWelcome && messages.length === 1 && (
                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          Suggested queries to get started:
                        </p>
                        <div className="grid grid-cols-1 gap-1.5">
                          <button
                            onClick={() =>
                              handleSendMessage('Show me fresh sabji and farm vegetables like tomatoes, palak, and potatoes')
                            }
                            className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200/80 text-xs font-medium flex items-center justify-between transition-colors"
                          >
                            <span>🥦 Show varieties of fresh sabji & farm vegetables</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>

                          <button
                            onClick={() =>
                              handleSendMessage('Show me shoes, linen shirts, pants and t-shirts')
                            }
                            className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200/80 text-xs font-medium flex items-center justify-between transition-colors"
                          >
                            <span>👟 Show shoes, shirts, pants & t-shirts collection</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>

                          <button
                            onClick={() =>
                              handleSendMessage('Show me chilled drinks, coconut water, juices and cold brews')
                            }
                            className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200/80 text-xs font-medium flex items-center justify-between transition-colors"
                          >
                            <span>🧃 Show chilled drinks, cold brew & pure juices</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>

                          <button
                            onClick={() =>
                              handleSendMessage('Show me electronics like wireless earbuds, smartwatches and fast chargers')
                            }
                            className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200/80 text-xs font-medium flex items-center justify-between transition-colors"
                          >
                            <span>⚡ Show wireless earbuds, smartwatches & gadgets</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>

                          <button
                            onClick={() =>
                              handleSendMessage('Show me pure honey, cold-pressed oils and healthy pantry nuts')
                            }
                            className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-900 border border-slate-200/80 text-xs font-medium flex items-center justify-between transition-colors"
                          >
                            <span>🍯 Show pure honey, organic oils & pantry nuts</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ============================================================ */}
                {/* PRODUCT VARIETY CARDS (Rich, compact, distinct varieties) */}
                {/* ============================================================ */}
                {msg.recommended_products && msg.recommended_products.length > 0 && (
                  <div className="mt-3.5 pl-9 w-full max-w-full">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                        Available Varieties in Store ({msg.recommended_products.length})
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {msg.recommended_products.map((prod) => (
                        <div
                          key={prod.id}
                          className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs hover:border-emerald-400 transition-all flex flex-col justify-between group"
                        >
                          <div className="flex gap-3">
                            <div className="relative w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0">
                              <img
                                src={resolveImageUrl(prod.image_url)}
                                alt={prod.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src =
                                    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80';
                                }}
                              />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                                  {prod.is_organic ? 'Certified Organic' : 'Pure'}
                                </span>
                                <span className="text-[10px] text-amber-600 font-medium flex items-center gap-0.5">
                                  <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                  {prod.rating ? prod.rating.toFixed(1) : '4.8'}
                                </span>
                              </div>
                              <h5
                                className="font-semibold text-xs text-slate-900 leading-tight truncate"
                                title={prod.name}
                              >
                                {prod.name}
                              </h5>
                              <div className="mt-1 flex items-baseline gap-2">
                                <span className="font-bold text-xs text-slate-900">
                                  {formatPrice(prod.price, currencySymbol)}
                                </span>
                                <span className="text-[10px] text-emerald-600 font-medium">
                                  In Stock
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Card Action Buttons: Add to Cart triggers instant pop-up! */}
                          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-2">
                            <button
                              onClick={() => onSelectProduct(prod as unknown as Product)}
                              className="flex-1 py-1.5 px-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200 flex items-center justify-center gap-1 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                            <button
                              onClick={() => handleAddProductToCart(prod)}
                              className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] flex items-center justify-center gap-1 shadow-xs transition-colors"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              <span>Add to Cart</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center gap-2.5 pl-1 animate-pulse text-slate-500 text-xs">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 flex items-center gap-2 shadow-xs">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>Thinking & searching farm varieties...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ============================================================ */}
        {/* 3. CHATGPT-STYLE FIXED BOTTOM MESSAGE COMPOSER */}
        {/* ============================================================ */}
        <div className="p-3 bg-white border-t border-slate-200/80 flex-shrink-0">
          {/* Quick Suggestion Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-1 scrollbar-none text-[11px]">
            {[
              '🍯 Show honey varieties',
              '🫒 Cold-pressed oils',
              '🌰 Almonds & Cashews',
              '💰 Snacks under ₹500',
            ].map((chip) => (
              <button
                key={chip}
                onClick={() => handleSendMessage(chip.slice(2).trim())}
                className="px-2.5 py-1 rounded-full bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 text-slate-600 whitespace-nowrap transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Composer Field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask about products, honey varieties, or say 'Buy this'..."
                className="w-full pl-4 pr-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 bg-slate-50 rounded-2xl border border-slate-200 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white flex items-center justify-center shadow-xs transition-colors flex-shrink-0"
              aria-label="Send message"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>

          <p className="text-[10px] text-center text-slate-400 mt-2">
            ShopScape AI assists with organic discovery & cart preparation.
          </p>
        </div>
      </div>
    </div>
  );
};
