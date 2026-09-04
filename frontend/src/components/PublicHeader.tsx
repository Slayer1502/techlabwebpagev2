import React from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const PublicHeader = () => {
  const { user } = useAuthStore();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue/30">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-navy tracking-tight leading-none">TECHLAB</h1>
            <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest mt-0.5">Computing & Security</p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-bold text-navy uppercase tracking-wider">
          <Link to="/products" className="hover:text-blue transition-colors">Products</Link>
          <Link to="/services" className="hover:text-blue transition-colors">Services</Link>
          {user ? (
            <Link to={`/${user.role}/dashboard`} className="px-6 py-2 bg-blue text-white rounded-xl hover:opacity-90 transition-all shadow-lg shadow-blue/20">Dashboard</Link>
          ) : (
            <Link to="/login" className="px-6 py-2 bg-navy text-white rounded-xl hover:opacity-90 transition-all shadow-lg shadow-navy/20">Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default PublicHeader;
