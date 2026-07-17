import React, { useState, useEffect } from 'react';
import { Home, Upload, Bed, Bath, X, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../supabase';
import ViewingScheduler from '../components/ViewingScheduler';

// ─── Property Card ───────────────────────────────────────────────────────────

function PropertyCard({ property, onSchedule }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition flex flex-col">
      {/* Image */}
      <div className="h-48 bg-gray-100 relative flex-shrink-0">
        {property.image_url ? (
          <img
            src={property.image_url}
            alt={property.address}
            className="w-full h-full object-cover"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Home size={48} className="text-gray-300" />
          </div>
        )}
        {property.property_type && (
          <span className="absolute top-3 left-3 bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
            {property.property_type}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        <p className="font-bold text-gray-900 mb-1 truncate">{property.address}</p>
        <p className="text-xl font-black text-blue-600 mb-3">
          {property.price
            ? `R ${Number(property.price).toLocaleString('en-ZA')}`
            : 'Price on application'}
        </p>

        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
          {property.bedrooms != null && (
            <div className="flex items-center gap-1">
              <Bed size={15} />
              <span>{property.bedrooms} bed</span>
            </div>
          )}
          {property.bathrooms != null && (
            <div className="flex items-center gap-1">
              <Bath size={15} />
              <span>{property.bathrooms} bath</span>
            </div>
          )}
        </div>

        {property.description && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2 flex-1">{property.description}</p>
        )}

        <button
          onClick={() => onSchedule(property)}
          className="mt-auto w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
        >
          Schedule Viewing
        </button>
      </div>
    </div>
  );
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

function UploadModal({ onClose, onSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0] || null);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/properties/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (res.ok) {
        setResult({ success: true, message: json.message });
        setSelectedFile(null);
        onSuccess();
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

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl z-50 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Upload Properties CSV</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <p className="text-sm text-gray-500 mb-1">Expected CSV columns:</p>
        <p className="text-xs bg-gray-100 rounded px-3 py-2 font-mono text-gray-700 mb-4 break-all">
          property_id, address, price, bedrooms, bathrooms, property_type, description, image_url
        </p>

        {/* Drop zone */}
        <label className="block border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 transition mb-4">
          <Upload size={32} className="mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 mb-1">
            {selectedFile ? selectedFile.name : 'Click to choose a CSV file'}
          </p>
          <p className="text-xs text-gray-400">Only .csv files accepted</p>
          <input type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        </label>

        {result && (
          <div className={`flex items-start gap-2 p-3 rounded-lg mb-4 text-sm ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {result.success ? <CheckCircle size={18} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />}
            <p>{result.message}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading…
              </>
            ) : 'Upload'}
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Listings Page ────────────────────────────────────────────────────────────

export default function Listings() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [schedulingProperty, setSchedulingProperty] = useState(null);
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error) setProperties(data || []);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, [refreshCount]);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-30 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-bold text-gray-900 whitespace-nowrap">Property Listings</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">
              {properties.length} {properties.length === 1 ? 'property' : 'properties'}
            </span>
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition"
            >
              <Upload size={15} />
              Upload CSV
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Loading properties…</p>
            </div>
          </div>
        ) : properties.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Home size={64} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">No properties yet</h3>
              <p className="text-gray-500 mb-4">Upload a CSV file to add property listings</p>
              <button
                onClick={() => setShowUpload(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg transition"
              >
                Upload CSV
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {properties.map(property => (
              <PropertyCard
                key={property.id}
                property={property}
                onSchedule={setSchedulingProperty}
              />
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={() => { setRefreshCount(c => c + 1); }}
        />
      )}

      {/* Viewing Scheduler */}
      {schedulingProperty && (
        <ViewingScheduler
          property={schedulingProperty}
          onClose={() => setSchedulingProperty(null)}
        />
      )}
    </div>
  );
}
