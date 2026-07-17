const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(cors());
app.use(express.json());

// Safely parse a price string like "R 1,250,000" or "1250000.50" into a number.
function parsePriceValue(raw) {
  const cleaned = String(raw).replace(/[^0-9.]/g, '');
  // Remove all but the last decimal point to avoid malformed floats
  const parts = cleaned.split('.');
  const normalized = parts.length > 1
    ? parts.slice(0, -1).join('') + '.' + parts[parts.length - 1]
    : cleaned;
  const n = parseFloat(normalized);
  return isNaN(n) ? null : n;
}

// POST /api/properties/upload
// Accepts a multipart/form-data request with a "file" field containing a CSV file.
// Columns expected: property_id, address, price, bedrooms, bathrooms, property_type, description, image_url
app.post('/api/properties/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse CSV
    const csvText = req.file.buffer.toString('utf-8');
    const records = parse(csvText, { columns: true, skip_empty_lines: true });

    // Map CSV rows to database schema
    const properties = records.map((row) => ({
      property_id:   row.property_id   || null,
      address:       row.address        || '',
      price:         row.price          ? parsePriceValue(row.price) : null,
      bedrooms:      row.bedrooms       ? parseInt(row.bedrooms, 10) || null : null,
      bathrooms:     row.bathrooms      ? parseInt(row.bathrooms, 10) || null : null,
      property_type: row.property_type  || '',
      description:   row.description    || '',
      image_url:     row.image_url      || null,
    }));

    // Insert into Supabase
    const { data, error } = await supabase
      .from('properties')
      .insert(properties)
      .select();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      message: `${data.length} properties uploaded successfully`,
      count: data.length
    });

  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/properties
// Retrieve all properties
app.get('/api/properties', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('*');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Property API running on port ${PORT}`);
});
