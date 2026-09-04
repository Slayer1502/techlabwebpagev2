import React from 'react';
import Layout from '../components/Layout';
import POSComponent from '../components/POSComponent';
import { ShoppingCart } from 'lucide-react';

const POSPage = () => {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-blue text-white rounded-2xl shadow-lg shadow-blue/20">
              <ShoppingCart className="h-6 w-6" />
           </div>
           <div>
              <h1 className="text-2xl font-bold text-navy tracking-tight">Point of Sale</h1>
              <p className="text-text-soft text-sm font-medium">Create invoices and manage walk-in customers</p>
           </div>
        </div>
        <POSComponent />
      </div>
    </Layout>
  );
};

export default POSPage;
