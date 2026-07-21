'use client';

// This component is always loaded via `dynamic(..., { ssr: false })` from the pages
// that use it, so it is safe to import MDEditor directly — no browser-API errors on the server.
import React, { useState } from 'react';
import MDEditor, { commands, type ICommand } from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import { uploadMedia } from '@/lib/api';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  token?: string;
}

const UploadIcon = (
  <svg viewBox="0 0 16 16" width="12px" height="12px" fill="currentColor">
    <path d="M14 10a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 2 0v2h10v-2a1 1 0 0 1 1-1Z" />
    <path d="M7.293 1.293a1 1 0 0 1 1.414 0l3 3a1 1 0 0 1-1.414 1.414L9 4.414V10a1 1 0 1 1-2 0V4.414L5.707 5.707A1 1 0 0 1 4.293 4.293l3-3Z" />
  </svg>
);

/* ── Alignment icons ── */
const AlignLeftIcon = (
  <svg viewBox="0 0 16 16" width="12px" height="12px" fill="currentColor">
    <path d="M2 3.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5Zm0 3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5Zm0 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5Zm0 3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5Z"/>
  </svg>
);

const AlignCenterIcon = (
  <svg viewBox="0 0 16 16" width="12px" height="12px" fill="currentColor">
    <path d="M4 3.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5Zm-2 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5Zm2 3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5Zm-2 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5Z"/>
  </svg>
);

const AlignRightIcon = (
  <svg viewBox="0 0 16 16" width="12px" height="12px" fill="currentColor">
    <path d="M2.5 3a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1h-11Zm4 3a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7Zm-4 3a.5.5 0 0 0 0 1h11a.5.5 0 0 0 0-1h-11Zm4 3a.5.5 0 0 0 0 1h7a.5.5 0 0 0 0-1h-7Z"/>
  </svg>
);

const AlignJustifyIcon = (
  <svg viewBox="0 0 16 16" width="12px" height="12px" fill="currentColor">
    <path d="M2 3.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5Zm0 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5Zm0 3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5Zm0 3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5Z"/>
  </svg>
);

/** Wraps selected text (or a placeholder) in an HTML alignment div. */
function makeAlignCmd(align: 'left' | 'center' | 'right' | 'justify', icon: React.ReactElement): ICommand {
  return {
    name: `align-${align}`,
    keyCommand: `align-${align}`,
    buttonProps: { 'aria-label': `Align ${align}`, title: `Align ${align}` },
    icon,
    execute: (state, api) => {
      const selected = state.selectedText || 'Your text here';
      api.replaceSelection(`\n<div style="text-align:${align}">\n${selected}\n</div>\n`);
    },
  };
}

