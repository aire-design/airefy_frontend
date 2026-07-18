'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Globe, Link2, AtSign, Code2, Mail, Edit3, Eye, EyeOff, X } from 'lucide-react';
import { getMediaUrl, updateMe, getFullProfile } from '@/lib/api';
import Avatar from '@/components/ui/Avatar';
import type { UserProfile } from '@/types';
import { useAuth } from '@/context/AuthContext';

interface ProfileHeaderProps {
  initialProfile: UserProfile;
  articleCount: number;
}

function normaliseUrl(raw: string): string {
  if (!raw) return '';
  return raw.startsWith('http') ? raw : `https://${raw}`;
}

function SocialLink({ href, icon, label, hidden }: { href: string; icon: React.ReactNode; label: string; hidden?: boolean }) {
  const url = normaliseUrl(href);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-1.5 text-sm transition-colors ${
        hidden ? 'text-gray-300 hover:text-gray-400 opacity-60' : 'text-gray-500 hover:text-gray-900'
      }`}
      title={hidden ? `${label} (Hidden from public)` : label}
    >
      {icon}
      <span className="truncate max-w-[160px]">
        {href.replace(/^https?:\/\//, '').replace(/\/$/, '')}
      </span>
      {hidden && <EyeOff className="h-3 w-3 ml-1" />}
    </a>
  );
}

// A small inline toggle for the owner
function VisibilityToggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      title={`Toggle ${label} visibility`}
    >
      <span
        className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-gray-900' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-3.5' : 'translate-x-0.5'
          }`}
        />
      </span>
      <span className="sr-only">{label}</span>
      {checked ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function ProfileHeader({ initialProfile, articleCount }: ProfileHeaderProps) {
  const { user: authUser, token } = useAuth();
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [isOwner, setIsOwner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const avatarUrl = profile.avatar ? getMediaUrl(profile.avatar.url) : null;

  // Determine if owner, and fetch full profile if so
  useEffect(() => {
    if (authUser && authUser.username === initialProfile.username && token) {
      setIsOwner(true);
      getFullProfile(initialProfile.username, token).then(full => {
        if (full) {
          // ensure boolean toggles default correctly if missing
          setProfile({
            ...full,
            showEmail: full.showEmail ?? false,
            showBio: full.showBio ?? true,
            showWebsite: full.showWebsite ?? true,
            showTwitter: full.showTwitter ?? true,
            showInstagram: full.showInstagram ?? true,
            showLinkedin: full.showLinkedin ?? true,
            showGithub: full.showGithub ?? true,
          });
        }
      });
    }
  }, [authUser, initialProfile.username, token]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleToggle = async (field: keyof UserProfile, value: boolean) => {
    if (!token || !authUser) return;
    
    // Optimistic update
    const prev = { ...profile };
    setProfile(p => ({ ...p, [field]: value }));
    setSaving(true);
    
    try {
      await updateMe(authUser.id, { [field]: value } as Record<string, unknown>, token);
      showToast('Visibility updated');
    } catch (err) {
      setProfile(prev); // revert
      showToast('Failed to update visibility');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-10 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm relative">
      {toastMessage && (
        <div className="absolute top-4 right-4 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-full shadow-md animate-fade-in z-10">
          {toastMessage}
        </div>
      )}

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* Avatar */}
        <div className="shrink-0">
          {avatarUrl ? (
            <div 
              className="relative h-24 w-24 overflow-hidden rounded-full cursor-pointer hover:ring-2 hover:ring-gray-200 transition-all" 
              onClick={() => setLightboxOpen(true)}
              title="Click to enlarge"
            >
              <Image src={avatarUrl} alt={profile.username} fill className="object-cover" />
            </div>
          ) : (
            <Avatar username={profile.username} size="lg" className="!h-24 !w-24 !text-2xl" />
          )}
        </div>

        {/* Avatar Lightbox */}
        {lightboxOpen && avatarUrl && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/90 p-4 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setLightboxOpen(false)}
          >
            <div 
              className="relative w-full max-w-2xl max-h-[90vh] aspect-square"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="absolute -top-12 right-0 flex items-center gap-2 text-white hover:text-gray-300 transition-colors bg-gray-800/50 hover:bg-gray-800/80 px-3 py-1.5 rounded-full backdrop-blur-md"
                onClick={() => setLightboxOpen(false)}
              >
                <X className="h-4 w-4" />
                <span className="text-sm font-medium">Close</span>
              </button>
              <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl bg-black/20">
                <Image 
                  src={avatarUrl} 
                  alt={profile.username} 
                  fill 
                  className="object-contain" 
                  sizes="(max-width: 768px) 100vw, 800px"
                  priority
                />
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{profile.username}</h1>
              <p className="mt-0.5 text-sm text-gray-400">
                {articleCount} published {articleCount === 1 ? 'story' : 'stories'}
              </p>
            </div>
            {isOwner && (
              <Link
                href="/profile"
                className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-full transition-colors border border-gray-200"
              >
                <Edit3 className="h-4 w-4" />
                Edit profile
              </Link>
            )}
          </div>

          {/* Bio */}
          {(profile.bio || isOwner) && (
            <div className="mt-3 max-w-xl">
              {profile.bio && (
                <div className={`text-sm leading-relaxed whitespace-pre-line flex items-start gap-2 ${!profile.showBio && isOwner ? 'text-gray-400 opacity-60' : 'text-gray-600'}`}>
                  <span>{profile.bio}</span>
                </div>
              )}
              {isOwner && profile.bio && (
                <div className="mt-1.5">
                  <VisibilityToggle 
                    checked={!!profile.showBio} 
                    onChange={(v) => handleToggle('showBio', v)} 
                    label="bio" 
                  />
                </div>
              )}
            </div>
          )}

          {/* Social links */}
          {(profile.email || profile.website || profile.twitter || profile.instagram || profile.linkedin || profile.github) && (
            <div className="mt-5 flex flex-col gap-3">
              {/* Layout as flex wrap for items, but keep toggles attached to their item */}
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {profile.email && (
                  <div className="flex items-center gap-2">
                    <a href={`mailto:${profile.email}`}
                      className={`flex items-center gap-1.5 text-sm transition-colors ${!profile.showEmail && isOwner ? 'text-gray-300 hover:text-gray-400 opacity-60' : 'text-gray-500 hover:text-gray-900'}`}
                      title={!profile.showEmail && isOwner ? 'Email (Hidden from public)' : 'Email'}>
                      <Mail className="h-4 w-4 shrink-0" />
                      <span className="truncate max-w-[160px]">{profile.email}</span>
                      {!profile.showEmail && isOwner && <EyeOff className="h-3 w-3 ml-1" />}
                    </a>
                    {isOwner && (
                      <VisibilityToggle checked={!!profile.showEmail} onChange={(v) => handleToggle('showEmail', v)} label="email" />
                    )}
                  </div>
                )}

                {profile.website && (
                  <div className="flex items-center gap-2">
                    <SocialLink href={profile.website} label="Website" icon={<Globe className="h-4 w-4 shrink-0" />} hidden={!profile.showWebsite && isOwner} />
                    {isOwner && (
                      <VisibilityToggle checked={!!profile.showWebsite} onChange={(v) => handleToggle('showWebsite', v)} label="website" />
                    )}
                  </div>
                )}

                {typeof profile.twitter === 'string' && profile.twitter && (
                  <div className="flex items-center gap-2">
                    <SocialLink href={profile.twitter.startsWith('@') ? `https://x.com/${profile.twitter.slice(1)}` : profile.twitter}
                      label="X / Twitter" icon={<AtSign className="h-4 w-4 shrink-0" />} hidden={!profile.showTwitter && isOwner} />
                    {isOwner && (
                      <VisibilityToggle checked={!!profile.showTwitter} onChange={(v) => handleToggle('showTwitter', v)} label="twitter" />
                    )}
                  </div>
                )}

                {typeof profile.instagram === 'string' && profile.instagram && (
                  <div className="flex items-center gap-2">
                    <SocialLink href={profile.instagram.startsWith('@') ? `https://instagram.com/${profile.instagram.slice(1)}` : profile.instagram}
                      label="Instagram" icon={<AtSign className="h-4 w-4 shrink-0" />} hidden={!profile.showInstagram && isOwner} />
                    {isOwner && (
                      <VisibilityToggle checked={!!profile.showInstagram} onChange={(v) => handleToggle('showInstagram', v)} label="instagram" />
                    )}
                  </div>
                )}

                {typeof profile.linkedin === 'string' && profile.linkedin && (
                  <div className="flex items-center gap-2">
                    <SocialLink href={profile.linkedin} label="LinkedIn" icon={<Link2 className="h-4 w-4 shrink-0" />} hidden={!profile.showLinkedin && isOwner} />
                    {isOwner && (
                      <VisibilityToggle checked={!!profile.showLinkedin} onChange={(v) => handleToggle('showLinkedin', v)} label="linkedin" />
                    )}
                  </div>
                )}

                {typeof profile.github === 'string' && profile.github && (
                  <div className="flex items-center gap-2">
                    <SocialLink href={profile.github.startsWith('@') ? `https://github.com/${profile.github.slice(1)}` : profile.github}
                      label="GitHub" icon={<Code2 className="h-4 w-4 shrink-0" />} hidden={!profile.showGithub && isOwner} />
                    {isOwner && (
                      <VisibilityToggle checked={!!profile.showGithub} onChange={(v) => handleToggle('showGithub', v)} label="github" />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
