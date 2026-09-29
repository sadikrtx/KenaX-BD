import React, { useState } from 'react';
import {
  Headphones,
  MessageSquare,
  Send,
  Phone,
  HelpCircle,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  Plus,
  FileText,
  Sparkles,
  Paperclip,
  CheckCheck,
  User,
  Zap,
} from 'lucide-react';
import { ResellerUser, ResellerSupportTicket } from '../../types/reseller';

interface ResellerSupportPanelProps {
  reseller: ResellerUser;
  lang?: 'bn' | 'en';
}

interface ChatMessage {
  id: string;
  sender: 'reseller' | 'agent' | 'system';
  text: string;
  time: string;
}

export const ResellerSupportPanel: React.FC<ResellerSupportPanelProps> = ({
  reseller,
  lang = 'bn',
}) => {
  const isBn = lang === 'bn';
  const [activeTab, setActiveTab] = useState<'live_chat' | 'ticket' | 'channels'>('live_chat');
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

  // Live Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'agent',
      text: isBn
        ? `আসসালামু আলাইকুম ${reseller.businessName || reseller.fullName}! কানেক্স বিডি (KenaX BD) সেন্ট্রাল সাপোর্ট ডেস্কে আপনাকে স্বাগতম।\n\nআপনার রিসেলার আইডি (${resellerIdCode}) ভেরিফাই করা হয়েছে। আপনার কোনো অর্ডার ডেলিভারি, প্রফিট উইথড্রয়াল বা মেম্বারশিপ সংক্রান্ত জিজ্ঞাসা থাকলে লিখুন।`
        : `Welcome ${reseller.businessName || reseller.fullName} to KenaX BD Central Helpdesk!\n\nYour Reseller ID (${resellerIdCode}) is verified. How can our senior support agents assist you today?`,
      time: 'Just now',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');

  // Ticket Form State
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketCategory, setTicketCategory] = useState<'order' | 'profit' | 'withdrawal' | 'product' | 'membership' | 'other'>('order');
  const [ticketPriority, setTicketPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [userTickets, setUserTickets] = useState<Array<{
    id: string;
    subject: string;
    category: string;
    priority: string;
    status: 'open' | 'in_progress' | 'resolved';
    createdAt: string;
    resellerId: string;
  }>>([
    {
      id: 'TKT-89241',
      subject: isBn ? 'পার্সেল ট্র্যাকিং ও দ্রুত ডেলিভারি রিকোয়েস্ট' : 'Parcel Tracking & Fast Delivery Request',
      category: 'order',
      priority: 'high',
      status: 'in_progress',
      createdAt: '2 hours ago',
      resellerId: resellerIdCode,
    },
  ]);

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

    // Intelligent Instant Automated Response
    setTimeout(() => {
      let replyText = isBn
        ? `ধন্যবাদ আপনার বার্তার জন্য। কানেক্স বিডি সিনিয়র সাপোর্ট এক্সিকিউটিভ আপনার রিকোয়েস্টটি পর্যালোচনা করছেন। (রিসেলার আইডি: ${resellerIdCode})`
        : `Thank you for your message. A KenaX BD senior account manager is reviewing your request. (Reseller ID: ${resellerIdCode})`;

      const lower = userText.toLowerCase();
      if (lower.includes('উইথড্র') || lower.includes('টাকা') || lower.includes('ব্যালেন্স') || lower.includes('withdraw') || lower.includes('payout')) {
        replyText = isBn
          ? `💰 উইথড্রয়াল ইনফো: আপনার ওয়ালেট ব্যালেন্স সর্বনিম্ন ৫০০ টাকা হলেই বিকাশ, নগদ বা ব্যাংক অ্যাকাউন্টে পে-আউট রিকোয়েস্ট দিতে পারবেন। প্রতিদিন সকাল ১১টা থেকে রাত ৯টার মধ্যে ট্রানজেকশন সফল করা হয়।`
          : `💰 Payout Info: Minimum withdrawal is ৳500 to bKash, Nagad or Bank. Disbursements are processed between 11 AM and 9 PM daily.`;
      } else if (lower.includes('ডেলিভারি') || lower.includes('কুরিয়ার') || lower.includes('চার্জ') || lower.includes('delivery') || lower.includes('courier')) {
        replyText = isBn
          ? `🚚 ডেলিভারি ও কুরিয়ার: ঢাকা সিটির ভেতরে ডেলিভারি চার্জ ৬০-৮০ টাকা এবং ঢাকার বাইরে ১২০-১৩০ টাকা। প্রিমিয়াম ভিআইপি মেম্বারদের পার্সেল অগ্রাধিকার ভিত্তিতে দ্রুততম স্লটে ডিসপ্যাচ করা হয়।`
          : `🚚 Courier & Delivery: Standard delivery is ৳60-80 inside Dhaka and ৳120-130 outside Dhaka. VIP parcels undergo expedited first-slot dispatch.`;
      } else if (lower.includes('ভিআইপি') || lower.includes('আপগ্রেড') || lower.includes('প্ল্যান') || lower.includes('vip') || lower.includes('plan')) {
        replyText = isBn
          ? `👑 ভিআইপি মেম্বারশিপ: প্রিমিয়াম ভিআইপি প্ল্যানে অতিরিক্ত ৩%-৫% ক্যাশব্যাক মার্জিন, আনলিমিটেড ড্রপশিপিং অর্ডার এবং কোনো অগ্রিম ডেলিভারি ফি ছাড়া সারাদেশে ক্যাশ অন ডেলিভারি সুবিধা পাওয়া যায়।`
          : `👑 VIP Membership: Unlocks 3%-5% extra profit margin, unlimited monthly orders, and zero advance delivery fees nationwide.`;
      }

      const agentReply: ChatMessage = {
        id: `agent-${Date.now()}`,
        sender: 'agent',
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, agentReply]);
    }, 700);
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim()) return;

    setTicketSubmitted(true);
    setTimeout(() => {
      const newTicketId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
      const newTkt = {
        id: newTicketId,
        subject: ticketSubject.trim(),
        category: ticketCategory,
        priority: ticketPriority,
        status: 'open' as const,
        createdAt: isBn ? 'এইমাত্র' : 'Just now',
        resellerId: resellerIdCode,
      };

      setUserTickets((prev) => [newTkt, ...prev]);
      setTicketSubject('');
      setTicketDescription('');
      setTicketSubmitted(false);
      setActiveTab('ticket');

      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          sender: 'system',
          text: isBn
            ? `✅ সাপোর্ট টিকিট #${newTicketId} সফলভাবে জমা হয়েছে! (রিসেলার আইডি: ${resellerIdCode})`
            : `✅ Support Ticket #${newTicketId} created successfully! (Reseller ID: ${resellerIdCode})`,
          time: 'Just now',
        },
      ]);
    }, 900);
  };

  // WhatsApp Pre-filled Link
  const whatsappMessage = encodeURIComponent(
    `আসসালামু আলাইকুম KenaX BD সাপোর্ট টিম,\nআমার রিসেলার আইডি: ${resellerIdCode}\nশপ নেম: ${reseller.businessName || reseller.fullName}\nফোন: ${reseller.phone}\nআমার প্রশ্ন/সমস্যা:`
  );
  const whatsappUrl = `https://wa.me/8801812345678?text=${whatsappMessage}`;

  return (
    <div className="space-y-5 animate-in fade-in duration-200 text-xs">
      {/* 1. TOP HEADER & RESELLER ID CARD BANNER */}
      <div className="p-5 sm:p-7 rounded-3xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-indigo-950/80 border border-emerald-500/30 shadow-2xl text-white space-y-4 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/20 shrink-0">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{isBn ? 'সেন্ট্রাল সাপোর্ট ডেস্ক' : 'Central Support Desk'}</span>
                </span>
                <span className="text-slate-500">•</span>
                <span className="text-xs font-bold text-slate-400">
                  {isBn ? 'গড় রেসপন্স সময়: ২ মিনিট' : 'Avg Response Time: 2 Mins'}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                {isBn ? 'চ্যাট উইথ কানেক্স বিডি টিম ও কাস্টমার কেয়ার' : 'Chat with KenaX BD Team & Support'}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5 max-w-xl">
                {isBn
                  ? 'যেকোনো পার্সেল ট্র্যাকিং, পেমেন্ট উইথড্রয়াল, কুরিয়ার সমস্যা অথবা ভিআইপি মেম্বারশিপ সংক্রান্ত সহায়তার জন্য সরাসরি যোগাযোগ করুন।'
                  : 'Get 24/7 dedicated assistance for order fulfillment, courier issues, payout verification, and technical support.'}
              </p>
            </div>
          </div>

          {/* Holographic Digital Reseller ID Card */}
          <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-emerald-500/40 shadow-xl space-y-2 shrink-0 max-w-xs w-full lg:w-auto">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                {isBn ? 'আপনার অফিসিয়াল রিসেলার আইডি' : 'Your Official Reseller ID'}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>

            <div className="flex items-center justify-between gap-3 bg-slate-900/90 px-3 py-2 rounded-xl border border-slate-800">
              <span className="font-mono text-base font-black text-emerald-400 tracking-widest">
                {resellerIdCode}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                title={isBn ? 'আইডি কপি করুন' : 'Copy ID'}
              >
                {copiedId ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{isBn ? 'কপিকৃত!' : 'Copied!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{isBn ? 'কপি' : 'Copy'}</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[10px] text-amber-300/90 font-medium leading-tight">
              {isBn
                ? '💡 যেকোনো টিকেট বা চ্যাট করার সময় এই আইডিটি প্রদান করুন।'
                : '💡 Always quote this Reseller ID when chatting or filing tickets.'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. MULTI-CHANNEL INSTANT CONNECT CARDS (WhatsApp, Telegram, Messenger, Hotline) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. WhatsApp Instant Support */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 hover:border-emerald-500 transition-all hover:shadow-lg group block"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
              {/* WhatsApp Custom SVG Icon */}
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.664-.698c.97.53 1.771.819 2.796.819 3.18 0 5.767-2.587 5.767-5.766.001-3.18-2.585-5.766-5.767-5.766zm3.393 8.163c-.144.405-.837.774-1.17.823-.312.045-.694.06-1.107-.074-.537-.174-1.396-.548-2.42-1.461-1.258-1.12-2.079-2.508-2.222-2.753-.144-.246-.013-.379.11-.502.11-.11.246-.286.368-.429.123-.143.164-.246.246-.409.082-.164.041-.307-.021-.43-.062-.123-.553-1.332-.758-1.823-.2-.48-.403-.415-.553-.423l-.472-.008c-.164 0-.43.061-.655.307-.225.246-.86 1.025-.86 2.072 0 1.047.779 2.059.887 2.203.108.143 1.533 2.341 3.715 3.283.52.224.925.358 1.242.459.523.166.999.143 1.375.087.42-.063 1.291-.528 1.474-1.037.183-.509.183-.945.128-1.037-.055-.092-.205-.144-.43-.257z"/>
              </svg>
            </div>
            <ExternalLink className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <h4 className="font-bold text-white text-sm">
            {isBn ? 'হোয়াটসঅ্যাপ হেল্পলাইন' : 'WhatsApp Support'}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isBn ? 'সরাসরি চ্যাট ও ছবি শেয়ার' : 'Instant chat & media share'}
          </p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
            🟢 {isBn ? 'ইনস্ট্যান্ট কানেক্ট' : 'Instant Connect'}
          </span>
        </a>

        {/* 2. Telegram Official Bot */}
        <a
          href="https://t.me/kenaxbd_support"
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 rounded-3xl bg-gradient-to-br from-sky-950/40 via-slate-900 to-slate-900 border border-sky-500/30 hover:border-sky-500 transition-all hover:shadow-lg group block"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
              <Send className="w-5 h-5" />
            </div>
            <ExternalLink className="w-4 h-4 text-sky-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <h4 className="font-bold text-white text-sm">
            {isBn ? 'টেলিগ্রাম অফিসিয়াল বট' : 'Telegram Bot'}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isBn ? 'অর্ডার স্ট্যাটাস ও বট ট্র্যাকিং' : 'Order updates & fast bot'}
          </p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-bold">
            ✈️ @kenaxbd_support
          </span>
        </a>

        {/* 3. Facebook Messenger Support */}
        <a
          href="https://m.me/kenaxbd"
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 hover:border-indigo-500 transition-all hover:shadow-lg group block"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
              <MessageSquare className="w-5 h-5" />
            </div>
            <ExternalLink className="w-4 h-4 text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <h4 className="font-bold text-white text-sm">
            {isBn ? 'মেসেঞ্জার ইনবক্স' : 'Messenger Inbox'}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isBn ? 'ফেসবুক অফিসিয়াল পেজ চ্যাট' : 'Official Facebook Page'}
          </p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">
            💬 m.me/kenaxbd
          </span>
        </a>

        {/* 4. Dedicated Phone Hotline */}
        <a
          href="tel:+8801812345678"
          className="p-4 rounded-3xl bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border border-amber-500/30 hover:border-amber-500 transition-all hover:shadow-lg group block"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black group-hover:scale-110 transition-transform">
              <Phone className="w-5 h-5" />
            </div>
            <ExternalLink className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <h4 className="font-bold text-white text-sm">
            {isBn ? 'ভিআইপি সাপোর্ট হটলাইন' : 'VIP Direct Hotline'}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {isBn ? 'সকাল ৯টা - রাত ১১টা' : '9:00 AM - 11:00 PM'}
          </p>
          <span className="inline-block mt-2 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold font-mono">
            📞 +880 1812-345678
          </span>
        </a>
      </div>

      {/* 3. MAIN WORKSPACE: LIVE CHAT & TICKET DESK SWITCHER */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xs overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 p-3 sm:p-4 bg-slate-950/60 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('live_chat')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'live_chat'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>{isBn ? 'লাইভ চ্যাট উইন্ডো' : 'Live Chat Window'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ticket')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'ticket'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{isBn ? 'সাপোর্ট টিকিট ও হিস্ট্রি' : 'Support Tickets'}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px] font-bold">
                {userTickets.length}
              </span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>{isBn ? 'এনক্রিপ্টেড ও সুরক্ষিত কমিউনিকেশন' : 'Encrypted & Secure Communication'}</span>
          </div>
        </div>

        {/* Tab Content 1: Live Chat Window */}
        {activeTab === 'live_chat' && (
          <div className="p-4 sm:p-6 space-y-4">
            {/* Chat Messages Log Box */}
            <div className="h-80 sm:h-96 rounded-2xl bg-slate-950 border border-slate-800/90 p-4 overflow-y-auto space-y-3.5 scrollbar-thin">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.sender === 'reseller'
                      ? 'items-end'
                      : m.sender === 'system'
                      ? 'items-center'
                      : 'items-start'
                  }`}
                >
                  {m.sender === 'system' ? (
                    <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-center text-[11px] max-w-md font-bold">
                      {m.text}
                    </div>
                  ) : (
                    <div className="max-w-[85%] sm:max-w-md space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1">
                        <span className="font-bold">
                          {m.sender === 'reseller' ? (reseller.businessName || reseller.fullName) : 'KenaX BD Senior Agent'}
                        </span>
                        <span>•</span>
                        <span>{m.time}</span>
                      </div>
                      <div
                        className={`p-3 rounded-2xl text-xs whitespace-pre-line leading-relaxed ${
                          m.sender === 'reseller'
                            ? 'bg-emerald-600 text-white rounded-tr-none shadow-md'
                            : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                        }`}
                      >
                        {m.text}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Action FAQ Buttons */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                {isBn ? 'কুইক প্রশ্ন (ক্লিক করে সরাসরি বার্তা পাঠান):' : 'Quick FAQs:'}
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {[
                  isBn ? 'উইথড্রল কীভাবে প্রসেস হয়?' : 'How are withdrawals processed?',
                  isBn ? 'ডেলিভারি চার্জের নিয়ম কী?' : 'What are courier delivery rules?',
                  isBn ? 'ভিআইপি মেম্বারশিপের বাড়তি সুবিধা কী?' : 'What are VIP tier benefits?',
                  isBn ? 'পার্সেল রিটার্ন হলে করণীয় কী?' : 'What to do for parcel returns?',
                ].map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setInputMessage(q)}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] whitespace-nowrap cursor-pointer transition-colors shrink-0"
                  >
                    💬 {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Message Input Box */}
            <form onSubmit={handleSendMessage} className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  isBn
                    ? `বার্তা লিখুন... (আপনার রিসেলার আইডি: ${resellerIdCode} সংযুক্ত থাকবে)`
                    : `Type your inquiry... (Reseller ID: ${resellerIdCode} attached)`
                }
                className="flex-1 px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
              />
              <button
                type="submit"
                className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer transition-all shrink-0"
              >
                <span>{isBn ? 'পাঠান' : 'Send'}</span>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* Tab Content 2: Priority Support Tickets Desk */}
        {activeTab === 'ticket' && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Create New Ticket Card */}
            <div className="p-5 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      {isBn ? 'নতুন প্রায়োরিটি সাপোর্ট টিকিট তৈরি করুন' : 'Create Priority Support Ticket'}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {isBn ? `রিসেলার আইডি: ${resellerIdCode} সহ সাবমিট হবে` : `Will be attached with Reseller ID: ${resellerIdCode}`}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      {isBn ? 'টিকেটের ক্যাটাগরি *' : 'Ticket Category *'}
                    </label>
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold"
                    >
                      <option value="order">{isBn ? '📦 অর্ডার ডেলিভারি ও কুরিয়ার ট্র্যাকিং' : 'Order & Courier Delivery'}</option>
                      <option value="withdrawal">{isBn ? '💰 প্রফিট উইথড্রয়াল ও বিকাশ/নগদ পেআউট' : 'Profit Payout & Withdrawals'}</option>
                      <option value="product">{isBn ? '🛒 প্রোডাক্ট স্টক ও হোলসেল ক্যাটালগ' : 'Product Stock & Wholesale'}</option>
                      <option value="membership">{isBn ? '👑 মেম্বারশিপ প্ল্যান ও ভিআইপি আপগ্রেড' : 'Membership & VIP Upgrade'}</option>
                      <option value="other">{isBn ? '⚙️ অন্যান্য টেকনিক্যাল সমস্যা' : 'Other Inquiries'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      {isBn ? 'অগ্রাধিকার লেভেল (Priority) *' : 'Priority Level *'}
                    </label>
                    <select
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-bold"
                    >
                      <option value="high">🔴 {isBn ? 'জরুরি (High Priority - জরুরি সমাধান)' : 'High Priority'}</option>
                      <option value="urgent">⚡ {isBn ? 'অত্যন্ত জরুরি (Urgent)' : 'Urgent'}</option>
                      <option value="medium">🟡 {isBn ? 'মাঝারি (Medium)' : 'Medium'}</option>
                      <option value="low">🟢 {isBn ? 'সাধারণ তথ্য (Normal)' : 'Normal'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    {isBn ? 'টিকেটের বিষয় / শিরোনাম *' : 'Ticket Subject *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder={isBn ? 'যেমন: অর্ডার #1245 ডেলিভারি স্ট্যাটাস আপডেট প্রয়োজন' : 'e.g. Order #1245 delivery status update'}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    {isBn ? 'বিস্তারিত বিবরণ *' : 'Detailed Description *'}
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    placeholder={isBn ? 'সমস্যার বিস্তারিত বিবরণ দিন। অর্ডার আইডি বা TrxID থাকলে উল্লেখ করুন...' : 'Describe your inquiry in detail...'}
                    className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs placeholder-slate-500"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <div className="text-[10px] text-slate-400">
                    {isBn ? `রিসেলার আইডি: ${resellerIdCode}` : `Attached: ${resellerIdCode}`}
                  </div>
                  <button
                    type="submit"
                    disabled={ticketSubmitted}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-2 shadow-lg cursor-pointer transition-all"
                  >
                    {ticketSubmitted ? (
                      <span>{isBn ? 'জমা হচ্ছে...' : 'Submitting...'}</span>
                    ) : (
                      <>
                        <span>{isBn ? 'টিকিট সাবমিট করুন' : 'Submit Ticket'}</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Existing User Tickets Log */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-xs flex items-center justify-between">
                <span>{isBn ? 'আপনার পূর্ববর্তী সাপোর্ট টিকিট তালিকা' : 'Your Ticket History'}</span>
                <span className="text-slate-400 text-[11px]">{userTickets.length} {isBn ? 'টি টিকেট' : 'Tickets'}</span>
              </h4>

              <div className="space-y-2.5">
                {userTickets.map((tkt) => (
                  <div
                    key={tkt.id}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-emerald-400">{tkt.id}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-[10px] font-mono text-slate-400">ID: {tkt.resellerId}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-[10px] text-slate-400">{tkt.createdAt}</span>
                      </div>
                      <h5 className="font-bold text-white text-xs">{tkt.subject}</h5>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        tkt.status === 'resolved'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : tkt.status === 'in_progress'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 animate-pulse'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {tkt.status === 'resolved' ? (isBn ? 'সমাধানকৃত' : 'Resolved') : tkt.status === 'in_progress' ? (isBn ? 'প্রক্রিয়াধীন' : 'In Progress') : (isBn ? 'ওপেন' : 'Open')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