const GUIDE: Array<{
  group: string;
  items: Array<{ symbol: string; label: string; desc: string; example?: React.ReactNode }>;
}> = [
  {
    group: 'Text Style',
    items: [
      { symbol: 'B',  label: 'Bold',         desc: 'Makes your selected text thick and stand out.',         example: <strong>like this</strong> },
      { symbol: 'I',  label: 'Italic',        desc: 'Slants your selected text for light emphasis.',         example: <em>like this</em> },
      { symbol: 'S̶', label: 'Strikethrough', desc: 'Draws a line through text to show it is crossed out.', example: <s>like this</s> },
    ],
  },
  {
    group: 'Headings (Titles)',
    items: [
      { symbol: 'H2', label: 'Large heading',  desc: 'A big section title. Use it for main topics in your article.' },
      { symbol: 'H3', label: 'Medium heading', desc: 'A smaller sub-title. Use it inside a main section.' },
    ],
  },
  {
    group: 'Links & Images',
    items: [
      { symbol: '🔗', label: 'Link',         desc: 'Turns selected text into a clickable link to a website.' },
      { symbol: '↑',  label: 'Upload image', desc: 'Pick a photo from your device and insert it into the article (JPG, PNG, GIF, WebP · max 10 MB).' },
      { symbol: '⊞',  label: 'Table',        desc: 'Inserts a grid of rows and columns for organising data.' },
    ],
  },
  {
    group: 'Lists',
    items: [
      { symbol: '•',  label: 'Bullet list',   desc: 'A list with dots — good for items with no particular order.' },
      { symbol: '1.', label: 'Numbered list', desc: 'A list where each item gets a number — good for steps or rankings.' },
      { symbol: '☑',  label: 'Checklist',     desc: 'A list with tick-boxes — good for tasks or requirements.' },
    ],
  },
  {
    group: 'Blocks & Dividers',
    items: [
      { symbol: '—',   label: 'Divider line', desc: 'Inserts a horizontal line to visually separate two sections.' },
      { symbol: '"',   label: 'Quote',        desc: 'Highlights a quote or important passage in a styled callout block.' },
      { symbol: '`a`', label: 'Inline code',  desc: 'Formats a short technical word in a fixed-width font (e.g. a filename).' },
      { symbol: '```', label: 'Code block',   desc: 'Inserts a multi-line block for programming code or technical content.' },
    ],
  },
  {
    group: 'Alignment',
    items: [
      { symbol: '⬤←', label: 'Align left',    desc: 'Aligns the selected text to the left margin (default reading direction).' },
      { symbol: '⬤↔', label: 'Align centre',  desc: 'Centres the selected text horizontally on the page.' },
      { symbol: '→⬤', label: 'Align right',   desc: 'Aligns the selected text to the right margin.' },
      { symbol: '⬤⬤', label: 'Justify',       desc: 'Spreads text evenly so both left and right edges are flush (like a newspaper column).' },
    ],
  },
  {
    group: 'View',
    items: [
      { symbol: '⛶', label: 'Full screen', desc: 'Expands the editor to fill your whole screen. Press Escape to go back.' },
      { symbol: '👁', label: 'Preview tab', desc: 'Click the "Preview" tab at the top of the editor to see how your article will look when published.' },
    ],
  },
];

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Tell your story…',
  minHeight = 500,
  token,
}: MarkdownEditorProps) {
  const [uploading, setUploading] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  const imageUploadCmd: ICommand = {
    name: 'imageUpload',
    keyCommand: 'imageUpload',
    buttonProps: {
      'aria-label': 'Upload image',
      title: token ? 'Upload image' : 'Sign in to upload images',
      disabled: uploading || !token,
    },
    icon: UploadIcon,
    execute: (_state, api) => {
      if (!token) return;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.jpg,.jpeg,.png,.gif,.webp';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return;
        const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowed.includes(file.type)) {
          alert('Unsupported format. Please use JPG, PNG, GIF, or WebP.');
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          alert('Image must be under 10 MB.');
          return;
        }
        setUploading(true);
        try {
          const [uploaded] = await uploadMedia(file, token);
          // Store the raw relative path (/uploads/...) so the article renderer
          // can resolve it via getMediaUrl() against the correct backend URL
          // for each environment (Vercel → Render, local → localhost:8000).
          api.replaceSelection(`\n![${file.name}](${uploaded.url})\n`);
        } catch {
          alert('Image upload failed. Please try again.');
        } finally {
          setUploading(false);
        }
      };
      input.click();
    },
  };

  const alignLeftCmd   = makeAlignCmd('left',    AlignLeftIcon);
  const alignCenterCmd = makeAlignCmd('center',  AlignCenterIcon);
  const alignRightCmd  = makeAlignCmd('right',   AlignRightIcon);
  const alignJustifyCmd = makeAlignCmd('justify', AlignJustifyIcon);

  const toolbar: ICommand[] = [
    commands.bold,
    commands.italic,
    commands.strikethrough,
    commands.hr,
    commands.divider,
    commands.title2,
    commands.title3,
    commands.divider,
    commands.link,
    imageUploadCmd,
    commands.table,
    commands.divider,
    commands.unorderedListCommand,
    commands.orderedListCommand,
    commands.checkedListCommand,
    commands.divider,
    commands.code,
    commands.codeBlock,
    commands.quote,
    commands.divider,
    alignLeftCmd,
    alignCenterCmd,
    alignRightCmd,
    alignJustifyCmd,
    commands.divider,
    commands.fullscreen,
  ];

  return (
    <div data-color-mode="light" className="space-y-2">
      {/* Editor */}
      <div className="relative">
        {uploading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-sm">
            <p className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow">
              Uploading image…
            </p>
          </div>
        )}
        <MDEditor
          value={value}
          onChange={(v) => onChange(v ?? '')}
          preview="edit"
          height={minHeight}
          textareaProps={{ placeholder }}
          commands={toolbar}
          style={{ borderRadius: '0.75rem', overflow: 'hidden' }}
        />
      </div>

      {/* Guide toggle */}
      <button
        type="button"
        onClick={() => setGuideOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors select-none"
      >
        {guideOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {guideOpen ? 'Hide formatting guide' : 'What do the toolbar buttons mean?'}
      </button>

      {/* Formatting guide panel */}
      {guideOpen && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 text-sm">
          <p className="mb-4 text-gray-500 leading-relaxed">
            <strong className="text-gray-700">How to use:</strong> Highlight the text you want to change, then click the button.
            You can also type the shortcut shown in the grey box directly into the editor.
          </p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {GUIDE.map((section) => (
              <div key={section.group}>
                <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {section.group}
                </h4>
                <ul className="space-y-3">
                  {section.items.map((item) => (
                    <li key={item.label} className="flex gap-2.5">
                      <span className="mt-0.5 flex h-6 min-w-[2rem] items-center justify-center rounded border border-gray-200 bg-white px-1 font-mono text-xs font-semibold text-gray-700 shadow-sm shrink-0">
                        {item.symbol}
                      </span>
                      <div className="leading-snug">
                        <span className="font-semibold text-gray-800">{item.label}</span>
                        <span className="text-gray-500"> — {item.desc}</span>
                        {item.example && (
                          <span className="ml-1 inline-block rounded bg-gray-200 px-1 py-0.5 font-mono text-xs text-gray-600">
                            {item.example}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
