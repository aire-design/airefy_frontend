// API entity types — the backend returns camelCase JSON with documentId keys
export interface UserProfile {
  id: number;
  documentId: string;
  username: string;
  email: string;
  createdAt: string;
  avatar?: Media | null;
  bio?: string | null;
  website?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  github?: string | null;
  showEmail?: boolean;
  showBio?: boolean;
  showWebsite?: boolean;
  showTwitter?: boolean;
  showInstagram?: boolean;
  showLinkedin?: boolean;
  showGithub?: boolean;
}

export interface Media {
  id: number;
  documentId: string;
  name: string;
  url: string;
  alternativeText: string | null;
  mime?: string;
  width: number | null;
  height: number | null;
  formats?: {
    thumbnail?: { url: string; width: number; height: number };
    small?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
  };
}

export interface Tag {
  id: number;
  documentId: string;
  name: string;
  slug: string;
}

export interface Article {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  coverImage: Media | null;
  readTime: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: UserProfile | null;
  tags: Tag[];
  likesCount?: number;
  commentsCount?: number;
}

export interface Comment {
  id: number;
  documentId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  author: UserProfile;
}

export interface LikeStatus {
  isLiked: boolean;
  count: number;
}

export interface Certification {
  id: number;
  documentId: string;
  title: string;
  issuer: string;
  description: string | null;
  credentialUrl: string | null;
  /** Comma-separated skill names, rendered as chips */
  skills: string | null;
  issuedDate: string;
  badge: Media | null;
  createdAt: string;
  updatedAt: string;
}

export interface CertificationInput {
  title: string;
  issuer: string;
  issuedDate: string;
  description?: string;
  credentialUrl?: string;
  skills?: string;
  badge?: number | null;
}

export interface ApiResponse<T> {
  data: T;
  meta: Record<string, unknown>;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: {
    pagination: {
      page: number;
      pageSize: number;
      pageCount: number;
      total: number;
    };
  };
}

export interface AuthResponse {
  jwt: string;
  user: UserProfile;
}

export interface CreateArticleInput {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: number | null;
  tags?: number[];
}

export type UpdateArticleInput = Partial<CreateArticleInput>;

export interface UploadedFile {
  id: number;
  documentId: string;
  name: string;
  url: string;
  mime: string;
  size: number;
}
