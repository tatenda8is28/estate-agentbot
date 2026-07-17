import React from 'react';
import ViewingCalendar from '../components/ViewingCalendar';

export default function Calendar() {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Viewing Calendar</h1>
        <ViewingCalendar />
      </div>
    </div>
  );
}
