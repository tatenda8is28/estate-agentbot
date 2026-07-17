import React, { useState } from 'react';
import { Users, Search, Filter, TrendingUp } from 'lucide-react';

export default function ProspectList({ prospects, selectedProspect, onSelectProspect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStage, setFilterStage] = useState('All');
  const [filterScore, setFilterScore] = useState('All');

  const filteredProspects = prospects.filter(p => {
    const matchesSearch = 
      (p.prospect_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      p.wa_number.includes(searchTerm);
    
    const matchesStage = filterStage === 'All' || p.lead_stage === filterStage;
    const matchesScore = filterScore === 'All' || p.lead_score === filterScore;

    return matchesSearch && matchesStage && matchesScore;
  });

  const scoreColors = {
    'Hot': 'bg-red-100 text-red-800',
    'Warm': 'bg-orange-100 text-orange-800',
    'Cool': 'bg-blue-100 text-blue-800',
    'Cold': 'bg-gray-100 text-gray-800'
  };

  const stageColors = {
    'Discovery': 'border-l-4 border-l-blue-500',
    'Interested': 'border-l-4 border-l-purple-500',
    'Negotiating': 'border-l-4 border-l-yellow-500',
    'Closed': 'border-l-4 border-l-green-500'
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar - Filters */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-20">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Filter size={18} />
            Filters
          </h3>

          {/* Search */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Name or WhatsApp"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Stage Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Stage</label>
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option>All</option>
              <option>Discovery</option>
              <option>Interested</option>
              <option>Negotiating</option>
              <option>Closed</option>
            </select>
          </div>

          {/* Score Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Lead Score</label>
            <select
              value={filterScore}
              onChange={(e) => setFilterScore(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option>All</option>
              <option>Hot</option>
              <option>Warm</option>
              <option>Cool</option>
              <option>Cold</option>
            </select>
          </div>

          {/* Results Count */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">{filteredProspects.length}</span> prospect{filteredProspects.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="lg:col-span-3">
        {filteredProspects.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 font-medium">No prospects found</p>
            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProspects.map((prospect) => (
              <div
                key={prospect.id}
                onClick={() => onSelectProspect(prospect)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                  selectedProspect?.id === prospect.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${stageColors[prospect.lead_stage] || ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">
                      {prospect.prospect_name || 'Unnamed Prospect'}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">{prospect.wa_number}</p>
                    
                    {prospect.preferred_area && (
                      <p className="text-sm text-gray-600 mt-1">
                        📍 {prospect.preferred_area}
                      </p>
                    )}

                    {prospect.target_budget && (
                      <p className="text-sm text-gray-600">
                        💰 {prospect.target_budget}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    {/* Lead Score Badge */}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${scoreColors[prospect.lead_score] || scoreColors['Cool']}`}>
                      {prospect.lead_score}
                    </span>

                    {/* Stage Badge */}
                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {prospect.lead_stage}
                    </span>

                    {/* Created Date */}
                    <p className="text-xs text-gray-500">
                      {new Date(prospect.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
