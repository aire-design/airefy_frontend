import type { Metadata } from 'next';
import Image from 'next/image';
import { Award, ExternalLink, FileText } from 'lucide-react';
import { getCertifications, getMediaUrl } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Certification } from '@/types';

export const metadata: Metadata = {
  title: 'Certifications',
  description:
    'Certifications and badges earned along the way — follow my learning progress.',
};

function skillChips(skills: string | null) {
  if (!skills) return [];
  return skills
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isPdfBadge(cert: Certification): boolean {
  return (
    cert.badge?.mime === 'application/pdf' ||
    (cert.badge?.url.toLowerCase().endsWith('.pdf') ?? false)
  );
}

function CertificationCard({ cert }: { cert: Certification }) {
  const pdf = isPdfBadge(cert);
  const badgeUrl = pdf
    ? null
    : getMediaUrl(cert.badge?.formats?.small?.url ?? cert.badge?.url);
  const pdfUrl = pdf ? getMediaUrl(cert.badge?.url) : null;

  return (
    <article className="relative flex gap-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="shrink-0">
        {badgeUrl ? (
          <div className="relative h-20 w-20 overflow-hidden rounded-xl bg-gray-50">
            <Image
              src={badgeUrl}
              alt={`${cert.title} badge`}
              fill
              className="object-contain"
              sizes="80px"
            />
          </div>
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
            <Award className="h-9 w-9" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {formatDate(cert.issuedDate)}
        </p>
        <h3 className="mt-1 text-lg font-bold text-gray-900">{cert.title}</h3>
        <p className="text-sm text-gray-500">{cert.issuer}</p>

        {cert.description && (
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{cert.description}</p>
        )}

        {skillChips(cert.skills).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {skillChips(cert.skills).map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-4">
          {cert.credentialUrl && (
            <a
              href={cert.credentialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-gray-900 underline hover:text-gray-600"
            >
              Verify credential
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-gray-900 underline hover:text-gray-600"
            >
              View certificate (PDF)
              <FileText className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export default async function CertificationsPage() {
  let certifications: Certification[] = [];
  try {
    const res = await getCertifications();
    certifications = res.data;
  } catch {
    // Backend unreachable — show empty state
  }

  // Group by year for a recruiter-friendly timeline
  const byYear = new Map<number, Certification[]>();
  for (const cert of certifications) {
    const year = new Date(cert.issuedDate).getUTCFullYear();
    byYear.set(year, [...(byYear.get(year) ?? []), cert]);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Certifications & Badges
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-500">
          A running record of what I&apos;m learning — every credential links to its
          issuer for verification.
        </p>
      </header>

      {years.length === 0 ? (
        <p className="py-16 text-center text-gray-400">
          No certifications published yet — check back soon.
        </p>
      ) : (
        <div className="space-y-12">
          {years.map((year) => (
            <section key={year}>
              <div className="mb-5 flex items-center gap-4">
                <h2 className="text-xl font-bold text-gray-900">{year}</h2>
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-sm text-gray-400">
                  {byYear.get(year)!.length}{' '}
                  {byYear.get(year)!.length === 1 ? 'credential' : 'credentials'}
                </span>
              </div>
              <div className="space-y-4">
                {byYear.get(year)!.map((cert) => (
                  <CertificationCard key={cert.documentId} cert={cert} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
