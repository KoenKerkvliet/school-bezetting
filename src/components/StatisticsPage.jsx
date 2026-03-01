import React, { useState, useMemo } from 'react';
import {
  BarChart3, TrendingUp, Users, Calendar, AlertTriangle,
  ChevronDown, ChevronUp, Clock, UserX,
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, isWithinInterval, subMonths, startOfYear, endOfYear, getYear } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useApp } from '../context/AppContext.jsx';

const MONTH_LABELS = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

export default function StatisticsPage() {
  const { state } = useApp();
  const { staff, absences, timeAbsences } = state;

  const today = new Date();
  const currentYear = getYear(today);
  const years = useMemo(() => {
    const allDates = [
      ...absences.map(a => a.date),
      ...(timeAbsences || []).map(a => a.date),
    ].filter(Boolean);
    const uniqueYears = [...new Set(allDates.map(d => getYear(parseISO(d))))];
    if (!uniqueYears.includes(currentYear)) uniqueYears.push(currentYear);
    return uniqueYears.sort((a, b) => b - a);
  }, [absences, timeAbsences, currentYear]);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [expandedStaffId, setExpandedStaffId] = useState(null);
  const [sortBy, setSortBy] = useState('total'); // 'total', 'name', 'recent'

  const yearStart = startOfYear(new Date(selectedYear, 0, 1));
  const yearEnd = selectedYear === currentYear ? today : endOfYear(new Date(selectedYear, 0, 1));

  // ── Computed statistics ──────────────────────────────────────────────

  const stats = useMemo(() => {
    const yearAbsences = absences.filter(a => {
      try { return getYear(parseISO(a.date)) === selectedYear; } catch { return false; }
    });
    const yearTimeAbsences = (timeAbsences || []).filter(a => {
      try { return getYear(parseISO(a.date)) === selectedYear; } catch { return false; }
    });

    // Total counts
    const totalAbsences = yearAbsences.length;
    const totalTimeAbsences = yearTimeAbsences.length;

    // Per month chart data
    const months = [];
    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(selectedYear, m, 1);
      const monthEnd = endOfMonth(monthStart);
      if (monthStart > today && selectedYear === currentYear) break;
      const monthAbsences = yearAbsences.filter(a => {
        try {
          const d = parseISO(a.date);
          return d >= monthStart && d <= monthEnd;
        } catch { return false; }
      });
      const monthTimeAbs = yearTimeAbsences.filter(a => {
        try {
          const d = parseISO(a.date);
          return d >= monthStart && d <= monthEnd;
        } catch { return false; }
      });
      months.push({
        label: MONTH_LABELS[m],
        absences: monthAbsences.length,
        timeAbsences: monthTimeAbs.length,
        total: monthAbsences.length + monthTimeAbs.length,
      });
    }

    // Per staff breakdown
    const staffStats = staff.map(s => {
      const sAbsences = yearAbsences.filter(a => a.staff_id === s.id);
      const sTimeAbsences = yearTimeAbsences.filter(a => a.staff_id === s.id);
      const total = sAbsences.length + sTimeAbsences.length;

      // Most recent absence
      const allDates = [
        ...sAbsences.map(a => a.date),
        ...sTimeAbsences.map(a => a.date),
      ].filter(Boolean).sort().reverse();
      const lastAbsence = allDates[0] || null;

      // Reason breakdown
      const reasonCounts = {};
      [...sAbsences, ...sTimeAbsences].forEach(a => {
        const reason = a.reason || 'Onbekend';
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      });

      // Per-month for sparkline
      const monthlyData = months.map((_, i) => {
        const monthStart = new Date(selectedYear, i, 1);
        const monthEnd = endOfMonth(monthStart);
        return sAbsences.filter(a => {
          try { const d = parseISO(a.date); return d >= monthStart && d <= monthEnd; } catch { return 0; }
        }).length + sTimeAbsences.filter(a => {
          try { const d = parseISO(a.date); return d >= monthStart && d <= monthEnd; } catch { return 0; }
        }).length;
      });

      return {
        id: s.id,
        name: s.name,
        role: s.role,
        absences: sAbsences.length,
        timeAbsences: sTimeAbsences.length,
        total,
        lastAbsence,
        reasonCounts,
        monthlyData,
        details: [...sAbsences.map(a => ({ ...a, type: 'absence' })), ...sTimeAbsences.map(a => ({ ...a, type: 'time' }))].sort((a, b) => (b.date || '').localeCompare(a.date || '')),
      };
    });

    // Reason breakdown for totals
    const totalReasonCounts = {};
    [...yearAbsences, ...yearTimeAbsences].forEach(a => {
      const reason = a.reason || 'Onbekend';
      totalReasonCounts[reason] = (totalReasonCounts[reason] || 0) + 1;
    });

    // Unique staff absent
    const uniqueStaffAbsent = new Set([
      ...yearAbsences.map(a => a.staff_id),
      ...yearTimeAbsences.map(a => a.staff_id),
    ]).size;

    // Average per staff (only those with absences)
    const avgPerStaff = uniqueStaffAbsent > 0
      ? ((totalAbsences + totalTimeAbsences) / uniqueStaffAbsent).toFixed(1)
      : '0';

    return { totalAbsences, totalTimeAbsences, months, staffStats, totalReasonCounts, uniqueStaffAbsent, avgPerStaff };
  }, [absences, timeAbsences, staff, selectedYear, currentYear]);

  // Sort staff
  const sortedStaff = useMemo(() => {
    const arr = [...stats.staffStats];
    if (sortBy === 'total') arr.sort((a, b) => b.total - a.total);
    else if (sortBy === 'name') arr.sort((a, b) => a.name.localeCompare(b.name, 'nl'));
    else if (sortBy === 'recent') arr.sort((a, b) => (b.lastAbsence || '').localeCompare(a.lastAbsence || ''));
    return arr;
  }, [stats.staffStats, sortBy]);

  const maxMonthly = Math.max(...stats.months.map(m => m.total), 1);
  const totalAll = stats.totalAbsences + stats.totalTimeAbsences;

  return (
    <div className="max-w-7xl">
      {/* Page header */}
      <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-7 h-7 text-gray-700" />
          <h1 className="text-3xl font-bold text-gray-900">Statistieken</h1>
        </div>
        <select
          value={selectedYear}
          onChange={e => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent w-fit"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <SummaryCard
          icon={UserX}
          label="Hele dag afwezig"
          value={stats.totalAbsences}
          color="red"
        />
        <SummaryCard
          icon={Clock}
          label="Deels afwezig"
          value={stats.totalTimeAbsences}
          color="amber"
        />
        <SummaryCard
          icon={Users}
          label="Collega's afwezig"
          value={stats.uniqueStaffAbsent}
          subtitle={`van ${staff.length} totaal`}
          color="blue"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Gem. per collega"
          value={stats.avgPerStaff}
          subtitle="meldingen"
          color="purple"
        />
      </div>

      {/* ── Monthly chart ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Afwezigheden per maand
        </h2>
        <div className="flex items-end gap-2 h-40">
          {stats.months.map((m, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col items-center justify-end h-28">
                {m.total > 0 && (
                  <span className="text-xs font-semibold text-gray-600 mb-1">{m.total}</span>
                )}
                <div className="w-full flex flex-col items-center">
                  {m.absences > 0 && (
                    <div
                      className="w-full max-w-[32px] bg-red-400 rounded-t"
                      style={{ height: `${Math.max((m.absences / maxMonthly) * 100, 4)}px` }}
                      title={`${m.absences} hele dag`}
                    />
                  )}
                  {m.timeAbsences > 0 && (
                    <div
                      className={`w-full max-w-[32px] bg-amber-400 ${m.absences === 0 ? 'rounded-t' : ''} rounded-b`}
                      style={{ height: `${Math.max((m.timeAbsences / maxMonthly) * 100, 4)}px` }}
                      title={`${m.timeAbsences} deels afwezig`}
                    />
                  )}
                  {m.total === 0 && (
                    <div className="w-full max-w-[32px] bg-gray-100 rounded h-1" />
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-500 font-medium">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400" /> Hele dag</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400" /> Deels afwezig</span>
        </div>
      </div>

      {/* ── Reason breakdown ── */}
      {Object.keys(stats.totalReasonCounts).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Redenen van afwezigheid
          </h2>
          <div className="space-y-2">
            {Object.entries(stats.totalReasonCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([reason, count]) => (
                <div key={reason} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700 truncate">{reason}</span>
                      <span className="text-sm font-semibold text-gray-900 flex-shrink-0 ml-2">{count}×</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${(count / totalAll) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ── Per staff table ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Afwezigheid per collega
            </h2>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {[
                { key: 'total', label: 'Meeste eerst' },
                { key: 'name', label: 'Naam' },
                { key: 'recent', label: 'Recent' },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    sortBy === opt.key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {sortedStaff.map(s => {
            const expanded = expandedStaffId === s.id;
            const sparkMax = Math.max(...s.monthlyData, 1);
            return (
              <div key={s.id}>
                <button
                  onClick={() => setExpandedStaffId(expanded ? null : s.id)}
                  className="w-full px-5 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                >
                  {/* Name & role */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-900 truncate">{s.name}</div>
                    {s.role && <div className="text-xs text-gray-400">{s.role}</div>}
                  </div>

                  {/* Sparkline */}
                  <div className="hidden sm:flex items-end gap-px h-6 w-24 flex-shrink-0">
                    {s.monthlyData.slice(0, stats.months.length).map((v, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm ${v > 0 ? 'bg-red-300' : 'bg-gray-100'}`}
                        style={{ height: `${Math.max((v / sparkMax) * 100, 8)}%` }}
                        title={`${MONTH_LABELS[i]}: ${v}`}
                      />
                    ))}
                  </div>

                  {/* Counters */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {s.absences > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-50 text-red-700 rounded-full px-2 py-0.5">
                        <UserX className="w-3 h-3" />{s.absences}
                      </span>
                    )}
                    {s.timeAbsences > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">
                        <Clock className="w-3 h-3" />{s.timeAbsences}
                      </span>
                    )}
                    {s.total === 0 && (
                      <span className="text-xs text-gray-400">Geen meldingen</span>
                    )}
                  </div>

                  {/* Total badge */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    s.total === 0
                      ? 'bg-green-50 text-green-600'
                      : s.total <= 3
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {s.total}
                  </div>

                  {/* Expand arrow */}
                  {s.total > 0 ? (
                    expanded
                      ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : <div className="w-4" />}
                </button>

                {/* Expanded detail */}
                {expanded && s.total > 0 && (
                  <div className="px-5 pb-4 bg-gray-50 border-t border-gray-100">
                    {/* Reason summary */}
                    {Object.keys(s.reasonCounts).length > 0 && (
                      <div className="flex flex-wrap gap-2 py-3">
                        {Object.entries(s.reasonCounts).sort((a,b) => b[1] - a[1]).map(([reason, count]) => (
                          <span key={reason} className="inline-flex items-center gap-1 text-xs bg-white border border-gray-200 rounded-full px-2.5 py-1 text-gray-700">
                            {reason} <span className="font-bold text-gray-900">{count}×</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Detail list */}
                    <div className="space-y-1.5">
                      {s.details.map(d => (
                        <div key={d.id} className="flex items-center gap-3 text-xs bg-white rounded-lg px-3 py-2 border border-gray-100">
                          {d.type === 'absence' ? (
                            <UserX className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          )}
                          <span className="font-medium text-gray-800 flex-shrink-0">
                            {d.date ? capitalize(format(parseISO(d.date), 'EEEE d MMM yyyy', { locale: nl })) : '—'}
                          </span>
                          {d.type === 'time' && d.startTime && (
                            <span className="text-gray-500">{d.startTime} – {d.endTime}</span>
                          )}
                          {d.reason && (
                            <span className="text-gray-500 truncate ml-auto">{d.reason}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, subtitle, color }) {
  const colors = {
    red: 'bg-red-50 text-red-600 border-red-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };
  const iconColors = {
    red: 'bg-red-100 text-red-600',
    amber: 'bg-amber-100 text-amber-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconColors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium opacity-75 mt-0.5">{label}</div>
      {subtitle && <div className="text-xs opacity-50">{subtitle}</div>}
    </div>
  );
}
