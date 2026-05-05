'use client';

import { useState } from 'react';
import type { FileItem } from '@/types';
import { deleteFile } from '@/lib/api';

interface FileListProps {
  files: FileItem[];
  total: number;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onDeleted: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function FileList({
  files,
  total,
  page,
  limit,
  onPageChange,
  onDeleted,
}: FileListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const totalPages = Math.ceil(total / limit);
  const shareBase =
    typeof window !== 'undefined' ? `${window.location.origin}/share` : '/share';

  async function handleDelete(id: string) {
    if (!confirm('Delete this file?')) return;
    setError('');
    setDeletingId(id);
    try {
      await deleteFile(id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  }

  async function copyShareLink(publicId: string) {
    try {
      await navigator.clipboard.writeText(`${shareBase}/${publicId}`);
      setCopiedId(publicId);
      setTimeout(() => {
        setCopiedId((current) => (current === publicId ? null : current));
      }, 1800);
    } catch {
      setError('Unable to copy share link. Please copy it manually.');
    }
  }

  if (files.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-6 text-center text-gray-400 text-sm">
        No files uploaded yet.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your Files</h2>
        <span className="text-xs text-gray-400">{total} file{total !== 1 ? 's' : ''}</span>
      </div>

      {error && (
        <div className="mx-6 mt-4 p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}

      <ul className="divide-y">
        {files.map((f) => (
          <li key={f.id} className="px-6 py-4 flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{f.originalName}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatBytes(f.size)} · {formatDate(f.uploadedAt)}
                {f.expiryTime && (
                  <span className="ml-2 text-amber-500">
                    Expires {formatDate(f.expiryTime)}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => copyShareLink(f.publicId)}
                title="Copy share link"
                className="text-xs cursor-pointer bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded transition"
              >
                <span className="inline-flex items-center gap-1">
                  {copiedId === f.publicId ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-3.5 w-3.5"
                      aria-hidden="true"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                  {copiedId === f.publicId ? 'Copied' : 'Copy'}
                </span>
              </button>
              <a
                href={`${shareBase}/${f.publicId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 px-2.5 py-1.5 rounded transition"
              >
                <span className="inline-flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  >
                    <path d="M14 3h7v7" />
                    <path d="M10 14 21 3" />
                    <path d="M21 14v7h-7" />
                    <path d="M3 10V3h7" />
                    <path d="M3 21l7-7" />
                  </svg>
                  Share
                </span>
              </a>
              <button
                onClick={() => handleDelete(f.id)}
                disabled={deletingId === f.id}
                className="text-xs cursor-pointer bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 px-2.5 py-1.5 rounded transition"
              >
                <span className="inline-flex items-center gap-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  >
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                  {deletingId === f.id ? 'Deleting' : 'Delete'}
                </span>
              </button>
            </div>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="px-6 py-3 border-t flex items-center justify-between">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="text-sm cursor-pointer disabled:opacity-40 hover:text-blue-600 transition"
          >
            ← Prev
          </button>
          <span className="text-xs text-gray-400">
            Page {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="text-sm disabled:opacity-40 hover:text-blue-600 transition"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
