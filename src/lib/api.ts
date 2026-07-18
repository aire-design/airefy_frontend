import type {
  Article,
  AuthResponse,
  Certification,
  CertificationInput,
  CreateArticleInput,
  ApiListResponse,
  ApiResponse,
  UserProfile,
  Tag,
  UpdateArticleInput,
  UploadedFile,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit & { revalidate?: number } = {}
): Promise<T> {
  const { revalidate, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  // Public read-only calls pass `revalidate` (seconds) to use Next.js ISR caching.
  // Authenticated / mutating calls leave it undefined → no-store (always fresh).
  const cacheConfig: RequestInit =
    revalidate !== undefined
      ? { next: { revalidate } } as RequestInit
      : { cache: 'no-store' };

  const res = await fetch(`${API_URL}/api${endpoint}`, {
    ...fetchOptions,
    headers,
    ...cacheConfig,
  });

  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    const body = await res.json().catch(() => ({}));
    const message =
      body?.error?.message || body?.message || `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return res.json();
}

function bearerHeader(token: string) {
  return { Authorization: `Bearer ${token}` } as HeadersInit;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function login(
  identifier: string,
  password: string
): Promise<AuthResponse> {
  return fetchAPI('/auth/local', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
}

export async function register(
  username: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  return fetchAPI('/auth/local/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

export async function getMe(token: string): Promise<UserProfile> {
  return fetchAPI('/users/me', {
    headers: bearerHeader(token),
  });
}

export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  // Public endpoint returns only the fields the user chose to make visible.
  try {
    return await fetchAPI<UserProfile>(
      `/profile/${encodeURIComponent(username)}`,
      { revalidate: 60 }
    );
  } catch {
    return null;
  }
}

export async function getFullProfile(username: string, token: string): Promise<UserProfile | null> {
  // Same endpoint, but with token, so the backend owner check can work
  try {
    return await fetchAPI<UserProfile>(
      `/profile/${encodeURIComponent(username)}`,
      { headers: bearerHeader(token) }
    );
  } catch {
    return null;
  }
}

export async function updateMe(
  _userId: number,
  data: Record<string, unknown>,
  token: string
): Promise<UserProfile> {
  return fetchAPI('/profile', {
    method: 'PUT',
    headers: bearerHeader(token),
    body: JSON.stringify(data),
  });
}

// ─── Articles ────────────────────────────────────────────────────────────────
// The backend always populates author, coverImage and tags — no populate params.

export async function getArticles(
  page = 1,
  pageSize = 10
): Promise<ApiListResponse<Article>> {
  return fetchAPI(
    `/articles?page=${page}&pageSize=${pageSize}`,
    { revalidate: 60 } // home feed: cache 60 s, revalidate in background
  );
}

export async function getArticleBySlug(
  slug: string
): Promise<ApiListResponse<Article>> {
  return fetchAPI(
    `/articles?slug=${encodeURIComponent(slug)}`,
    { revalidate: 120 } // article page: cache 2 min
  );
}

export async function getArticlesByTag(
  tagSlug: string,
  page = 1,
  pageSize = 12
): Promise<ApiListResponse<Article>> {
  return fetchAPI(
    `/articles?tag=${encodeURIComponent(tagSlug)}&page=${page}&pageSize=${pageSize}`,
    { revalidate: 60 }
  );
}

export async function getArticlesByUsername(
  username: string
): Promise<ApiListResponse<Article>> {
  return fetchAPI(
    `/articles-by-user/${encodeURIComponent(username)}`,
    { revalidate: 10 } // public profile: short cache to reflect new publishes quickly
  );
}

export async function getMyArticles(
  _userDocumentId: string,
  token: string
): Promise<ApiListResponse<Article>> {
  return fetchAPI('/my-articles', { headers: bearerHeader(token) });
}

export async function getArticleForEdit(
  documentId: string,
  token: string
): Promise<ApiResponse<Article>> {
  return fetchAPI(
    `/articles/${documentId}`,
    { headers: bearerHeader(token) }
  );
}

export async function createArticle(
  data: CreateArticleInput,
  token: string,
  publish = false
): Promise<ApiResponse<Article>> {
  const payload: Record<string, unknown> = { ...data };
  if (publish) payload.publishedAt = new Date().toISOString();

  return fetchAPI('/articles', {
    method: 'POST',
    headers: bearerHeader(token),
    body: JSON.stringify({ data: payload }),
  });
}

export async function updateArticle(
  documentId: string,
  data: UpdateArticleInput,
  token: string,
  publish?: boolean,
  existingPublishedAt?: string | null
): Promise<ApiResponse<Article>> {
  const payload: Record<string, unknown> = { ...data };
  // Preserve the original publication time when re-publishing an already-published
  // post; only stamp "now" the first time it goes live.
  if (publish === true) payload.publishedAt = existingPublishedAt ?? new Date().toISOString();
  if (publish === false) payload.publishedAt = null;

  return fetchAPI(`/articles/${documentId}`, {
    method: 'PUT',
    headers: bearerHeader(token),
    body: JSON.stringify({ data: payload }),
  });
}

export async function deleteArticle(
  documentId: string,
  token: string
): Promise<void> {
  await fetchAPI(`/articles/${documentId}`, {
    method: 'DELETE',
    headers: bearerHeader(token),
  });
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export async function getTags(): Promise<ApiListResponse<Tag>> {
  return fetchAPI('/tags', { revalidate: 300 }); // tags rarely change — cache 5 min
}

export async function createTag(
  name: string,
  token: string
): Promise<ApiResponse<Tag>> {
  const slug = name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return fetchAPI('/tags', {
    method: 'POST',
    headers: bearerHeader(token),
    body: JSON.stringify({ data: { name, slug: slug || `tag-${Math.random().toString(36).slice(2, 6)}` } }),
  });
}

// ─── Certifications ──────────────────────────────────────────────────────────

export async function getCertifications(): Promise<ApiListResponse<Certification>> {
  return fetchAPI('/certifications', { revalidate: 30 });
}

export async function createCertification(
  data: CertificationInput,
  token: string
): Promise<ApiResponse<Certification>> {
  return fetchAPI('/certifications', {
    method: 'POST',
    headers: bearerHeader(token),
    body: JSON.stringify({ data }),
  });
}

export async function updateCertification(
  documentId: string,
  data: Partial<CertificationInput>,
  token: string
): Promise<ApiResponse<Certification>> {
  return fetchAPI(`/certifications/${documentId}`, {
    method: 'PUT',
    headers: bearerHeader(token),
    body: JSON.stringify({ data }),
  });
}

export async function deleteCertification(
  documentId: string,
  token: string
): Promise<void> {
  await fetchAPI(`/certifications/${documentId}`, {
    method: 'DELETE',
    headers: bearerHeader(token),
  });
}

// ─── Media ───────────────────────────────────────────────────────────────────

export async function uploadMedia(
  file: File,
  token: string
): Promise<UploadedFile[]> {
  const formData = new FormData();
  formData.append('files', file);

  const res = await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body?.error?.message || 'Upload failed', res.status);
  }

  return res.json();
}

export function getMediaUrl(url: string | undefined | null): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
}
