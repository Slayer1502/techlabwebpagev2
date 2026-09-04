import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Laptop,
  Video,
  Zap,
  Shield,
  ShoppingCart,
  Stethoscope,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
  Package,
  Plus
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';
import { formatCurrencyValue } from '../utils/helpers';
import { Product } from '../types';

const LandingPage = () => {
  const { data: productsData } = useQuery({
    queryKey: ['public-products-highlight'],
    queryFn: async () => {
      const res = await api.get('/public/products?limit=4');
      return res.data;
    }
  });

  return (
    <div className="min-h-screen bg-white w-full">
      {/* Navigation */}
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
             <a href="#expertise" className="hover:text-blue transition-colors">Expertise</a>
             <Link to="/products" className="hover:text-blue transition-colors">Products</Link>
             <Link to="/services" className="hover:text-blue transition-colors">Services</Link>
             <Link to="/login" className="px-6 py-2 bg-navy text-white rounded-xl hover:opacity-90 transition-all shadow-lg shadow-navy/20">Login</Link>
          </nav>
        </div>
      </header>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 lg:py-32 px-6">
           <div className="absolute top-0 right-0 w-1/2 h-full bg-soft -z-10 rounded-l-[10rem] hidden lg:block animate-in slide-in-from-right duration-1000"></div>

           <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div className="space-y-8 text-center lg:text-left">
                 <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue/5 text-blue rounded-full text-xs font-bold uppercase tracking-widest border border-blue/10">
                    <span className="w-2 h-2 bg-blue rounded-full animate-pulse"></span>
                    Live Tech Ecosystem
                 </div>
                 <h2 className="text-5xl lg:text-7xl font-black text-navy leading-[1.1] tracking-tighter text-navy">
                    The Lab where<br />
                    <span className="text-blue">Hardware meets Care.</span>
                 </h2>
                 <p className="text-lg text-text-soft font-medium leading-relaxed max-w-xl mx-auto lg:mx-0">
                    Expert chip-level laptop repairs, precision CCTV surveillance, and premium hardware sales — all synced in one seamless management flow.
                 </p>
                 <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                    <Link to="/products" className="w-full sm:w-auto px-10 py-4 bg-blue text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue/30 hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
                       Explore Store <ArrowRight className="h-5 w-5" />
                    </Link>
                    <Link to="/services" className="w-full sm:w-auto px-10 py-4 bg-white text-navy border-2 border-navy/10 rounded-2xl font-black uppercase tracking-widest hover:bg-soft transition-all">
                       Book Service
                    </Link>
                 </div>
              </div>

              <div className="relative flex justify-center items-center h-[500px]">
                 <div className="absolute top-10 right-0 md:right-10 bg-white p-6 rounded-[2rem] shadow-2xl border border-gray-100 flex items-center gap-6">
                    <div className="p-4 bg-blue/5 text-blue rounded-2xl"><Laptop className="h-8 w-8" /></div>
                    <div>
                       <p className="font-black text-navy leading-none">Laptop Clinic</p>
                       <p className="text-xs text-text-soft font-bold uppercase mt-1">Chip-level specialists</p>
                    </div>
                 </div>
                 <div className="absolute bottom-10 left-0 md:left-10 bg-navy p-6 rounded-[2rem] shadow-2xl text-white flex items-center gap-6">
                    <div className="p-4 bg-white/10 text-white rounded-2xl"><Video className="h-8 w-8" /></div>
                    <div>
                       <p className="font-black leading-none text-white">CCTV Radar</p>
                       <p className="text-xs text-gray-400 font-bold uppercase mt-1">Next-gen surveillance</p>
                    </div>
                 </div>
                 <div className="w-64 h-64 bg-blue rounded-full blur-[100px] opacity-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
              </div>
           </div>
        </section>

        {/* Stats */}
        <section className="bg-navy py-20 px-6">
           <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-12">
              {[
                { n: '12+', l: 'Years Experience' },
                { n: '15k+', l: 'Devices Serviced' },
                { n: '24h', l: 'Avg Response' },
                { n: '100%', l: 'Original Spares' }
              ].map((s, i) => (
                <div key={i} className="text-center space-y-2">
                   <p className="text-4xl font-black text-white">{s.n}</p>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{s.l}</p>
                </div>
              ))}
           </div>
        </section>

        {/* Expertise */}
        <section id="expertise" className="py-32 px-6 bg-white">
           <div className="max-w-7xl mx-auto">
              <div className="text-center space-y-4 mb-20">
                 <p className="text-xs font-black text-blue uppercase tracking-[0.3em]">Our Core</p>
                 <h2 className="text-4xl lg:text-5xl font-black text-navy tracking-tight">Precision Engineering for Every Vertical</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                 {[
                   { icon: Stethoscope, t: 'Laptop Diagnostics', d: 'From motherboard logic gate repairs to display replacements, we handle what others return.', l: ['MacBook & Windows', 'Liquid Recovery', 'Body Fabrication'] },
                   { icon: Shield, t: 'Security Architecture', d: 'We design surveillance ecosystems with remote access and high-definition long-term storage.', l: ['IP & Analog Systems', 'NVR/DVR Config', 'Remote Viewing'] },
                   { icon: ShoppingCart, t: 'Premium Hardware', d: 'Hand-picked inventory of business laptops, gaming rigs, and enterprise networking gear.', l: ['Brand Partners', 'GST Ready Billing', 'On-site Support'] }
                 ].map((card, i) => (
                   <div key={i} className="group bg-soft/30 p-10 rounded-[3rem] border border-transparent hover:border-blue/10 hover:bg-white hover:shadow-2xl hover:shadow-blue/5 transition-all">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-blue shadow-lg mb-8 group-hover:bg-blue group-hover:text-white transition-all">
                         <card.icon className="h-8 w-8" />
                      </div>
                      <h3 className="text-2xl font-black text-navy mb-4">{card.t}</h3>
                      <p className="text-text-soft font-medium leading-relaxed mb-8">{card.d}</p>
                      <ul className="space-y-3">
                         {card.l.map((item, ix) => (
                            <li key={ix} className="flex items-center gap-3 text-xs font-bold text-navy uppercase tracking-wide">
                               <ChevronRight className="h-4 w-4 text-blue" /> {item}
                            </li>
                         ))}
                      </ul>
                   </div>
                 ))}
              </div>
           </div>
        </section>

        {/* Featured Products */}
        <section className="py-32 bg-gray-50/50 px-6">
           <div className="max-w-7xl mx-auto">
              <div className="flex justify-between items-end mb-16">
                 <div>
                    <p className="text-xs font-black text-blue uppercase tracking-[0.3em] mb-4">Shop Tech</p>
                    <h2 className="text-4xl lg:text-5xl font-black text-navy tracking-tight">Fresh in the Lab</h2>
                 </div>
                 <Link to="/products" className="hidden md:flex items-center gap-2 text-sm font-black text-navy uppercase tracking-widest hover:text-blue transition-colors">
                    View Catalog <ChevronRight className="h-5 w-5" />
                 </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                 {productsData?.products?.map((p: Product) => (
                    <div key={p.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden flex flex-col">
                       <div className="aspect-square bg-soft rounded-[2rem] mb-6 flex items-center justify-center text-blue/20 overflow-hidden group-hover:scale-105 transition-transform">
                          {p.imageUrl ? (
                             <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                             <Package className="h-16 w-16 opacity-20" />
                          )}
                       </div>
                       <p className="text-[10px] font-black text-blue uppercase tracking-widest mb-2">{p.type}</p>
                       <h4 className="text-lg font-black text-navy mb-4 group-hover:text-blue transition-colors leading-tight">{p.name}</h4>
                       <div className="flex items-center justify-between mt-auto">
                          <p className="text-xl font-black text-navy">{formatCurrencyValue(p.finalPrice)}</p>
                          <button className="p-2 bg-navy text-white rounded-xl hover:bg-blue transition-colors">
                             <Plus className="h-5 w-5" />
                          </button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-navy py-20 px-6 text-white">
         <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16">
            <div className="space-y-6 lg:col-span-2">
               <h3 className="text-2xl font-black tracking-tight text-white">TECHLAB</h3>
               <p className="text-gray-400 font-medium leading-relaxed max-w-sm">
                  Karur's hub for premium technology hardware and chip-level service excellence since 2012. We bridge the gap between high-end hardware and reliable local care.
               </p>
               <div className="flex gap-4">
                  {[1,2,3].map(i => <div key={i} className="w-10 h-10 bg-white/5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"></div>)}
               </div>
            </div>
            <div className="space-y-6 text-white">
               <h4 className="text-xs font-black uppercase tracking-[0.2em]">Explore</h4>
               <ul className="space-y-4 text-sm font-bold text-gray-400">
                  <li><Link to="/products" className="hover:text-white transition-colors">Inventory Catalog</Link></li>
                  <li><Link to="/services" className="hover:text-white transition-colors">Service Ticketing</Link></li>
                  <li><Link to="/login" className="hover:text-white transition-colors">Login</Link></li>
               </ul>
            </div>
            <div className="space-y-6 text-white">
               <h4 className="text-xs font-black uppercase tracking-[0.2em]">Connect</h4>
               <ul className="space-y-4 text-sm font-medium text-gray-400">
                  <li className="flex items-center gap-3"><MapPin className="h-4 w-4 text-blue" /> Casa Layout, Karur, TN</li>
                  <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-blue" /> +91 94888-0-9897</li>
                  <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-blue" /> info@techlab.in</li>
               </ul>
            </div>
         </div>
         <div className="max-w-7xl mx-auto pt-20 mt-20 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center md:text-left">
            <p>© 2026 TECHLAB. Precision in Every Pixel.</p>
            <p>Designed for the next generation of tech management.</p>
         </div>
      </footer>
    </div>
  );
};

export default LandingPage;
