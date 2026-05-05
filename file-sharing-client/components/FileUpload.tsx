'use client';

import { useRef, useState } from 'react';
import { uploadFile } from '@/lib/api';

interface FileUploadProps {
  onUploaded: () => void;
}

export default function FileUpload({ onUploaded }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [expiryTime, setExpiryTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError('');
    setSuccess('');
    setFile(e.target.files?.[0] ?? null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError('Please select a file.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await uploadFile(file, expiryTime || undefined);
      setSuccess('File uploaded successfully!');
      setFile(null);
      setExpiryTime('');
      if (inputRef.current) inputRef.current.value = '';
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Upload File</h2>

      {error && (
        <div className="mb-3 p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-3 p-3 text-sm bg-green-50 border border-green-200 text-green-700 rounded">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">File</label>
          <input
            ref={inputRef}
            type="file"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {file && (
            <p className="mt-1 text-xs text-gray-500">
              {file.name} — {(file.size / 1024).toFixed(1)} KB
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">
            Expiry (optional)
          </label>
          <input
            type="datetime-local"
            value={expiryTime}
            onChange={(e) => setExpiryTime(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !file}
          className="bg-blue-600 cursor-pointer hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded font-medium text-sm transition"
        >
          {loading ? 'Uploading…' : 'Upload'}
        </button>
      </form>
    </div>
  );
}
