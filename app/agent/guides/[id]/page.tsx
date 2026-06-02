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
  Eye,
} from 'lucide-react';
import TipTapEditor from '@/components/guide-blogs/TipTapEditor';
import { api } from '@/lib/api';

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

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function GuideViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [blog, setBlog] = useState<GuideBlog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    async function fetchBlog() {
      try {
        const res = await api.get(`/guide-blogs/${id}`);
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
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-72 w-full rounded-3xl" />
          <div className="space-y-3 pt-4">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-10 w-3/4 rounded-xl" />
            <Skeleton className="h-5 w-full rounded-xl" />
            <Skeleton className="h-5 w-5/6 rounded-xl" />
          </div>
          <Skeleton className="h-[500px] w-full rounded-3xl" />
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-red-100">
            <BookOpen className="h-9 w-9 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2 tracking-tight">
            Guide unavailable
          </h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            {error ??
              'This guide could not be found or you may not have permission to view it.'}
          </p>
          <Button
            onClick={() => router.back()}
            className="bg-slate-900 hover:bg-slate-700 text-white rounded-xl px-6 h-11 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
        </div>
      </div>
    );
  }

  const readTime = estimateReadTime(blog.content);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sticky top bar */}
      <div
        className={`sticky top-0 z-30 transition-all duration-300 ${
          scrolled
            ? 'bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors group"
          >
            <span className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
            </span>
            <span
              className={`transition-opacity duration-200 ${scrolled ? 'opacity-100' : 'opacity-0'}`}
            >
              {blog.title.length > 40
                ? blog.title.slice(0, 40) + '…'
                : blog.title}
            </span>
          </button>

          {scrolled && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              <span>{readTime} min read</span>
            </div>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-0">
        {blog.coverImageUrl ? (
          <div className="relative rounded-3xl overflow-hidden mb-10 aspect-[2/1] shadow-xl shadow-slate-200">
            <img
              src={blog.coverImageUrl}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay at bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>
        ) : (
          <div className="relative rounded-3xl overflow-hidden mb-10 aspect-[3/1] bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 flex items-center justify-center shadow-xl shadow-slate-200">
            <BookOpen className="h-16 w-16 text-white/20" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.15)_0%,_transparent_60%)]" />
          </div>
        )}
      </div>

      {/* Article */}
      <article className="max-w-4xl mx-auto px-4 pb-24">
        {/* Visibility + status pills */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {blog.visibleTo.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
            >
              <Eye className="h-3 w-3" />
              {v}
            </span>
          ))}
          {blog.status === 'PUBLISHED' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Published
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-bold text-slate-900 tracking-tight leading-[1.2] mb-5">
          {blog.title}
        </h1>

        {/* Excerpt */}
        {blog.excerpt && (
          <p className="text-xl text-slate-500 leading-relaxed mb-8 font-normal">
            {blog.excerpt}
          </p>
        )}

        {/* Author bar */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 py-5 border-y border-slate-200 mb-10">
          {/* Author */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-bold">
              {getInitials(blog.createdByUser.designation)}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 leading-none mb-0.5">
                {blog.createdByUser.designation}
              </p>
              <p className="text-xs text-slate-400">
                {blog.createdByUser.email}
              </p>
            </div>
          </div>

          <div className="hidden sm:block w-px h-6 bg-slate-200" />

          {/* Date */}
          {blog.publishedAt && (
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              {new Date(blog.publishedAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          )}

          <div className="hidden sm:block w-px h-6 bg-slate-200" />

          {/* Read time */}
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Clock className="h-4 w-4 text-slate-400" />
            {readTime} min read
          </div>
        </div>

        {/* Content */}
        <div className="prose-container bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-10 shadow-sm shadow-slate-100">
          <TipTapEditor content={blog.content} editable={false} />
        </div>

        {/* Tags */}
        {blog.tags.length > 0 && (
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-slate-400 mr-1">
              <Tag className="h-4 w-4" />
              <span>Tags</span>
            </div>
            {blog.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-3.5 py-1.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-default"
              >
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Bottom back button */}
        <div className="mt-16 pt-8 border-t border-slate-200">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors group"
          >
            <span className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
            </span>
            Back to all guides
          </button>
        </div>
      </article>
    </div>
  );
}
