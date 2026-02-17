'use client';

import { SlidePanel, Button, Input } from '@second-turn/design-system';
import { ComponentDemo } from '@/components/ComponentDemo';
import { useState } from 'react';

export default function SlidePanelPage() {
  const [basicOpen, setBasicOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [sizeSm, setSizeSm] = useState(false);
  const [sizeMd, setSizeMd] = useState(false);
  const [sizeLg, setSizeLg] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="space-y-12">
      {/* Overview */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">SlidePanel</h1>
        <p className="text-lg text-polar-nightMedium max-w-3xl leading-relaxed">
          SlidePanel is a responsive overlay that slides from the right on desktop and from the bottom on mobile.
          Ideal for forms, filters, and detailed views that need more space than a modal.
        </p>
      </section>

      {/* Marketplace Use Case */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Marketplace Context</h2>
        <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-6">
          <p className="text-polar-nightMedium leading-relaxed mb-4">
            The SlidePanel component is perfect for:
          </p>
          <ul className="space-y-2 text-polar-nightMedium">
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Offer forms:</strong> Make or counter offers with full price breakdown</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Advanced filters:</strong> Show all filtering options on browse pages</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Game details:</strong> Quick view of listing details without leaving the page</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>User profiles:</strong> View seller information and ratings</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Basic Usage */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Basic Usage</h2>

        <ComponentDemo
          title="Basic SlidePanel"
          description="Simple panel with title and content."
        >
          <Button onClick={() => setBasicOpen(true)}>Open Panel</Button>
          <SlidePanel
            open={basicOpen}
            onClose={() => setBasicOpen(false)}
            title="Panel Title"
          >
            <div className="space-y-4">
              <p className="text-polar-nightMedium">
                This is the panel content. It slides from the right on desktop and from the bottom on mobile.
              </p>
              <p className="text-polar-nightMedium">
                The panel includes focus trapping, escape key handling, and body scroll prevention.
              </p>
            </div>
          </SlidePanel>
        </ComponentDemo>

        <ComponentDemo
          title="Form Panel"
          description="Panel containing a form for data collection."
        >
          <Button variant="primary" onClick={() => setFormOpen(true)}>
            Make an Offer
          </Button>
          <SlidePanel
            open={formOpen}
            onClose={() => setFormOpen(false)}
            title="Make an Offer"
          >
            <div className="space-y-6">
              <div className="p-4 bg-bg-secondary rounded-lg">
                <h3 className="font-semibold text-polar-night mb-2">Settlers of Catan</h3>
                <p className="text-sm text-polar-nightMedium">Listed at: EUR 28.00</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-polar-night mb-2">
                  Your Offer Amount
                </label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  prefix="EUR"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-polar-night mb-2">
                  Message to Seller (Optional)
                </label>
                <textarea
                  className="w-full px-3 py-2 border-2 border-border rounded-lg focus:border-frost-ice focus:ring-3 focus:ring-frost-ice/30 transition-colors"
                  rows={3}
                  placeholder="Add a personal message..."
                />
              </div>

              <div className="pt-4 border-t border-border-subtle flex gap-3">
                <Button variant="secondary" onClick={() => setFormOpen(false)} fullWidth>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => setFormOpen(false)} fullWidth>
                  Send Offer
                </Button>
              </div>
            </div>
          </SlidePanel>
        </ComponentDemo>
      </section>

      {/* Sizes */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Sizes</h2>

        <ComponentDemo
          title="Panel Sizes"
          description="Different sizes for different content needs."
        >
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => setSizeSm(true)}>Small (sm)</Button>
            <Button onClick={() => setSizeMd(true)}>Medium (md) - Default</Button>
            <Button onClick={() => setSizeLg(true)}>Large (lg)</Button>
          </div>

          <SlidePanel
            open={sizeSm}
            onClose={() => setSizeSm(false)}
            title="Small Panel"
            size="sm"
          >
            <p className="text-polar-nightMedium">
              Small panels (max-width: 28rem / 448px) are good for simple forms and quick actions.
            </p>
          </SlidePanel>

          <SlidePanel
            open={sizeMd}
            onClose={() => setSizeMd(false)}
            title="Medium Panel"
            size="md"
          >
            <p className="text-polar-nightMedium">
              Medium panels (max-width: 32rem / 512px) work well for most use cases including forms with multiple fields.
            </p>
          </SlidePanel>

          <SlidePanel
            open={sizeLg}
            onClose={() => setSizeLg(false)}
            title="Large Panel"
            size="lg"
          >
            <p className="text-polar-nightMedium">
              Large panels (max-width: 42rem / 672px) provide space for complex forms, detailed content, or data tables.
            </p>
          </SlidePanel>
        </ComponentDemo>
      </section>

      {/* Real Marketplace Example */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Real Marketplace Examples</h2>

        <ComponentDemo
          title="Advanced Filters"
          description="Filter panel for browse page."
        >
          <Button onClick={() => setFiltersOpen(true)}>
            Show Filters
          </Button>
          <SlidePanel
            open={filtersOpen}
            onClose={() => setFiltersOpen(false)}
            title="Filter Games"
            size="sm"
          >
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-polar-night mb-2">
                  Price Range
                </label>
                <div className="flex items-center gap-2">
                  <Input type="number" placeholder="Min" prefix="EUR" />
                  <span className="text-text-muted">-</span>
                  <Input type="number" placeholder="Max" prefix="EUR" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-polar-night mb-3">
                  Condition
                </label>
                <div className="space-y-2">
                  {['Like New', 'Very Good', 'Good', 'Acceptable'].map((condition) => (
                    <label key={condition} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-border text-frost-ice focus:ring-frost-ice" />
                      <span className="text-polar-nightMedium">{condition}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-polar-night mb-3">
                  Language
                </label>
                <div className="space-y-2">
                  {['English', 'German', 'French', 'Other'].map((lang) => (
                    <label key={lang} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" className="rounded border-border text-frost-ice focus:ring-frost-ice" />
                      <span className="text-polar-nightMedium">{lang}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border-subtle flex gap-3">
                <Button variant="ghost" fullWidth>
                  Reset
                </Button>
                <Button variant="primary" onClick={() => setFiltersOpen(false)} fullWidth>
                  Apply Filters
                </Button>
              </div>
            </div>
          </SlidePanel>
        </ComponentDemo>
      </section>

      {/* Responsive Behavior */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Responsive Behavior</h2>

        <div className="bg-snow-white shadow-sm rounded-lg p-6 border border-border space-y-4">
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Desktop (md+)</h3>
            <p className="text-polar-nightMedium">
              Panel slides in from the right edge, taking full height of the viewport.
              Width is controlled by the size prop. Content scrolls independently.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Mobile</h3>
            <p className="text-polar-nightMedium">
              Panel slides up from the bottom with rounded top corners, capped at 90% viewport height.
              This matches native mobile sheet patterns for familiar interaction.
            </p>
          </div>
        </div>
      </section>

      {/* vs Modal */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">SlidePanel vs Modal</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-snow-white shadow-sm rounded-lg p-6 border border-border">
            <h3 className="font-semibold text-polar-night mb-3">Use SlidePanel when:</h3>
            <ul className="space-y-2 text-polar-nightMedium">
              <li className="flex gap-2">
                <span className="text-frost-ice">-</span>
                <span>Content needs more vertical space (forms, lists)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-frost-ice">-</span>
                <span>User may need to scroll through content</span>
              </li>
              <li className="flex gap-2">
                <span className="text-frost-ice">-</span>
                <span>Task involves multiple steps or fields</span>
              </li>
              <li className="flex gap-2">
                <span className="text-frost-ice">-</span>
                <span>On mobile, a native sheet pattern is preferred</span>
              </li>
            </ul>
          </div>

          <div className="bg-snow-white shadow-sm rounded-lg p-6 border border-border">
            <h3 className="font-semibold text-polar-night mb-3">Use Modal when:</h3>
            <ul className="space-y-2 text-polar-nightMedium">
              <li className="flex gap-2">
                <span className="text-frost-ice">-</span>
                <span>Content is short and centered (confirmations)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-frost-ice">-</span>
                <span>User needs to make a quick decision</span>
              </li>
              <li className="flex gap-2">
                <span className="text-frost-ice">-</span>
                <span>Viewing media that should be centered (images)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-frost-ice">-</span>
                <span>Consistent appearance across device sizes</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Code Example</h2>

        <div className="bg-polar-night rounded-lg p-6">
          <pre className="text-sm text-snow-white overflow-x-auto">
            <code>{`'use client';

import { SlidePanel, Button, Input } from '@second-turn/design-system';
import { useState } from 'react';

function OfferForm({ listing }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Make an Offer
      </Button>

      <SlidePanel
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Make an Offer"
        size="md"
      >
        <div className="space-y-6">
          <div className="p-4 bg-bg-secondary rounded-lg">
            <h3 className="font-semibold">{listing.title}</h3>
            <p className="text-sm">Listed at: {listing.price}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Your Offer Amount
            </label>
            <Input type="number" placeholder="Enter amount" />
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsOpen(false)}
              fullWidth
            >
              Cancel
            </Button>
            <Button variant="primary" fullWidth>
              Send Offer
            </Button>
          </div>
        </div>
      </SlidePanel>
    </>
  );
}`}</code>
          </pre>
        </div>
      </section>

      {/* Accessibility */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Accessibility</h2>

        <div className="bg-snow-white shadow-sm rounded-lg p-6 border border-border space-y-4">
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Focus Management</h3>
            <p className="text-polar-nightMedium">
              When opened, focus moves to the first focusable element inside the panel.
              Tab navigation is trapped within the panel. On close, focus returns to the trigger element.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Keyboard Support</h3>
            <p className="text-polar-nightMedium">
              Press Escape to close the panel. Tab and Shift+Tab cycle through panel elements only.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">ARIA Attributes</h3>
            <p className="text-polar-nightMedium">
              Uses role=&quot;dialog&quot; and aria-modal=&quot;true&quot;. Title is linked via aria-labelledby.
              Backdrop has aria-hidden=&quot;true&quot;.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
