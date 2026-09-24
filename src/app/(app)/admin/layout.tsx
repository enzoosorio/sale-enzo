import { isAdmin } from '@/lib/auth/isAdmin';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { DashboardSidebar } from '@/components/admin/DashboardSidebar';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Panel de administración seguro para gestionar productos, categorías y más',
  // Installable capture app (iPhone: Share → Add to Home Screen)
  manifest: '/admin.webmanifest',
  appleWebApp: { capable: true, title: 'Sale Enzo', statusBarStyle: 'default' },
  icons: { apple: '/pwa/icon-180.png' },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // comprobamos si el usuario que intenta ingresar, es el administrador.
  const userIsAdmin = await isAdmin();

  if (!userIsAdmin) {
    redirect('/home');
  }

  return (
    <div className="h-[calc(100vh-var(--navbar-height))] bg-off-white">
      <div className="flex h-[calc(100vh-var(--navbar-height))] bg-amber-600 overflow-hidden">
        <DashboardSidebar/>
        {children}
      </div>
    </div>
  );
}
