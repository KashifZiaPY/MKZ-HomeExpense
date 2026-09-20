import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatPKR, formatDate } from '../../utils/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Calendar,
  Users2,
  Tag,
  ArrowRight,
  Sparkles,
  Download,
  FileText,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { ExportPdfModal } from '../common/ExportPdfModal';

const CATEGORY_COLORS = [
  '#f59e0b', // amber-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#ec4899', // pink-500
  '#8b5cf6', // purple-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#64748b', // slate-500
  '#84cc16', // lime-500
  '#14b8a6', // teal-500
  '#e11d48', // rose-600
  '#6366f1', // indigo-500
];

export const ReportsView: React.FC = () => {
  const { expenses, settlements, theme } = useApp();
  const isDark = theme === 'dark';
  const [isPdfModalOpen, setIsPdfModalOpen] = useState<boolean>(false);

  // 1. Monthly Spending Trend (with Asif vs Kashif breakdown)
  const monthlyData = useMemo(() => {
    const map: Record<string, { monthKey: string; monthLabel: string; total: number; asif: number; kashif: number }> = {};

    expenses.forEach((e) => {
      if (!e.date) return;
      try {
        const d = new Date(e.date);
        if (!isValid(d)) return;
        const monthKey = format(d, 'yyyy-MM');
        const monthLabel = format(d, 'MMM yyyy');

        if (!map[monthKey]) {
          map[monthKey] = { monthKey, monthLabel, total: 0, asif: 0, kashif: 0 };
        }

        const amt = Number(e.amount) || 0;
        map[monthKey].total += amt;
        if (e.paidBy === 'Asif Zia') {
          map[monthKey].asif += amt;
        } else {
          map[monthKey].kashif += amt;
        }
      } catch {}
    });

    return Object.values(map).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [expenses]);

  // 2. Category-wise breakdown
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    let grandTotal = 0;

    expenses.forEach((e) => {
      const cat = e.category || 'Miscellaneous';
      const amt = Number(e.amount) || 0;
      map[cat] = (map[cat] || 0) + amt;
      grandTotal += amt;
    });

    return Object.entries(map)
      .map(([name, value]) => ({
        name,
        value,
        percentage: grandTotal > 0 ? ((value / grandTotal) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // 3. Payer Contribution Totals
  const payerStats = useMemo(() => {
    let asifTotal = 0;
    let kashifTotal = 0;
    let grandTotal = 0;

    expenses.forEach((e) => {
      const amt = Number(e.amount) || 0;
      grandTotal += amt;
      if (e.paidBy === 'Asif Zia') asifTotal += amt;
      else kashifTotal += amt;
    });

    const asifPct = grandTotal > 0 ? ((asifTotal / grandTotal) * 100).toFixed(1) : '50.0';
    const kashifPct = grandTotal > 0 ? ((kashifTotal / grandTotal) * 100).toFixed(1) : '50.0';

    return { asifTotal, kashifTotal, grandTotal, asifPct, kashifPct };
  }, [expenses]);

  return (
    <div id="reports-view" className="max-w-7xl mx-auto space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Spending Reports & Analytics
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Client-side computed household analytics and brother payment distributions
          </p>
        </div>

        <button
          id="reports-export-pdf-btn"
          onClick={() => setIsPdfModalOpen(true)}
          className="self-start sm:self-auto px-4 py-2.5 rounded-2xl bg-[#1a2744] hover:bg-[#24355a] text-white font-bold text-xs shadow-md shadow-slate-900/10 active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-slate-700/50"
        >
          <FileText className="w-4 h-4 text-indigo-300" />
          <span>Export PDF</span>
        </button>
      </div>

      {/* Export PDF Modal */}
      <ExportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
      />

      {/* Top 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Household Spend
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {formatPKR(payerStats.grandTotal)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Across {expenses.length} total logged bills
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Asif Zia Fronted ({payerStats.asifPct}%)
            </span>
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400">Equal target</span>
          </div>
          <p className="text-2xl font-black text-rose-700 dark:text-rose-300 mt-1">
            {formatPKR(payerStats.asifTotal)}
          </p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, parseFloat(payerStats.asifPct)))}%` }}
            />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Kashif Zia Fronted ({payerStats.kashifPct}%)
            </span>
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400">Equal target</span>
          </div>
          <p className="text-2xl font-black text-sky-700 dark:text-sky-300 mt-1">
            {formatPKR(payerStats.kashifTotal)}
          </p>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-sky-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, parseFloat(payerStats.kashifPct)))}%` }}
            />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Spending Trend (Bar Chart) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly Spending Trend
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Asif Fronted
              </span>
              <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded bg-sky-500" /> Kashif Fronted
              </span>
            </div>
          </div>

          {monthlyData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No monthly data available
            </div>
          ) : (
            <div className="h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#f1f5f9'} vertical={false} />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: isDark ? '#334155' : '#e2e8f0' }}
                  />
                  <YAxis
                    tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }}
                    tickFormatter={(val) => `Rs.${val >= 1000 ? `${Math.round(val / 1000)}k` : val}`}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                      borderRadius: '12px',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      fontSize: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    }}
                    formatter={(val: any, name: any) => [
                      formatPKR(val),
                      name === 'asif' ? 'Asif Zia Fronted' : name === 'kashif' ? 'Kashif Zia Fronted' : 'Total',
                    ]}
                  />
                  <Bar dataKey="asif" fill="#f43f5e" radius={[4, 4, 0, 0]} name="asif" stackId="a" />
                  <Bar dataKey="kashif" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="kashif" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category Breakdown (Donut Chart) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <PieChartIcon className="w-5 h-5 text-blue-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Category Distribution
            </h3>
          </div>

          {categoryData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-slate-400">
              No category data available
            </div>
          ) : (
            <div className="h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#e2e8f0',
                      borderRadius: '12px',
                      color: isDark ? '#f8fafc' : '#0f172a',
                      fontSize: '12px',
                    }}
                    formatter={(val: any) => [formatPKR(val), 'Spent']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Category Leaderboard Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Tag className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Category Breakdown Table
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categoryData.map((item, index) => {
            const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
            return (
              <div
                key={item.name}
                className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5 min-w-0 mr-2">
                  <span
                    className="w-3.5 h-3.5 rounded-md shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {item.percentage}% of all expenses
                    </p>
                  </div>
                </div>

                <span className="text-xs font-black text-slate-900 dark:text-white shrink-0">
                  {formatPKR(item.value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
