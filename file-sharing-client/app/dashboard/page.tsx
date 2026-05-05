'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getMe, listFiles } from '@/lib/api';
import type { FileItem, User } from '@/types';
import Navbar from '@/components/Navbar';
import FileUpload from '@/components/FileUpload';
import FileList from '@/components/FileList';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filesError, setFilesError] = useState('');

  useEffect(() => {
    getMe()
      .then((res) => setUser(res.data.user))
      .catch(() => router.push('/login'))
      .finally(() => setLoadingAuth(false));
  }, [router]);

  const fetchFiles = useCallback(
    async (p: number) => {
      setLoadingFiles(true);
      setFilesError('');
      try {
        const res = await listFiles(p, limit);
        setFiles(res.data.list);
        setTotal(res.data.total);
        setPage(res.data.page);
      } catch (err) {
        setFilesError(err instanceof Error ? err.message : 'Failed to load files');
      } finally {
        setLoadingFiles(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    if (!loadingAuth && user) {
      void fetchFiles(1);
    }
  }, [loadingAuth, user, fetchFiles]);

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Authenticating…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar username={user?.username} />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <FileUpload onUploaded={() => void fetchFiles(1)} />

        {filesError && (
          <div className="p-3 text-sm bg-red-50 border border-red-200 text-red-700 rounded">
            {filesError}
          </div>
        )}

        {loadingFiles ? (
          <div className="text-center text-gray-400 text-sm py-8">
            Loading files…
          </div>
        ) : (
          <FileList
            files={files}
            total={total}
            page={page}
            limit={limit}
            onPageChange={(p) => void fetchFiles(p)}
            onDeleted={() => void fetchFiles(page)}
          />
        )}
      </main>
    </div>
  );
}
