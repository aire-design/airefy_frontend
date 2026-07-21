'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import { ImagePlus, X, Loader2, FileText } from 'lucide-react';
import { uploadMedia, getMediaUrl } from '@/lib/api';
import type { UploadedFile } from '@/types';

interface ImageUploadProps {
  token: string;
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null) => void;
  /** Also accept PDF files (used for certification badges/certificates). */
  allowPdf?: boolean;
  label?: string;
}

function isPdf(file: UploadedFile): boolean {
  return file.mime === 'application/pdf' || file.url.toLowerCase().endsWith('.pdf');
}

export default function ImageUpload({
  token,
  value,
  onChange,
  allowPdf = false,
  label,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedTypes = allowPdf ? [...IMAGE_TYPES, 'application/pdf'] : IMAGE_TYPES;
  const acceptAttr = allowPdf
    ? '.jpg,.jpeg,.png,.gif,.webp,.pdf'
    : '.jpg,.jpeg,.png,.gif,.webp';
  const formatsHint = allowPdf ? 'JPG, PNG, GIF, WebP, PDF' : 'JPG, PNG, GIF, WebP';
  const MAX_MB = 10;

  const handleFile = useCallback(
    async (file: File) => {
      if (!allowedTypes.includes(file.type)) {
        setError(`Unsupported format. Please use ${formatsHint}.`);
        return;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`File must be smaller than ${MAX_MB} MB.`);
        return;
      }

      setError('');
      setUploading(true);
      try {
        const [uploaded] = await uploadMedia(file, token);
        onChange(uploaded);
      } catch (err) {
        setError((err as Error).message || 'Upload failed.');
      } finally {
        setUploading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, onChange, allowPdf]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }

  if (value) {
    const url = getMediaUrl(value.url);

    // PDFs can't be previewed with next/image — show a file chip instead
    if (isPdf(value)) {
      return (
        <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">
              {value.name || 'certificate.pdf'}
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-gray-500 underline hover:text-gray-900"
            >
              Open PDF
            </a>
          </div>
          <button
            onClick={() => onChange(null)}
            className="shrink-0 rounded-full p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-700"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      );
    }

    return (
      <div className="relative w-full h-56 rounded-xl overflow-hidden bg-gray-100 group">
        <Image
          src={url}
          alt="Cover"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 800px"
        />
        <button
          onClick={() => onChange(null)}
          className="absolute top-3 right-3 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/80"
          aria-label="Remove image"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <label
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-300 py-12 text-gray-400 transition-colors hover:border-gray-400 hover:bg-gray-50"
      >
        <input
          type="file"
          accept={acceptAttr}
          onChange={handleChange}
          className="sr-only"
          disabled={uploading}
        />
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        ) : (
          <ImagePlus className="h-8 w-8" />
        )}
        <span className="text-sm font-medium">
          {uploading ? 'Uploading…' : label ?? 'Add a cover image'}
        </span>
        {!uploading && (
          <span className="text-xs text-gray-400">
            Drag & drop or click · {formatsHint} · Max {MAX_MB} MB
          </span>
        )}
      </label>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}
