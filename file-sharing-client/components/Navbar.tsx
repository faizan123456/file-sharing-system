'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { logout } from '@/lib/api';

interface NavbarProps {
  username?: string;
}

export default function Navbar({ username }: NavbarProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    try {
      await logout();
    } catch {
      // ignore — always redirect
    } finally {
      setLoading(false);
      router.push('/login');
    }
  }

  return (
    <nav className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between shadow">
      <span className="font-semibold text-lg tracking-tight">FileShare</span>
      {username && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">
            👤 {username}
          </span>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="text-sm cursor-pointer bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-1.5 rounded transition"
          >
            {loading ? 'Logging out…' : 'Logout'}
          </button>
        </div>
      )}
    </nav>
  );
}
