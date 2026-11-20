import React, { useState } from 'react';
import {
  X,
  MapPin,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  Check,
  ShieldAlert,
  Globe,
  Radio,
  Wifi,
  Server,
  AlertTriangle,
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { IpGeoLocation } from '../../types';

interface OrderLocationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  ip: string;
  orderId?: string;
  customerName?: string;
  deliveryAddress?: string;
  geoData?: IpGeoLocation | null;
  onRefreshGeo?: () => void;
}

export const OrderLocationMapModal: React.FC<OrderLocationMapModalProps> = ({
  isOpen,
  onClose,
  ip,
  orderId,
  customerName,
  deliveryAddress,
  geoData,
  onRefreshGeo,
}) => {
  const { language } = useLanguage();
  const isBn = language === 'bn';

  const [zoomLevel, setZoomLevel] = useState<number>(13);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [activeMapTab, setActiveMapTab] = useState<'google' | 'osm'>('google');

  if (!isOpen) return null;

  const lat = geoData?.latitude;
  const lon = geoData?.longitude;
  const hasCoordinates = typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon);

  // Compute bounding box for OpenStreetMap embed based on current zoom
  const delta = Math.max(0.005, 0.5 / Math.pow(1.5, zoomLevel - 8));
  const osmUrl = hasCoordinates
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${(lon - delta).toFixed(5)}%2C${(lat - delta * 0.75).toFixed(5)}%2C${(lon + delta).toFixed(5)}%2C${(lat + delta * 0.75).toFixed(5)}&layer=mapnik&marker=${lat.toFixed(5)}%2C${lon.toFixed(5)}`
    : null;

  const googleEmbedUrl = hasCoordinates
    ? `https://maps.google.com/maps?q=${lat},${lon}&z=${zoomLevel}&output=embed`
    : geoData?.city
    ? `https://maps.google.com/maps?q=${encodeURIComponent(`${geoData.city}, ${geoData.region || ''}, ${geoData.country || 'Bangladesh'}`)}&z=${zoomLevel}&output=embed`
    : deliveryAddress
    ? `https://maps.google.com/maps?q=${encodeURIComponent(`${deliveryAddress}, Bangladesh`)}&z=${zoomLevel}&output=embed`
    : null;

  const googleMapsUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
    : geoData?.city
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${geoData.city}, ${geoData.region || ''}, ${geoData.country || 'Bangladesh'}`)}`
    : deliveryAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${deliveryAddress}, Bangladesh`)}`
    : `https://www.google.com/maps/search/?api=1&query=Bangladesh`;

  const openStreetMapUrl = hasCoordinates ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoomLevel}/${lat}/${lon}` : null;

  const handleCopyCoords = () => {
    if (!hasCoordinates) return;
    navigator.clipboard.writeText(`${lat}, ${lon}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  const handleZoomIn = () => setZoomLevel((z) => Math.min(18, z + 1));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(4, z - 1));
  const handleResetZoom = () => setZoomLevel(13);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/80 backdrop-blur-xs animate-fadeIn">
      <div
        className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-bold border border-red-700 shadow-sm shrink-0">
              <MapPin className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {isBn ? 'গ্রাহকের প্রকৃত আইপি অবস্থান (গুগল ম্যাপ)' : 'Customer IP Location (Google Maps)'}
                </h3>
                {orderId && (
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                    #{orderId}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 flex-wrap">
                <span>IP: <strong className="font-mono text-slate-800 dark:text-slate-200">{ip}</strong></span>
                {geoData?.city && (
                  <>
                    <span>•</span>
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"
                      title={isBn ? 'গুগল ম্যাপে সরাসরি খুলুন' : 'Open direct in Google Maps'}
                    >
                      <span>{geoData.city}, {geoData.region || geoData.country}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{isBn ? 'গুগল ম্যাপে দেখুন' : 'Open Google Maps'}</span>
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mandatory Disclaimer Banner */}
        <div className="px-5 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>{isBn ? 'সঠিক আইপি লোকেশন তথ্য:' : 'IP Geolocation Notice:'}</strong>{' '}
            {isBn
              ? 'এই তথ্যটি গ্রাহকের অর্ডার দেওয়ার মুহূর্তের প্রকৃত পাবলিক আইপি অ্যাড্রেস ও নেটওয়ার্ক গেটওয়ে থেকে সরাসরি পাওয়া। গুগল ম্যাপ বা বাটনে ক্লিক করলে প্রকৃত মেটাডাটা সহ অরিজিনাল গুগল ম্যাপে লোকেশনটি লোড হবে।'
              : 'This location is derived directly from the customer\'s real public IP gateway at order submission. Click the Google Maps button to open the location inside official Google Maps.'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Map Type Selector Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveMapTab('google')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeMapTab === 'google'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>{isBn ? 'গুগল ম্যাপ ভিউ (Google Maps)' : 'Google Maps View'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMapTab('osm')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeMapTab === 'osm'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>OpenStreetMap</span>
              </button>
            </div>

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-red-600 dark:text-red-400 font-bold hover:underline flex items-center gap-1"
            >
              <span>{isBn ? 'অরিজিনাল গুগল ম্যাপ অ্যাপে যান' : 'Go to Google Maps App'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {(hasCoordinates || googleEmbedUrl) ? (
            <div className="space-y-4">
              {/* Map Container */}
              <div className="relative w-full h-[360px] sm:h-[420px] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-950 shadow-inner">
                {activeMapTab === 'google' ? (
                  googleEmbedUrl ? (
                    <iframe
                      title="Customer Location on Google Maps"
                      src={googleEmbedUrl}
                      className="w-full h-full border-0"
                      loading="lazy"
                      allowFullScreen
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-50 dark:bg-slate-900">
                      <MapPin className="w-10 h-10 text-red-500 animate-bounce" />
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {isBn ? 'গুগল ম্যাপ লিংক প্রস্তুত' : 'Google Maps Link Ready'}
                      </p>
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-xs shadow-md hover:bg-red-700 transition-colors inline-flex items-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>{isBn ? 'গুগল ম্যাপে অবস্থানটি দেখুন' : 'Open Location in Google Maps'}</span>
                      </a>
                    </div>
                  )
                ) : (
                  osmUrl && (
                    <iframe
                      title="Customer Approximate Location"
                      src={osmUrl}
                      className="w-full h-full border-0"
                      loading="lazy"
                    />
                  )
                )}

                {/* Floating Map Zoom & Reset Controls */}
                <div className="absolute top-3 right-3 flex flex-col gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md">
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title={isBn ? 'জুম ইন' : 'Zoom In'}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title={isBn ? 'জুম আউট' : 'Zoom Out'}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <div className="h-px bg-slate-200 dark:bg-slate-800 my-0.5" />
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title={isBn ? 'রিসেট' : 'Reset View'}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>

                {/* Approximate Location Overlay Badge */}
                <div className="absolute bottom-3 left-3 bg-slate-900/90 text-white backdrop-blur-xs px-3 py-1.5 rounded-lg text-xs font-mono shadow-md flex items-center gap-2 border border-slate-800">
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>{lat?.toFixed(4)}, {lon?.toFixed(4)}</span>
                  <span className="text-[10px] text-slate-400">({geoData?.city || 'ISP node'})</span>
                </div>
              </div>

              {/* Action Toolbar for External Map Links & Coordinates */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {googleMapsUrl && (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors shadow-2xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      <span>{isBn ? 'গুগল ম্যাপে খুলুন' : 'Open in Google Maps'}</span>
                    </a>
                  )}

                  {openStreetMapUrl && (
                    <a
                      href={openStreetMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors shadow-2xs"
                    >
                      <Globe className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      <span>{isBn ? 'ওপেনস্ট্রিটম্যাপে খুলুন' : 'Open in OpenStreetMap'}</span>
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={handleCopyCoords}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  >
                    {copiedCoords ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCoords ? (isBn ? 'কপি হয়েছে' : 'Copied!') : (isBn ? 'কোঅর্ডিনেটস কপি' : 'Copy Coordinates')}</span>
                  </button>
                </div>

                {onRefreshGeo && (
                  <button
                    type="button"
                    onClick={onRefreshGeo}
                    className="inline-flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:underline font-semibold cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{isBn ? 'তথ্য রিফ্রেশ করুন' : 'Refresh Geo Data'}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                {isBn ? 'ম্যাপ কোঅর্ডিনেটস পাওয়া যায়নি' : 'Location Coordinates Not Available'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                {isBn
                  ? 'এই আইপি অ্যাড্রেসের জন্য কোনো নির্ভরযোগ্য ভৌগোলিক স্থানাঙ্ক (Latitude / Longitude) পাওয়া যায়নি (যেমন: লোকাল বা প্রাইভেট নেটওয়ার্ক আইপি)। ফলে সরাসরি ম্যাপ প্রদর্শন সম্ভব নয়।'
                  : 'Approximate geographical coordinates are not available for this IP address (e.g. private network or unmapped ISP range). The map view cannot be displayed.'}
              </p>
              {onRefreshGeo && (
                <button
                  type="button"
                  onClick={onRefreshGeo}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{isBn ? 'পুনরায় যাচাই করুন' : 'Retry IP Geolocation Lookup'}</span>
                </button>
              )}
            </div>
          )}

          {/* Location & Network Intelligence Breakdown Card */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Server className="w-3.5 h-3.5 text-slate-500" />
              <span>{isBn ? 'আইপি ও নেটওয়ার্ক মেটাডাটা বিবরণ' : 'IP & Network Intelligence Summary'}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{isBn ? 'আইপি অ্যাড্রেস' : 'IP Address'}</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{ip}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{geoData?.ipVersion || 'IPv4'}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{isBn ? 'আনুমানিক শহর ও বিভাগ' : 'City & Division'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {geoData?.city || 'Not available'}, {geoData?.region || 'Not available'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{geoData?.country || 'Bangladesh'}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{isBn ? 'নেটওয়ার্ক প্রোভাইডার (ISP)' : 'ISP / Provider'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {geoData?.isp || 'Not available'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">{geoData?.as || 'Standard ASN'}</span>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{isBn ? 'কানেকশন টাইপ' : 'Connection Type'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {geoData?.connectionType || 'Not available'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{isBn ? 'শনাক্তকরণ মাধ্যম' : 'Detection Source'}</span>
                <span className="font-mono text-slate-800 dark:text-slate-200 text-[11px]">
                  {geoData?.detectionSource || 'Server Verified (Cloud Run)'}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">{isBn ? 'প্রক্সি স্ট্যাটাস' : 'Proxy Status'}</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {geoData?.isTrustedProxy ? `${geoData.proxyType || 'Trusted Proxy'}` : 'Direct Connection'}
                </span>
              </div>
            </div>

            {deliveryAddress && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  <strong>{isBn ? 'অর্ডারের ডেলিভারি ঠিকানা:' : 'Order Delivery Address:'}</strong> {deliveryAddress}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
