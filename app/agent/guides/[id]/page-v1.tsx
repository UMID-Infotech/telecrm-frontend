// app/agent/guides/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Clock,
  Tag,
  User,
} from 'lucide-react';
import TipTapEditor from '@/components/guide-blogs/TipTapEditor';
import { api } from '@/lib/api'; // ✅ FIX

interface GuideBlog {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverImageUrl?: string;
  status: string;
  visibleTo: string[];
  publishedAt?: string;
  tags: { id: string; name: string }[];
  createdByUser: { email: string; designation: string };
}

function estimateReadTime(jsonContent: string): number {
  try {
    const text = JSON.stringify(JSON.parse(jsonContent));
    return Math.max(1, Math.ceil(text.split(/\s+/).length / 200));
  } catch {
    return 1;
  }
}

export default function GuideViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [blog, setBlog] = useState<GuideBlog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBlog() {
      try {
        const res = await api.get(`/guide-blogs/${id}`); // ✅ FIX
        setBlog(res.data);
      } catch (e: any) {
        setError(
          e?.response?.data?.message ?? e?.message ?? 'Failed to load guide',
        );
      } finally {
        setIsLoading(false);
      }
    }
    fetchBlog();
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="p-6 bg-red-50 rounded-2xl border border-red-100 inline-block mb-6">
          <BookOpen className="h-10 w-10 text-red-400 mx-auto" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800 mb-2">
          {error ?? 'Guide not found'}
        </h2>
        <p className="text-slate-500 mb-6">
          You may not have permission to view this guide.
        </p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const readTime = estimateReadTime(blog.content);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-3xl mx-auto px-4 pt-8 pb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-slate-500 hover:text-slate-800 gap-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Guides
        </Button>
      </div>

      <article className="max-w-3xl mx-auto px-4 pb-20">
        {blog.coverImageUrl && (
          <div className="rounded-2xl overflow-hidden mb-8 shadow-lg aspect-video">
            <img
              src={blog.coverImageUrl}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {blog.visibleTo.map((v) => (
            <Badge
              key={v}
              className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
            >
              {v}
            </Badge>
          ))}
          {blog.status === 'PUBLISHED' && (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
              ● Published
            </Badge>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight mb-4">
          {blog.title}
        </h1>

        {blog.excerpt && (
          <p className="text-lg text-slate-600 leading-relaxed mb-6 border-l-4 border-slate-200 pl-4 italic">
            {blog.excerpt}
          </p>
        )}

        <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-8 pb-8 border-b border-slate-200">
          <div className="flex items-center gap-1.5">
            <User className="h-4 w-4" />
            <span>{blog.createdByUser.designation}</span>
          </div>
          {blog.publishedAt && (
            <div className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              <span>
                {new Date(blog.publishedAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{readTime} min read</span>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden">
          <TipTapEditor content={blog.content} editable={false} />
        </div>

        {blog.tags.length > 0 && (
          <div className="mt-10 pt-8 border-t border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-600">Tags</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {blog.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
