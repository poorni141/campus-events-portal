import React, { useState, useEffect } from 'react';
import { User, Organization, Event, AuditLog } from '../types';
import {
  Shield,
  Users,
  Building,
  Calendar,
  DollarSign,
  AlertOctagon,
  FileText,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';

interface AdminDashboardProps {
  onToggleEventStatus: (eventId: string, currentStatus: string) => Promise<void>;
  onRefreshStats: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onToggleEventStatus,
  onRefreshStats,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'orgs' | 'audit'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [resStats, resUsers, resOrgs, resEvents, resAudit] = await Promise.all([
        fetch('/api/admin/stats', { headers: { 'x-user-id': 'usr-admin-1' } }).then((r) => r.json()),
        fetch('/api/admin/users', { headers: { 'x-user-id': 'usr-admin-1' } }).then((r) => r.json()),
        fetch('/api/admin/organizations', { headers: { 'x-user-id': 'usr-admin-1' } }).then((r) => r.json()),
        fetch('/api/admin/events', { headers: { 'x-user-id': 'usr-admin-1' } }).then((r) => r.json()),
        fetch('/api/admin/audit-logs', { headers: { 'x-user-id': 'usr-admin-1' } }).then((r) => r.json()),
      ]);

      setStats(resStats.stats);
      setUsers(resUsers.users || []);
      setOrganizations(resOrgs.organizations || []);
      setEvents(resEvents.events || []);
      setAuditLogs(resAudit.auditLogs || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleToggleEvent = async (eventId: string, status: string) => {
    const nextStatus = status === 'SUSPENDED' ? 'PUBLISHED' : 'SUSPENDED';
    await fetch(`/api/admin/events/${eventId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'usr-admin-1',
      },
      body: JSON.stringify({ status: nextStatus }),
    });
    await fetchAdminData();
  };

  const handleToggleOrg = async (orgId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
    await fetch(`/api/admin/organizations/${orgId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': 'usr-admin-1',
      },
      body: JSON.stringify({ status: nextStatus }),
    });
    await fetchAdminData();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold text-[#FF5A36] uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Platform Root Administration
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B0A2A] mt-0.5">
            Platform Operations & Moderation
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Global governance: moderate events, audit multi-tenant organizations, and monitor transaction safety.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="px-3.5 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Registry
        </button>
      </div>

      {/* KPI Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Volume (GMV)</span>
            <span className="text-xl font-black text-[#1B0A2A] font-mono tabular-nums block mt-1">
              ₹{(stats.totalGrossMerchandiseValue || 0).toLocaleString()}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Organizations</span>
            <span className="text-xl font-black text-slate-900 font-mono tabular-nums block mt-1">
              {stats.totalOrganizations}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Active Users</span>
            <span className="text-xl font-black text-slate-900 font-mono tabular-nums block mt-1">
              {stats.totalUsers}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Confirmed Bookings</span>
            <span className="text-xl font-black text-emerald-700 font-mono tabular-nums block mt-1">
              {stats.totalConfirmedOrders}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Suspended Events</span>
            <span className="text-xl font-black text-red-600 font-mono tabular-nums block mt-1">
              {stats.suspendedEvents}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">Redis Cache Hit Rate</span>
            <span className="text-xl font-black text-purple-700 font-mono tabular-nums block mt-1">
              {stats.cacheStats?.hitRate || '96.2%'}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-200/60 rounded-lg w-fit text-xs font-semibold">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'overview' ? 'bg-white text-[#1B0A2A] shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          User Accounts ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'events' ? 'bg-white text-[#1B0A2A] shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Event Moderation ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('orgs')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'orgs' ? 'bg-white text-[#1B0A2A] shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Organizations ({organizations.length})
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 rounded-md transition-colors ${
            activeTab === 'audit' ? 'bg-white text-[#1B0A2A] shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Audit Ledger ({auditLogs.length})
        </button>
      </div>

      {/* TAB 1: User Accounts */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">User Registry</h3>
            <p className="text-xs text-slate-500">All registered attendees, organizers, and platform admins.</p>
          </div>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">User ID</th>
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Organization</th>
                <th className="px-5 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-mono text-slate-500">{u.id}</td>
                  <td className="px-5 py-3 font-semibold text-slate-900">{u.name}</td>
                  <td className="px-5 py-3 font-mono text-slate-600">{u.email}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`font-semibold uppercase text-[10px] ${
                        u.role === 'ADMIN'
                          ? 'text-purple-700'
                          : u.role === 'ORGANIZER'
                          ? 'text-[#FF5A36]'
                          : 'text-slate-600'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{u.organizationName || '—'}</td>
                  <td className="px-5 py-3 text-slate-400 font-mono">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: Event Moderation */}
      {activeTab === 'events' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">Event Review & Moderation</h3>
            <p className="text-xs text-slate-500">
              Review and immediately suspend any events violating platform policies.
            </p>
          </div>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Event Title</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">City / Venue</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Moderation Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {events.map((ev) => (
                <tr key={ev.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-bold text-slate-900 max-w-[240px] truncate">
                    {ev.title}
                  </td>
                  <td className="px-5 py-3 font-semibold text-[#FF5A36] uppercase">{ev.category}</td>
                  <td className="px-5 py-3 text-slate-600 truncate max-w-[180px]">{ev.venueName}, {ev.city}</td>
                  <td className="px-5 py-3 font-mono text-slate-500">
                    {new Date(ev.eventDate).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`font-semibold text-[10px] font-mono ${
                        ev.status === 'PUBLISHED'
                          ? 'text-emerald-700'
                          : ev.status === 'SUSPENDED'
                          ? 'text-red-600'
                          : 'text-amber-700'
                      }`}
                    >
                      {ev.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleToggleEvent(ev.id, ev.status)}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                        ev.status === 'SUSPENDED'
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                      }`}
                    >
                      {ev.status === 'SUSPENDED' ? 'Reinstate Event' : 'Suspend Event'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: Organizations */}
      {activeTab === 'orgs' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">Tenant Organizations</h3>
            <p className="text-xs text-slate-500">Multi-tenant organizer entities and verification statuses.</p>
          </div>
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Organization Name</th>
                <th className="px-5 py-3">Slug</th>
                <th className="px-5 py-3">Contact Email</th>
                <th className="px-5 py-3">Events Count</th>
                <th className="px-5 py-3">Verified</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-bold text-slate-900">{org.name}</td>
                  <td className="px-5 py-3 font-mono text-slate-500">{org.slug}</td>
                  <td className="px-5 py-3 font-mono text-slate-600">{org.contactEmail}</td>
                  <td className="px-5 py-3 font-mono text-slate-800">{org.eventCount}</td>
                  <td className="px-5 py-3">
                    {org.isVerified ? (
                      <span className="text-emerald-700 font-bold text-xs">Verified ✓</span>
                    ) : (
                      <span className="text-slate-400">Unverified</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`font-semibold font-mono text-[10px] ${
                        org.status === 'ACTIVE' ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {org.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleToggleOrg(org.id, org.status)}
                      className={`px-3 py-1 rounded text-xs font-semibold ${
                        org.status === 'SUSPENDED'
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-red-50 text-red-700 hover:bg-red-100'
                      }`}
                    >
                      {org.status === 'SUSPENDED' ? 'Activate' : 'Suspend'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="p-4 border-b border-slate-200">
            <h3 className="font-bold text-sm text-slate-900">Immutable Audit Ledger</h3>
            <p className="text-xs text-slate-500">Complete chronological trace of ticket reservations, payments, and admin actions.</p>
          </div>
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Actor Email</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Entity Type</th>
                  <th className="px-5 py-3">Entity ID</th>
                  <th className="px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-2.5 text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-2.5 text-slate-800 font-semibold">{log.userEmail}</td>
                    <td className="px-5 py-2.5 text-[#FF5A36] font-bold">{log.action}</td>
                    <td className="px-5 py-2.5 text-slate-500">{log.entityType}</td>
                    <td className="px-5 py-2.5 text-slate-400 truncate max-w-[120px]">{log.entityId}</td>
                    <td className="px-5 py-2.5 text-slate-600 font-sans max-w-[320px] truncate">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
