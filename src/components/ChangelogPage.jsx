import React from 'react';
import { FileText, Sparkles, Wrench } from 'lucide-react';
import changelog from '../changelog.json';

const changeTypeConfig = {
  new:         { label: 'Nieuw',       dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  improvement: { label: 'Aanpassing',  dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-600 border-blue-200' },
};

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
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

      {/* Legend */}
      <div className="flex gap-4 mb-5 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Nieuwe functie
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          Aanpassing
        </span>
      </div>

      <div className="space-y-4">
        {changelog.map((entry, index) => {
          const isLatest = index === 0;

          // Group changes by type
          const newChanges = entry.changes.filter(c => (typeof c === 'string' ? 'new' : c.type) === 'new');
          const improvements = entry.changes.filter(c => (typeof c === 'string' ? null : c.type) === 'improvement');

          return (
            <div
              key={entry.version}
              className={`bg-white rounded-lg shadow p-5 border-l-4 ${isLatest ? 'border-l-blue-500' : 'border-l-gray-200'}`}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-900">v{entry.version}</span>
                  {isLatest && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                      Huidige versie
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-400 capitalize">{formatDate(entry.date)}</span>
              </div>

              {/* New features */}
              {newChanges.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Nieuwe functies</span>
                  </div>
                  <ul className="space-y-1.5">
                    {newChanges.map((change, i) => {
                      const text = typeof change === 'string' ? change : change.text;
                      return (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 bg-emerald-500" />
                          {text}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {improvements.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Wrench className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Aanpassingen</span>
                  </div>
                  <ul className="space-y-1.5">
                    {improvements.map((change, i) => {
                      const text = typeof change === 'string' ? change : change.text;
                      return (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 bg-blue-400" />
                          {text}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
