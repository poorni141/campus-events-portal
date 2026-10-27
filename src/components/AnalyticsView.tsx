import React, { useState, useEffect } from 'react';
import { AnalyticsOverview } from '../types';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  Ticket,
  Calendar,
  Percent,
  RefreshCw,
  Clock,
  Layers,
} from 'lucide-react';

interface AnalyticsViewProps {
  analytics: AnalyticsOverview | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

const CATEGORY_COLORS = ['#FF5A36', '#2D124D', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  analytics,
  onRefresh,
  isRefreshing,
}) => {
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      onRefresh();
    }, 15000); // 15s poll
    return () => clearInterval(interval);
  }, [autoRefresh, onRefresh]);

  if (!analytics) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-500 text-xs">
        Loading real-time sales telemetry...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Analytics Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold text-[#FF5A36] uppercase tracking-wider">
            Real-Time Intelligence
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B0A2A] mt-0.5">
            Event Revenue & Sales Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative transactional metrics, conversion funnel, and category distribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="text-[#FF5A36] focus:ring-[#FF5A36] rounded"
            />
            <span>Auto-poll (15s)</span>
          </label>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Gross GMV</span>
            <DollarSign className="w-4 h-4 text-[#FF5A36]" />
          </div>
          <span className="text-2xl font-black text-[#1B0A2A] font-mono tabular-nums block">
            ₹{analytics.totalRevenue.toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold block mt-1">
            +18.4% vs last cycle
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Tickets Sold</span>
            <Ticket className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-slate-900 font-mono tabular-nums block">
            {analytics.totalTicketsSold.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">
            Confirmed attendees
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Conversion Rate</span>
            <Percent className="w-4 h-4 text-[#FF5A36]" />
          </div>
          <span className="text-2xl font-black text-[#1B0A2A] font-mono tabular-nums block">
            {analytics.conversionRate}%
          </span>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">
            Bookings / Attempts
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active 10-Min Holds</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-2xl font-black text-amber-600 font-mono tabular-nums block">
            {analytics.pendingReservations}
          </span>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">
            In checkout pipeline
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Remaining Stock</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-2xl font-black text-slate-800 font-mono tabular-nums block">
            {analytics.remainingInventory.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">
            Available to reserve
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Live Events</span>
            <Calendar className="w-4 h-4 text-[#2D124D]" />
          </div>
          <span className="text-2xl font-black text-[#2D124D] font-mono tabular-nums block">
            {analytics.publishedEvents}
          </span>
          <span className="text-[10px] text-slate-500 font-medium block mt-1">
            Active sales portals
          </span>
        </div>
      </div>

      {/* Chart Section 1: Sales Trend & Revenue by Category */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sales Trend Area Chart */}
        <div className="lg:col-span-8 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Daily Sales Revenue & Velocity
              </h3>
              <p className="text-xs text-slate-500">
                7-day rolling revenue aggregate from verified orders.
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
              Authoritative
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.salesTrend}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF5A36" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#FF5A36" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, 'Revenue']}
                  contentStyle={{
                    backgroundColor: '#1B0A2A',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#FF5A36"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#revenueGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Category Donut Chart */}
        <div className="lg:col-span-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
          <h3 className="text-base font-bold text-slate-900 mb-1">Revenue by Category</h3>
          <p className="text-xs text-slate-500 mb-4">
            Distribution across event domains.
          </p>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.revenueByCategory}
                  dataKey="revenue"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                >
                  {analytics.revenueByCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`₹${Number(val).toLocaleString()}`, 'Revenue']}
                  contentStyle={{
                    backgroundColor: '#1B0A2A',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 space-y-1.5">
            {analytics.revenueByCategory.map((item, idx) => (
              <div key={item.category} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                  />
                  <span className="text-slate-700 font-medium">{item.category}</span>
                </div>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  ₹{item.revenue.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart Section 2: Ticket Tier Velocity Breakdown */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="text-base font-bold text-slate-900 mb-1">
          Ticket Tier Sales Breakdown & Capacity Utilization
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Comparing sold quantities vs total capacity per ticket tier.
        </p>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.categoryPerformance}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#6B7280' }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#6B7280' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1B0A2A',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="sold" name="Tickets Sold" fill="#FF5A36" radius={[4, 4, 0, 0]} />
              <Bar dataKey="total" name="Total Capacity" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
