import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Sparkles,
  Send,
  Bot,
  User,
  Zap,
  Brain,
  ShoppingBag,
  ArrowRight,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { Product } from '../types';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onBuyNow?: (product: Product, quantity?: number) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  recommendedProducts?: Product[];
  mode?: 'fast' | 'deep';
  timestamp: string;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello! I am your KenaX BD Smart Shopping Assistant. How can I help you today? You can ask for product recommendations, compare gadgets, check delivery to your district, or find the best deals in Bangladesh!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [thinkingMode, setThinkingMode] = useState<'fast' | 'deep'>('fast');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSendMessage = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = customPrompt || input.trim();
    if (!promptToSend || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'user',
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setIsLoading(true);

    try {
      // Call server.ts endpoint /api/chat
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptToSend,
          mode: thinkingMode,
          history: messages.slice(-6).map((m) => ({
            role: m.sender === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }],
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Server error');
      }

      const data = await response.json();

      let recProds: Product[] = [];
      if (Array.isArray(data.suggestedProducts) && data.suggestedProducts.length > 0) {
        recProds = data.suggestedProducts.slice(0, data.suggestedProducts.length === 1 ? 1 : 3);
      } else {
        // Find matching products based on exact title or relevant keywords (strict 1 exact or max 3 items)
        const lower = promptToSend.toLowerCase().trim();
        const normQ = lower.replace(/[।.,!?;:"'(){}[\]<>_+\-=/\\|`~*^%#@&$]/g, ' ').replace(/\s+/g, ' ').trim();
        const exactMatch = products.find((p) => {
          const pNameNorm = (p.name || '').toLowerCase().trim();
          const pBnNorm = (p.banglaName || '').toLowerCase().trim();
          return pNameNorm === normQ || pBnNorm === normQ || (pNameNorm.length > 3 && normQ.includes(pNameNorm)) || (pBnNorm.length > 3 && normQ.includes(pBnNorm));
        });

        if (exactMatch) {
          recProds = [exactMatch];
        } else {
          const stopWords = new Set(['a', 'an', 'the', 'in', 'of', 'for', 'to', 'order', 'অর্ডার', 'চাই', 'নিতে', 'দাম', 'কত', 'আছে', 'কি', 'দাও']);
          const queryWords = normQ.split(/\s+/).filter((w) => w.length > 1 && !stopWords.has(w));
          const scored = products
            .map((p) => {
              let score = 0;
              const pName = (p.name || '').toLowerCase();
              const pBn = (p.banglaName || '').toLowerCase();
              const pCat = (p.category || '').toLowerCase();
              queryWords.forEach((w) => {
                if (pName.includes(w) || pBn.includes(w)) score += 60;
                else if (pCat.includes(w)) score += 25;
              });
              if ((normQ.includes('lamp') || normQ.includes('বাতি') || normQ.includes('ল্যাম্প')) && (pName.includes('lamp') || pName.includes('light') || pBn.includes('বাতি'))) {
                score += 100;
              }
              return { product: p, score };
            })
            .filter((item) => item.score > 0)
            .sort((a, b) => b.score - a.score);

          recProds = scored.slice(0, 3).map((item) => item.product);
        }
      }

      const aiMsg: ChatMessage = {
        id: 'ai-' + Date.now(),
        sender: 'assistant',
        text: data.reply || 'Here is what I found for you in our KenaX BD store.',
        recommendedProducts: recProds,
        mode: thinkingMode,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      // Fallback smart client response if API key is not configured in local environment
      const lower = promptToSend.toLowerCase();
      let replyText = `Thanks for asking! We have genuine items with cash on delivery all over Bangladesh (৳60 in Dhaka, ৳120 outside).`;

      if (lower.includes('delivery') || lower.includes('shipping')) {
        replyText = `Our delivery is fast and reliable: 24-48 hours within Dhaka Metro (৳60) and 3-5 days across all 64 districts (৳120). Orders over ৳5000 in Dhaka get FREE delivery!`;
      } else if (lower.includes('bkash') || lower.includes('payment') || lower.includes('nagad')) {
        replyText = `We accept Cash on Delivery (Pay After Delivery), bKash, Nagad, and Rocket mobile banking with instant transaction verification.`;
      } else if (lower.includes('watch') || lower.includes('smartwatch')) {
        replyText = `For smartwatches, I highly recommend the Haylou Solar Plus RT3 or Amazfit Pop 3R with AMOLED display, Bluetooth calling, and health monitoring under ৳5,000!`;
      } else if (lower.includes('earbuds') || lower.includes('sound') || lower.includes('headphone')) {
        replyText = `Check out the Redmi Buds 5 with 46dB Hybrid Active Noise Cancellation or Anker Soundcore R50i for booming bass and long 30-hour battery life!`;
      }

      const matched = products.filter(
        (p) =>
          lower.includes(p.name.toLowerCase()) ||
          lower.includes(p.category.toLowerCase()) ||
          (lower.includes('watch') && p.name.includes('Watch')) ||
          (lower.includes('earbuds') && p.category.includes('Electronics'))
      );

      const aiMsg: ChatMessage = {
        id: 'ai-' + Date.now(),
        sender: 'assistant',
        text: replyText,
        recommendedProducts: matched.slice(0, 2),
        mode: thinkingMode,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const sampleQueries = [
    'Best smartwatch under ৳4,000?',
    'Show genuine wireless earbuds',
    'How does Cash on Delivery work in Sylhet?',
    'Do you have Eid discount coupons?',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full h-[600px] max-h-[90vh] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 bg-slate-900 dark:bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold">KenaX AI Shopping Assistant</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <p className="text-[10px] text-slate-400">Powered by Google Gemini 2.5</p>
            </div>
          </div>

          {/* Thinking Mode Toggle Switch */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-800 dark:bg-slate-900 rounded-xl p-0.5 border border-slate-700 text-[11px]">
              <button
                onClick={() => setThinkingMode('fast')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  thinkingMode === 'fast'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Low latency Flash model"
              >
                <Zap className="w-3 h-3" />
                <span className="hidden sm:inline">Fast</span>
              </button>
              <button
                onClick={() => setThinkingMode('deep')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  thinkingMode === 'deep'
                    ? 'bg-gradient-to-r from-purple-600 to-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Deep reasoning & comparative research mode"
              >
                <Brain className="w-3 h-3" />
                <span className="hidden sm:inline">Thinking Mode</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950/60">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 text-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[82%] space-y-2`}>
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                    msg.sender === 'user'
                      ? 'bg-sky-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  <div
                    className={`mt-1.5 text-[9px] flex items-center gap-1.5 ${
                      msg.sender === 'user' ? 'text-sky-200 justify-end' : 'text-slate-400 dark:text-slate-400'
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {msg.mode === 'deep' && (
                      <span className="bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 px-1.5 py-0.2 rounded font-semibold">
                        Thinking Mode
                      </span>
                    )}
                  </div>
                </div>

                {/* Attached Interactive Product Recommendations */}
                {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Recommended Products:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.recommendedProducts.map((p) => (
                        <div
                          key={p.id}
                          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-500 flex items-center gap-2 shadow-2xs transition-all group"
                        >
                          <img
                            src={
                              (p.images?.[0] && p.images[0].trim() !== '')
                                ? p.images[0]
                                : 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500'
                            }
                            alt={p.name}
                            className="w-10 h-10 object-contain rounded bg-slate-50 dark:bg-slate-800 p-0.5 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h5
                              onClick={() => {
                                onSelectProduct(p);
                                onClose();
                              }}
                              className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer"
                            >
                              {p.name}
                            </h5>
                            <p className="text-[11px] font-extrabold text-sky-700 dark:text-sky-400">
                              ৳{p.price.toLocaleString('en-BD')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => onAddToCart(p)}
                              className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 hover:bg-sky-600 hover:text-white dark:hover:bg-sky-600 dark:hover:text-white transition-colors cursor-pointer shrink-0 border border-sky-200/50 dark:border-sky-800/60"
                              title="Add to Cart"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                            </button>
                            {onBuyNow && (
                              <button
                                onClick={() => {
                                  onBuyNow(p, 1);
                                  onClose();
                                }}
                                className="px-2 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] transition-colors cursor-pointer shrink-0"
                                title="Buy Now"
                              >
                                Buy
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center shrink-0 text-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2.5 items-center text-slate-500 dark:text-slate-400 text-xs">
              <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2 shadow-2xs text-slate-800 dark:text-slate-200">
                <Loader2 className="w-4 h-4 text-sky-600 dark:text-sky-400 animate-spin" />
                <span className="text-[11px]">
                  {thinkingMode === 'deep'
                    ? 'Reasoning deeply through catalog & specifications...'
                    : 'Finding best options...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="px-4 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 overflow-x-auto flex gap-1.5 no-scrollbar">
          {sampleQueries.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(undefined, q)}
              className="text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/60 hover:text-sky-700 dark:hover:text-sky-300 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors cursor-pointer shrink-0 border border-transparent dark:border-slate-700"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              thinkingMode === 'deep'
                ? 'Ask a complex question (e.g. compare best ANC earbuds under ৳3000)...'
                : 'Ask for products, prices, delivery info...'
            }
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
