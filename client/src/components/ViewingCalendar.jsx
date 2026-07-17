import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabase';

export default function ViewingCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewings, setViewings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchViewings();
  }, [currentDate]);

  const fetchViewings = async () => {
    try {
      setLoading(true);
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const { data, error } = await supabase
        .from('re_property_viewings')
        .select('*')
        .gte('viewing_date', firstDay.toISOString().split('T')[0])
        .lte('viewing_date', lastDay.toISOString().split('T')[0]);

      if (error) throw error;
      setViewings(data || []);
    } catch (err) {
      console.error('Error fetching viewings:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const hasViewingOnDate = (day) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString()
      .split('T')[0];
    return viewings.some(v => v.viewing_date === dateStr);
  };

  const getViewingsForDate = (day) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString()
      .split('T')[0];
    return viewings.filter(v => v.viewing_date === dateStr);
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{monthName}</h3>
        <div className="flex gap-1">
          <button
            onClick={handlePrevMonth}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={handleNextMonth}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-semibold text-gray-600 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1 flex-1">
        {emptyDays.map(i => (
          <div key={`empty-${i}`} className="bg-gray-50 rounded" />
        ))}
        {days.map(day => {
          const hasViewing = hasViewingOnDate(day);
          return (
            <div
              key={day}
              className={`p-1 text-center rounded text-sm font-medium cursor-pointer transition ${
                hasViewing
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-50 text-gray-900 hover:bg-gray-100'
              }`}
              title={hasViewing ? `${getViewingsForDate(day).length} viewing(s)` : ''}
            >
              {day}
            </div>
          );
        })}
      </div>

      {/* Upcoming Viewings */}
      {viewings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-600 mb-2">Upcoming</p>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {viewings.slice(0, 5).map(viewing => (
              <div key={viewing.id} className="bg-blue-50 p-2 rounded text-xs">
                <p className="font-semibold text-blue-900">{viewing.viewing_date}</p>
                <p className="text-blue-700">{viewing.viewing_time}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
