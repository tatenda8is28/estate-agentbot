import React, { useState } from 'react';
import { Mail, Phone, MapPin, DollarSign, TrendingUp, Edit2, Check, X } from 'lucide-react';
import { supabase } from '../supabase';

export default function ProspectDetails({ prospect, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(prospect || {});
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('re_prospect_leads')
        .update({
          prospect_name: formData.prospect_name,
          target_budget: formData.target_budget,
          preferred_area: formData.preferred_area,
          lead_score: formData.lead_score,
          lead_stage: formData.lead_stage
        })
        .eq('id', prospect.id);

      if (error) throw error;
      
      setIsEditing(false);
      onUpdate?.(formData);
    } catch (error) {
      console.error('Error updating prospect:', error);
    } finally {
      setSaving(false);
    }
  };

  const scoreColors = {
    'Hot': 'bg-red-100 text-red-800 border-red-300',
    'Warm': 'bg-orange-100 text-orange-800 border-orange-300',
    'Cool': 'bg-blue-100 text-blue-800 border-blue-300',
    'Cold': 'bg-gray-100 text-gray-800 border-gray-300'
  };

  const stageColors = {
    'Discovery': 'bg-blue-50 border-blue-200',
    'Interested': 'bg-purple-50 border-purple-200',
    'Negotiating': 'bg-yellow-50 border-yellow-200',
    'Closed': 'bg-green-50 border-green-200'
  };

  if (!prospect) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500">Select a prospect to view details</p>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-lg border-2 ${stageColors[formData.lead_stage] || 'bg-gray-50'}`}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isEditing ? (
              <input
                type="text"
                name="prospect_name"
                value={formData.prospect_name || ''}
                onChange={handleChange}
                placeholder="Enter name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              formData.prospect_name || 'Unnamed Prospect'
            )}
          </h2>
          <p className="text-gray-600 mt-1">{formData.wa_number}</p>
        </div>
        <button
          onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
          className="p-2 hover:bg-white rounded-lg transition"
        >
          {isEditing ? (
            <X size={20} className="text-red-500" />
          ) : (
            <Edit2 size={20} className="text-blue-500" />
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Budget */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} className="text-green-600" />
            <label className="text-sm font-medium text-gray-700">Target Budget</label>
          </div>
          {isEditing ? (
            <input
              type="text"
              name="target_budget"
              value={formData.target_budget || ''}
              onChange={handleChange}
              placeholder="e.g., R1,500,000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-lg font-semibold text-gray-900">{formData.target_budget || 'Not specified'}</p>
          )}
        </div>

        {/* Area */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={18} className="text-red-600" />
            <label className="text-sm font-medium text-gray-700">Preferred Area</label>
          </div>
          {isEditing ? (
            <input
              type="text"
              name="preferred_area"
              value={formData.preferred_area || ''}
              onChange={handleChange}
              placeholder="e.g., Randburg"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-lg font-semibold text-gray-900">{formData.preferred_area || 'Not specified'}</p>
          )}
        </div>

        {/* Lead Score */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-blue-600" />
            <label className="text-sm font-medium text-gray-700">Lead Score</label>
          </div>
          {isEditing ? (
            <select
              name="lead_score"
              value={formData.lead_score || 'Cool'}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Hot</option>
              <option>Warm</option>
              <option>Cool</option>
              <option>Cold</option>
            </select>
          ) : (
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${scoreColors[formData.lead_score] || scoreColors['Cool']}`}>
              {formData.lead_score || 'Cool'}
            </span>
          )}
        </div>

        {/* Stage */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Phone size={18} className="text-purple-600" />
            <label className="text-sm font-medium text-gray-700">Lead Stage</label>
          </div>
          {isEditing ? (
            <select
              name="lead_stage"
              value={formData.lead_stage || 'Discovery'}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Discovery</option>
              <option>Interested</option>
              <option>Negotiating</option>
              <option>Closed</option>
            </select>
          ) : (
            <p className="text-lg font-semibold text-gray-900">{formData.lead_stage || 'Discovery'}</p>
          )}
        </div>
      </div>

      {/* Contact Info */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Phone size={18} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900">Contact Information</h3>
        </div>
        <div className="space-y-2 text-sm">
          <p><span className="font-medium">WhatsApp:</span> {formData.wa_number}</p>
          <p><span className="font-medium">Created:</span> {new Date(formData.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Check size={18} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setFormData(prospect);
            }}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 px-4 py-2 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
