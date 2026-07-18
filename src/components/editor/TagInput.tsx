'use client';

import { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import type { Tag } from '@/types';
import { createTag } from '@/lib/api';

interface TagInputProps {
  token: string;
  selectedTags: Tag[];
  availableTags: Tag[];
  onChange: (tags: Tag[]) => void;
}

export default function TagInput({
  token,
  selectedTags,
  availableTags,
  onChange,
}: TagInputProps) {
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const atLimit = selectedTags.length >= 20;
  const unselected = availableTags.filter(
    (t) => !selectedTags.find((s) => s.id === t.id)
  );
  const filtered = query.trim()
    ? unselected.filter((t) =>
        t.name.toLowerCase().includes(query.trim().toLowerCase())
      )
    : unselected;

  const exactMatch = availableTags.find(
    (t) => t.name.toLowerCase() === query.trim().toLowerCase()
  );
  const canCreate = query.trim().length > 0 && !exactMatch && !atLimit;

  function addTag(tag: Tag) {
    if (atLimit) return;
    onChange([...selectedTags, tag]);
    setQuery('');
  }

  function removeTag(id: number) {
    onChange(selectedTags.filter((t) => t.id !== id));
  }

  async function handleCreate() {
    if (!canCreate || creating) return;
    setCreating(true);
    setError('');
    try {
      const res = await createTag(query.trim(), token);
      addTag(res.data as unknown as Tag);
    } catch (err) {
      setError((err as Error).message || 'Failed to create tag.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Tags</span>
        <span className={`text-xs ${atLimit ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
          {selectedTags.length}/20
        </span>
      </div>

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="flex items-center gap-1 rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white"
            >
              {tag.name}
              <button
                type="button"
                onClick={() => removeTag(tag.id)}
                aria-label={`Remove ${tag.name}`}
                className="ml-0.5 rounded-full hover:opacity-70 focus:outline-none"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search / add row */}
      {!atLimit ? (
        <div className="space-y-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={unselected.length > 0 ? 'Search tags or create a new one…' : 'Create a new tag…'}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-0"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (filtered[0]) addTag(filtered[0]);
                else if (canCreate) handleCreate();
              }
            }}
          />

          {/* Available tags as chips — always visible, filtered when typing */}
          {filtered.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {filtered.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 transition-colors hover:border-gray-900 hover:text-gray-900"
                >
                  <Plus className="h-3 w-3" />
                  {tag.name}
                </button>
              ))}
            </div>
          )}

          {/* Create new tag — only shown when query has no exact match */}
          {canCreate && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 disabled:opacity-50"
            >
              {creating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Create &ldquo;{query.trim()}&rdquo;
            </button>
          )}

          {/* No results state */}
          {query.trim() && filtered.length === 0 && !canCreate && (
            <p className="text-xs text-gray-400">Tag already selected.</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-amber-600">Maximum 20 tags reached. Remove one to add another.</p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
