import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar, Clock, User, CheckCircle } from 'lucide-react';
import { supabase } from '../supabase';

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatTime(time) {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function ViewingScheduler({ property, onClose }) {
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedLead, setSelectedLead] = useState('');
  const [leads, setLeads] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase
      .from('re_prospect_leads')
      .select('id, prospect_name, wa_number')
      .order('prospect_name')
      .then(({ data }) => setLeads(data || []));
  }, []);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const isDisabled = (day) => new Date(viewYear, viewMonth, day) < todayMidnight;

  const isSelected = (day) =>
    selectedDate &&
    selectedDate.getDate() === day &&
    selectedDate.getMonth() === viewMonth &&
    selectedDate.getFullYear() === viewYear;

  const handleDateClick = (day) => {
    if (isDisabled(day)) return;
    setSelectedDate(new Date(viewYear, viewMonth, day));
    setSelectedTime(null);
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime || !selectedLead) return;
    setSubmitting(true);
    setError(null);

    // Build YYYY-MM-DD using UTC to avoid timezone-offset day-shift
    const viewing_date = new Date(Date.UTC(viewYear, viewMonth, selectedDate.getDate()))
      .toISOString()
      .split('T')[0];

    const { error: insertError } = await supabase.from('property_viewings').insert([{
      property_id:  property.id,
      lead_id:      selectedLead,
      viewing_date,
      viewing_time: selectedTime,
      status:       'pending'
    }]);

    if (insertError) {
      setError(insertError.message);
    } else {
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl z-50 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0">
            <h2 className="font-bold text-lg">Schedule Viewing</h2>
            <p className="text-blue-100 text-sm truncate">{property.address}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg flex-shrink-0 ml-3">
            <X size={20} />
          </button>
        </div>

        {submitted ? (
          /* Success state */
          <div className="p-8 text-center">
            <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Viewing Scheduled!</h3>
            <p className="text-gray-600">
              {selectedDate?.toLocaleDateString('en-ZA', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
              })}
            </p>
            <p className="text-gray-600 mb-6">at {formatTime(selectedTime)}</p>
            <button
              onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 p-4 space-y-5">
            {/* ── Calendar ── */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={18} className="text-blue-600" />
                <h3 className="font-semibold text-gray-900">Select Date</h3>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Month nav */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <button onClick={prevMonth} className="p-1 hover:bg-gray-200 rounded transition">
                    <ChevronLeft size={18} className="text-gray-600" />
                  </button>
                  <span className="font-semibold text-gray-900 text-sm">
                    {MONTH_NAMES[viewMonth]} {viewYear}
                  </span>
                  <button onClick={nextMonth} className="p-1 hover:bg-gray-200 rounded transition">
                    <ChevronRight size={18} className="text-gray-600" />
                  </button>
                </div>

                <div className="p-2">
                  {/* Day-of-week headers */}
                  <div className="grid grid-cols-7 mb-1">
                    {DAY_LABELS.map(d => (
                      <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">
                        {d}
                      </div>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7">
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <div key={`pad-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const disabled = isDisabled(day);
                      const selected = isSelected(day);
                      return (
                        <button
                          key={day}
                          disabled={disabled}
                          onClick={() => handleDateClick(day)}
                          className={`aspect-square flex items-center justify-center text-sm rounded-lg m-0.5 transition
                            ${disabled ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-blue-50 cursor-pointer'}
                            ${selected ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                          `}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Time Slots ── */}
            {selectedDate && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock size={18} className="text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Select Time</h3>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      className={`py-2 px-3 text-sm font-medium rounded-lg border transition
                        ${selectedTime === slot
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400 hover:text-blue-600'
                        }`}
                    >
                      {formatTime(slot)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Lead Selection ── */}
            {selectedDate && selectedTime && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <User size={18} className="text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Select Lead</h3>
                </div>
                <select
                  value={selectedLead}
                  onChange={(e) => setSelectedLead(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Select a lead...</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>
                      {lead.prospect_name || 'Unnamed'} — {lead.wa_number}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!selectedDate || !selectedTime || !selectedLead || submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                'Confirm Viewing'
              )}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
