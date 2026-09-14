import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Smartphone, Lock, User, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LoginPage = () => {
  const [tab, setTab] = useState<'customer' | 'staff'>('customer');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/customer/request-otp', { mobile });
      setOtpSent(true);
      if (res.data.otpPreview) {
          setOtp(res.data.otpPreview);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/customer/verify-otp', { mobile, otp });
      setUser(res.data.user);
      navigate('/customer/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/staff/login', { email, password });
      setUser(res.data.user);
      const role = res.data.user.role;
      if (role === 'admin') navigate('/admin/dashboard');
      else if (role === 'auditor') navigate('/auditor/dashboard');
      else if (role === 'sales') navigate('/sales/dashboard');
      else if (role === 'technician') navigate('/technician/dashboard');
      else navigate('/employee/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex bg-gray-50 border-b">
          <button
            onClick={() => { setTab('customer'); setError(''); }}
            className={cn(
              "flex-1 py-4 text-sm font-medium transition-colors",
              tab === 'customer' ? "text-blue border-b-2 border-blue bg-white" : "text-text-soft hover:bg-gray-100"
            )}
          >
            Customer
          </button>
          <button
            onClick={() => { setTab('staff'); setError(''); }}
            className={cn(
              "flex-1 py-4 text-sm font-medium transition-colors",
              tab === 'staff' ? "text-blue border-b-2 border-blue bg-white" : "text-text-soft hover:bg-gray-100"
            )}
          >
            Staff
          </button>
        </div>

        <div className="p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-navy">
              {tab === 'customer' ? 'Customer Login' : 'Staff Login'}
            </h1>
            <p className="text-text-soft mt-2 text-sm">
              {tab === 'customer'
                ? 'Enter your mobile number to receive an OTP'
                : 'Enter your credentials to access the dashboard'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {tab === 'customer' ? (
            !otpSent ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-soft uppercase mb-1">Mobile Number</label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                    <input
                      type="tel"
                      required
                      placeholder="10-digit mobile"
                      className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-lg focus:ring-2 focus:ring-blue/20 outline-none"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  disabled={loading}
                  type="submit"
                  className="w-full bg-blue text-white py-2 rounded-lg font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Send OTP
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-soft uppercase mb-1">Verification Code</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                    <input
                      type="text"
                      required
                      placeholder="Enter 6-digit OTP"
                      className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-lg focus:ring-2 focus:ring-blue/20 outline-none"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  disabled={loading}
                  type="submit"
                  className="w-full bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Verify & Login
                </button>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full text-blue text-sm hover:underline"
                >
                  Change Mobile Number
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-soft uppercase mb-1">Email Address</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                  <input
                    type="email"
                    required
                    placeholder="name@techlab.in"
                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-lg focus:ring-2 focus:ring-blue/20 outline-none"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-soft uppercase mb-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 bg-white rounded-lg focus:ring-2 focus:ring-blue/20 outline-none"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>
              <button
                disabled={loading}
                type="submit"
                className="w-full bg-navy text-white py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Login to Dashboard
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
