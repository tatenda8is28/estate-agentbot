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
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg md:text-2xl font-bold text-gray-900 flex-shrink-0">Real Estate CRM</h1>
          
          <div className="flex items-center gap-4 md:gap-6 flex-shrink-0">
            {/* View Toggle */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('pipeline')}
                className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded text-xs font-medium transition ${
                  viewMode === 'pipeline'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">Pipeline</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1 px-2 md:px-3 py-1.5 rounded text-xs font-medium transition ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List size={14} />
                <span className="hidden sm:inline">List</span>
              </button>
            </div>

            {/* Stats */}
            <div className="flex gap-3 md:gap-4 text-xs">
              <div className="text-right">
                <p className="text-gray-500 text-xs">Total</p>
                <p className="font-bold text-gray-900 text-sm">{prospects.length}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs">Hot</p>
                <p className={`font-bold text-sm ${hotLeadsCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {hotLeadsCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex gap-3 md:gap-4 p-3 md:p-4">
        
        {/* Pipeline/List */}
        <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow-sm border border-gray-200">
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

        {/* Sidebar - Desktop only */}
        {selectedProspect && (
          <div className="hidden lg:flex flex-col gap-3 w-80 flex-shrink-0">
            <div className="flex-1 overflow-y-auto rounded-lg bg-white shadow-sm border border-gray-200 p-4">
              <ProspectDetails
                prospect={selectedProspect}
                onUpdate={(updated) => setSelectedProspect(updated)}
              />
            </div>

            <div className="h-72 rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden">
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

          <div className="fixed bottom-0 left-0 right-0 lg:hidden z-50 bg-white rounded-t-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
              <h2 className="text-base font-bold text-gray-900 truncate">
                {selectedProspect.prospect_name || 'Prospect'}
              </h2>
              <button onClick={handleCloseDetail} className="p-1 hover:bg-gray-100 rounded-lg flex-shrink-0">
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <ProspectDetails prospect={selectedProspect} />
              <div className="h-96">
                <ChatPanel prospect={selectedProspect} />
              </div>
              <div className="h-4" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
