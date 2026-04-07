import React, { useState, useRef } from 'react';
import api from '../utils/axiosConfig';
import './CSVImporter.css';

interface CSVRow {
  name: string;
  category: string;
  price: string;
  description: string;
  sizes: string;
  image_url: string;
}

interface CSVImporterProps {
  onImportComplete: () => void;
  onClose: () => void;
}

const VALID_CATEGORIES = ['shoes', 'official', 'casual', 'sneakers', 'boots', 'sandals', 'others'];
const REQUIRED_COLS = ['name', 'price'];

const parseCSV = (text: string): CSVRow[] => {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim());
    const row: any = {};
    headers.forEach((h, i) => { row[h] = vals[i] || ''; });
    return {
      name: row.name || '',
      category: row.category || 'shoes',
      price: row.price || '0',
      description: row.description || '',
      sizes: row.sizes || '',
      image_url: row.image_url || ''
    };
  }).filter(r => r.name.trim());
};

const CSVImporter: React.FC<CSVImporterProps> = ({ onImportComplete, onClose }) => {
  const [rows, setRows] = useState<CSVRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [parseError, setParseError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.csv')) { setParseError('Please select a .csv file'); return; }
    setFileName(file.name);
    setParseError('');
    setResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target?.result as string);
        if (parsed.length === 0) { setParseError('No valid rows found. Check the file has a header row and data.'); return; }
        setRows(parsed);
      } catch { setParseError('Failed to parse CSV file.'); }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const res = await api.post('/products/bulk', { products: rows });
      setResult(res.data);
      if (res.data.imported > 0) onImportComplete();
    } catch (err: any) {
      setParseError(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'name,category,price,description,sizes,image_url\nAir Max 90,sneakers,4500,Classic Nike sneakers,36:37:38:39:40,\nLeather Oxford,official,6500,Formal leather shoes,39:40:41:42,';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'products_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content csv-importer" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import Products from CSV</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {!result ? (
          <>
            <div className="csv-instructions">
              <p>Upload a CSV file with columns: <code>name</code>, <code>category</code>, <code>price</code>, <code>description</code>, <code>sizes</code>, <code>image_url</code></p>
              <p>Sizes: comma-separated numbers (e.g. <code>36,37,38,39</code>). Only <code>name</code> and <code>price</code> are required.</p>
              <p>Valid categories: {VALID_CATEGORIES.join(', ')}</p>
              <button onClick={downloadTemplate} className="btn btn-outline btn-sm">
                Download Template CSV
              </button>
            </div>

            <div className="csv-upload-area">
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                style={{ display: 'none' }}
              />
              <button className="btn btn-outline" onClick={() => fileRef.current?.click()}>
                {fileName ? `📄 ${fileName}` : '📂 Choose CSV File'}
              </button>
            </div>

            {parseError && <div className="alert alert-error">{parseError}</div>}

            {rows.length > 0 && (
              <>
                <div className="csv-preview">
                  <p className="csv-preview-label">{rows.length} products ready to import:</p>
                  <div className="csv-table-wrap">
                    <table className="csv-table">
                      <thead>
                        <tr>
                          <th>Name</th><th>Category</th><th>Price</th><th>Sizes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 10).map((r, i) => (
                          <tr key={i}>
                            <td>{r.name}</td>
                            <td>{r.category}</td>
                            <td>KSh {Number(r.price).toLocaleString()}</td>
                            <td>{r.sizes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {rows.length > 10 && <p className="csv-more">...and {rows.length - 10} more</p>}
                  </div>
                </div>

                <div className="form-actions">
                  <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                  <button onClick={handleImport} disabled={importing} className="btn btn-primary">
                    {importing ? 'Importing...' : `Import ${rows.length} Products`}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="csv-result">
            <div className="result-icon">{result.imported > 0 ? '✅' : '⚠️'}</div>
            <h3>Import Complete</h3>
            <p><strong>{result.imported}</strong> products imported successfully.</p>
            {result.skipped > 0 && <p><strong>{result.skipped}</strong> skipped (plan limit or errors).</p>}
            {result.errors.length > 0 && (
              <div className="csv-errors">
                <p>Failed rows: {result.errors.join(', ')}</p>
              </div>
            )}
            <div className="form-actions">
              <button onClick={onClose} className="btn btn-primary">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CSVImporter;
