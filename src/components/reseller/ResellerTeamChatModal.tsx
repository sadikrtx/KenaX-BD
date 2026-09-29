import React, { useState } from 'react';
import {
  MessageSquare,
  Send,
  X,
  Sparkles,
  Headphones,
  CheckCircle2,
  Paperclip,
  Clock,
  User,
  ShieldCheck,
  Plus,
  HelpCircle,
  FileText,
  Check,
  Copy,
} from 'lucide-react';
import { ResellerUser, ResellerSupportTicket } from '../../types/reseller';

interface ResellerTeamChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  reseller: ResellerUser;
  lang?: 'bn' | 'en';
  onOpenCreateTicket?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'reseller' | 'agent' | 'system';
  text: string;
  time: string;
}

export const ResellerTeamChatModal: React.FC<ResellerTeamChatModalProps> = ({
  isOpen,
  onClose,
  reseller,
  lang = 'bn',
  onOpenCreateTicket,
}) => {
  const isBn = lang === 'bn';
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'agent',
      text: isBn
        ? `আসসালামু আলাইকুম ${reseller.businessName || reseller.fullName}! কেনাবেচা বিডি (KenaX BD) সেন্ট্রাল সাপোর্ট টিমে আপনাকে স্বাগতম। আপনার কোনো পার্সেল ট্র্যাকিং, ডেলিভারি চার্জ, অথবা উইথড্রল সম্পর্কিত প্রশ্ন থাকলে জানান।`
        : `Welcome ${reseller.businessName || reseller.fullName} to KenaX BD Central Support! How can our support team assist you with orders, delivery rules, or payouts today?`,
      time: 'Just now',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'ticket'>('chat');

  // New Ticket State
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState<'order' | 'profit' | 'withdrawal' | 'product' | 'account' | 'other'>('order');
  const [ticketPriority, setTicketPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [ticketDesc, setTicketDesc] = useState('');
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Formatted Reseller ID
  const resellerIdCode = reseller.referralCode && reseller.referralCode.startsWith('KX-RES-')
    ? reseller.referralCode
    : `KX-RES-${reseller.id.replace('reseller-', '').toUpperCase().slice(0, 5) || '8492'}`;

  const handleCopyId = () => {
    navigator.clipboard.writeText(resellerIdCode);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  const whatsappMessage = encodeURIComponent(
    `আসসালামু আলাইকুম KenaX BD সাপোর্ট টিম,\nআমার রিসেলার আইডি: ${resellerIdCode}\nশপ নেম: ${reseller.businessName || reseller.fullName}\nফোন: ${reseller.phone}\nআমার বার্তা:`
  );
  const whatsappUrl = `https://wa.me/8801812345678?text=${whatsappMessage}`;

  if (!isOpen) return null;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userText = inputMessage.trim();
    const newMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'reseller',
      text: userText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputMessage('');

    // Simulated automated assistant / live agent response
    setTimeout(() => {
      let replyText = isBn
        ? 'ধন্যবাদ আপনার বার্তার জন্য। কেনাবেচা বিডি সিনিয়র সাপোর্ট এজেন্ট আপনার বার্তাটি রিভিউ করছেন।'
        : 'Thank you for your message. A KenaX BD senior support representative is reviewing your request.';

      if (userText.includes('উইথড্র') || userText.includes('টাকা') || userText.includes('ব্যালেন্স') || userText.toLowerCase().includes('withdraw')) {
        replyText = isBn
          ? 'ওয়ালেট ব্যালেন্স সর্বনিম্ন ৫০০ টাকা হলে bKash/Nagad এ উত্তোলন করতে পারবেন। প্রতিদিন সকাল ১১টা থেকে রাত ৯টার মধ্যে উইথড্রল প্রসেস করা হয়।'
          : 'Minimum withdrawal is ৳500 for bKash/Nagad. Settlement requests are processed within 12-24 hours with 0% fees.';
      } else if (userText.includes('ডেলিভারি') || userText.includes('অগ্রিম') || userText.includes('চার্জ') || userText.toLowerCase().includes('delivery')) {
        replyText = isBn
          ? 'ডেলিভারি চার্জ নিয়মাবলী: বেসিক প্ল্যানে প্রথম ৫-৭টি এবং স্ট্যান্ডার্ডে ৩টি অর্ডারের ডেলিভারি চার্জ অগ্রিম দিতে হয়। প্রিমিয়াম ভিআইপিতে কোনো অগ্রিম ডেলিভারি চার্জ লাগে না।'
          : 'Delivery charge rules: Basic Free requires advance for first 5-7 orders, Standard Pro for 3 orders, and Premium VIP has 0 advance fees nationwide.';
      }

      const agentReply: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, agentReply]);
    }, 800);
  };

  const handleQuickQuestion = (q: string) => {
    setInputMessage(q);
  };

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDesc.trim()) return;

    setTicketSubmitted(true);
    setTimeout(() => {
      setTicketSubmitted(false);
      const randomTicketId = Math.floor(100000 + Math.random() * 900000);
      setTicketSubject('');
      setTicketDesc('');
      setActiveTab('chat');
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: isBn
            ? `✅ সাপোর্ট টিকিট #${randomTicketId} সফলভাবে তৈরি করা হয়েছে! আমাদের হেল্পডেস্ক টিম শীঘ্রই আপনার সাথে যোগাযোগ করবে।`
            : `✅ Support Ticket #${randomTicketId} created successfully! Our team will follow up shortly.`,
          time: 'Just now',
        },
      ]);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[650px] max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 bg-gradient-to-r from-emerald-950/90 via-slate-900 to-indigo-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white">
                  {isBn ? 'চ্যাট উইথ কানেক্স বিডি টিম' : 'Chat with KenaX BD Team'}
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-400 font-bold">{isBn ? 'অনলাইন এজেন্ট' : 'Online Agent'}</span>
              </div>
              <p className="text-[10px] text-slate-400">
                {isBn ? 'সেন্ট্রাল সাপোর্ট ও রিসেলার হেল্পডেস্ক' : 'Central Reseller Helpdesk'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-1 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isBn ? 'লাইভ চ্যাট' : 'Live Chat'}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ticket')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  activeTab === 'ticket'
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isBn ? 'টিকিট তৈরি' : 'Create Ticket'}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Reseller ID & Multi-Channel Quick Action Ribbon */}
        <div className="px-4 py-2.5 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
          {/* Reseller ID Pill with Copy */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase">{isBn ? 'আপনার আইডি:' : 'Your ID:'}</span>
            <span className="font-mono font-black text-xs text-emerald-400 bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
              {resellerIdCode}
            </span>
            <button
              type="button"
              onClick={handleCopyId}
              className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
              title="Copy Reseller ID"
            >
              {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedId ? (isBn ? 'কপিকৃত!' : 'Copied!') : (isBn ? 'কপি' : 'Copy')}</span>
            </button>
          </div>

          {/* Social Channels Quick Buttons */}
          <div className="flex items-center gap-1.5">
            {/* WhatsApp */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-bold text-[10px] flex items-center gap-1 transition-colors"
              title="Chat on WhatsApp"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>WhatsApp</span>
            </a>

            {/* Telegram */}
            <a
              href="https://t.me/kenaxbd_support"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-300 font-bold text-[10px] flex items-center gap-1 transition-colors"
              title="Telegram Support"
            >
              <Send className="w-3 h-3" />
              <span>Telegram</span>
            </a>

            {/* Messenger */}
            <a
              href="https://m.me/kenaxbd"
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1 rounded-lg bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 font-bold text-[10px] flex items-center gap-1 transition-colors"
              title="Facebook Messenger"
            >
              <MessageSquare className="w-3 h-3" />
              <span>Messenger</span>
            </a>
          </div>
        </div>

        {/* Tab 1: Live Chat Interface */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            {/* Quick Prompt Chips */}
            <div className="p-2.5 bg-slate-950/60 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto text-[11px]">
              <span className="text-slate-500 text-[10px] font-bold uppercase shrink-0">
                {isBn ? 'দ্রুত প্রশ্ন:' : 'Quick Prompts:'}
              </span>
              {[
                { labelBn: 'উইথড্রল প্রসেস সময় কত?', labelEn: 'Withdrawal settlement time?' },
                { labelBn: 'ডেলিভারি চার্জ নিয়মাবলী', labelEn: 'Delivery charge advance policy' },
                { labelBn: 'কুরিয়ার ট্র্যাকিং আপডেট', labelEn: 'Courier tracking updates' },
              ].map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleQuickQuestion(isBn ? q.labelBn : q.labelEn)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 shrink-0 whitespace-nowrap cursor-pointer transition-colors text-[11px]"
                >
                  {isBn ? q.labelBn : q.labelEn}
                </button>
              ))}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'reseller'
                      ? 'items-end'
                      : msg.sender === 'system'
                      ? 'items-center'
                      : 'items-start'
                  }`}
                >
                  {msg.sender === 'system' ? (
                    <div className="p-3 bg-emerald-950/50 border border-emerald-800/60 rounded-2xl text-emerald-300 text-xs font-bold text-center max-w-md">
                      {msg.text}
                    </div>
                  ) : (
                    <div
                      className={`max-w-[80%] p-3.5 rounded-2xl text-xs space-y-1 ${
                        msg.sender === 'reseller'
                          ? 'bg-emerald-600 text-white rounded-tr-xs'
                          : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-xs'
                      }`}
                    >
                      <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                      <span
                        className={`text-[9px] block text-right font-mono ${
                          msg.sender === 'reseller' ? 'text-emerald-200' : 'text-slate-400'
                        }`}
                      >
                        {msg.time}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                placeholder={isBn ? 'আপনার বার্তা এখানে লিখুন...' : 'Type your message here...'}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">{isBn ? 'পাঠান' : 'Send'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Create Support Ticket Form */}
        {activeTab === 'ticket' && (
          <div className="flex-1 p-5 overflow-y-auto space-y-4">
            <div className="space-y-1">
              <h4 className="font-black text-white text-sm">
                {isBn ? 'নতুন সাপোর্ট টিকিট তৈরি করুন' : 'Create a Support Ticket'}
              </h4>
              <p className="text-xs text-slate-400">
                {isBn
                  ? 'যেকোনো জটিল সমস্যা বা পেমেন্ট সংক্রান্ত বিষয়ে টিকিট ওপেন করুন। ২৪ ঘণ্টার মধ্যে সমাধান মিলবে।'
                  : 'Open a dedicated ticket for complex inquiries or payout queries with resolution in 24 hours.'}
              </p>
            </div>

            <form onSubmit={handleSubmitTicket} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  {isBn ? 'টিকিটের বিষয় (Subject):' : 'Ticket Subject:'}
                </label>
                <input
                  type="text"
                  required
                  placeholder={isBn ? 'উদা: অর্ডার #10293 ডেলিভারি স্ট্যাটাস চেক' : 'e.g. Order #10293 delivery inquiry'}
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-300">
                    {isBn ? 'ক্যাটাগরি:' : 'Category:'}
                  </label>
                  <select
                    value={ticketCategory}
                    onChange={(e) => setTicketCategory(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="order">{isBn ? 'অর্ডার সংক্রান্ত' : 'Order Issues'}</option>
                    <option value="withdrawal">{isBn ? 'উইথড্রল ও পেমেন্ট' : 'Withdrawal & Payout'}</option>
                    <option value="profit">{isBn ? 'প্রফিট হিসাব' : 'Profit Calculation'}</option>
                    <option value="product">{isBn ? 'পণ্য ও হোলসেল স্টক' : 'Product & Stock'}</option>
                    <option value="account">{isBn ? 'অ্যাকাউন্ট ও মেম্বারশিপ' : 'Account & Membership'}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-300">
                    {isBn ? 'অগ্রাধিকার (Priority):' : 'Priority:'}
                  </label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="low">{isBn ? 'সাধারণ (Low)' : 'Low'}</option>
                    <option value="medium">{isBn ? 'মাঝারি (Medium)' : 'Medium'}</option>
                    <option value="high">{isBn ? 'উচ্চ (High)' : 'High'}</option>
                    <option value="urgent">{isBn ? 'জরুরি (Urgent)' : 'Urgent'}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-300">
                  {isBn ? 'সমস্যার বিস্তারিত বিবরণ:' : 'Issue Description:'}
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder={isBn ? 'আপনার সমস্যার বিস্তারিত লিখুন...' : 'Describe your issue in detail...'}
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white"
                />
              </div>

              <button
                type="submit"
                disabled={ticketSubmitted || !ticketSubject.trim() || !ticketDesc.trim()}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all"
              >
                {ticketSubmitted ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{isBn ? 'টিকিট জমা হচ্ছে...' : 'Submitting Ticket...'}</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>{isBn ? 'টিকিট সাবমিট করুন' : 'Submit Support Ticket'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
