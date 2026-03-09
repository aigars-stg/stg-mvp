import { requireServerAuth } from '@/lib/auth/server-auth';
import { StaffNav } from '@/components/staff/StaffNav';
import { Shield } from '@/lib/icons';

interface StaffLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function StaffLayout({ children, params }: StaffLayoutProps) {
  const { locale } = await params;
  const { isStaff } = await requireServerAuth(locale);

  if (!isStaff) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h1 className="text-xl font-bold text-polar-night mb-2">Staff Access Required</h1>
          <p className="text-text-secondary">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="bg-frost-ice/5 border-b border-frost-ice/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <h1 className="text-xl font-bold text-polar-night mb-3">Staff Dashboard</h1>
          <StaffNav />
        </div>
      </div>
      {children}
    </div>
  );
}
