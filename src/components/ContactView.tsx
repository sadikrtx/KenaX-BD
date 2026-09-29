import React, { useState } from 'react';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SiteSettings } from '../types';
import {
  cleanBDPhoneNumber,
  isValidBDMobileNumber,
  getBDPhoneValidationError,
} from '../utils/phoneUtils';

interface FAQItem {
  question: string;
  answer: string;
}

interface ContactViewProps {
  siteSettings?: SiteSettings;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: 'How do I place an order with Cash on Delivery (COD)?',
    answer:
      'Simply browse our store, add your desired items to your cart, proceed to checkout, enter your shipping name, mobile number, and address, and select "Cash on Delivery". You pay only when the parcel arrives at your doorstep.',
  },
  {
    question: 'What are the delivery charges and delivery times across Bangladesh?',
    answer:
      'Delivery inside Dhaka City is ৳60 (typically 24 to 48 hours). Delivery outside Dhaka across all 64 districts is ৳120 (typically 3 to 5 business days) via our official partners Steadfast, Pathao, RedX, and Sundarban Courier.',
  },
  {
    question: 'Can I inspect the parcel before paying the courier delivery agent?',
    answer:
      'Yes, absolutely! We encourage open-box checking in front of the delivery agent. If the item is defective, incorrect, or damaged in transit, you can decline to accept it immediately without any hassle.',
  },
  {
    question: 'How do I track my active order?',
    answer:
      'Click on "Track Order" in the top navigation bar, enter your Order ID (e.g. KB-1001) and your registered mobile phone number. You will receive live status updates from Confirmation to Courier dispatch.',
  },
  {
    question: 'What is your return and replacement policy?',
    answer:
      'We provide a 7-day hassle-free replacement warranty for manufacturing defects or shipping damages. Simply contact our hotline or email support@kenaxbd.com with photos or an unboxing video.',
  },
  {
    question: 'Are all products sold on KenaX BD 100% genuine?',
    answer:
      'Yes, all electronics, accessories, and lifestyle products are 100% genuine and procured directly from authorized manufacturers and verified suppliers.',
  },
];

export const ContactView: React.FC<ContactViewProps> = ({ siteSettings }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Dynamic Contact Center details from settings
  const expTitle = siteSettings?.experienceCenterTitle !== undefined ? siteSettings.experienceCenterTitle : 'Dhaka Experience Center';
  const expAddress = siteSettings?.experienceCenterAddress !== undefined ? siteSettings.experienceCenterAddress : 'Level 4, House 45, Road 27, Dhanmondi, Dhaka 1209, Bangladesh';
  
  const helplines = siteSettings?.helplines !== undefined 
    ? siteSettings.helplines 
    : (siteSettings?.phone ? [siteSettings.phone] : ['+880 1700-123456', '+880 1911-987654']);
    
  const emails = siteSettings?.officialEmails !== undefined 
    ? siteSettings.officialEmails 
    : (siteSettings?.email ? [siteSettings.email] : ['support@kenaxbd.com', 'sales@kenaxbd.com']);
    
  const hours = siteSettings?.supportHours !== undefined ? siteSettings.supportHours : '9:00 AM – 10:00 PM (Everyday including weekends)';
  const deliveryText = siteSettings?.nationwideDeliveryText !== undefined ? siteSettings.nationwideDeliveryText : '24-48 Hours inside Dhaka Metro | 3-5 Days across all 64 Districts.';

  const [phoneError, setPhoneError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    if (!name || !phone || !message) return;

    const cleaned = cleanBDPhoneNumber(phone);
    if (!isValidBDMobileNumber(cleaned)) {
      setPhoneError(getBDPhoneValidationError(cleaned) || 'Please enter a valid 11-digit mobile number starting with 013 to 019.');
      return;
    }

    setIsSent(true);
    setTimeout(() => {
      setName('');
      setPhone('');
      setEmail('');
      setSubject('');
      setMessage('');
      setPhoneError('');
    }, 400);
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-12">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <span className="text-xs font-bold text-sky-600 uppercase tracking-widest bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
          Get in Touch
        </span>
        <h1 className="text-3xl font-black text-slate-900 mt-2">Contact & Help Center</h1>
        <p className="text-xs text-slate-500 mt-1">
          Have questions regarding order tracking, delivery status, or product details? We are here to assist you 7 days a week.
        </p>
      </div>

      {/* Main Grid: Contact Details & Form */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left: Contact Info */}
        <div className="md:col-span-5 bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-md">
          <div className="space-y-6">
            <h2 className="text-xl font-black">Customer Support & Headquarters</h2>

            <div className="space-y-4 text-xs text-slate-300">
              {(expTitle || expAddress) && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    {expTitle && <h4 className="font-bold text-white">{expTitle}</h4>}
                    {expAddress && <p>{expAddress}</p>}
                  </div>
                </div>
              )}

              {helplines.length > 0 && (
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white">Helpline (Customer Care)</h4>
                    {helplines.map((num, i) => (
                      <p key={i}>{num}</p>
                    ))}
                  </div>
                </div>
              )}

              {emails.length > 0 && (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white">Official Email</h4>
                    {emails.map((em, i) => (
                      <p key={i}>{em}</p>
                    ))}
                  </div>
                </div>
              )}

              {hours && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-white">Support Hours</h4>
                    <p>{hours}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {deliveryText && (
            <div className="mt-8 pt-6 border-t border-slate-800 text-xs text-slate-400">
              <p className="font-semibold text-white">Fast Nationwide Delivery:</p>
              <p>{deliveryText}</p>
            </div>
          )}
        </div>

        {/* Right: Contact Form */}
        <div className="md:col-span-7 bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Send us a Message</h2>
          <p className="text-xs text-slate-500 mb-6">
            Fill out the form below and our representative will respond promptly.
          </p>

          {isSent ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2 animate-in fade-in">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-emerald-900">Message Sent Successfully!</h3>
              <p className="text-xs text-emerald-700">
                Thank you for reaching out. Our customer support team will contact you within 2 hours.
              </p>
              <button
                type="button"
                onClick={() => setIsSent(false)}
                className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Send Another Inquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Your Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tanvir Hossain"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Mobile Number (11-Digit) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    value={phone}
                    onChange={(e) => {
                      setPhone(cleanBDPhoneNumber(e.target.value));
                      if (phoneError) setPhoneError('');
                    }}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-sky-500"
                    required
                  />
                  {phoneError && <p className="text-[11px] text-rose-500 mt-1">{phoneError}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Order Tracking Inquiry"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Your Message / Inquiry <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your question or request here..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-sky-600/20"
              >
                <Send className="w-4 h-4" />
                <span>Send Message</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Integrated FAQ Section */}
      <div className="pt-6 border-t border-slate-200">
        <div className="text-center max-w-xl mx-auto mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold mb-2">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900">Got Questions? We Have Answers</h2>
          <p className="text-xs text-slate-500 mt-1">
            Browse quick answers to common questions about purchasing, shipping, and returns.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
          {FAQ_ITEMS.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-2xs transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full px-5 py-4 text-left flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-900 leading-snug">{faq.question}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-sky-600 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3 bg-slate-50/50">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
