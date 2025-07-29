import { redirect } from 'next/navigation';

export default function Home() {
  // In a real app, you'd check for authentication status
  // and redirect to /login if not authenticated.
  // For now, we'll just redirect to dashboard.
  redirect('/dashboard');
}
