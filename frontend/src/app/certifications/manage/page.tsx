'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Award, ExternalLink, Edit3, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  getCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
} from '@/lib/api';
import { formatDate } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import ImageUpload from '@/components/editor/ImageUpload';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import type { Certification, CertificationInput, UploadedFile } from '@/types';

const EMPTY_FORM = {
  title: '',
  issuer: '',
  issuedDate: '',
  credentialUrl: '',
  skills: '',
  description: '',
};

export default function ManageCertificationsPage() {
  const { token } = useAuth();
  const [certs, setCerts] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [badge, setBadge] = useState<UploadedFile | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    getCertifications()
      .then((res) => setCerts(res.data))
      .catch(() => setError('Could not load certifications.'))
      .finally(() => setLoading(false));
  }, []);

  function set(field: keyof typeof EMPTY_FORM, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function startEdit(cert: Certification) {
    setEditingId(cert.documentId);
    setForm({
      title: cert.title,
      issuer: cert.issuer,
      issuedDate: cert.issuedDate.slice(0, 10),
      credentialUrl: cert.credentialUrl ?? '',
      skills: cert.skills ?? '',
      description: cert.description ?? '',
    });
    setBadge(
      cert.badge
        ? {
            id: cert.badge.id,
            documentId: cert.badge.documentId,
            name: cert.badge.name,
            url: cert.badge.url,
            mime: cert.badge.mime ?? '',
            size: 0,
          }
        : null
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setBadge(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError('');
    setSuccess('');

    if (!form.title.trim() || !form.issuer.trim() || !form.issuedDate) {
      setError('Title, issuer and date are required.');
      return;
    }

    const payload: CertificationInput = {
      title: form.title.trim(),
      issuer: form.issuer.trim(),
      issuedDate: form.issuedDate,
      credentialUrl: form.credentialUrl.trim(),
      skills: form.skills.trim(),
      description: form.description.trim(),
      badge: badge?.id ?? null,
    };

    setSaving(true);
    try {
      if (editingId) {
        const res = await updateCertification(editingId, payload, token);
        setCerts((cs) => cs.map((c) => (c.documentId === editingId ? res.data : c)));
        setSuccess('Certification updated.');
      } else {
        const res = await createCertification(payload, token);
        setCerts((cs) =>
          [res.data, ...cs].sort(
            (a, b) => new Date(b.issuedDate).getTime() - new Date(a.issuedDate).getTime()
          )
        );
        setSuccess('Certification added.');
      }
      resetForm();
    } catch (err) {
      setError((err as Error).message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(documentId: string) {
    if (!token || !confirm('Delete this certification?')) return;
    setDeletingId(documentId);
    try {
      await deleteCertification(documentId, token);
      setCerts((cs) => cs.filter((c) => c.documentId !== documentId));
      if (editingId === documentId) resetForm();
    } catch (err) {
      setError((err as Error).message || 'Failed to delete.');
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Manage certifications</h1>
        <Link
          href="/certifications"
          className="inline-flex items-center gap-1 text-sm text-gray-500 underline hover:text-gray-900"
        >
          View public page
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Add / edit form */}
      <form
        onSubmit={handleSubmit}
        className="mb-12 space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
      >
        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
          {editingId ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {editingId ? 'Edit certification' : 'Add a certification'}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="cert-title"
            label="Title *"
            placeholder="AWS Solutions Architect Associate"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
          />
          <Input
            id="cert-issuer"
            label="Issuer *"
            placeholder="Amazon Web Services"
            value={form.issuer}
            onChange={(e) => set('issuer', e.target.value)}
          />
          <Input
            id="cert-date"
            label="Date earned *"
            type="date"
            value={form.issuedDate}
            onChange={(e) => set('issuedDate', e.target.value)}
          />
          <Input
            id="cert-url"
            label="Credential URL"
            placeholder="https://www.credly.com/badges/…"
            value={form.credentialUrl}
            onChange={(e) => set('credentialUrl', e.target.value)}
          />
        </div>

        <Input
          id="cert-skills"
          label="Skills (comma-separated)"
          placeholder="AWS, Cloud Architecture, Networking"
          value={form.skills}
          onChange={(e) => set('skills', e.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="cert-desc" className="text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            id="cert-desc"
            rows={3}
            placeholder="What this certification covers…"
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-gray-700">
            Badge image or certificate (PDF)
          </span>
          <ImageUpload
            token={token!}
            value={badge}
            onChange={setBadge}
            allowPdf
            label="Add a badge image or PDF certificate"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">{success}</p>}

        <div className="flex gap-2">
          <Button type="submit" loading={saving}>
            {editingId ? 'Save changes' : 'Add certification'}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* Existing certifications */}
      <h2 className="mb-4 text-xl font-bold text-gray-900">
        Your certifications ({certs.length})
      </h2>
      {certs.length === 0 ? (
        <p className="py-8 text-center text-gray-400">
          Nothing yet — add your first certification above.
        </p>
      ) : (
        <div className="space-y-3">
          {certs.map((cert) => (
            <div
              key={cert.documentId}
              className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                <Award className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-gray-900">{cert.title}</h3>
                <p className="text-xs text-gray-400">
                  {cert.issuer} · {formatDate(cert.issuedDate)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => startEdit(cert)}>
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  loading={deletingId === cert.documentId}
                  onClick={() => handleDelete(cert.documentId)}
                >
                  ×
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
