import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PublicHeader from '../components/PublicHeader';
import { productService } from '../services/productService';
import {
  Package,
  Search,
  Filter,
  ShoppingCart,
  Zap,
  Image as ImageIcon
} from 'lucide-react';
import { formatCurrencyValue } from '../utils/helpers';
import { Product } from '../types';

const PublicProducts = () => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['public-products'],
    queryFn: () => productService.getPublicProducts(),
  });

  const filteredProducts = productsData?.products?.filter((p: Product) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                         p.type.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterType === 'all' || p.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const productTypes = Array.from(new Set(productsData?.products?.map((p: Product) => p.type) || []));

  return (
    <div className="min-h-screen bg-white w-full">
      <PublicHeader />

      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-4">
           <h1 className="text-4xl lg:text-6xl font-black text-navy tracking-tight">Techlab Storefront</h1>
           <p className="text-text-soft text-lg font-medium max-w-2xl mx-auto">Explore our curated selection of business laptops, enterprise CCTV solutions, and networking essentials.</p>
        </div>

        {/* Search & Filter */}
        <div className="bg-soft/50 p-6 rounded-[2.5rem] border border-blue/5 flex flex-col md:flex-row gap-6">
           <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-text-soft" />
              <input
                placeholder="Search products..."
                className="w-full pl-12 pr-4 py-3 bg-white border-none rounded-2xl shadow-sm text-sm outline-none focus:ring-2 focus:ring-blue/10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
           </div>
           <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              <button
                onClick={() => setFilterType('all')}
                className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${filterType === 'all' ? 'bg-navy text-white shadow-lg' : 'bg-white text-text-soft hover:bg-gray-100'}`}
              >
                All
              </button>
              {productTypes.map(type => (
                 <button
                    key={type as string}
                    onClick={() => setFilterType(type as string)}
                    className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${filterType === type ? 'bg-navy text-white shadow-lg' : 'bg-white text-text-soft hover:bg-gray-100'}`}
                 >
                    {type as string}
                 </button>
              ))}
           </div>
        </div>

        {isLoading ? (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 animate-pulse">
              {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-80 bg-gray-50 rounded-[2.5rem]"></div>)}
           </div>
        ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {filteredProducts?.map((p: Product) => (
                 <div key={p.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all group flex flex-col h-full overflow-hidden">
                    <div className="aspect-square bg-soft rounded-[2rem] mb-6 flex items-center justify-center text-blue/20 group-hover:scale-105 transition-transform overflow-hidden">
                       {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                       ) : (
                          <Package className="h-20 w-16 opacity-20" />
                       )}
                    </div>
                    <div className="flex-1 space-y-2">
                       <p className="text-[10px] font-black text-blue uppercase tracking-widest">{p.type}</p>
                       <h3 className="text-xl font-black text-navy leading-tight group-hover:text-blue transition-colors">{p.name}</h3>
                       <p className="text-xs text-text-soft line-clamp-2 leading-relaxed font-medium">{p.description}</p>
                    </div>
                    <div className="mt-8 pt-6 border-t border-dashed flex items-center justify-between">
                       <div>
                          <p className="text-[10px] font-bold text-text-soft uppercase">Our Price</p>
                          <p className="text-2xl font-black text-navy">{formatCurrencyValue(p.finalPrice)}</p>
                       </div>
                       <button className="h-12 w-12 bg-navy text-white rounded-2xl flex items-center justify-center hover:bg-blue transition-colors shadow-lg shadow-navy/20">
                          <ShoppingCart className="h-5 w-5" />
                       </button>
                    </div>
                 </div>
              ))}
           </div>
        )}

        {filteredProducts?.length === 0 && (
           <div className="text-center py-20 opacity-30">
              <Zap className="h-16 w-16 mx-auto mb-4" />
              <p className="font-black text-2xl uppercase tracking-tighter">No items matching your search</p>
           </div>
        )}
      </main>
    </div>
  );
};

export default PublicProducts;
