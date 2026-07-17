import React, { useState } from 'react';
import { LayoutGrid, List, X } from 'lucide-react';
import PipelineView from '../components/PipelineView';
import ProspectList from '../components/ProspectList';
import ChatPanel from '../components/ChatPanel';
import ProspectDetails from '../components/ProspectDetails';
import { useSupabaseRealtime } from '../useSupabaseRealtime';

export default function CRM() {
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [viewMode, setViewMode] = useState('pipeline'); // 'pipeline' or 'list'
  const [showDetail, setShowDetail] = useState(false);
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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header - Consistent across all screens */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-40 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Real Estate CRM</h1>
          
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* View Toggle */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('pipeline')}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded text-sm sm:text-base font-medium transition ${
                  viewMode === 'pipeline'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutGrid size={16} />
                <span className="hidden sm:inline">Pipeline</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded text-sm sm:text-base font-medium transition ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List size={16} />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>

            {/* Quick Stats - Hidden on mobile */}
            <div className="hidden sm:flex gap-6 text-sm pl-4 border-l border-gray-200">
              <div className="text-center">
                <p className="text-gray-500 text-xs">Total</p>
                <p className="text-lg font-bold text-gray-900">{prospects.length}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-500 text-xs">Hot</p>
                <p className="text-lg font-bold text-red-600">{prospects.filter(p => p.lead_score === 'Hot').length}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col sm:flex-row gap-0 sm:gap-4 p-0 sm:p-4">
        
        {/* Primary View - Full width on mobile, responsive on desktop */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {viewMode === 'pipeline' ? (
            <PipelineView 
              prospects={prospects}
              onSelectProspect={(prospect) => {
                setSelectedProspect(prospect);
                setShowDetail(true);
              }}
            />
          ) : (
            <ProspectList
              prospects={prospects}
              selectedProspect={selectedProspect}
              onSelectProspect={(prospect) => {
                setSelectedProspect(prospect);
                setShowDetail(true);
              }}
            />
          )}
        </div>

        {/* Detail Sidebar - Hidden on mobile, visible on tablet+ */}
        {selectedProspect && (
          <div className="hidden lg:flex flex-col gap-4 w-full lg:w-96 min-h-0">
            {/* Prospect Details */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <ProspectDetails
                prospect={selectedProspect}
                onUpdate={(updated) => {
                  setSelectedProspect(updated);
                }}
              />
            </div>

            {/* Chat Panel */}
            <div className="h-80 flex-shrink-0">
              <ChatPanel prospect={selectedProspect} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Detail Modal - Overlay on mobile screens */}
      {selectedProspect && showDetail && (
        <div className="fixed inset-0 lg:hidden bg-black bg-opacity-50 z-50 flex flex-col">
          {/* Modal Header */}
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">
              {selectedProspect.prospect_name || 'Prospect'}
            </h2>
            <button
              onClick={() => {
                setShowDetail(false);
                setSelectedProspect(null);
              }}
              className="p-1 hover:bg-gray-100 rounded-lg transition"
            >
              <X size={24} className="text-gray-600" />
            </button>
          </div>

          {/* Modal Content - Scrollable */}
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="p-4 space-y-4">
              {/* Prospect Details */}
              <ProspectDetails prospect={selectedProspect} />

              {/* Chat Panel */}
              <div className="h-96">
                <ChatPanel prospect={selectedProspect} />
              </div>

              {/* Bottom padding for scroll space */}
              <div className="h-4"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
