import React from 'react'

/**
 * Branded loading screen — shown during auth check and data loading.
 * Single consistent screen prevents flashes between load phases.
 */
export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        {/* Rotating logo */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-lg flex items-center justify-center animate-pulse">
            <img src="/favicon.svg" alt="" className="w-10 h-10 rounded-lg" />
          </div>
          {/* Spinner ring around logo */}
          <div className="absolute inset-0 -m-1.5">
            <svg className="w-[76px] h-[76px] animate-spin" viewBox="0 0 76 76">
              <circle
                cx="38" cy="38" r="35"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="3"
              />
              <circle
                cx="38" cy="38" r="35"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="140 80"
              />
            </svg>
          </div>
        </div>

        {/* App name */}
        <div className="text-center">
          <div className="font-bold text-gray-900 text-lg leading-tight">School Bezetting</div>
          <div className="text-sm text-gray-400 mt-1">Laden…</div>
        </div>
      </div>
    </div>
  )
}
