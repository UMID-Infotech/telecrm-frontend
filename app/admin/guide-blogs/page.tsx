//app/admin/guide-blogs/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BlogStatus, BlogVisibility } from '@/types/blog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookOpen,
  Edit2,
  Eye,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { api } from '@/lib/api'; // ✅ FIX: axios instance with JWT interceptor

interface BlogTag {
  id: string;
  name: string;
}
interface GuideBlog {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  status: BlogStatus;
  visibleTo: BlogVisibility[];
  tags: BlogTag[];
  publishedAt?: string;
  updatedAt: string;
  createdByUser: { email: string; designation: string };
}

function StatusBadge({ status }: { status: BlogStatus }) {
  const map = {
    PUBLISHED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    DRAFT: 'bg-amber-50 text-amber-700 border-amber-200',
    ARCHIVED: 'bg-slate-100 text-slate-500 border-slate-200',
  };
  const labels = {
    PUBLISHED: '● Published',
    DRAFT: '○ Draft',
    ARCHIVED: '◌ Archived',
  };
  return (
    <Badge variant="outline" className={`text-xs font-medium ${map[status]}`}>
      {labels[status]}
    </Badge>
  );
}

function VisibilityBadges({ visibleTo }: { visibleTo: BlogVisibility[] }) {
  return (
    <div className="flex gap-1">
      {visibleTo.map((v) => (
        <Badge
          key={v}
          variant="secondary"
          className="text-xs bg-blue-50 text-blue-700 border-blue-200"
        >
          {v}
        </Badge>
      ))}
    </div>
  );
}

export default function AdminBlogListPage() {
  const router = useRouter();
  const [blogs, setBlogs] = useState<GuideBlog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('ALL');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchBlogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (visibilityFilter !== 'ALL') params.set('visibleTo', visibilityFilter);

      // ✅ FIX: api instance attaches Bearer token automatically
      const res = await api.get(`/guide-blogs/admin?${params}`);
      setBlogs(res.data);
    } catch {
      setBlogs([]);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, visibilityFilter]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      // ✅ FIX: api instance attaches Bearer token automatically
      await api.delete(`/guide-blogs/${deleteId}`);
      setBlogs((prev) => prev.filter((b) => b.id !== deleteId));
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 rounded-xl shadow-sm">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Guide Blogs
              </h1>
              <p className="text-sm text-slate-500">
                Manage knowledge base for your team
              </p>
            </div>
          </div>
          <Button
            asChild
            className="bg-slate-900 hover:bg-slate-800 text-white gap-2 shadow-sm"
          >
            <Link href="/admin/guide-blogs/new">
              <Plus className="h-4 w-4" />
              New Blog
            </Link>
          </Button>
        </div>

        {/* ── Stats row ───────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: 'Total Blogs',
              value: blogs.length,
              color: 'bg-slate-900',
              icon: <BookOpen className="h-4 w-4 text-white" />,
            },
            {
              label: 'Published',
              value: blogs.filter((b) => b.status === 'PUBLISHED').length,
              color: 'bg-emerald-600',
              icon: <Eye className="h-4 w-4 text-white" />,
            },
            {
              label: 'Drafts',
              value: blogs.filter((b) => b.status === 'DRAFT').length,
              color: 'bg-amber-500',
              icon: <Edit2 className="h-4 w-4 text-white" />,
            },
            {
              label: 'Audience',
              value:
                [...new Set(blogs.flatMap((b) => b.visibleTo))].join(', ') ||
                '—',
              color: 'bg-blue-600',
              icon: <Users className="h-4 w-4 text-white" />,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm"
            >
              <div className={`p-2 rounded-lg ${stat.color}`}>{stat.icon}</div>
              <div>
                <p className="text-xs text-slate-500">{stat.label}</p>
                <p className="text-lg font-bold text-slate-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ─────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by title or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border-slate-200 focus:border-slate-400"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 border-slate-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PUBLISHED">Published</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={visibilityFilter}
              onValueChange={setVisibilityFilter}
            >
              <SelectTrigger className="w-full sm:w-40 border-slate-200">
                <SelectValue placeholder="Visibility" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Levels</SelectItem>
                <SelectItem value="L2">L2 Only</SelectItem>
                <SelectItem value="L3">L3 Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Table ───────────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                <TableHead className="font-semibold text-slate-700 pl-6">
                  Title
                </TableHead>
                <TableHead className="font-semibold text-slate-700">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-slate-700">
                  Visible To
                </TableHead>
                <TableHead className="font-semibold text-slate-700">
                  Tags
                </TableHead>
                <TableHead className="font-semibold text-slate-700">
                  Updated
                </TableHead>
                <TableHead className="font-semibold text-slate-700 pr-6 text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : blogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-4 bg-slate-100 rounded-full">
                        <BookOpen className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">
                        No blogs found
                      </p>
                      <p className="text-sm text-slate-400">
                        Create your first guide blog to get started
                      </p>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="mt-2 border-slate-300"
                      >
                        <Link href="/admin/guide-blogs/new">
                          <Plus className="h-4 w-4 mr-1" /> Create Blog
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                blogs.map((blog) => (
                  <TableRow
                    key={blog.id}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <TableCell className="pl-6">
                      <div>
                        <p className="font-medium text-slate-900 line-clamp-1">
                          {blog.title}
                        </p>
                        {blog.excerpt && (
                          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                            {blog.excerpt}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={blog.status} />
                    </TableCell>
                    <TableCell>
                      <VisibilityBadges visibleTo={blog.visibleTo} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap max-w-[160px]">
                        {blog.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            className="text-xs text-slate-500 border-slate-200"
                          >
                            {tag.name}
                          </Badge>
                        ))}
                        {blog.tags.length > 3 && (
                          <span className="text-xs text-slate-400">
                            +{blog.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {new Date(blog.updatedAt).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-slate-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/admin/guide-blogs/${blog.id}`)
                            }
                            className="gap-2 cursor-pointer"
                          >
                            <Eye className="h-4 w-4 text-slate-500" /> Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/admin/guide-blogs/${blog.id}/edit`)
                            }
                            className="gap-2 cursor-pointer"
                          >
                            <Edit2 className="h-4 w-4 text-slate-500" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteId(blog.id)}
                            className="gap-2 text-red-600 focus:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── Delete Confirmation ──────────────────────────────── */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this blog?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The blog and all its content will be
              permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete Blog
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
