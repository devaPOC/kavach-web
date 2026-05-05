import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth/session-helpers';

// Force dynamic rendering since we use cookies
export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getCurrentSession();

  if (!session) {
    // No session, redirect to login
    redirect('/login');
  }

  // User is authenticated, redirect based on role
  if (session.role === 'admin') {
    redirect('/admin/dashboard');
  } else if (session.role === 'expert') {
    redirect('/expert/dashboard');
  } else if (session.role === 'trainer') {
    redirect('/trainer/dashboard');
  } else {
    redirect('/dashboard');
  }
}
