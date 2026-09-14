import React from 'react';
import {
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  CheckCircle2,
  Award,
  Users,
  MapPin,
  ShoppingBag,
  ArrowRight,
  HeartHandshake,
  Sparkles,
  PhoneCall,
  Clock,
  Package,
} from 'lucide-react';

interface AboutViewProps {
  onNavigate: (view: string) => void;
  onOpenPolicy?: (policyKey: string) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onNavigate, onOpenPolicy }) => {
  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* 1. Hero Section */}
      <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Subtle Decorative Background Glows */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs sm:text-sm font-bold tracking-wide">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>About KenaX BD • Smart Shopping, Better Living</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            Empowering Bangladesh with <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-teal-300 to-emerald-400">
              Authentic & Hassle-Free
            </span>{' '}
            E-Commerce
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Welcome to KenaX BD, your premier digital marketplace dedicated to providing genuine electronics,
            fashion, gadgets, and home essentials delivered right to your doorstep across all 64 districts of Bangladesh.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('shop')}
              className="px-6 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black text-sm transition-all shadow-lg shadow-sky-500/25 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Explore Products</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('track')}
              className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/20 flex items-center gap-2 cursor-pointer backdrop-blur-xs active:scale-95"
            >
              <Truck className="w-4 h-4 text-sky-400" />
              <span>Track Your Order</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Bar */}
      <div className="max-w-6xl mx-auto px-4 -mt-8 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs text-center">
            <span className="text-2xl sm:text-3xl font-black text-sky-600 block">50,000+</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1 block">
              Satisfied Customers
            </span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs text-center">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 block">64</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1 block">
              Districts Covered
            </span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs text-center">
            <span className="text-2xl sm:text-3xl font-black text-amber-500 block">100%</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1 block">
              Genuine Products
            </span>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs text-center">
            <span className="text-2xl sm:text-3xl font-black text-indigo-600 block">24/7</span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-1 block">
              Customer Support
            </span>
          </div>
        </div>
      </div>

      {/* 3. Our Story & Purpose */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 space-y-12">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 shadow-xs">
          <div className="max-w-3xl">
            <span className="text-xs font-black uppercase tracking-widest text-sky-600 mb-2 block">
              Our Story
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-6 leading-snug">
              Built on Trust, Authenticity, and Everyday Convenience
            </h2>
            <div className="space-y-4 text-slate-600 text-sm sm:text-base leading-relaxed">
              <p>
                KenaX BD was founded with a singular ambition: to eliminate counterfeit products, opaque pricing,
                and delayed shipping from online shopping in Bangladesh. We believe that every customer, whether in
                the heart of Dhaka or remote corners of the country, deserves access to genuine, high-quality products
                with absolute peace of mind.
              </p>
              <p>
                From premium wireless gadgets and smart home solutions to trendy lifestyle items and personal care,
                we source directly from verified manufacturers, official brand importers, and certified distributors.
                Every single package is quality-inspected at our central Dhaka fulfillment center before hand-off to
                our trusted courier partners.
              </p>
              <p>
                With support for verified Cash on Delivery (COD), instant Mobile Financial Services (bKash, Nagad,
                Rocket, Upay), and an immutable parcel tracking system, KenaX BD represents the modern standard
                of Bangladeshi digital retail.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Core Pillars of KenaX BD */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-black uppercase tracking-widest text-sky-600 block mb-2">
              Why Choose KenaX BD
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
              The Guarantees That Set Us Apart
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h4 className="text-base font-black text-slate-900 mb-2">100% Authentic</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  We maintain zero tolerance for counterfeit or replica goods. Every product is authenticated with official warranty backing.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-sky-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Quality</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                  <Truck className="w-6 h-6" />
                </div>
                <h4 className="text-base font-black text-slate-900 mb-2">Nationwide Delivery</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Fast 24-48 hours delivery within Dhaka metro and 3-5 days across all other 63 districts via Steadfast and Pathao logistics.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Live Parcel Tracking</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-4">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <h4 className="text-base font-black text-slate-900 mb-2">7-Day Easy Returns</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Received a damaged or incorrect item? Enjoy straightforward returns and prompt refunds with our customer-friendly policy.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-amber-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Hassle-Free Protection</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4">
                  <Headphones className="w-6 h-6" />
                </div>
                <h4 className="text-base font-black text-slate-900 mb-2">Dedicated Support</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Our friendly customer care team is available daily to assist with order tracking, product inquiries, and warranty service.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-indigo-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Call & WhatsApp</span>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Official Courier & Payment Ecosystem */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-8 sm:p-10 shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="text-xs font-black uppercase tracking-widest text-sky-400">
                Logistics & Payments
              </span>
              <h3 className="text-2xl sm:text-3xl font-black">
                Seamless Payments & Nationwide Couriers
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                We partner exclusively with certified couriers and authorized payment gateways so your money and orders are always safe.
              </p>

              <div className="space-y-2 text-xs text-slate-300 pt-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span><b>Payment Methods:</b> Cash on Delivery, bKash, Nagad, Rocket, Upay, Visa & Mastercard</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                  <span><b>Delivery Couriers:</b> Steadfast Courier, Pathao Logistics, RedX, Sundarban</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">
                Customer Care & Hub Office
              </h4>
              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Central Fulfillment Hub</span>
                    <span>Plot #24, Road #11, Banani C/A, Dhaka-1213, Bangladesh</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <PhoneCall className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Support Hotline</span>
                    <span>+880 1700-000000 / +880 1900-000000 (10 AM - 10 PM)</span>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Operating Hours</span>
                    <span>7 Days a Week, 365 Days a Year</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => onNavigate('contact')}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer text-center"
                >
                  Contact Us
                </button>
                <button
                  onClick={() => onOpenPolicy?.('faq')}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs transition-colors cursor-pointer text-center"
                >
                  View FAQs
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Quick Policy Links & CTA */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center space-y-4">
          <h3 className="text-xl font-bold text-slate-900">
            Transparent Policies You Can Rely On
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            We are committed to clear and fair policies for data privacy, consumer terms, and returns.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => onOpenPolicy?.('privacy')}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => onOpenPolicy?.('terms')}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              onClick={() => onOpenPolicy?.('refund')}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              Refund Policy
            </button>
            <button
              onClick={() => onOpenPolicy?.('faq')}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              FAQ Help Center
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
