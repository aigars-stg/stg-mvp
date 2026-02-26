import { LegalNav } from '@/components/legal/LegalNav';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg py-6 sm:py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
          <aside className="mb-6 lg:mb-0">
            <div className="lg:sticky lg:top-24">
              <LegalNav />
            </div>
          </aside>

          <main className="min-w-0 rounded-lg border border-border-subtle bg-white p-6 sm:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
