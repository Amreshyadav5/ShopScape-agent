import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, AlertCircle, Shield } from 'lucide-react';
import type { User } from '../types';
import { api } from '../api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        const res = await api.login(email.trim(), password);
        onAuthSuccess(res.user);
        onClose();
      } else {
        const res = await api.register(email.trim(), password, fullName.trim());
        onAuthSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setTab('login');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-md bg-[#fbf9f4] border border-[#e8e4dc] rounded-2xl shadow-xl overflow-hidden p-6 md:p-8 text-[#1a2e22]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-[#f4efe6] hover:bg-[#e8e4dc] text-[#556b5d] hover:text-[#1a2e22] transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Tab switcher */}
        <div className="flex border-b border-[#e8e4dc] mb-6">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setError(null);
            }}
            className={`pb-3 text-sm font-medium flex-1 text-center transition-colors border-b-2 ${
              tab === 'login'
                ? 'border-[#2d5a3d] text-[#1a2e22] font-semibold'
                : 'border-transparent text-[#7a8a80] hover:text-[#1a2e22]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setError(null);
            }}
            className={`pb-3 text-sm font-medium flex-1 text-center transition-colors border-b-2 ${
              tab === 'register'
                ? 'border-[#2d5a3d] text-[#1a2e22] font-semibold'
                : 'border-transparent text-[#7a8a80] hover:text-[#1a2e22]'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-[#556b5d] mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-[#8a9990] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Sharma"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#e8e4dc] rounded-lg text-xs text-[#1a2e22] focus:outline-none focus:border-[#2d5a3d] focus:ring-1 focus:ring-[#2d5a3d]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#556b5d] mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8a9990] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#e8e4dc] rounded-lg text-xs text-[#1a2e22] focus:outline-none focus:border-[#2d5a3d] focus:ring-1 focus:ring-[#2d5a3d]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#556b5d] mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8a9990] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#e8e4dc] rounded-lg text-xs text-[#1a2e22] focus:outline-none focus:border-[#2d5a3d] focus:ring-1 focus:ring-[#2d5a3d]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#2d5a3d] hover:bg-[#234830] disabled:bg-[#d8d4cc] text-white font-medium text-xs rounded-lg transition-colors mt-2"
          >
            {loading ? 'Authenticating...' : tab === 'login' ? 'Sign In to Account' : 'Register Account'}
          </button>
        </form>

        {/* Quick Demo Fill Buttons */}
        <div className="mt-6 pt-5 border-t border-[#e8e4dc]">
          <p className="text-[11px] text-[#7a8a80] text-center mb-2.5 font-medium">Quick Demo Credentials:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('alex@example.com', 'Customer123!')}
              className="p-2.5 rounded-lg bg-[#f4efe6] hover:bg-[#ede7dc] border border-[#e8e4dc] text-left text-xs transition-colors"
            >
              <span className="block font-semibold text-[#1a2e22]">Customer Demo</span>
              <span className="text-[10px] text-[#7a8a80]">alex@example.com</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@shopscape.ai', 'AdminPass123!')}
              className="p-2.5 rounded-lg bg-[#f4efe6] hover:bg-[#ede7dc] border border-amber-300 text-left text-xs transition-colors"
            >
              <div className="flex items-center gap-1 font-semibold text-amber-900">
                <Shield className="w-3 h-3 text-amber-700" />
                <span>Admin Portal</span>
              </div>
              <span className="text-[10px] text-[#7a8a80]">admin@shopscape.ai</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
