//components/guide-blogs/BlogForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BlogStatus, BlogVisibility } from '@/types/blog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  BookOpen,
  Eye,
  Loader2,
  Plus,
  Save,
  Send,
  Tag,
  X,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import TipTapEditor from './TipTapEditor';
import { api } from '@/lib/api'; // ✅ FIX: use axios instance with JWT interceptor

interface GuideBlog {
  id: string;
  title: string;
  excerpt?: string;
  content: string;
  coverImageUrl?: string;
  status: BlogStatus;
  visibleTo: BlogVisibility[];
  tags: { id: string; name: string }[];
}

interface BlogFormProps {
  initialData?: GuideBlog;
  mode: 'create' | 'edit';
}

export default function BlogForm({ initialData, mode }: BlogFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialData?.title ?? '');
  const [excerpt, setExcerpt] = useState(initialData?.excerpt ?? '');
  const [content, setContent] = useState(initialData?.content ?? '');
  const [coverImageUrl, setCoverImageUrl] = useState(
    initialData?.coverImageUrl ?? '',
  );
const [status, setStatus] = useState<BlogStatus>(
  initialData?.status ?? BlogStatus.DRAFT,
);
  const [visibleTo, setVisibleTo] = useState<BlogVisibility[]>(
    initialData?.visibleTo ?? [],
  );
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(
    initialData?.tags.map((t) => t.name) ?? [],
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // ── Visibility checkboxes ─────────────────────────────────────
  const toggleVisibility = (level: BlogVisibility) => {
    setIsDirty(true);
    setVisibleTo((prev) =>
      prev.includes(level) ? prev.filter((v) => v !== level) : [...prev, level],
    );
  };

  // ── Tags ──────────────────────────────────────────────────────
  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags((prev) => [...prev, t]);
      setTagInput('');
      setIsDirty(true);
    }
  };

  const removeTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
    setIsDirty(true);
  };

  // ── Submit ────────────────────────────────────────────────────
  const handleSubmit = async (submitStatus: BlogStatus) => {
    setError(null);

    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!content || content === '{}') {
      setError('Content cannot be empty');
      return;
    }
    if (visibleTo.length === 0) {
      setError('Select at least one visibility level (L2 or L3)');
      return;
    }

    setIsLoading(true);

    const payload = {
      title: title.trim(),
      excerpt: excerpt.trim() || undefined,
      content,
      coverImageUrl: coverImageUrl.trim() || undefined,
      status: submitStatus,
      visibleTo,
      tags,
    };

    try {
      // ✅ FIX: replaced raw fetch() with api axios instance.
      // The api instance (lib/api.ts) has a request interceptor that reads
      // the token from localStorage key "token" and attaches
      // `Authorization: Bearer <token>` automatically — no manual getToken() needed.
      if (mode === 'create') {
        await api.post('/guide-blogs', payload);
      } else {
        await api.patch(`/guide-blogs/${initialData!.id}`, payload);
      }

      router.push('/admin/guide-blogs');
      router.refresh();
    } catch (err: any) {
      // axios wraps the response; error.response.data.message has the backend message
      const message =
        err?.response?.data?.message ?? err?.message ?? 'Something went wrong';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-slate-900 rounded-lg">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {mode === 'create' ? 'Create Guide Blog' : 'Edit Guide Blog'}
              </h1>
              <p className="text-sm text-slate-500">
                {mode === 'create'
                  ? 'Write a new guide for your team members'
                  : 'Update this guide blog'}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Main Content ──────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold text-slate-800">
                  Blog Content
                </CardTitle>
                <CardDescription className="text-sm text-slate-500">
                  Write engaging guide content for your team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label
                    htmlFor="title"
                    className="text-sm font-medium text-slate-700"
                  >
                    Title <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="e.g. How to Handle Objections Effectively"
                    className="mt-1.5 border-slate-200 focus:border-slate-400 focus:ring-slate-400 text-base font-medium"
                  />
                </div>

                <div>
                  <Label
                    htmlFor="excerpt"
                    className="text-sm font-medium text-slate-700"
                  >
                    Short Description
                  </Label>
                  <Textarea
                    id="excerpt"
                    value={excerpt}
                    onChange={(e) => {
                      setExcerpt(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Brief summary shown in the blog list..."
                    className="mt-1.5 border-slate-200 resize-none h-20 focus:border-slate-400"
                    maxLength={300}
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {excerpt.length}/300 characters
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">
                    Content <span className="text-red-500">*</span>
                  </Label>
                  <TipTapEditor
                    content={content || undefined}
                    onChange={(json) => {
                      setContent(json);
                      setIsDirty(true);
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Sidebar Settings ──────────────────────────── */}
          <div className="space-y-6">
            {/* Publish Actions */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800">
                  Publish
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Status</span>
                  <Badge
                    variant={status === 'PUBLISHED' ? 'default' : 'secondary'}
                    className={
                      status === 'PUBLISHED'
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : status === 'DRAFT'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                    }
                  >
                    {status === 'PUBLISHED'
                      ? '● Published'
                      : status === 'DRAFT'
                        ? '○ Draft'
                        : '◌ Archived'}
                  </Badge>
                </div>

                <Separator />

                <div className="flex flex-col gap-2">
                  <Button
                    onClick={() => handleSubmit(BlogStatus.DRAFT)}
                    disabled={isLoading}
                    variant="outline"
                    className="w-full justify-start gap-2 text-slate-700 border-slate-200 hover:bg-slate-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Save as Draft
                  </Button>
                  <Button
                    onClick={() => handleSubmit(BlogStatus.PUBLISHED)}
                    disabled={isLoading}
                    className="w-full justify-start gap-2 bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Publish Blog
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Visibility */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Visibility
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Choose who can view this guide
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(
                  [
                    {
                      level: 'L2' as BlogVisibility,
                      label: 'L2 — Managers',
                      desc: 'Team managers and supervisors',
                    },
                    {
                      level: 'L3' as BlogVisibility,
                      label: 'L3 — Agents',
                      desc: 'Front-line sales agents',
                    },
                  ] as const
                ).map(({ level, label, desc }) => (
                  <div
                    key={level}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      visibleTo.includes(level)
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => toggleVisibility(level)}
                  >
                    <Checkbox
                      checked={visibleTo.includes(level)}
                      onCheckedChange={() => toggleVisibility(level)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {label}
                      </p>
                      <p className="text-xs text-slate-500">{desc}</p>
                    </div>
                  </div>
                ))}

                {visibleTo.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    At least one level must be selected
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Cover Image */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800">
                  Cover Image
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={coverImageUrl}
                  onChange={(e) => {
                    setCoverImageUrl(e.target.value);
                    setIsDirty(true);
                  }}
                  placeholder="https://example.com/image.jpg"
                  className="border-slate-200 text-sm"
                />
                {coverImageUrl && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-slate-200">
                    <img
                      src={coverImageUrl}
                      alt="Cover preview"
                      className="w-full h-32 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-3">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Add a tag..."
                    className="border-slate-200 text-sm flex-1"
                    maxLength={30}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTag}
                    className="border-slate-200 hover:bg-slate-50 px-3"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-slate-100 text-slate-700 hover:bg-slate-200 gap-1 pr-1"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-0.5 hover:text-red-500 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No tags added yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
