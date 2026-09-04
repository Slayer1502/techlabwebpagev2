import React, { useState } from 'react';
import PublicHeader from '../components/PublicHeader';
import {
  Wrench,
  ArrowRight,
  CheckCircle2,
  Monitor,
  Smartphone,
  ShieldCheck,
  Clock,
  Laptop
} from 'lucide-react';

const PublicServices = () => {
  return (
    <div className="min-h-screen bg-white w-full">
      <PublicHeader />

      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto space-y-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
           <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-navy/5 text-navy rounded-full text-xs font-black uppercase tracking-widest border border-navy/10">
                 Support Hub
              </div>
              <h1 className="text-5xl lg:text-7xl font-black text-navy leading-none tracking-tighter">
                 Precision Service for <br />
                 <span className="text-blue">Critical Hardware.</span>
              </h1>
              <p className="text-lg text-text-soft font-medium leading-relaxed max-w-lg">
                 From chip-level laptop diagnostics to enterprise CCTV architectural design, we provide Karur's most reliable tech support ecosystem.
              </p>

              <div className="space-y-4">
                 {[
                   { icon: Laptop, t: 'Chip-Level Laptop Repair', d: 'Expert motherboard and display servicing.' },
                   { icon: ShieldCheck, t: 'Surveillance Maintenance', d: 'AMC and on-call CCTV ecosystem support.' },
                   { icon: Wrench, t: 'Hardware Upgrades', d: 'SSD, RAM, and Performance optimization.' }
                 ].map((s, i) => (
                    <div key={i} className="flex items-start gap-4">
                       <div className="p-2 bg-blue/5 text-blue rounded-lg"><s.icon className="h-5 w-5" /></div>
                       <div>
                          <p className="font-bold text-navy">{s.t}</p>
                          <p className="text-sm text-text-soft">{s.d}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           <div className="bg-soft/50 p-10 rounded-[3rem] border border-blue/5 space-y-8">
              <div className="space-y-2">
                 <h2 className="text-3xl font-black text-navy tracking-tight text-center">Book a Technician</h2>
                 <p className="text-center text-text-soft text-sm font-medium">Professional on-site or in-lab support</p>
              </div>

              <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-text-soft uppercase ml-1">Customer Name</label>
                       <input className="w-full px-6 py-4 bg-white border-none rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue/10 text-sm font-bold" placeholder="Your full name" />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black text-text-soft uppercase ml-1">Mobile Number</label>
                       <input className="w-full px-6 py-4 bg-white border-none rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue/10 text-sm font-bold" placeholder="10-digit number" />
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-soft uppercase ml-1">What needs care?</label>
                    <select className="w-full px-6 py-4 bg-white border-none rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue/10 text-sm font-bold appearance-none">
                       <option>Laptop / PC Service</option>
                       <option>CCTV System Issue</option>
                       <option>Networking / Wi-Fi</option>
                       <option>Biometric / Access Control</option>
                       <option>New Installation Survey</option>
                    </select>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-text-soft uppercase ml-1">Describe the problem</label>
                    <textarea rows={3} className="w-full px-6 py-4 bg-white border-none rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue/10 text-sm font-bold resize-none" placeholder="Briefly explain the requirement..."></textarea>
                 </div>

                 <button className="w-full py-5 bg-blue text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl shadow-blue/30 hover:bg-blue-600 transition-all flex items-center justify-center gap-3">
                    Request Service Visit <ArrowRight className="h-5 w-5" />
                 </button>

                 <p className="text-[10px] text-center text-text-soft font-bold uppercase tracking-wider">
                    Our team will contact you within 2-4 business hours.
                 </p>
              </div>
           </div>
        </div>

        <section className="bg-navy p-12 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex items-center gap-6 text-center md:text-left">
              <div className="p-5 bg-white/10 rounded-[2rem]"><Clock className="h-10 w-10" /></div>
              <div>
                 <p className="text-2xl font-black">Emergency On-Call?</p>
                 <p className="text-gray-400 font-medium">Critical system down? Our rapid response team is ready.</p>
              </div>
           </div>
           <button className="px-10 py-5 bg-white text-navy rounded-[2rem] font-black uppercase tracking-widest hover:bg-soft transition-all shrink-0">
              Call +91 94888-0-9897
           </button>
        </section>
      </main>
    </div>
  );
};

export default PublicServices;
