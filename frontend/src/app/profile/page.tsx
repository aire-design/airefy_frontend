'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Save, Camera, Loader2, Globe, Link2, AtSign, Code2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { updateMe, uploadMedia, getMediaUrl } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Avatar from '@/components/ui/Avatar';
import { PageLoader } from '@/components/ui/LoadingSpinner';

const ALLOWED = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/** A small "show on public profile" switch. */
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-gray-700"
    >
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? 'bg-gray-900' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </span>
      {label}
    </button>
  );
}

const BIO_WORD_LIMIT = 1000;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Truncate to the first BIO_WORD_LIMIT words, preserving original whitespace. */
function clampToWordLimit(text: string): string {
  if (countWords(text) <= BIO_WORD_LIMIT) return text;
  const match = text.match(new RegExp(`^(?:\\s*\\S+){0,${BIO_WORD_LIMIT}}`));
  return match ? match[0] : text;
}

export default function ProfilePage() {
  const { user, token, loading: authLoading, login: authLogin } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [twitter, setTwitter] = useState('');
  const [instagram, setInstagram] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Visibility toggles — what shows on the public profile
  const [showEmail, setShowEmail] = useState(false);
  const [showBio, setShowBio] = useState(true);
  const [showWebsite, setShowWebsite] = useState(true);
  const [showTwitter, setShowTwitter] = useState(true);
  const [showInstagram, setShowInstagram] = useState(true);
  const [showLinkedin, setShowLinkedin] = useState(true);
  const [showGithub, setShowGithub] = useState(true);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarId, setAvatarId] = useState<number | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login?from=/profile');
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
      setBio(user.bio ?? '');
      setWebsite(user.website ?? '');
      setTwitter(user.twitter ?? '');
      setInstagram(user.instagram ?? '');
      setLinkedin(user.linkedin ?? '');
      setGithub(user.github ?? '');
      setShowEmail(user.showEmail ?? false);
      setShowBio(user.showBio ?? true);
      setShowWebsite(user.showWebsite ?? true);
      setShowTwitter(user.showTwitter ?? true);
      setShowInstagram(user.showInstagram ?? true);
      setShowLinkedin(user.showLinkedin ?? true);
      setShowGithub(user.showGithub ?? true);
      if (user.avatar) {
        setAvatarPreview(getMediaUrl(user.avatar.url));
        setAvatarId(user.avatar.id);
      }
    }
  }, [user, authLoading, router]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    if (!ALLOWED.includes(file.type)) { alert('Please use JPG, PNG, GIF or WebP.'); return; }
    if (file.size > 10 * 1024 * 1024) { alert('Image must be under 10 MB.'); return; }
    setUploadingAvatar(true);
    try {
      const [uploaded] = await uploadMedia(file, token);
      setAvatarPreview(getMediaUrl(uploaded.url));
      setAvatarId(uploaded.id);
    } catch { alert('Upload failed. Please try again.'); }
    finally { setUploadingAvatar(false); }
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (username.trim().length < 3) errs.username = 'Username must be at least 3 characters.';
    if (!/^[a-zA-Z0-9_-]+$/.test(username.trim()))
      errs.username = 'Username can only contain letters, numbers, hyphens and underscores.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = 'Enter a valid email address.';
    if (newPassword && newPassword.length < 8)
      errs.newPassword = 'Password must be at least 8 characters.';
    if (newPassword && newPassword !== confirmPassword)
      errs.confirmPassword = 'Passwords do not match.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate() || !user || !token) return;
    setSaving(true);
    setSuccess('');
    setErrors({});
    try {
      const payload: Record<string, unknown> = {
        username: username.trim(),
        email: email.trim(),
        bio: bio.trim() || null,
        website: website.trim() || null,
        twitter: twitter.trim() || null,
        instagram: instagram.trim() || null,
        linkedin: linkedin.trim() || null,
        github: github.trim() || null,
        avatar: avatarId ?? null,
        showEmail,
        showBio,
        showWebsite,
        showTwitter,
        showInstagram,
        showLinkedin,
        showGithub,
      };
      if (newPassword) payload.password = newPassword;
      const updated = await updateMe(user.id, payload as any, token);
      authLogin(token, { ...updated, avatar: updated.avatar ?? user.avatar });
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setErrors({ form: (err as Error).message || 'Failed to update profile.' });
    } finally { setSaving(false); }
  }

  if (authLoading) return <PageLoader />;
  if (!user) return null;

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        Back to dashboard
      </Link>

      <h1 className="mb-8 text-2xl font-bold text-gray-900">Edit profile</h1>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Photo ── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">Profile photo</h2>
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              {avatarPreview ? (
                <div className="relative h-20 w-20 overflow-hidden rounded-full">
                  <Image src={avatarPreview} alt="Profile photo" fill className="object-cover" />
                </div>
              ) : (
                <Avatar username={user.username} size="lg" className="!h-20 !w-20 !text-xl" />
              )}
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-white shadow hover:bg-gray-700 transition-colors"
                aria-label="Change photo">
                {uploadingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="text-sm font-medium text-gray-900 hover:underline">
                {uploadingAvatar ? 'Uploading…' : 'Change photo'}
              </button>
              <p className="mt-0.5 text-xs text-gray-400">JPG, PNG, GIF or WebP · max 10 MB</p>
            </div>
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.gif,.webp" onChange={handleAvatarChange} className="sr-only" />
          </div>
        </div>

        {/* ── About you ── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">About you</h2>
          <Input id="username" label="Username" type="text" value={username}
            onChange={(e) => setUsername(e.target.value)} placeholder="yourname"
            autoComplete="username" error={errors.username} required />
          <div>
            <Input id="email" label="Email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
              autoComplete="email" error={errors.email} required />
            <div className="mt-2">
              <Toggle checked={showEmail} onChange={setShowEmail} label="Show email on my public profile" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(clampToWordLimit(e.target.value))}
              placeholder="Write a short note about yourself — what you do, what you write about…"
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
            />
            <div className="mt-1 flex items-center justify-between">
              <Toggle checked={showBio} onChange={setShowBio} label="Show bio on my public profile" />
              <p className={`text-xs ${countWords(bio) >= BIO_WORD_LIMIT ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                {countWords(bio)}/{BIO_WORD_LIMIT} words
              </p>
            </div>
          </div>
        </div>

        {/* ── Social media ── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Social media & links</h2>
          <p className="text-xs text-gray-400">Enter your username or full URL. Use the switch beside each one to choose whether it appears on your public profile.</p>

          {[
            { id: 'website',   label: 'Website',     icon: <Globe  className="h-4 w-4 text-gray-400" />, value: website,   set: setWebsite,   ph: 'https://yourwebsite.com',   show: showWebsite,   setShow: setShowWebsite },
            { id: 'twitter',   label: 'X / Twitter', icon: <AtSign className="h-4 w-4 text-gray-400" />, value: twitter,   set: setTwitter,   ph: '@username or full URL',     show: showTwitter,   setShow: setShowTwitter },
            { id: 'instagram', label: 'Instagram',   icon: <AtSign className="h-4 w-4 text-gray-400" />, value: instagram, set: setInstagram, ph: '@username or full URL',     show: showInstagram, setShow: setShowInstagram },
            { id: 'linkedin',  label: 'LinkedIn',    icon: <Link2  className="h-4 w-4 text-gray-400" />, value: linkedin,  set: setLinkedin,  ph: 'linkedin.com/in/yourname',  show: showLinkedin,  setShow: setShowLinkedin },
            { id: 'github',    label: 'GitHub',      icon: <Code2  className="h-4 w-4 text-gray-400" />, value: github,    set: setGithub,    ph: '@username or full URL',     show: showGithub,    setShow: setShowGithub },
          ].map(({ id, label, icon, value, set, ph, show, setShow }) => (
            <div key={id}>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">{label}</label>
                {value.trim() && (
                  <Toggle checked={show} onChange={setShow} label={show ? 'Visible' : 'Hidden'} />
                )}
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 focus-within:border-gray-500 focus-within:ring-1 focus-within:ring-gray-500">
                {icon}
                <input
                  id={id}
                  type="text"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={ph}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
              </div>
            </div>
          ))}
        </div>

        {/* ── Password ── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Change password</h2>
          <p className="text-xs text-gray-400">Leave blank to keep your current password.</p>
          <Input id="newPassword" label="New password" type="password" value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters"
            autoComplete="new-password" error={errors.newPassword} />
          <Input id="confirmPassword" label="Confirm new password" type="password" value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat your new password"
            autoComplete="new-password" error={errors.confirmPassword} />
        </div>

        {errors.form && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errors.form}</div>}
        {success && <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

        <Button type="submit" loading={saving} className="w-full" size="lg">
          <Save className="h-4 w-4" />
          Save changes
        </Button>
      </form>
    </div>
  );
}
