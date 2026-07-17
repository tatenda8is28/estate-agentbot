import React, { useState } from 'react';
import { LayoutGrid, List, X } from 'lucide-react';
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
      <div className="flex-1 overflow-hidden flex gap-4 p-4">
        
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

        {/* Desktop Sidebar */}
        {selectedProspect && (
          <div className="hidden lg:flex flex-col gap-4 w-96 min-h-0">
            {/* Details */}
            <div className="flex-1 overflow-y-auto min-h-0 rounded-lg bg-white shadow-sm">
              <ProspectDetails
                prospect={selectedProspect}
                onUpdate={(updated) => setSelectedProspect(updated)}
              />
            </div>

            {/* Chat */}
            <div className="h-80 rounded-lg bg-white shadow-sm overflow-hidden">
              <ChatPanel prospect={selectedProspect} />
            </div>
          </div>
        )}
      </div>

      {/* Mobile Modal */}
      {selectedProspect && showDetail && (
        <>
          <div 
            className="fixed inset-0 lg:hidden bg-black/30 z-40"
            onClick={handleCloseDetail}
          />

          <div className="fixed bottom-0 left-0 right-0 lg:hidden z-50 bg-white rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {selectedProspect.prospect_name || 'Prospect'}
              </h2>
              <button
                onClick={handleCloseDetail}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-4">
                <ProspectDetails prospect={selectedProspect} />
                <div className="h-96">
                  <ChatPanel prospect={selectedProspect} />
                </div>
                <div className="h-4" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
