import React, { useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import PipelineView from '../components/PipelineView';
import ProspectList from '../components/ProspectList';
import ChatPanel from '../components/ChatPanel';
import ProspectDetails from '../components/ProspectDetails';
import { useSupabaseRealtime } from '../useSupabaseRealtime';

export default function CRM() {
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [viewMode, setViewMode] = useState('pipeline'); // 'pipeline' or 'list'
  const { data: prospects, loading } = useSupabaseRealtime('re_prospect_leads');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading prospects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900">Real Estate CRM</h1>
          
          {/* View Toggle */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('pipeline')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                viewMode === 'pipeline'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LayoutGrid size={18} />
              <span className="text-sm font-medium">Pipeline</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                viewMode === 'list'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List size={18} />
              <span className="text-sm font-medium">List</span>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="hidden md:flex gap-6 text-sm">
            <div className="text-center">
              <p className="text-gray-500">Total</p>
              <p className="text-xl font-bold text-gray-900">{prospects.length}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Hot Leads</p>
              <p className="text-xl font-bold text-red-600">{prospects.filter(p => p.lead_score === 'Hot').length}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* Left: Pipeline or List View */}
        <div className="flex-1 min-w-0">
          {viewMode === 'pipeline' ? (
            <PipelineView prospects={prospects} />
          ) : (
            <ProspectList
              prospects={prospects}
              selectedProspect={selectedProspect}
              onSelectProspect={setSelectedProspect}
            />
          )}
        </div>

        {/* Right: Details + Chat (Desktop only) */}
        {selectedProspect && (
          <div className="hidden lg:flex flex-col gap-6 w-96">
            {/* Prospect Details */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <ProspectDetails
                prospect={selectedProspect}
                onUpdate={(updated) => {
                  setSelectedProspect(updated);
                }}
              />
            </div>

            {/* Chat Panel */}
            <div className="h-96 flex-shrink-0">
              <ChatPanel prospect={selectedProspect} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Detail View */}
      {selectedProspect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden flex flex-col">
          <div className="bg-white flex-1 overflow-y-auto rounded-t-2xl mt-20">
            <div className="p-6">
              <button
                onClick={() => setSelectedProspect(null)}
                className="mb-4 px-4 py-2 text-blue-600 font-semibold"
              >
                ← Back
              </button>

              {/* Mobile Details */}
              <ProspectDetails prospect={selectedProspect} />

              {/* Mobile Chat */}
              <div className="mt-6 h-96">
                <ChatPanel prospect={selectedProspect} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
