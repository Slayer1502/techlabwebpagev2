import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { productService } from '../services/productService';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertCircle,
  Filter,
  MoreVertical,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react';
import { formatCurrencyValue } from '../utils/helpers';
import ProductModal from '../components/ProductModal';
import { Product } from '../types';

const ProductsPage = () => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productService.getStaffProducts(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => productService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const filteredProducts = products?.filter((p: Product) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                         p.type.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterType === 'all' || p.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const productTypes = Array.from(new Set(products?.map((p: Product) => p.type) || []));

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleRemove = async (id: string) => {
    if (window.confirm('Are you sure you want to remove this product from the storefront?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy">Inventory Catalog</h1>
            <p className="text-text-soft text-sm">Manage your products, pricing, and stock levels</p>
          </div>
          <button
            onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
            className="flex items-center justify-center gap-2 bg-blue text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue/20"
          >
            <Plus className="h-5 w-5" />
            Add New Product
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-3 h-5 w-5 text-text-soft" />
            <input
              type="text"
              placeholder="Search products by name or category..."
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-blue/10 outline-none transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-3 h-5 w-5 text-text-soft" />
            <select
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 bg-white rounded-xl focus:ring-2 focus:ring-blue/10 outline-none appearance-none transition-all"
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="all">All Categories</option>
              {productTypes.map(type => (
                <option key={type as string} value={type as string}>{type as string}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="bg-white h-72 rounded-2xl border border-gray-100"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts?.map((product: Product) => (
              <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden group hover:shadow-md transition-all relative">
                <div className="p-5 flex flex-col h-full">
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-2.5 py-1 bg-soft text-blue text-[10px] font-bold uppercase rounded-lg tracking-wider">
                      {product.type}
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 text-text-soft hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRemove(product.id)}
                        className="p-2 text-text-soft hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="aspect-video bg-gray-50 rounded-xl mb-4 overflow-hidden flex items-center justify-center text-blue/10">
                     {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                     ) : (
                        <ImageIcon className="h-12 w-12" />
                     )}
                  </div>

                  <h3 className="font-bold text-navy line-clamp-1 mb-1">{product.name}</h3>
                  <p className="text-xs text-text-soft line-clamp-2 mb-4 flex-1">{product.description}</p>

                  <div className="flex items-end justify-between mt-auto pt-4 border-t border-dashed">
                    <div>
                      <p className="text-[10px] text-text-soft font-bold uppercase mb-0.5">Price</p>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-navy">{formatCurrencyValue(product.finalPrice)}</span>
                        {product.discountPercent > 0 && (
                          <span className="text-xs text-text-soft line-through">{formatCurrencyValue(product.originalPrice)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-text-soft font-bold uppercase mb-0.5 text-right">Stock</p>
                      <div className={`flex items-center justify-end gap-1.5 font-bold ${product.stock < 5 ? 'text-red-500' : 'text-green-600'}`}>
                        {product.stock < 5 ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                        <span className="text-lg">{product.stock}</span>
                        <span className="text-[10px] pt-1">{product.unit_type === 'measurement' ? (product.base_unit || 'Box') : 'Units'}</span>
                      </div>
                    </div>
                  </div>

                  {product.discountPercent > 0 && (
                    <div className="absolute top-10 left-0 bg-green-500 text-white text-[8px] font-black py-1 px-3 rounded-r-lg shadow-sm uppercase tracking-widest z-10">
                      {product.discountPercent}% OFF
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredProducts?.length === 0 && !isLoading && (
          <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-navy">No products found</h3>
            <p className="text-text-soft text-sm mt-1">Try adjusting your search or filters</p>
            <button
              onClick={() => { setSearch(''); setFilterType('all'); }}
              className="mt-4 text-blue text-sm font-bold hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <ProductModal
          product={editingProduct}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['products'] })}
        />
      )}
    </Layout>
  );
};

export default ProductsPage;
