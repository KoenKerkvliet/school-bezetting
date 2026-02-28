import React, { useState } from 'react';
import { Send, Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export default function TestEmailPage() {
  const [formData, setFormData] = useState({ to: '', name: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { success, error, details }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    setLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${supabaseUrl}/functions/v1/send-test-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          to: formData.to,
          name: formData.name,
          message: formData.message,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({ success: true, details: data });
      } else {
        setResult({ success: false, error: data.error || 'Onbekende fout', details: data });
      }
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Mail className="w-7 h-7 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Test Email</h1>
      </div>

      <p className="text-gray-500 text-sm mb-6">
        Verstuur een test email via Emailit om te controleren of de email configuratie correct werkt.
      </p>

      {/* Result banner */}
      {result && (
        <div className={`mb-6 p-4 rounded-lg border ${
          result.success
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            )}
            <div>
              <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                {result.success ? 'Email succesvol verstuurd!' : 'Email versturen mislukt'}
              </p>
              {result.error && (
                <p className="text-red-700 text-sm mt-1">{result.error}</p>
              )}
              {result.details && (
                <pre className="mt-2 text-xs bg-white/50 p-2 rounded overflow-x-auto max-w-full">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email adres *
          </label>
          <input
            type="email"
            required
            value={formData.to}
            onChange={(e) => setFormData({ ...formData, to: e.target.value })}
            placeholder="voorbeeld@email.nl"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Naam
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Jouw naam"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bericht *
          </label>
          <textarea
            required
            rows={4}
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="Typ je testbericht..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-vertical"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Versturen...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Verstuur test email
            </>
          )}
        </button>
      </form>
    </div>
  );
}
