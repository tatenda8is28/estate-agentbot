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
      return res.status(400).json({ error: 'No file uploaded. Send the CSV as form-data with field name "file".' });
    }

    const csvText = req.file.buffer.toString('utf-8');

    let records;
    try {
      records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        trim: true
      });
    } catch (parseErr) {
      return res.status(400).json({ error: `CSV parse error: ${parseErr.message}` });
    }

    if (!records.length) {
      return res.status(400).json({ error: 'CSV file contains no data rows.' });
    }

    const properties = records.map((row) => ({
      property_id:   row.property_id   || null,
      address:       row.address        || '',
      price:         row.price          ? parsePriceValue(row.price) : null,
      bedrooms:      row.bedrooms       ? parseInt(row.bedrooms, 10) || null : null,
      bathrooms:     row.bathrooms      ? parseInt(row.bathrooms, 10) || null : null,
      property_type: row.property_type  || '',
      description:   row.description    || '',
      image_url:     row.image_url      || ''
    }));

    const { data, error } = await supabase
      .from('properties')
      .insert(properties)
      .select();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({
      success: true,
      count: data.length,
      message: `Successfully imported ${data.length} propert${data.length === 1 ? 'y' : 'ies'}.`
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`🏠 Properties API running on http://localhost:${PORT}`);
});
