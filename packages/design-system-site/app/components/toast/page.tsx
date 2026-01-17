'use client';

import { Button } from '@second-turn/design-system';
import { ComponentDemo } from '@/components/ComponentDemo';

// Note: Toast requires ToastProvider which is typically at the app root
// For demo purposes, we'll show static examples and code

export default function ToastPage() {
  return (
    <div className="space-y-12">
      {/* Overview */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">Toast</h1>
        <p className="text-lg text-polar-nightMedium max-w-3xl leading-relaxed">
          Toast notifications provide brief, non-blocking feedback about actions or events.
          They appear temporarily and dismiss automatically.
        </p>
      </section>

      {/* Marketplace Use Case */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Marketplace Context</h2>
        <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-6">
          <p className="text-polar-nightMedium leading-relaxed mb-4">
            Toasts keep users informed without interrupting their flow:
          </p>
          <ul className="space-y-2 text-polar-nightMedium">
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Success:</strong> "Listing saved" / "Offer sent" / "Item added to cart"</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Error:</strong> "Failed to save changes" / "Network error"</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Warning:</strong> "Low stock - only 1 left" / "Session expiring soon"</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Info:</strong> "New message received" / "Price updated"</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Toast Types */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Toast Types</h2>

        <ComponentDemo
          title="Success Toast"
          description="Confirms successful actions."
        >
          <div className="flex items-start gap-3 p-4 rounded-lg shadow-lg border bg-snow-white border-aurora-green/30 max-w-sm">
            <svg className="w-5 h-5 text-aurora-green flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
              <path d="m9 11 3 3L22 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex-1">
              <p className="font-medium text-polar-night text-sm">Listing Published</p>
              <p className="text-sm text-text-secondary">Your game is now visible to buyers.</p>
            </div>
          </div>
        </ComponentDemo>

        <ComponentDemo
          title="Error Toast"
          description="Alerts users to failures or problems."
        >
          <div className="flex items-start gap-3 p-4 rounded-lg shadow-lg border bg-snow-white border-aurora-red/30 max-w-sm">
            <svg className="w-5 h-5 text-aurora-red flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="m15 9-6 6M9 9l6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex-1">
              <p className="font-medium text-polar-night text-sm">Payment Failed</p>
              <p className="text-sm text-text-secondary">Please check your card details.</p>
            </div>
          </div>
        </ComponentDemo>

        <ComponentDemo
          title="Warning Toast"
          description="Warns about potential issues."
        >
          <div className="flex items-start gap-3 p-4 rounded-lg shadow-lg border bg-snow-white border-aurora-yellow/30 max-w-sm">
            <svg className="w-5 h-5 text-aurora-yellow flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex-1">
              <p className="font-medium text-polar-night text-sm">Session Expiring</p>
              <p className="text-sm text-text-secondary">Your session will expire in 5 minutes.</p>
            </div>
          </div>
        </ComponentDemo>

        <ComponentDemo
          title="Info Toast"
          description="Provides neutral information."
        >
          <div className="flex items-start gap-3 p-4 rounded-lg shadow-lg border bg-snow-white border-frost-ice/30 max-w-sm">
            <svg className="w-5 h-5 text-frost-ice flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex-1">
              <p className="font-medium text-polar-night text-sm">New Message</p>
              <p className="text-sm text-text-secondary">You have a new message from GameTrader.</p>
            </div>
          </div>
        </ComponentDemo>
      </section>

      {/* Position Options */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Position Options</h2>

        <div className="bg-snow-white shadow-sm rounded-lg p-6 border border-border">
          <p className="text-polar-nightMedium mb-4">
            Toasts can be positioned at any corner or center of the viewport:
          </p>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div className="p-3 bg-bg-secondary rounded">top-left</div>
            <div className="p-3 bg-bg-secondary rounded">top-center</div>
            <div className="p-3 bg-bg-secondary rounded">top-right</div>
            <div className="p-3 bg-frost-ice/10 rounded border border-frost-ice/30">bottom-left</div>
            <div className="p-3 bg-frost-ice/10 rounded border border-frost-ice/30">bottom-center</div>
            <div className="p-3 bg-frost-ice text-snow-white rounded font-medium">bottom-right (default)</div>
          </div>
        </div>
      </section>

      {/* Setup */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Setup</h2>

        <div className="bg-polar-night rounded-lg p-6">
          <pre className="text-sm text-snow-white overflow-x-auto">
            <code>{`// 1. Wrap your app with ToastProvider
// app/providers.tsx or app/layout.tsx

import { ToastProvider } from '@second-turn/design-system';

export function Providers({ children }) {
  return (
    <ToastProvider position="bottom-right" defaultDuration={5000}>
      {children}
    </ToastProvider>
  );
}

// 2. Use the useToast hook in components

import { useToast } from '@second-turn/design-system';

function SaveButton() {
  const toast = useToast();

  const handleSave = async () => {
    try {
      await saveListing();
      toast.success('Listing saved successfully!');
    } catch (error) {
      toast.error('Failed to save listing.');
    }
  };

  return <Button onClick={handleSave}>Save</Button>;
}`}</code>
          </pre>
        </div>
      </section>

      {/* API Reference */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">useToast API</h2>

        <div className="bg-snow-white shadow-sm rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary">
              <tr>
                <th className="text-left p-4 font-medium text-polar-night">Method</th>
                <th className="text-left p-4 font-medium text-polar-night">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="p-4 font-mono text-frost-ice">toast.success(message, options?)</td>
                <td className="p-4 text-polar-nightMedium">Show success toast</td>
              </tr>
              <tr>
                <td className="p-4 font-mono text-frost-ice">toast.error(message, options?)</td>
                <td className="p-4 text-polar-nightMedium">Show error toast</td>
              </tr>
              <tr>
                <td className="p-4 font-mono text-frost-ice">toast.warning(message, options?)</td>
                <td className="p-4 text-polar-nightMedium">Show warning toast</td>
              </tr>
              <tr>
                <td className="p-4 font-mono text-frost-ice">toast.info(message, options?)</td>
                <td className="p-4 text-polar-nightMedium">Show info toast</td>
              </tr>
              <tr>
                <td className="p-4 font-mono text-frost-ice">toast.removeToast(id)</td>
                <td className="p-4 text-polar-nightMedium">Dismiss specific toast by ID</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 bg-snow-white shadow-sm rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-secondary">
              <tr>
                <th className="text-left p-4 font-medium text-polar-night">Option</th>
                <th className="text-left p-4 font-medium text-polar-night">Type</th>
                <th className="text-left p-4 font-medium text-polar-night">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="p-4 font-mono">title</td>
                <td className="p-4 text-text-muted">string</td>
                <td className="p-4 text-polar-nightMedium">Optional title above message</td>
              </tr>
              <tr>
                <td className="p-4 font-mono">duration</td>
                <td className="p-4 text-text-muted">number</td>
                <td className="p-4 text-polar-nightMedium">Auto-dismiss time in ms (0 = persistent)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Accessibility */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Accessibility</h2>

        <div className="bg-snow-white shadow-sm rounded-lg p-6 border border-border space-y-4">
          <div>
            <h3 className="font-semibold text-polar-night mb-2">ARIA Live Region</h3>
            <p className="text-polar-nightMedium">
              Toast container uses role="region" with aria-label="Notifications" so screen readers
              announce new toasts automatically.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Dismiss Button</h3>
            <p className="text-polar-nightMedium">
              Each toast includes a close button with aria-label="Dismiss notification"
              for keyboard and screen reader users.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Color + Icon</h3>
            <p className="text-polar-nightMedium">
              Toast types are indicated by both color and icon, ensuring accessibility
              for color-blind users.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
