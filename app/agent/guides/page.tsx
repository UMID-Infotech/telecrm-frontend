// app/agent/guides/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, CalendarDays, Search, Tag } from 'lucide-react';
import { api } from '@/lib/api'; // ✅ FIX

interface BlogTag {
  id: string;
  name: string;
}
interface GuideBlog {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  coverImageUrl?: string;
  visibleTo: string[];
  publishedAt?: string;
  tags: BlogTag[];
}

function BlogCard({ blog }: { blog: GuideBlog }) {
  return (
    <Link href={`/agent/guides/${blog.id}`} className="group block">
      <article className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200">
        {blog.coverImageUrl ? (
          <div className="aspect-video overflow-hidden">
            <img
              src={blog.coverImageUrl}
              alt={blog.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-slate-300" />
          </div>
        )}

        <div className="p-5">
          <div className="flex gap-1.5 mb-3">
            {blog.visibleTo.map((v) => (
              <Badge
                key={v}
                className="text-xs bg-blue-50 text-blue-600 border-blue-200"
              >
                {v}
              </Badge>
            ))}
          </div>

          <h2 className="font-semibold text-slate-900 text-lg leading-snug mb-2 group-hover:text-blue-700 transition-colors line-clamp-2">
            {blog.title}
          </h2>

          {blog.excerpt && (
            <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-4">
              {blog.excerpt}
            </p>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <div className="flex items-center gap-3 text-xs text-slate-400">
              {blog.publishedAt && (
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {new Date(blog.publishedAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </div>
              )}
            </div>

            {blog.tags.length > 0 && (
              <div className="flex items-center gap-1">
                <Tag className="h-3.5 w-3.5 text-slate-300" />
                <span className="text-xs text-slate-400 line-clamp-1 max-w-[100px]">
                  {blog.tags
                    .slice(0, 2)
                    .map((t) => t.name)
                    .join(', ')}
                  {blog.tags.length > 2 && ` +${blog.tags.length - 2}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

function BlogCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <Skeleton className="aspect-video w-full" />
      <div className="p-5 space-y-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}

export default function GuideBlogsPage() {
  const [blogs, setBlogs] = useState<GuideBlog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchBlogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);

      const res = await api.get(`/guide-blogs?${params}`); // ✅ FIX
      setBlogs(res.data);
    } catch {
      setBlogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchBlogs, 300);
    return () => clearTimeout(t);
  }, [fetchBlogs]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-slate-900 rounded-xl">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Team Guides
              </h1>
              <p className="text-slate-500">
                Knowledge base and training resources for your role
              </p>
            </div>
          </div>
        </div>

        <div className="relative max-w-xl mb-8">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guides..."
            className="pl-10 bg-white border-slate-200 focus:border-slate-400 rounded-xl shadow-sm h-11"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <BlogCardSkeleton key={i} />
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-24">
            <div className="p-6 bg-slate-100 rounded-full w-fit mx-auto mb-5">
              <BookOpen className="h-10 w-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-700 mb-2">
              No guides available
            </h2>
            <p className="text-slate-500">
              {search
                ? 'No guides match your search. Try different keywords.'
                : "Your admin hasn't published any guides yet."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">
              {blogs.length} guide{blogs.length !== 1 ? 's' : ''} available
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map((blog) => (
                <BlogCard key={blog.id} blog={blog} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
