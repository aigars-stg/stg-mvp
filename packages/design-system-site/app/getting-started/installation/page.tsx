export default function InstallationPage() {
  return (
    <div className="space-y-12">
      {/* Introduction */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">Installation & Setup</h1>
        <p className="text-lg text-polar-nightMedium leading-relaxed">
          Get started with the Second Turn Games design system in your React project.
          This guide walks you through installation, configuration, and your first components.
        </p>
      </section>

      {/* Prerequisites */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Prerequisites</h2>
        <div className="bg-snow-white shadow-sm rounded-lg p-6 border border-border">
          <p className="text-polar-nightMedium mb-4">
            Before installing the design system, ensure you have the following:
          </p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-6 h-6 bg-frost-ice/10 text-frost-arctic rounded-full text-sm font-semibold shrink-0">1</span>
              <div>
                <strong className="text-polar-night">Node.js 18 or higher</strong>
                <p className="text-sm text-polar-nightMedium mt-1">Required for package management and build tooling</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-6 h-6 bg-frost-ice/10 text-frost-arctic rounded-full text-sm font-semibold shrink-0">2</span>
              <div>
                <strong className="text-polar-night">pnpm package manager</strong>
                <p className="text-sm text-polar-nightMedium mt-1">Fast, disk space efficient package manager (install: <code className="px-1 py-0.5 bg-polar-nightDark/10 rounded text-xs">npm install -g pnpm</code>)</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-6 h-6 bg-frost-ice/10 text-frost-arctic rounded-full text-sm font-semibold shrink-0">3</span>
              <div>
                <strong className="text-polar-night">React 18 or higher</strong>
                <p className="text-sm text-polar-nightMedium mt-1">Design system components are built with React 18 features</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center w-6 h-6 bg-frost-ice/10 text-frost-arctic rounded-full text-sm font-semibold shrink-0">4</span>
              <div>
                <strong className="text-polar-night">TypeScript (recommended)</strong>
                <p className="text-sm text-polar-nightMedium mt-1">All components ship with TypeScript types for the best development experience</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Installation */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Installing the Design System</h2>
        <div className="space-y-4">
          <div className="bg-aurora-yellow/10 border border-aurora-yellow/30 rounded-lg p-4">
            <p className="text-sm text-polar-night">
              <strong>Note:</strong> The design system package is not yet published to npm.
              For now, use workspace references within the monorepo.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-medium text-polar-night mb-3">Within the Monorepo</h3>
            <p className="text-polar-nightMedium mb-3">
              From within a consuming package in the monorepo, add the design system as a workspace dependency:
            </p>
            <div className="bg-polar-night rounded-lg p-4 overflow-x-auto">
              <pre className="text-snow-stormLightest text-sm">
{`pnpm add @second-turn/design-system --workspace`}
              </pre>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-polar-night mb-3">After npm Publication (Future)</h3>
            <p className="text-polar-nightMedium mb-3">
              Once published to npm, install via:
            </p>
            <div className="bg-polar-night rounded-lg p-4 overflow-x-auto">
              <pre className="text-snow-stormLightest text-sm">
{`pnpm add @second-turn/design-system`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Tailwind Configuration */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Configuring Tailwind CSS</h2>
        <p className="text-polar-nightMedium mb-4">
          The design system uses Tailwind CSS with custom tokens. You need to configure Tailwind
          in your consuming project to generate styles for design system components.
        </p>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-polar-night mb-3">Step 1: Install Tailwind CSS</h3>
            <div className="bg-polar-night rounded-lg p-4 overflow-x-auto">
              <pre className="text-snow-stormLightest text-sm">
{`pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p`}
              </pre>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-polar-night mb-3">Step 2: Configure Tailwind</h3>
            <p className="text-polar-nightMedium mb-3">
              Update your <code className="px-1.5 py-0.5 bg-polar-nightDark/10 rounded text-sm">tailwind.config.js</code> to import design tokens and scan design system components:
            </p>
            <div className="bg-polar-night rounded-lg p-4 overflow-x-auto">
              <pre className="text-snow-stormLightest text-sm">
{`import { colors, spacing, typography, borderRadius, shadows } from '@second-turn/design-system/tokens';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    // IMPORTANT: Include design system source files so Tailwind generates their styles
    './node_modules/@second-turn/design-system/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        polar: colors.polar,
        snow: colors.snow,
        frost: colors.frost,
        aurora: colors.aurora,
        primary: colors.semantic.primary,
        accent: colors.semantic.accent,
        success: colors.semantic.success,
        error: colors.semantic.error,
        warning: colors.semantic.warning,
        text: {
          DEFAULT: colors.semantic.textPrimary,
          secondary: colors.semantic.textSecondary,
          muted: colors.semantic.textMuted,
          inverse: colors.semantic.textInverse,
        },
        bg: {
          DEFAULT: colors.semantic.bgPrimary,
          secondary: colors.semantic.bgSecondary,
          elevated: colors.semantic.bgElevated,
        },
        border: {
          DEFAULT: colors.semantic.borderDefault,
          subtle: colors.semantic.borderSubtle,
          strong: colors.semantic.borderStrong,
        },
        condition: colors.condition,
      },
      spacing: spacing,
      fontFamily: {
        sans: typography.fontFamily.primary.split(','),
      },
      fontSize: typography.fontSize,
      fontWeight: {
        normal: String(typography.fontWeight.normal),
        medium: String(typography.fontWeight.medium),
        semibold: String(typography.fontWeight.semibold),
        bold: String(typography.fontWeight.bold),
      },
      lineHeight: {
        normal: String(typography.lineHeight.normal),
        relaxed: String(typography.lineHeight.relaxed),
      },
      borderRadius: borderRadius,
      boxShadow: shadows,
      ringWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
};`}
              </pre>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-polar-night mb-3">Step 3: Import Design System Styles</h3>
            <p className="text-polar-nightMedium mb-3">
              Import the design system CSS in your global stylesheet or layout file:
            </p>
            <div className="bg-polar-night rounded-lg p-4 overflow-x-auto">
              <pre className="text-snow-stormLightest text-sm">
{`// app/globals.css or similar
@import '@second-turn/design-system/styles';

@tailwind base;
@tailwind components;
@tailwind utilities;`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Font Setup */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Font Setup</h2>
        <p className="text-polar-nightMedium mb-6">
          The design system uses the Inter font family. Choose the loading method that fits your framework:
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Next.js */}
          <div className="bg-snow-white shadow-sm rounded-lg p-6 border border-border">
            <h3 className="text-lg font-semibold text-polar-night mb-3 flex items-center gap-2">
              <span className="px-2 py-1 bg-polar-night text-snow-white text-xs font-mono rounded">Next.js</span>
            </h3>
            <p className="text-sm text-polar-nightMedium mb-3">
              Use next/font for optimized font loading:
            </p>
            <div className="bg-polar-night rounded-lg p-3 overflow-x-auto">
              <pre className="text-snow-stormLightest text-xs">
{`import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html className={inter.className}>
      <body>{children}</body>
    </html>
  );
}`}
              </pre>
            </div>
          </div>

          {/* Other Frameworks */}
          <div className="bg-snow-white shadow-sm rounded-lg p-6 border border-border">
            <h3 className="text-lg font-semibold text-polar-night mb-3 flex items-center gap-2">
              <span className="px-2 py-1 bg-polar-night text-snow-white text-xs font-mono rounded">Other</span>
            </h3>
            <p className="text-sm text-polar-nightMedium mb-3">
              Use Google Fonts CDN in your HTML head:
            </p>
            <div className="bg-polar-night rounded-lg p-3 overflow-x-auto">
              <pre className="text-snow-stormLightest text-xs">
{`<link rel="preconnect"
  href="https://fonts.googleapis.com">
<link rel="preconnect"
  href="https://fonts.gstatic.com"
  crossorigin>
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
  rel="stylesheet">`}
              </pre>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-frost-ice/5 border border-frost-ice/20 rounded-lg">
          <p className="text-sm text-polar-nightMedium">
            The design system tokens reference Inter by name. As long as the font is loaded and available,
            the typography will work correctly regardless of your loading method.
          </p>
        </div>
      </section>

      {/* Usage */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Importing and Using Components</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-polar-night mb-3">Import Components</h3>
            <p className="text-polar-nightMedium mb-3">
              Import individual components from the design system package:
            </p>
            <div className="bg-polar-night rounded-lg p-4 overflow-x-auto">
              <pre className="text-snow-stormLightest text-sm">
{`// Import a single component
import { Button } from '@second-turn/design-system';

// Import multiple components
import { Button, Card, Badge, Input } from '@second-turn/design-system';

// Import design tokens
import { colors, spacing } from '@second-turn/design-system/tokens';`}
              </pre>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-polar-night mb-3">Use Components in JSX</h3>
            <div className="bg-polar-night rounded-lg p-4 overflow-x-auto">
              <pre className="text-snow-stormLightest text-sm">
{`export default function GameListingPage() {
  return (
    <div className="p-6">
      <Card>
        <h2 className="text-2xl font-bold mb-4">Settlers of Catan</h2>
        <Badge variant="success">Very Good</Badge>
        <p className="mt-4 text-polar-nightMedium">
          Classic strategy game in excellent condition.
        </p>
        <div className="flex gap-3 mt-6">
          <Button variant="primary">Buy Now - €32</Button>
          <Button variant="secondary">Add to Wishlist</Button>
        </div>
      </Card>
    </div>
  );
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Quick Start Example</h2>
        <p className="text-polar-nightMedium mb-4">
          Here's a complete minimal example to get you started:
        </p>
        <div className="bg-polar-night rounded-lg p-4 overflow-x-auto">
          <pre className="text-snow-stormLightest text-sm">
{`// app/page.tsx
import { Button, Card } from '@second-turn/design-system';

export default function Home() {
  return (
    <main className="min-h-screen bg-snow-stormLightest p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-polar-night mb-8">
          Second Turn Games
        </h1>

        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-2">
            Welcome to the Marketplace
          </h2>
          <p className="text-polar-nightMedium mb-6">
            Every game deserves a second turn. Browse quality
            pre-owned board games from trusted sellers.
          </p>
          <Button variant="primary">
            Browse Games
          </Button>
        </Card>
      </div>
    </main>
  );
}`}
          </pre>
        </div>
      </section>

      {/* Troubleshooting */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Troubleshooting</h2>
        <div className="space-y-4">
          <details className="bg-snow-white shadow-sm rounded-lg border border-border">
            <summary className="p-4 cursor-pointer font-medium text-polar-night hover:bg-snow-stormLight transition-colors">
              Tailwind classes aren't working
            </summary>
            <div className="px-4 pb-4 text-sm text-polar-nightMedium space-y-2">
              <p><strong>Solution:</strong> Ensure your Tailwind config includes the design system source files in the content array:</p>
              <code className="block px-3 py-2 bg-polar-nightDark/5 rounded text-xs mt-2">
                './node_modules/@second-turn/design-system/src/**/*.{'{'}js,ts,jsx,tsx{'}'}',
              </code>
              <p className="mt-2">This tells Tailwind to scan design system components and generate CSS for all classes they use.</p>
            </div>
          </details>

          <details className="bg-snow-white shadow-sm rounded-lg border border-border">
            <summary className="p-4 cursor-pointer font-medium text-polar-night hover:bg-snow-stormLight transition-colors">
              Fonts aren't loading correctly
            </summary>
            <div className="px-4 pb-4 text-sm text-polar-nightMedium space-y-2">
              <p><strong>Solution:</strong> Verify your font import is correct for your framework:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Next.js: Check that next/font/google Inter import is in your root layout</li>
                <li>Other frameworks: Verify the Google Fonts link is in your HTML head</li>
                <li>Check browser DevTools Network tab to confirm font files are loading</li>
              </ul>
            </div>
          </details>

          <details className="bg-snow-white shadow-sm rounded-lg border border-border">
            <summary className="p-4 cursor-pointer font-medium text-polar-night hover:bg-snow-stormLight transition-colors">
              TypeScript shows import errors
            </summary>
            <div className="px-4 pb-4 text-sm text-polar-nightMedium space-y-2">
              <p><strong>Solution:</strong> Ensure the design system package exports types correctly:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Check that @second-turn/design-system is in your package.json dependencies</li>
                <li>Try running <code className="px-1 py-0.5 bg-polar-nightDark/10 rounded text-xs">pnpm install</code> to refresh dependencies</li>
                <li>Restart your TypeScript server in your editor</li>
              </ul>
            </div>
          </details>

          <details className="bg-snow-white shadow-sm rounded-lg border border-border">
            <summary className="p-4 cursor-pointer font-medium text-polar-night hover:bg-snow-stormLight transition-colors">
              Components using hooks show 'use client' errors in Next.js
            </summary>
            <div className="px-4 pb-4 text-sm text-polar-nightMedium space-y-2">
              <p><strong>Solution:</strong> The design system components that use hooks (Select, Modal) already have 'use client' directives. If you see this error:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Ensure you're importing from the built package, not source files</li>
                <li>Rebuild the design system: <code className="px-1 py-0.5 bg-polar-nightDark/10 rounded text-xs">pnpm build:ds</code></li>
                <li>Clear Next.js cache: <code className="px-1 py-0.5 bg-polar-nightDark/10 rounded text-xs">rm -rf .next</code></li>
              </ul>
            </div>
          </details>
        </div>
      </section>

      {/* Next Steps */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Next Steps</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <a href="/tokens/colors" className="block p-6 bg-snow-white shadow-sm hover:shadow-md rounded-lg border border-border transition-shadow">
            <h3 className="font-semibold text-polar-night mb-2">Explore Design Tokens</h3>
            <p className="text-sm text-polar-nightMedium">Learn about colors, typography, spacing, and shadows</p>
          </a>
          <a href="/components/button" className="block p-6 bg-snow-white shadow-sm hover:shadow-md rounded-lg border border-border transition-shadow">
            <h3 className="font-semibold text-polar-night mb-2">Browse Components</h3>
            <p className="text-sm text-polar-nightMedium">See all available components with usage examples</p>
          </a>
          <a href="/" className="block p-6 bg-snow-white shadow-sm hover:shadow-md rounded-lg border border-border transition-shadow">
            <h3 className="font-semibold text-polar-night mb-2">Design Philosophy</h3>
            <p className="text-sm text-polar-nightMedium">Understand Nordic minimalism and our design principles</p>
          </a>
        </div>
      </section>
    </div>
  );
}
