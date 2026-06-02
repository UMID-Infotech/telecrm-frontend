// telecrm-frontend/app/admin/guide-blogs/new/page.tsx
import BlogForm from '@/components/guide-blogs/BlogForm';

export const metadata = {
  title: 'Create Guide Blog | TeleCRM Admin',
};

export default function NewBlogPage() {
  return <BlogForm mode="create" />;
}