'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { getSharedFile } from '@/lib/api';
import type { FileItem } from '@/types';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function SharePage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = use(params);
  const [signedUrl, setSignedUrl] = useState('');
  const [file, setFile] = useState<FileItem | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSharedFile(publicId)
      .then((res) => {
        setSignedUrl(res.data.url);
        setFile(res.data.file);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'File not found or link expired');
      })
      .finally(() => setLoading(false));
  }, [publicId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Loading…
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-medium text-lg mb-2">
            {error || 'File not available'}
          </p>
          <p className="text-gray-400 text-sm">
            This link may have expired or does not exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-xl shadow p-8">
        <h1 className="text-xl font-bold mb-6 text-center">Shared File</h1>

        <div className="space-y-3 mb-8">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Name</span>
              <span className="font-medium truncate max-w-[200px]">
                {file.originalName}
              </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Size</span>
            <span>{formatBytes(file.size)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Type</span>
            <span>{file.mimeType}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Uploaded</span>
            <span>{formatDate(file.uploadedAt)}</span>
          </div>
          {file.expiryTime && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Expires</span>
              <span className="text-amber-500">{formatDate(file.expiryTime)}</span>
            </div>
          )}
        </div>

        <a
          href={signedUrl}
          download={file.originalName}
          className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded font-medium transition"
        >
          Download
        </a>
      </div>
    </div>
  );
}
