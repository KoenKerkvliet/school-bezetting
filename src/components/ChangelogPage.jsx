import React from 'react';
import { FileText } from 'lucide-react';

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

      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">De changelog wordt binnenkort aangevuld.</p>
        </div>
      </div>
    </div>
  );
}
