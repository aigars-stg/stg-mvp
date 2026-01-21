// Root layout - delegates to [locale]/layout.tsx for i18n
// The locale layout handles html/body tags with dynamic lang attribute
// The "Missing required html tags" warning in dev is expected and harmless -
// the middleware redirects all requests to a locale before rendering
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
