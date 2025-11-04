'use client';

import { Modal, Button } from '@second-turn/design-system';
import { ComponentDemo } from '@/components/ComponentDemo';
import { useState } from 'react';

export default function ModalPage() {
  const [basicOpen, setBasicOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [sizeSmOpen, setSizeSmOpen] = useState(false);
  const [sizeLgOpen, setSizeLgOpen] = useState(false);

  return (
    <div className="space-y-12">
      {/* Overview */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">Modal</h1>
        <p className="text-lg text-polar-nightMedium max-w-3xl leading-relaxed">
          Modals present focused content that requires user attention or action before continuing.
          Essential for purchase confirmations, image viewing, and multi-step forms.
        </p>
      </section>

      {/* Marketplace Use Case */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Marketplace Context</h2>
        <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-6">
          <p className="text-polar-nightMedium leading-relaxed mb-4">
            The Modal component handles critical marketplace interactions:
          </p>
          <ul className="space-y-2 text-polar-nightMedium">
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">•</span>
              <span><strong>Purchase confirmations:</strong> Show final price, shipping, and total before completing transaction</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">•</span>
              <span><strong>Image viewing:</strong> Display full-size condition photos so buyers can assess game state</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">•</span>
              <span><strong>Multi-step forms:</strong> Guide sellers through listing creation without leaving the page</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">•</span>
              <span><strong>Destructive confirmations:</strong> Prevent accidental deletions with explicit confirmation</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Basic Usage */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Basic Usage</h2>

        <ComponentDemo
          title="Basic Modal"
          description="Simple modal with title and content."
        >
          <Button onClick={() => setBasicOpen(true)}>Open Basic Modal</Button>
          <Modal
            open={basicOpen}
            onClose={() => setBasicOpen(false)}
            title="Welcome to Second Turn Games"
          >
            <p className="text-polar-nightMedium">
              Every game deserves a second turn. Browse quality pre-owned board games
              from trusted sellers across the Baltics.
            </p>
          </Modal>
        </ComponentDemo>

        <ComponentDemo
          title="Confirmation Modal"
          description="Typical purchase confirmation with action buttons in footer."
        >
          <Button variant="primary" onClick={() => setConfirmOpen(true)}>
            Purchase Game
          </Button>
          <Modal
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            title="Confirm Purchase"
            footer={
              <>
                <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    setConfirmOpen(false);
                    // Handle purchase
                  }}
                >
                  Confirm Purchase - €32.00
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-polar-night">Settlers of Catan</h3>
                <p className="text-sm text-polar-nightMedium">Condition: Very Good</p>
              </div>
              <div className="border-t border-border-subtle pt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-polar-nightMedium">Price</span>
                  <span className="text-polar-night">€28.00</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-polar-nightMedium">Shipping</span>
                  <span className="text-polar-night">€4.00</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t border-border-subtle">
                  <span className="text-polar-night">Total</span>
                  <span className="text-polar-night">€32.00</span>
                </div>
              </div>
            </div>
          </Modal>
        </ComponentDemo>

        <ComponentDemo
          title="Form Modal"
          description="Modal containing a form for data collection."
        >
          <Button onClick={() => setFormOpen(true)}>Contact Seller</Button>
          <Modal
            open={formOpen}
            onClose={() => setFormOpen(false)}
            title="Send Message to Seller"
            footer={
              <>
                <Button variant="secondary" onClick={() => setFormOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => setFormOpen(false)}>
                  Send Message
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-polar-night mb-1.5">
                  Your Message
                </label>
                <textarea
                  className="w-full px-3 py-2 border-2 border-border rounded-md focus:border-frost-ice focus:ring-3 focus:ring-frost-ice/30 transition-colors"
                  rows={4}
                  placeholder="Ask about condition, shipping, or negotiate price..."
                />
              </div>
              <p className="text-sm text-polar-nightMedium">
                Be respectful and specific. Sellers typically respond within 24 hours.
              </p>
            </div>
          </Modal>
        </ComponentDemo>
      </section>

      {/* Sizes */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Sizes</h2>

        <ComponentDemo
          title="Modal Sizes"
          description="Different sizes for different content needs."
        >
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => setSizeSmOpen(true)}>Small Modal</Button>
            <Button onClick={() => setBasicOpen(true)}>Medium Modal (Default)</Button>
            <Button onClick={() => setSizeLgOpen(true)}>Large Modal</Button>
          </div>

          <Modal
            open={sizeSmOpen}
            onClose={() => setSizeSmOpen(false)}
            title="Small Modal"
            size="sm"
          >
            <p className="text-polar-nightMedium">
              Small modals (max-width: 448px) work well for simple confirmations and alerts.
            </p>
          </Modal>

          <Modal
            open={sizeLgOpen}
            onClose={() => setSizeLgOpen(false)}
            title="Large Modal"
            size="lg"
          >
            <p className="text-polar-nightMedium mb-4">
              Large modals (max-width: 672px) provide space for forms, detailed content, or image galleries.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-32 bg-polar-nightDark/10 rounded"></div>
              <div className="h-32 bg-polar-nightDark/10 rounded"></div>
              <div className="h-32 bg-polar-nightDark/10 rounded"></div>
              <div className="h-32 bg-polar-nightDark/10 rounded"></div>
            </div>
          </Modal>
        </ComponentDemo>
      </section>

      {/* Real Marketplace Examples */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Real Marketplace Examples</h2>

        <ComponentDemo
          title="Delete Listing Confirmation"
          description="Destructive action requiring explicit confirmation."
        >
          <Button variant="danger">Delete Listing</Button>
          <Modal
            open={false}
            onClose={() => {}}
            title="Delete Game Listing?"
            size="sm"
            footer={
              <>
                <Button variant="secondary">Cancel</Button>
                <Button variant="danger">Yes, Delete Listing</Button>
              </>
            }
          >
            <div className="space-y-4">
              <p className="text-polar-nightMedium">
                Are you sure you want to delete your listing for <strong>Settlers of Catan</strong>?
              </p>
              <div className="p-3 bg-aurora-red/10 border border-aurora-red/30 rounded">
                <p className="text-sm text-polar-night">
                  This action cannot be undone. Any pending messages with buyers will be lost.
                </p>
              </div>
            </div>
          </Modal>
        </ComponentDemo>

        <div className="bg-polar-nightDark/5 border border-polar-nightDark/20 rounded-lg p-6 mt-6">
          <h3 className="font-semibold text-polar-night mb-2">Implementation Note</h3>
          <p className="text-sm text-polar-nightMedium">
            The examples above show modal structure. In production, wire up state management
            to control open/close behavior and handle user actions in the footer buttons.
          </p>
        </div>
      </section>

      {/* Animations */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Animations</h2>

        <div className="bg-snow-white shadow-sm rounded-lg p-6 border border-border">
          <p className="text-polar-nightMedium leading-relaxed mb-4">
            Modals use our 300ms "slow" timing for overlays, creating a calm, deliberate feel:
          </p>
          <ul className="space-y-2 text-polar-nightMedium">
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">•</span>
              <span><strong>Backdrop:</strong> Fades in over 300ms to polar night at 60% opacity</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">•</span>
              <span><strong>Content:</strong> Simultaneously fades in and scales from 95% to 100%</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">•</span>
              <span><strong>Exit:</strong> Reverses the animation smoothly when closing</span>
            </li>
          </ul>
          <p className="text-sm text-polar-nightMedium mt-4 italic">
            The slower 300ms timing (vs our standard 200ms) gives users time to orient to the
            modal's appearance rather than feeling jarred by sudden UI changes.
          </p>
        </div>
      </section>

      {/* Focus Management */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Focus Management & Keyboard</h2>

        <div className="bg-snow-white shadow-sm rounded-lg p-6 border border-border space-y-4">
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Focus Trap</h3>
            <p className="text-polar-nightMedium">
              When a modal opens, keyboard focus moves to the first interactive element inside.
              Tab navigation cycles only through modal elements - you can't accidentally tab to
              elements behind the modal. This prevents confusion and maintains context.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Focus Restoration</h3>
            <p className="text-polar-nightMedium">
              When closing the modal, focus returns to the element that opened it (typically
              the trigger button). This maintains navigation flow and helps keyboard users
              understand where they are in the interface.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Escape Key</h3>
            <p className="text-polar-nightMedium">
              Pressing Escape closes the modal, calling the onClose callback. This matches
              user expectations and provides a quick exit without requiring mouse interaction.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Body Scroll Prevention</h3>
            <p className="text-polar-nightMedium">
              When a modal is open, scrolling on the body element is prevented. This ensures
              users don't accidentally scroll the page behind the modal, which breaks immersion
              and can cause confusion.
            </p>
          </div>
        </div>
      </section>

      {/* Usage Guidelines */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Usage Guidelines</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Do */}
          <div className="border-2 border-success rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-success rounded-full flex items-center justify-center text-white text-sm font-bold">✓</div>
              <h3 className="text-lg font-semibold text-polar-night">Do</h3>
            </div>
            <ul className="space-y-3 text-polar-nightMedium">
              <li className="flex gap-2">
                <span className="text-success mt-1">•</span>
                <span>Use modals for critical actions requiring full user attention</span>
              </li>
              <li className="flex gap-2">
                <span className="text-success mt-1">•</span>
                <span>Keep modal content focused on a single task or decision</span>
              </li>
              <li className="flex gap-2">
                <span className="text-success mt-1">•</span>
                <span>Provide clear action buttons in the footer (primary + secondary)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-success mt-1">•</span>
                <span>Always provide a way to close (X button, Cancel, or backdrop click)</span>
              </li>
            </ul>
          </div>

          {/* Don't */}
          <div className="border-2 border-error rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-error rounded-full flex items-center justify-center text-white text-sm font-bold">✗</div>
              <h3 className="text-lg font-semibold text-polar-night">Don't</h3>
            </div>
            <ul className="space-y-3 text-polar-nightMedium">
              <li className="flex gap-2">
                <span className="text-error mt-1">•</span>
                <span>Stack modals on top of each other - redesign the flow instead</span>
              </li>
              <li className="flex gap-2">
                <span className="text-error mt-1">•</span>
                <span>Use modals for lengthy forms - consider a dedicated page instead</span>
              </li>
              <li className="flex gap-2">
                <span className="text-error mt-1">•</span>
                <span>Open modals automatically on page load - this feels aggressive</span>
              </li>
              <li className="flex gap-2">
                <span className="text-error mt-1">•</span>
                <span>Prevent closing for non-critical content - respect user autonomy</span>
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

import { Modal, Button } from '@second-turn/design-system';
import { useState } from 'react';

function PurchaseButton() {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handlePurchase = () => {
    // Process purchase
    console.log('Purchase confirmed');
    setConfirmOpen(false);
  };

  return (
    <>
      <Button
        variant="primary"
        onClick={() => setConfirmOpen(true)}
      >
        Buy Now - €32.00
      </Button>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Purchase"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handlePurchase}
            >
              Confirm Purchase
            </Button>
          </>
        }
      >
        <p>Are you sure you want to purchase Catan for €32.00?</p>
      </Modal>
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
            <h3 className="font-semibold text-polar-night mb-2">ARIA Dialog Pattern</h3>
            <p className="text-polar-nightMedium">
              Modal uses role="dialog" and aria-modal="true" to announce its presence to
              assistive technology. The title is linked via aria-labelledby for context.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Focus Trap Implementation</h3>
            <p className="text-polar-nightMedium">
              Tab and Shift+Tab cycle through focusable elements within the modal only.
              Focus never escapes to elements behind the modal, preventing confusion.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Backdrop Accessibility</h3>
            <p className="text-polar-nightMedium">
              The backdrop has aria-hidden="true" since it's purely visual. Clicking the
              backdrop closes the modal, but this isn't announced - it's discovered naturally.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Elevation & Contrast</h3>
            <p className="text-polar-nightMedium">
              Modal uses elevation 4 (shadow-xl) for maximum separation. The 60% opacity
              polar night backdrop ensures sufficient contrast between modal and background.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
