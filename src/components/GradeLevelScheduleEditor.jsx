import React, { useState, useEffect } from 'react';
import { Clock, RotateCcw, Save, CheckCircle } from 'lucide-react';
import {
  useApp, DAYS, DAY_LABELS_SHORT, GRADE_LEVELS, DEFAULT_GRADE_LEVEL_SCHEDULES,
} from '../context/AppContext.jsx';

export default function GradeLevelScheduleEditor() {
  const { state, dispatch } = useApp();
  const [local, setLocal] = useState([]);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialise local state from context
  useEffect(() => {
    const schedules = state.gradeLevelSchedules?.length > 0
      ? state.gradeLevelSchedules
      : DEFAULT_GRADE_LEVEL_SCHEDULES;
    setLocal(JSON.parse(JSON.stringify(schedules)));
  }, [state.gradeLevelSchedules]);

  function updateTime(gradeLevel, day, field, value) {
    setLocal(prev =>
      prev.map(gl =>
        gl.gradeLevel === gradeLevel
          ? {
              ...gl,
              schedule: {
                ...gl.schedule,
                [day]: { ...gl.schedule[day], [field]: value },
              },
            }
          : gl
      )
    );
    setHasChanges(true);
    setSaved(false);
  }

  function handleSave() {
    dispatch({ type: 'SET_GRADE_LEVEL_SCHEDULES', payload: local });
    setSaved(true);
    setHasChanges(false);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleReset() {
    setLocal(JSON.parse(JSON.stringify(DEFAULT_GRADE_LEVEL_SCHEDULES)));
    setHasChanges(true);
    setSaved(false);
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Clock className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">Lestijden per leerjaar</h2>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Stel de standaard lestijden in per leerjaar (1–8). Deze tijden worden automatisch overgenomen bij het aanmaken van een nieuwe groep.
      </p>

      {/* Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap w-28">
                  Leerjaar
                </th>
                {DAYS.map((day, i) => (
                  <th key={day} className="px-3 py-3 font-semibold text-gray-700 text-center whitespace-nowrap">
                    {DAY_LABELS_SHORT[i]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {GRADE_LEVELS.map((gl, idx) => {
                const entry = local.find(s => s.gradeLevel === gl);
                return (
                  <tr
                    key={gl}
                    className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">
                      Leerjaar {gl}
                    </td>
                    {DAYS.map(day => {
                      const dayData = entry?.schedule?.[day] || { startTime: '08:30', endTime: '15:00' };
                      return (
                        <td key={day} className="px-2 py-2">
                          <div className="flex items-center gap-1 justify-center">
                            <input
                              type="time"
                              value={dayData.startTime}
                              onChange={e => updateTime(gl, day, 'startTime', e.target.value)}
                              className="w-[5.5rem] px-1.5 py-1 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <span className="text-gray-400 text-xs">–</span>
                            <input
                              type="time"
                              value={dayData.endTime}
                              onChange={e => updateTime(gl, day, 'endTime', e.target.value)}
                              className="w-[5.5rem] px-1.5 py-1 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Herstel standaardwaarden
          </button>

          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                <CheckCircle className="w-4 h-4" />
                Opgeslagen
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Opslaan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
