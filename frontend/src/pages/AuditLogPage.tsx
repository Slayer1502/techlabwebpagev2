import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/Layout';
import { auditService } from '../services/auditService';
import { ScrollText, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateValue } from '../utils/helpers';

const AuditLogPage = () => {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, entityType, action, userId, dateFrom, dateTo],
    queryFn: () => auditService.getLogs({ page, entityType, action, userId, dateFrom, dateTo, limit: 30 }),
  });

  const entityTypes = ['product', 'service_request', 'order', 'party', 'expense', 'enquiry', 'quotation', 'sales_quotation', 'supplier', 'purchase'];

  const handleFilterChange = () => {
    setPage(1);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Audit Trail</h1>
          <p className="text-text-soft text-sm">Track every change made across the system</p>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="relative">
            <Filter className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
            <select
              className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/10 outline-none text-sm appearance-none"
              value={entityType}
              onChange={e => { setEntityType(e.target.value); handleFilterChange(); }}
            >
              <option value="">All Entities</option>
              {entityTypes.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
            <select
              className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/10 outline-none text-sm appearance-none"
              value={action}
              onChange={e => { setAction(e.target.value); handleFilterChange(); }}
            >
              <option value="">All Actions</option>
              <option value="POST">Create</option>
              <option value="PATCH">Update</option>
              <option value="PUT">Replace</option>
              <option value="DELETE">Delete</option>
            </select>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-text-soft" />
            <input
              type="text"
              placeholder="User ID"
              className="w-full pl-10 pr-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/10 outline-none text-sm"
              value={userId}
              onChange={e => { setUserId(e.target.value); handleFilterChange(); }}
            />
          </div>
          <input
            type="date"
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/10 outline-none text-sm"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); handleFilterChange(); }}
            title="From date"
          />
          <input
            type="date"
            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue/10 outline-none text-sm"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); handleFilterChange(); }}
            title="To date"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-text-soft animate-pulse">Loading audit trail...</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-max">
                <thead>
                  <tr className="bg-soft/60 text-left text-xs uppercase tracking-wider text-text-soft">
                    <th className="px-5 py-3 font-bold">Time</th>
                    <th className="px-5 py-3 font-bold">Action</th>
                    <th className="px-5 py-3 font-bold">Entity</th>
                    <th className="px-5 py-3 font-bold">ID</th>
                    <th className="px-5 py-3 font-bold">User</th>
                    <th className="px-5 py-3 font-bold">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.logs.map((log: any) => (
                    <tr key={log.id} className="border-t border-gray-100 hover:bg-soft/30 transition-colors">
                      <td className="px-5 py-3 text-text-soft whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-lg uppercase ${
                          log.action?.includes('DELETE') ? 'bg-red-100 text-red-600' :
                          log.action?.includes('POST') || log.action?.includes('CREATE') ? 'bg-green-100 text-green-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-navy font-medium capitalize">{log.entity_type?.replace('_', ' ')}</td>
                      <td className="px-5 py-3 text-text-soft font-mono text-xs">{log.entity_id || '-'}</td>
                      <td className="px-5 py-3 text-navy font-medium">{log.user_name || '-'}</td>
                      <td className="px-5 py-3 text-text-soft capitalize">{log.user_role || '-'}</td>
                    </tr>
                  ))}
                  {data?.logs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-16 text-center">
                        <ScrollText className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-text-soft">No audit records found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data && data.total > 0 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-soft/30">
                <span className="text-xs text-text-soft">
                  Showing {(data.page - 1) * 30 + 1}-{Math.min(data.page * 30, data.total)} of {data.total}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-text-soft"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-bold text-navy">Page {page}</span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * 30 >= data.total}
                    className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 text-text-soft"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AuditLogPage;
