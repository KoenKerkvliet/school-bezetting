import React from 'react';
import { FileText, Sparkles, Wrench } from 'lucide-react';
import changelog from '../changelog.json';

const typeConfig = {
  major: { label: 'Grote update', icon: Sparkles, color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  minor: { label: 'Nieuwe functies', icon: Sparkles, color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500' },
  patch: { label: 'Verbetering', icon: Wrench, color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
};

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ChangelogPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-7 h-7 text-blue-500" />
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Changelog</h1>
          <p className="text-sm text-gray-500">Versiegeschiedenis van School Bezetting</p>
        </div>
      </div>

      <div className="space-y-4">
        {changelog.map((entry, index) => {
          const config = typeConfig[entry.type] || typeConfig.patch;
          const Icon = config.icon;
          const isLatest = index === 0;

          return (
            <div
              key={entry.version}
              className={`bg-white rounded-lg shadow p-5 border-l-4 ${isLatest ? 'border-l-blue-500' : 'border-l-gray-200'}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-900">v{entry.version}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.color}`}>
                    <Icon className="w-3 h-3" />
                    {config.label}
                  </span>
                  {isLatest && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                      Huidige versie
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-400">{formatDate(entry.date)}</span>
              </div>

              {/* Changes list */}
              <ul className="space-y-1.5">
                {entry.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${config.dot}`} />
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
