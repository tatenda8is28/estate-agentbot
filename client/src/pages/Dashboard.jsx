import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, MessageSquare, MapPin, TrendingDown } from 'lucide-react';
import { supabase } from '../supabase';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeSessions: 0,
    avgLeadScore: 0,
    topArea: '',
    conversionRate: 0,
    interactions: 0,
  });
  const [recentLeads, setRecentLeads] = useState([]);
  const [topAreas, setTopAreas] = useState([]);
  const [leadStages, setLeadStages] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch leads
      const { data: leads, error: leadsError } = await supabase
        .from('re_prospect_leads')
        .select('*');

      if (leadsError) throw leadsError;

      // Fetch interactions
      const { data: interactions, error: interError } = await supabase
        .from('re_interaction_logs')
        .select('*');

      if (interError) throw interError;

      // Calculate stats
      if (leads && leads.length > 0) {
        const leadScores = leads
          .map(l => {
            if (l.lead_score === 'Hot') return 3;
            if (l.lead_score === 'Warm') return 2;
            if (l.lead_score === 'Cool') return 1;
            return 0;
          })
          .filter(s => s > 0);

        const avgScore = leadScores.length > 0 ? (leadScores.reduce((a, b) => a + b, 0) / leadScores.length).toFixed(1) : 0;

        // Get top areas
        const areaCount = {};
        leads.forEach(l => {
          if (l.preferred_area) {
            areaCount[l.preferred_area] = (areaCount[l.preferred_area] || 0) + 1;
          }
        });
        const topArea = Object.keys(areaCount).sort((a, b) => areaCount[b] - areaCount[a])[0];

        // Count lead stages
        const stageCount = {};
        leads.forEach(l => {
          if (l.lead_stage) {
            stageCount[l.lead_stage] = (stageCount[l.lead_stage] || 0) + 1;
          }
        });

        setStats({
          totalLeads: leads.length,
          activeSessions: leads.filter(l => l.lead_stage === 'Discovery').length,
          avgLeadScore: avgScore,
          topArea: topArea || 'N/A',
          conversionRate: ((leads.filter(l => l.lead_stage === 'Qualified').length / leads.length) * 100).toFixed(1),
          interactions: interactions?.length || 0,
        });

        setRecentLeads(leads.slice(0, 5));

        // Format top areas for chart
        const areasArray = Object.entries(areaCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
        setTopAreas(areasArray);
        setLeadStages(stageCount);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderColor: color }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        </div>
        <div className="p-3 rounded-lg" style={{ backgroundColor: color + '20' }}>
          <Icon size={28} style={{ color }} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-auto p-8 bg-gradient-to-br from-[#F8FAFC] to-[#E8EAEE]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Performance Analytics</h1>
          <p className="text-gray-600 mt-2">Real estate lead management insights</p>
        </div>

        {/* Stats Grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard
              icon={Users}
              label="Total Leads"
              value={stats.totalLeads}
              color="#3B82F6"
            />
            <StatCard
              icon={MessageSquare}
              label="Total Interactions"
              value={stats.interactions}
              color="#10B981"
            />
            <StatCard
              icon={TrendingUp}
              label="Avg Lead Score"
              value={stats.avgLeadScore}
              color="#F59E0B"
            />
            <StatCard
              icon={MapPin}
              label="Top Area"
              value={stats.topArea}
              color="#8B5CF6"
            />
            <StatCard
              icon={TrendingUp}
              label="Active Sessions"
              value={stats.activeSessions}
              color="#EC4899"
            />
            <StatCard
              icon={TrendingDown}
              label="Conversion Rate"
              value={`${stats.conversionRate}%`}
              color="#06B6D4"
            />
          </div>
        )}

        {/* Charts & Tables Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Areas Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Top Areas</h2>
            <div className="space-y-3">
              {topAreas.map(([area, count]) => (
                <div key={area}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 font-medium">{area}</span>
                    <span className="text-gray-600">{count} leads</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${(count / (topAreas[0]?.[1] || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Lead Stages */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Lead Stages</h2>
            <div className="space-y-3">
              {Object.entries(leadStages).map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">{stage}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-600 h-2 rounded-full"
                        style={{
                          width: `${(count / stats.totalLeads) * 100}%`,
                        }}
                      ></div>
                    </div>
                    <span className="text-gray-600 text-sm w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Leads Table */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Leads</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Lead</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Area</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Stage</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Score</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 text-gray-900 font-medium">{lead.prospect_name || 'Unknown'}</td>
                    <td className="py-3 px-4 text-gray-600">{lead.preferred_area || 'N/A'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        lead.lead_stage === 'Qualified'
                          ? 'bg-green-100 text-green-800'
                          : lead.lead_stage === 'Discovery'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {lead.lead_stage}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        lead.lead_score === 'Hot'
                          ? 'bg-red-100 text-red-800'
                          : lead.lead_score === 'Warm'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {lead.lead_score}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
