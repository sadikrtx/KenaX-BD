import React from 'react';
import {
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  Truck,
  Home,
  ShoppingBag,
  User,
  Smartphone,
  Shirt,
  Sparkles,
  Dumbbell,
  HelpCircle,
  Package,
  FileText,
  RotateCcw,
  Info,
} from 'lucide-react';
import { KenaXLogo } from './KenaXLogo';
import { SiteSettings } from '../types';

interface FooterProps {
  onNavigate: (view: string) => void;
  onSelectCategory: (cat: string) => void;
  customLogoUrl?: string;
  onOpenPolicy?: (tab: 'privacy' | 'terms' | 'refund' | 'faq') => void;
  siteSettings?: SiteSettings;
}

export const Footer: React.FC<FooterProps> = ({
  onNavigate,
  onSelectCategory,
  customLogoUrl,
  onOpenPolicy,
  siteSettings,
}) => {
  return (
    <footer className="bg-slate-950 text-slate-300 border-t border-slate-800/80 pt-8 sm:pt-10 pb-20 sm:pb-8">
      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Grid: Left Brand Info (lg:col-span-4 / xl:col-span-4) + Right 3 Link Columns (lg:col-span-8 / xl:col-span-8) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 pb-8 border-b border-slate-800/70">
          
          {/* Brand Info & Contacts */}
          <div className="lg:col-span-4 xl:col-span-4 space-y-3.5">
            <div
              className="cursor-pointer inline-block"
              onClick={() => {
                onNavigate('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <KenaXLogo size="md" theme="dark" customLogoUrl={customLogoUrl} />
            </div>

            <p className="text-xs text-slate-400 leading-relaxed pr-1 sm:pr-4">
              Smart Shopping, Better Living. Bangladesh's premier smart e-commerce platform offering 100% genuine electronics, gadgets, fashion, and home essentials with verified Cash on Delivery nationwide.
            </p>

            {/* Compact Contact Rows */}
            <div className="space-y-1.5 text-xs text-slate-300 pt-0.5">
              {(siteSettings?.address || siteSettings?.experienceCenterAddress) && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] sm:text-xs">
                    {siteSettings?.address || siteSettings?.experienceCenterAddress || 'House 45, Road 27, Dhanmondi, Dhaka 1209'}
                  </span>
                </div>
              )}
              {(siteSettings?.phone || (siteSettings?.helplines && siteSettings.helplines.length > 0)) && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-[11px] sm:text-xs font-semibold">
                    {siteSettings?.phone || siteSettings?.helplines?.join(' / ') || '+880 1700-123456 / +880 1911-987654'}
                  </span>
                </div>
              )}
              {(siteSettings?.email || (siteSettings?.officialEmails && siteSettings.officialEmails.length > 0)) && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="text-[11px] sm:text-xs">
                    {siteSettings?.email || siteSettings?.officialEmails?.join(' / ') || 'support@kenaxbd.com'}
                  </span>
                </div>
              )}
            </div>

            {/* Social Media Links */}
            <div className="pt-1.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                Follow Us On Social Media
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Facebook */}
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-7 h-7 rounded-lg bg-[#1877F2]/15 border border-[#1877F2]/30 text-[#1877F2] hover:bg-[#1877F2] hover:text-white flex items-center justify-center transition-all duration-150 hover:scale-110"
                  title="Facebook"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>

                {/* Instagram */}
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-7 h-7 rounded-lg bg-[#E4405F]/15 border border-[#E4405F]/30 text-[#E4405F] hover:bg-[#E4405F] hover:text-white flex items-center justify-center transition-all duration-150 hover:scale-110"
                  title="Instagram"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>

                {/* YouTube */}
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-7 h-7 rounded-lg bg-[#FF0000]/15 border border-[#FF0000]/30 text-[#FF0000] hover:bg-[#FF0000] hover:text-white flex items-center justify-center transition-all duration-150 hover:scale-110"
                  title="YouTube"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>

                {/* WhatsApp */}
                <a
                  href="https://wa.me/8801700123456"
                  target="_blank"
                  rel="noreferrer"
                  className="w-7 h-7 rounded-lg bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366] hover:text-white flex items-center justify-center transition-all duration-150 hover:scale-110"
                  title="WhatsApp"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                  </svg>
                </a>

                {/* TikTok */}
                <a
                  href="https://tiktok.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:border-cyan-400 hover:text-cyan-400 flex items-center justify-center transition-all duration-150 hover:scale-110"
                  title="TikTok"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                  </svg>
                </a>

                {/* LinkedIn */}
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-7 h-7 rounded-lg bg-[#0A66C2]/15 border border-[#0A66C2]/30 text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white flex items-center justify-center transition-all duration-150 hover:scale-110"
                  title="LinkedIn"
                >
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
                  </svg>
                </a>

                {/* Twitter / X */}
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noreferrer"
                  className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:bg-white hover:text-slate-950 flex items-center justify-center transition-all duration-150 hover:scale-110"
                  title="X (Twitter)"
                >
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Right Section: 3 Link Columns (Quick Links, Categories, Policies) */}
          <div className="lg:col-span-8 xl:col-span-8">
            
            {/* 3 Columns Grid: Compact on Mobile, Spacious & Refined on Desktop */}
            <div className="grid grid-cols-3 gap-3 sm:gap-6 md:gap-8 lg:gap-10 xl:gap-12">
              
              {/* 1. Quick Links */}
              <div className="space-y-2.5 md:space-y-3.5 min-w-0">
                <h4 className="text-[11px] sm:text-xs md:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5 md:gap-2 pb-1 md:pb-2 border-b border-slate-800/80 md:border-sky-500/30 truncate">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-sky-500 shrink-0 inline-block shadow-xs shadow-sky-500/50"></span>
                  <span className="truncate">Quick Links</span>
                </h4>
                <ul className="space-y-1.5 md:space-y-2.5 text-[11px] sm:text-xs md:text-sm">
                  <li>
                    <button
                      onClick={() => {
                        onNavigate('home');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-sky-400 md:hover:text-white md:hover:bg-slate-800/60 transition-all duration-150 cursor-pointer flex items-center gap-1.5 md:gap-2 text-slate-300 hover:translate-x-1 py-0.5 md:py-1 md:px-2 md:rounded-lg w-full text-left truncate group"
                    >
                      <Home className="w-3.5 h-3.5 md:w-4 md:h-4 text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="truncate">Home</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        onNavigate('shop');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-sky-400 md:hover:text-white md:hover:bg-slate-800/60 transition-all duration-150 cursor-pointer flex items-center gap-1.5 md:gap-2 text-slate-300 hover:translate-x-1 py-0.5 md:py-1 md:px-2 md:rounded-lg w-full text-left truncate group"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 md:w-4 md:h-4 text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="truncate">Shop</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        onNavigate('track');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-sky-400 md:hover:text-white md:hover:bg-slate-800/60 transition-all duration-150 cursor-pointer flex items-center gap-1.5 md:gap-2 text-slate-300 hover:translate-x-1 py-0.5 md:py-1 md:px-2 md:rounded-lg w-full text-left truncate group"
                    >
                      <Truck className="w-3.5 h-3.5 md:w-4 md:h-4 text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="truncate">Track Order</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        onNavigate('profile');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-sky-400 md:hover:text-white md:hover:bg-slate-800/60 transition-all duration-150 cursor-pointer flex items-center gap-1.5 md:gap-2 text-slate-300 hover:translate-x-1 py-0.5 md:py-1 md:px-2 md:rounded-lg w-full text-left truncate group"
                    >
                      <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="truncate">Profile</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        onNavigate('contact');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-sky-400 md:hover:text-white md:hover:bg-slate-800/60 transition-all duration-150 cursor-pointer flex items-center gap-1.5 md:gap-2 text-slate-300 hover:translate-x-1 py-0.5 md:py-1 md:px-2 md:rounded-lg w-full text-left truncate group"
                    >
                      <HelpCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="truncate">Support</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        onNavigate('about');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-sky-400 md:hover:text-white md:hover:bg-slate-800/60 transition-all duration-150 cursor-pointer flex items-center gap-1.5 md:gap-2 text-slate-300 hover:translate-x-1 py-0.5 md:py-1 md:px-2 md:rounded-lg w-full text-left truncate group"
                    >
                      <Info className="w-3.5 h-3.5 md:w-4 md:h-4 text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="truncate">About Us</span>
                    </button>
                  </li>
                </ul>
              </div>

              {/* 2. Top Categories */}
              <div className="space-y-2.5 md:space-y-3.5 min-w-0">
                <h4 className="text-[11px] sm:text-xs md:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5 md:gap-2 pb-1 md:pb-2 border-b border-slate-800/80 md:border-emerald-500/30 truncate">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 shrink-0 inline-block shadow-xs shadow-emerald-500/50"></span>
                  <span className="truncate">Categories</span>
                </h4>
                <ul className="space-y-1.5 md:space-y-2.5 text-[11px] sm:text-xs md:text-sm">
                  <li>
                    <button
                      onClick={() => {
                        onSelectCategory('Electronics & Gadgets');
                        onNavigate('shop');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-sky-400 md:hover:text-white md:hover:bg-slate-800/60 transition-all duration-150 cursor-pointer flex items-center gap-1.5 md:gap-2 text-slate-300 hover:translate-x-1 py-0.5 md:py-1 md:px-2 md:rounded-lg w-full text-left truncate group"
                    >
                      <Smartphone className="w-3.5 h-3.5 md:w-4 md:h-4 text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="truncate">Electronics</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        onSelectCategory('Fashion & Lifestyle');
                        onNavigate('shop');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-sky-400 md:hover:text-white md:hover:bg-slate-800/60 transition-all duration-150 cursor-pointer flex items-center gap-1.5 md:gap-2 text-slate-300 hover:translate-x-1 py-0.5 md:py-1 md:px-2 md:rounded-lg w-full text-left truncate group"
                    >
                      <Shirt className="w-3.5 h-3.5 md:w-4 md:h-4 text-rose-400 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="truncate">Fashion</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        onSelectCategory('Home & Living');
                        onNavigate('shop');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-sky-400 md:hover:text-white md:hover:bg-slate-800/60 transition-all duration-150 cursor-pointer flex items-center gap-1.5 md:gap-2 text-slate-300 hover:translate-x-1 py-0.5 md:py-1 md:px-2 md:rounded-lg w-full text-left truncate group"
                    >
                      <Home className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="truncate">Home & Living</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        onSelectCategory('Beauty & Personal Care');
                        onNavigate('shop');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-sky-400 md:hover:text-white md:hover:bg-slate-800/60 transition-all duration-150 cursor-pointer flex items-center gap-1.5 md:gap-2 text-slate-300 hover:translate-x-1 py-0.5 md:py-1 md:px-2 md:rounded-lg w-full text-left truncate group"
                    >
                      <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-400 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="truncate">Beauty & Care</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        onSelectCategory('Sports & Fitness');
                        onNavigate('shop');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-sky-400 md:hover:text-white md:hover:bg-slate-800/60 transition-all duration-150 cursor-pointer flex items-center gap-1.5 md:gap-2 text-slate-300 hover:translate-x-1 py-0.5 md:py-1 md:px-2 md:rounded-lg w-full text-left truncate group"
                    >
                      <Dumbbell className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="truncate">Sports</span>
                    </button>
                  </li>
                </ul>
              </div>

              {/* 3. Policies */}
              <div className="space-y-2.5 md:space-y-3.5 min-w-0">
                <h4 className="text-[11px] sm:text-xs md:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5 md:gap-2 pb-1 md:pb-2 border-b border-slate-800/80 md:border-amber-500/30 truncate">
                  <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-amber-400 shrink-0 inline-block shadow-xs shadow-amber-400/50"></span>
                  <span className="truncate">Policies</span>
                </h4>
                <ul className="space-y-1.5 md:space-y-2.5 text-[11px] sm:text-xs md:text-sm">
                  <li>
                    <button
                      onClick={() => {
                        onOpenPolicy?.('privacy');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-sky-400 md:hover:text-white md:hover:bg-slate-800/60 transition-all duration-150 cursor-pointer flex items-center gap-1.5 md:gap-2 text-slate-300 hover:translate-x-1 py-0.5 md:py-1 md:px-2 md:rounded-lg w-full text-left truncate group"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4 text-sky-400 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="truncate">Privacy Policy</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        onOpenPolicy?.('terms');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-sky-400 md:hover:text-white md:hover:bg-slate-800/60 transition-all duration-150 cursor-pointer flex items-center gap-1.5 md:gap-2 text-slate-300 hover:translate-x-1 py-0.5 md:py-1 md:px-2 md:rounded-lg w-full text-left truncate group"
                    >
                      <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="truncate">Terms of Service</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        onOpenPolicy?.('refund');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-sky-400 md:hover:text-white md:hover:bg-slate-800/60 transition-all duration-150 cursor-pointer flex items-center gap-1.5 md:gap-2 text-slate-300 hover:translate-x-1 py-0.5 md:py-1 md:px-2 md:rounded-lg w-full text-left truncate group"
                    >
                      <RotateCcw className="w-3.5 h-3.5 md:w-4 md:h-4 text-rose-400 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="truncate">Refund Policy</span>
                    </button>
                  </li>
                  <li>
                    <button
                      onClick={() => {
                        onOpenPolicy?.('faq');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="hover:text-sky-400 md:hover:text-white md:hover:bg-slate-800/60 transition-all duration-150 cursor-pointer flex items-center gap-1.5 md:gap-2 text-slate-300 hover:translate-x-1 py-0.5 md:py-1 md:px-2 md:rounded-lg w-full text-left truncate group"
                    >
                      <HelpCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                      <span className="truncate">FAQ & Help</span>
                    </button>
                  </li>
                </ul>
              </div>

            </div>

          </div>
        </div>

        {/* Bottom Bar: Secured Payment & Courier Badges */}
        <div className="pt-6 pb-2 border-t border-slate-800/80 flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Left: Payment Badges (Single line on mobile with smooth scroll) */}
          <div className="flex items-center flex-nowrap overflow-x-auto scrollbar-none w-full lg:w-auto justify-start gap-1.5 sm:gap-2 py-1">
            <span className="text-xs sm:text-sm text-slate-400 font-bold tracking-wide flex items-center gap-1 sm:gap-1.5 mr-1 shrink-0 whitespace-nowrap">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              Secured By:
            </span>

            {/* bKash */}
            <span className="inline-flex items-center justify-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg bg-[#E2136E] text-white font-black text-[11px] sm:text-xs tracking-tight shadow-xs select-none shrink-0 whitespace-nowrap">
              bKash
            </span>

            {/* Nagad */}
            <span className="inline-flex items-center justify-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg bg-[#F7921E] text-white font-black text-[11px] sm:text-xs tracking-tight shadow-xs select-none shrink-0 whitespace-nowrap">
              Nagad
            </span>

            {/* Rocket */}
            <span className="inline-flex items-center justify-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg bg-[#8C3494] text-white font-black text-[11px] sm:text-xs tracking-tight shadow-xs select-none shrink-0 whitespace-nowrap">
              Rocket
            </span>

            {/* VISA */}
            <span className="inline-flex items-center justify-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg bg-[#1A1F71] text-white font-black italic text-[11px] sm:text-xs tracking-wider shadow-xs select-none shrink-0 whitespace-nowrap">
              VISA
            </span>

            {/* Mastercard */}
            <span className="inline-flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg bg-[#192A3E] border border-slate-700/80 text-[#F79E1B] font-black text-[11px] sm:text-xs tracking-tight shadow-xs select-none shrink-0 whitespace-nowrap">
              <span className="flex -space-x-1 items-center">
                <span className="w-2 h-2 rounded-full bg-[#EB001B] inline-block opacity-95"></span>
                <span className="w-2 h-2 rounded-full bg-[#F79E1B] inline-block opacity-95"></span>
              </span>
              <span>Mastercard</span>
            </span>

            {/* Cash on Delivery */}
            <span className="inline-flex items-center justify-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg bg-[#00875A] text-white font-black text-[11px] sm:text-xs tracking-tight shadow-xs select-none shrink-0 whitespace-nowrap">
              Cash on Delivery
            </span>
          </div>

          {/* Right: Courier / Delivery Partners (Single line on mobile, text with no background) */}
          <div className="flex items-center flex-nowrap overflow-x-auto scrollbar-none w-full lg:w-auto justify-start lg:justify-end gap-2 sm:gap-2.5 py-1">
            <span className="text-xs sm:text-sm text-slate-400 font-bold tracking-wide flex items-center gap-1.5 mr-0.5 shrink-0 whitespace-nowrap">
              <Truck className="w-4 h-4 text-cyan-400 shrink-0" />
              Couriers:
            </span>

            {/* Steadfast Courier - Text Only without background */}
            <span className="inline-flex items-center gap-1.5 text-sky-400 hover:text-sky-300 font-bold text-xs sm:text-sm shrink-0 whitespace-nowrap transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              Steadfast
            </span>

            <span className="text-slate-600 text-xs shrink-0 select-none">•</span>

            {/* Pathao Logistics - Text Only without background */}
            <span className="inline-flex items-center gap-1.5 text-rose-400 hover:text-rose-300 font-bold text-xs sm:text-sm shrink-0 whitespace-nowrap transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              Pathao
            </span>

            <span className="text-slate-600 text-xs shrink-0 select-none">•</span>

            {/* Sundarban Courier - Text Only without background */}
            <span className="inline-flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 font-bold text-xs sm:text-sm shrink-0 whitespace-nowrap transition-colors">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Sundarban
            </span>
          </div>

        </div>

        {/* Bottom Bar: Copyright */}
        <div className="pt-4 text-center text-xs text-slate-500">
          <p>© 2026 KenaX BD. All Rights Reserved. Smart Shopping, Better Living.</p>
        </div>
      </div>
    </footer>
  );
};
