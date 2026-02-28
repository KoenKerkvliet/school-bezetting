import React from 'react'
import { useApp } from '../context/AppContext'

export default function SyncStatusBar() {
  const { syncQueue, syncInProgress, syncError, lastSyncTime } = useApp()

  // Don't show bar if nothing is happening
  if (!syncInProgress && syncQueue.length === 0 && !syncError) {
    return null
  }

  const pendingCount = syncQueue.length

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm max-w-xs z-40">
      {syncError ? (
        <div className="flex items-start gap-2">
          <span className="text-red-600 font-semibold flex-shrink-0 mt-0.5">⚠️</span>
          <div className="flex-1">
            <p className="text-red-700 font-semibold">Sync mislukt</p>
            <p className="text-red-600 text-xs mt-1">{syncError}</p>
            <p className="text-gray-500 text-xs mt-2">Herprobeert automatisch...</p>
          </div>
        </div>
      ) : syncInProgress ? (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-gray-700">
            Synchroniseren... ({pendingCount} wijzigingen)
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-green-600">✓</span>
          <div className="flex-1">
            <span className="text-gray-700">
              {pendingCount} wijzigingen wachten op sync
            </span>
            {lastSyncTime && (
              <p className="text-gray-500 text-xs mt-1">
                Laatst gesynchroniseerd: {formatTime(lastSyncTime)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function formatTime(date) {
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)

  if (minutes > 0) {
    return `${minutes}m geleden`
  }
  return `${seconds}s geleden`
}
