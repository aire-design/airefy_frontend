import { redirect } from 'next/navigation';

// /settings now lives at /profile
export default function SettingsRedirect() {
  redirect('/profile');
}
