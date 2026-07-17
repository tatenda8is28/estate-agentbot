import React from 'react';
import { GripHorizontal, Users } from 'lucide-react';

export default function PipelineView({ prospects, onSelectProspect }) {
  const stages = ['Discovery', 'Interested', 'Negotiating', 'Closed'];

  const scoreColors = {
    'Hot': 'bg-red-100 text-red-800 border-red-200',
    'Warm': 'bg-orange-100 text-orange-800 border-orange-200',
    'Cool': 'bg-blue-100 text-blue-800 border-blue-200',
    'Cold': 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const stageHeaderColors = {
    'Discovery': 'from-blue-600 to-blue-700',
    'Interested': 'from-purple-600 to-purple-700',
    'Negotiating': 'from-yellow-600 to-yellow-700',
    'Closed': 'from-green-600 to-green-700'
  };

  const getProspectsForStage = (stage) => {
    return prospects.filter(p => p.lead_stage === stage);
  };

  const getStageCounts = () => {
    return stages.map(stage => ({
      stage,
      count: getProspectsForStage(stage).length
    }));
  };

  return (
    <div className="flex flex-col h-full">
      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 p-4">
        {getStageCounts().map(({ stage, count }) => (
          <div key={stage} className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600">{stage}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 px-4 flex-1">
        {stages.map(stage => (
          <div
            key={stage}
            className="flex-shrink-0 w-80 bg-gray-50 rounded-lg border border-gray-200 flex flex-col"
          >
            {/* Stage Header */}
            <div className={`bg-gradient-to-r ${stageHeaderColors[stage]} text-white p-4 rounded-t-lg`}>
              <h3 className="font-semibold text-lg">{stage}</h3>
              <p className="text-sm text-white text-opacity-90 mt-1">
                {getProspectsForStage(stage).length} prospect{getProspectsForStage(stage).length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Cards Container */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {getProspectsForStage(stage).length === 0 ? (
                <div className="flex items-center justify-center h-32 text-gray-400">
                  <p className="text-sm">No prospects</p>
                </div>
              ) : (
                getProspectsForStage(stage).map(prospect => (
                  <div
                    key={prospect.id}
                    onClick={() => onSelectProspect(prospect)}
                    className="bg-white p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md hover:scale-105 transition cursor-pointer"
                  >
                    <div className="flex gap-2">
                      <GripHorizontal size={16} className="text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 text-sm truncate">
                          {prospect.prospect_name || 'Unnamed'}
                        </h4>
                        
                        <p className="text-xs text-gray-600 mt-1 truncate">
                          {prospect.wa_number}
                        </p>

                        {prospect.preferred_area && (
                          <p className="text-xs text-gray-600 mt-1">
                            📍 {prospect.preferred_area}
                          </p>
                        )}

                        <div className="flex gap-2 mt-2">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${scoreColors[prospect.lead_score] || scoreColors['Cool']}`}>
                            {prospect.lead_score}
                          </span>
                          {prospect.target_budget && (
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                              💰
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {prospects.length === 0 && (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 font-medium">No prospects yet</p>
            <p className="text-gray-500 text-sm mt-1">Prospects will appear here as they contact you on WhatsApp</p>
          </div>
        </div>
      )}
    </div>
  );
}
