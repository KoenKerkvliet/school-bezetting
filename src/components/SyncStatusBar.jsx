import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'

export default function SyncStatusBar() {
  const { syncError } = useApp()
  const [visible, setVisible] = useState(false)

  // Show bar when there's an error, auto-hide after 8 seconds
  useEffect(() => {
    if (syncError) {
      setVisible(true)
      const timer = setTimeout(() => setVisible(false), 8000)
      return () => clearTimeout(timer)
    }
  }, [syncError])

  if (!visible || !syncError) return null

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-red-200 rounded-lg shadow-lg p-3 text-sm max-w-xs z-40">
      <div className="flex items-start gap-2">
        <span className="text-red-600 font-semibold flex-shrink-0 mt-0.5">⚠️</span>
        <div className="flex-1">
          <p className="text-red-700 font-semibold">Sync fout</p>
          <p className="text-red-600 text-xs mt-1 break-words">{syncError}</p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none"
        >
          ×
        </button>
      </div>
    </div>
  )
}
