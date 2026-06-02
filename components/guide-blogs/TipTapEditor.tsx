//components/guide-blogs/TipTapEditor.tsx
'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/extension-bubble-menu';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback } from 'react';
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Minus,
  ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TipTapEditorProps {
  content?: string;
  onChange?: (json: string) => void;
  placeholder?: string;
  editable?: boolean;
}

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tooltip: string;
  children: React.ReactNode;
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  tooltip,
  children,
}: ToolbarButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Toggle
            size="sm"
            pressed={isActive}
            onPressedChange={onClick}
            disabled={disabled}
            className={cn(
              'h-8 w-8 p-0 rounded-md transition-all duration-150',
              'hover:bg-slate-100 dark:hover:bg-slate-800',
              isActive &&
                'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900',
            )}
          >
            {children}
          </Toggle>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function TipTapEditor({
  content,
  onChange,
  placeholder = 'Start writing your guide...',
  editable = true,
}: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      TextStyle,
      Highlight.configure({ multicolor: false }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline cursor-pointer' },
      }),
      Image.configure({ HTMLAttributes: { class: 'rounded-lg max-w-full' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: content ? JSON.parse(content) : '',
    editable,
    onUpdate({ editor }) {
      onChange?.(JSON.stringify(editor.getJSON()));
    },
    editorProps: {
      attributes: {
        class:
          'min-h-[420px] p-6 focus:outline-none prose prose-slate max-w-none ' +
          'prose-headings:font-semibold prose-headings:tracking-tight ' +
          'prose-p:leading-relaxed prose-li:leading-relaxed ' +
          'dark:prose-invert',
      },
    },
  });

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href;
    const url = window.prompt('Enter URL', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter image URL');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        'border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden',
        'bg-white dark:bg-slate-950 shadow-sm',
        !editable && 'border-transparent shadow-none',
      )}
    >
      {editable && (
        <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2">
          <div className="flex flex-wrap items-center gap-0.5">
            {/* History */}
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              tooltip="Undo (Ctrl+Z)"
            >
              <Undo className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              tooltip="Redo (Ctrl+Y)"
            >
              <Redo className="h-3.5 w-3.5" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Headings */}
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              isActive={editor.isActive('heading', { level: 1 })}
              tooltip="Heading 1"
            >
              <Heading1 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              isActive={editor.isActive('heading', { level: 2 })}
              tooltip="Heading 2"
            >
              <Heading2 className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              isActive={editor.isActive('heading', { level: 3 })}
              tooltip="Heading 3"
            >
              <Heading3 className="h-3.5 w-3.5" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Inline formatting */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              tooltip="Bold (Ctrl+B)"
            >
              <Bold className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              tooltip="Italic (Ctrl+I)"
            >
              <Italic className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              tooltip="Underline (Ctrl+U)"
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              tooltip="Strikethrough"
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              isActive={editor.isActive('highlight')}
              tooltip="Highlight"
            >
              <Highlighter className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCode().run()}
              isActive={editor.isActive('code')}
              tooltip="Inline Code"
            >
              <Code className="h-3.5 w-3.5" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Lists */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              tooltip="Bullet List"
            >
              <List className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              tooltip="Numbered List"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              tooltip="Blockquote"
            >
              <Quote className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              tooltip="Divider"
            >
              <Minus className="h-3.5 w-3.5" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Alignment */}
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              isActive={editor.isActive({ textAlign: 'left' })}
              tooltip="Align Left"
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign('center').run()
              }
              isActive={editor.isActive({ textAlign: 'center' })}
              tooltip="Align Center"
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              isActive={editor.isActive({ textAlign: 'right' })}
              tooltip="Align Right"
            >
              <AlignRight className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().setTextAlign('justify').run()
              }
              isActive={editor.isActive({ textAlign: 'justify' })}
              tooltip="Justify"
            >
              <AlignJustify className="h-3.5 w-3.5" />
            </ToolbarButton>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* Link & Image */}
            <ToolbarButton
              onClick={setLink}
              isActive={editor.isActive('link')}
              tooltip="Add Link"
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
            <ToolbarButton onClick={addImage} tooltip="Insert Image">
              <ImageIcon className="h-3.5 w-3.5" />
            </ToolbarButton>
          </div>
        </div>
      )}

      

      <EditorContent editor={editor} />

      {editable && (
        <div className="border-t border-slate-100 dark:border-slate-800 px-4 py-1.5 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {editor.storage.characterCount?.characters?.() ?? 0} characters
          </span>
          <span className="text-xs text-slate-300">TipTap Editor</span>
        </div>
      )}
    </div>
  );
}
