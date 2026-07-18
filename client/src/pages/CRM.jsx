import React, { useState, useCallback } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import PipelineView from '../components/PipelineView';
import ProspectList from '../components/ProspectList';
import LeadModal from '../components/LeadModal';
import { useSupabaseRealtime } from '../useSupabaseRealtime';

export default function CRM() {
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [viewMode, setViewMode] = useState('pipeline');
  const { data: prospects, loading, refetch } = useSupabaseRealtime('re_prospect_leads');

  const handleSelectProspect = (prospect) => {
    setSelectedProspect(prospect);
  };

  const handleCloseModal = () => {
    setSelectedProspect(null);
  };

  const handleUpdateLead = useCallback((updatedLead) => {
    // Update selected prospect
    setSelectedProspect(updatedLead);
    // Refetch all prospects to update pipeline
    refetch();
  }, [refetch]);

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
    <div className="flex flex-col h-screen w-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Real Estate CRM</h1>
          
          <div className="flex items-center gap-4">
            {/* View Toggle */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('pipeline')}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition ${
                  viewMode === 'pipeline'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutGrid size={16} />
                Pipeline
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List size={16} />
                List
              </button>
            </div>

            {/* Stats */}
            <div className="flex gap-6 text-sm">
              <div>
                <p className="text-gray-600">Total</p>
                <p className="font-bold text-gray-900 text-lg">{prospects.length}</p>
              </div>
              <div>
                <p className="text-gray-600">Hot</p>
                <p className={`font-bold text-lg ${hotLeadsCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {hotLeadsCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="h-full rounded-lg bg-white shadow-sm border border-gray-200 overflow-hidden">
          {viewMode === 'pipeline' ? (
            <PipelineView 
              prospects={prospects}
              onSelectProspect={handleSelectProspect}
            />
          ) : (
            <ProspectList
              prospects={prospects}
              onSelectProspect={handleSelectProspect}
            />
          )}
        </div>
      </div>

      {/* Lead Modal */}
      {selectedProspect && (
        <LeadModal
          lead={selectedProspect}
          onClose={handleCloseModal}
          onUpdate={handleUpdateLead}
        />
      )}
    </div>
  );
}
