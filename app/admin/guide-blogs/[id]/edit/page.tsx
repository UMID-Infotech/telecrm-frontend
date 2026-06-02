// app/admin/guide-blogs/[id]/edit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import BlogForm from '@/components/guide-blogs/BlogForm';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api'; // ✅ FIX

export default function EditBlogPage() {
  const params = useParams();
  const id = params.id as string;
  const [blog, setBlog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFoundError, setNotFoundError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/guide-blogs/${id}`); // ✅ FIX
        setBlog(res.data);
      } catch {
        setNotFoundError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (notFoundError || !blog) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center text-slate-500">
        Blog not found or you don't have access.
      </div>
    );
  }

  return <BlogForm mode="edit" initialData={blog} />;
}