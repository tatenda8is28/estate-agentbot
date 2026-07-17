import React, { useState, useEffect } from 'react';
import { Upload, Calendar, Search, Grid } from 'lucide-react';
import { supabase } from '../supabase';
import ViewingScheduler from '../components/ViewingScheduler';

export default function Listings() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showScheduler, setShowScheduler] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch properties on mount
  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('re_properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (err) {
      console.error('Error fetching properties:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setResult(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('http://localhost:3001/api/properties/upload', {
        method: 'POST',
        body: formData
      });

      const json = await response.json();

      if (response.ok) {
        setResult({ success: true, message: json.message });
        fetchProperties();
      } else {
        setResult({ success: false, message: json.error });
      }
    } catch (err) {
      console.error('CSV upload error:', err);
      setResult({ success: false, message: 'Upload failed. Make sure the API server is running on port 3001.' });
    } finally {
      setUploading(false);
    }
  };

  const filteredProperties = properties.filter(p =>
    p.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.property_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading properties...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Property Listings</h1>
          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition">
            <Upload size={18} />
            <span>{uploading ? 'Uploading...' : 'Upload CSV'}</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} disabled={uploading} className="hidden" />
          </label>
        </div>

        {result && (
          <div className={`p-3 rounded-lg ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {result.message}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by address or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredProperties.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Grid size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-600 font-medium">No properties found</p>
            <p className="text-gray-500 text-sm mt-1">Upload a CSV file to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <div key={property.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition overflow-hidden">
                {/* Image */}
                {property.image_url && (
                  <img src={property.image_url} alt={property.address} className="w-full h-48 object-cover" />
                )}

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{property.address}</h3>
                  
                  {property.property_type && (
                    <p className="text-sm text-gray-600 mb-2">{property.property_type}</p>
                  )}

                  {/* Price */}
                  {property.price && (
                    <p className="text-xl font-bold text-blue-600 mb-3">
                      R {parseFloat(property.price).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}
                    </p>
                  )}

                  {/* Specs */}
                  <div className="flex gap-4 text-sm text-gray-600 mb-4">
                    {property.bedrooms && <span>🛏️ {property.bedrooms} bed</span>}
                    {property.bathrooms && <span>🚿 {property.bathrooms} bath</span>}
                  </div>

                  {property.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">{property.description}</p>
                  )}

                  {/* Schedule Button */}
                  <button
                    onClick={() => {
                      setSelectedProperty(property);
                      setShowScheduler(true);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    <Calendar size={18} />
                    Schedule Viewing
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scheduler Modal */}
      {showScheduler && selectedProperty && (
        <ViewingScheduler
          property={selectedProperty}
          onClose={() => {
            setShowScheduler(false);
            setSelectedProperty(null);
          }}
        />
      )}
    </div>
  );
}
