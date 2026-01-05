// Root layout - delegates to [locale]/layout.tsx for i18n
// The locale layout handles html/body tags with dynamic lang attribute
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
