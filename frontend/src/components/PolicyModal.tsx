import React from 'react';
import { X, ShieldCheck, Truck, RefreshCw } from 'lucide-react';

interface PolicyModalProps {
  policy: string | null;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ policy, onClose }) => {
  if (!policy) return null;

  const getPolicyContent = () => {
    switch (policy) {
      case 'shipping':
        return {
          title: 'Shipping & Delivery Policy',
          icon: Truck,
          content: (
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong>Delivery Timelines:</strong> Standard domestic orders are processed within 24 hours of confirmation. Deliveries across metro areas arrive within 2–4 business days; regional deliveries arrive within 4–6 business days.
              </p>
              <p>
                <strong>Shipping Rates:</strong> Flat rate of ₹50 applies on orders below ₹999. All orders of ₹999 or higher qualify for <strong>100% Free Express Delivery</strong>.
              </p>
              <p>
                <strong>Live Courier Tracking:</strong> Once your package is dispatched, a real-time tracking number is issued and visible on your Order Tracking page.
              </p>
            </div>
          ),
        };
      case 'returns':
        return {
          title: 'Returns & Refund Policy',
          icon: RefreshCw,
          content: (
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong>7-Day Purity Guarantee:</strong> We stand behind the freshness and authenticity of our organic goods. If any item arrives damaged or compromised, you are eligible for a replacement or full refund within 7 days of delivery.
              </p>
              <p>
                <strong>Refund Processing:</strong> Refunds for authorized returns are credited back to the original payment method within 3–5 business days following inspection.
              </p>
            </div>
          ),
        };
      case 'privacy':
      default:
        return {
          title: 'Privacy Policy & Customer Security',
          icon: ShieldCheck,
          content: (
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <p>
                <strong>Zero-Spam Commitment:</strong> Your personal contact details and email address are solely used for order fulfillment, dispatch notifications, and verified account authentication.
              </p>
              <p>
                <strong>Payment Credentials:</strong> We never store card numbers or banking passwords on our servers. All transactions are processed through encrypted tokenized payment rails.
              </p>
              <p>
                <strong>AI Conversation Safety:</strong> Conversations with the ShopScape AI shopping agent are strictly scoped to catalog assistance and order guidance.
              </p>
            </div>
          ),
        };
    }
  };

  const { title, icon: Icon, content } = getPolicyContent();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Icon className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
        </div>

        <div className="py-2 mb-6">{content}</div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl"
        >
          Close
        </button>
      </div>
    </div>
  );
};
