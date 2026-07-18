import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../supabase';
import Papa from 'papaparse';

export default function CSVUpload() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setMessage(null);

      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const data = results.data;

            if (!data || data.length === 0) {
              throw new Error('CSV is empty');
            }

            console.log('Parsed CSV data:', data);

            // Validate and transform data to match Supabase schema
            const properties = data
              .map((row) => {
                try {
                  // Extract price - remove all non-digits
                  const priceStr = row.price?.replace(/[^\d]/g, '') || '0';
                  const price = parseInt(priceStr) || 0;

                  // Parse bedrooms, bathrooms, garage
                  const bedrooms = parseFloat(row.bedrooms) || 0;
                  const bathrooms = parseFloat(row.bathroom) || 0;
                  
                  // Handle garage field (can be "72 m²" or just a number)
                  let garage = 0;
                  if (row.garage) {
                    const garageNum = parseFloat(row.garage);
                    garage = isNaN(garageNum) ? 0 : garageNum;
                  }

                  return {
                    property_url: row['image_url']?.[0] || '', // First URL column - property link
                    image_url: row['image_url']?.[1] || row.image_url || '', // Second URL column - image
                    price,
                    title: row.title?.trim() || '',
                    location: row.location?.trim() || '',
                    address: row.address?.trim() || '',
                    description: row.description?.trim() || '',
                    bedrooms,
                    bathrooms,
                    garage,
                    property_type: extractPropertyType(row.title),
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };
                } catch (rowErr) {
                  console.error('Error processing row:', row, rowErr);
                  return null;
                }
              })
              .filter(p => p !== null && p.title && p.address);

            if (properties.length === 0) {
              throw new Error('No valid properties found in CSV');
            }

            console.log('Transformed properties:', properties);

            // Insert directly into Supabase
            const { data: inserted, error } = await supabase
              .from('re_properties')
              .insert(properties)
              .select();

            if (error) {
              console.error('Supabase insert error:', error);
              throw new Error(error.message);
            }

            console.log('Successfully inserted:', inserted);
            setMessageType('success');
            setMessage(`✅ Successfully uploaded ${inserted.length} properties!`);
            e.target.value = '';
          } catch (err) {
            console.error('Processing error:', err);
            setMessageType('error');
            setMessage(`❌ Error: ${err.message}`);
          } finally {
            setLoading(false);
          }
        },
        error: (err) => {
          console.error('Parse error:', err);
          setMessageType('error');
          setMessage(`❌ CSV Parse Error: ${err.message}`);
          setLoading(false);
        }
      });
    } catch (err) {
      console.error('Upload error:', err);
      setMessageType('error');
      setMessage(`❌ Error: ${err.message}`);
      setLoading(false);
    }
  };

  const extractPropertyType = (title) => {
    if (!title) return 'House';
    const lower = title.toLowerCase();
    if (lower.includes('apartment')) return 'Apartment';
    if (lower.includes('townhouse')) return 'Townhouse';
    if (lower.includes('villa')) return 'Villa';
    if (lower.includes('plot')) return 'Plot';
    return 'House';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-8 max-w-md mx-auto">
      <div className="text-center">
        <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Upload size={32} className="text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Properties</h2>
        <p className="text-gray-600 text-sm mb-6">Upload a CSV file with property data from Property24</p>

        {/* File Input */}
        <label className="block">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            disabled={loading}
            className="hidden"
          />
          <div className={`border-2 border-dashed border-blue-300 rounded-lg p-8 cursor-pointer hover:border-blue-500 transition ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader size={24} className="animate-spin text-blue-600" />
              </div>
            ) : (
              <>
                <Upload size={32} className="mx-auto text-blue-600 mb-2" />
                <p className="font-medium text-gray-900">Click to upload CSV</p>
                <p className="text-xs text-gray-600 mt-1">or drag and drop</p>
              </>
            )}
          </div>
        </label>

        {/* Message */}
        {message && (
          <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${messageType === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
            {messageType === 'success' ? (
              <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <p className={`text-sm ${messageType === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {message}
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 text-left bg-gray-50 p-4 rounded-lg">
          <p className="text-xs font-semibold text-gray-900 mb-2">CSV Format Required:</p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Column 1: image_url (property link)</li>
            <li>• Column 2: image_url (image link)</li>
            <li>• price, title, location, address</li>
            <li>• description, bedrooms, bathroom, garage</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
