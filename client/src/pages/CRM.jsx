import React, { useState } from 'react';
import { LayoutGrid, List, X, ChevronLeft } from 'lucide-react';
import PipelineView from '../components/PipelineView';
import ProspectList from '../components/ProspectList';
import ChatPanel from '../components/ChatPanel';
import ProspectDetails from '../components/ProspectDetails';
import { useSupabaseRealtime } from '../useSupabaseRealtime';

export default function CRM() {
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [viewMode, setViewMode] = useState('pipeline');
  const [showDetail, setShowDetail] = useState(false);
  const { data: prospects, loading } = useSupabaseRealtime('re_prospect_leads');

  const handleSelectProspect = (prospect) => {
    setSelectedProspect(prospect);
    setShowDetail(true);
  };

  const handleCloseDetail = () => {
    setShowDetail(false);
    setTimeout(() => setSelectedProspect(null), 300);
  };

  const hotLeadsCount = prospects.filter(p => p.lead_score === 'Hot').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading prospects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Sticky Header */}
      <header className="bg-white border-b border-gray-200 px-3 sm:px-6 py-3 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Title */}
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Real Estate CRM</h1>
          
          <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6">
            {/* View Toggle */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('pipeline')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 rounded text-sm font-medium transition-all ${
                  viewMode === 'pipeline'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Pipeline View"
              >
                <LayoutGrid size={16} />
                <span className="hidden sm:inline">Pipeline</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 rounded text-sm font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="List View"
              >
                <List size={16} />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>

            {/* Quick Stats */}
            <div className="hidden sm:flex gap-4 text-sm border-l border-gray-200 pl-6">
              <div>
                <p className="text-gray-500 text-xs font-medium">Total</p>
                <p className="text-xl font-bold text-gray-900">{prospects.length}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium">Hot</p>
                <p className={`text-xl font-bold ${hotLeadsCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {hotLeadsCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex gap-4 p-4 max-w-7xl mx-auto w-full">
        
        {/* Primary View */}
        <div className="flex-1 overflow-y-auto min-w-0 rounded-lg bg-white shadow-sm">
          {viewMode === 'pipeline' ? (
            <PipelineView 
              prospects={prospects}
              onSelectProspect={handleSelectProspect}
            />
          ) : (
            <ProspectList
              prospects={prospects}
              selectedProspect={selectedProspect}
              onSelectProspect={handleSelectProspect}
            />
          )}
        </div>

        {/* Desktop Sidebar - Hidden on mobile/tablet */}
        {selectedProspect && (
          <div className="hidden lg:flex flex-col gap-4 w-96 min-h-0">
            {/* Details Card */}
            <div className="flex-1 overflow-y-auto min-h-0 rounded-lg bg-white shadow-sm">
              <ProspectDetails
                prospect={selectedProspect}
                onUpdate={(updated) => setSelectedProspect(updated)}
              />
            </div>

            {/* Chat Card */}
            <div className="h-80 rounded-lg bg-white shadow-sm overflow-hidden flex flex-col">
              <ChatPanel prospect={selectedProspect} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Modal - Slides up from bottom */}
      {selectedProspect && showDetail && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 lg:hidden bg-black/30 z-40 transition-opacity duration-200"
            onClick={handleCloseDetail}
          />

          {/* Modal */}
          <div className="fixed bottom-0 left-0 right-0 lg:hidden z-50 bg-white rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-lg font-bold text-gray-900 truncate pr-4">
                {selectedProspect.prospect_name || 'Prospect'}
              </h2>
              <button
                onClick={handleCloseDetail}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* Prospect Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <ProspectDetails prospect={selectedProspect} />
                </div>

                {/* Chat Panel */}
                <div className="h-96 bg-gray-50 rounded-lg overflow-hidden">
                  <ChatPanel prospect={selectedProspect} />
                </div>

                {/* Safe scroll padding */}
                <div className="h-4" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
