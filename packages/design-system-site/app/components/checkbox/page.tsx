'use client';

import { Checkbox } from '@second-turn/design-system';
import { ComponentDemo } from '@/components/ComponentDemo';
import { useState } from 'react';

export default function CheckboxPage() {
  const [allCards, setAllCards] = useState(true);
  const [rulebook, setRulebook] = useState(true);
  const [originalBox, setOriginalBox] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  return (
    <div className="space-y-12">
      {/* Overview */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">Checkbox</h1>
        <p className="text-lg text-polar-nightMedium max-w-3xl leading-relaxed">
          Checkboxes enable multi-select options and boolean choices throughout forms.
          Essential for game completeness tracking, filter selections, and agreement confirmations.
        </p>
      </section>

      {/* Marketplace Use Case */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Marketplace Context</h2>
        <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-6">
          <p className="text-polar-nightMedium leading-relaxed mb-4">
            The Checkbox component addresses critical marketplace transparency needs:
          </p>
          <ul className="space-y-2 text-polar-nightMedium">
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">•</span>
              <span><strong>Completeness tracking:</strong> Sellers indicate whether all cards, rulebook, and original box are present</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">•</span>
              <span><strong>Multi-select filters:</strong> Buyers filter by multiple categories, conditions, or features simultaneously</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">•</span>
              <span><strong>Trust through honesty:</strong> Encouraging sellers to honestly report missing components builds buyer confidence</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Basic Usage */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Basic Usage</h2>

        <ComponentDemo
          title="Simple Checkbox"
          description="Most basic form - just the checkbox itself without label."
        >
          <Checkbox />
        </ComponentDemo>

        <ComponentDemo
          title="With Label"
          description="Labels make checkboxes clearer and increase the clickable area."
        >
          <Checkbox
            label="All cards present"
            checked={allCards}
            onChange={(e) => setAllCards(e.target.checked)}
          />
        </ComponentDemo>

        <ComponentDemo
          title="With Helper Text"
          description="Provide context to help sellers be honest about completeness."
        >
          <Checkbox
            label="Original rulebook included"
            helperText="Digital copies don't count - only include the physical rulebook"
            checked={rulebook}
            onChange={(e) => setRulebook(e.target.checked)}
          />
        </ComponentDemo>
      </section>

      {/* States */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">States</h2>

        <ComponentDemo
          title="Checked State"
          description="Uses frost ice color to signal trust and confirmation."
        >
          <Checkbox
            label="Verified seller badge earned"
            checked={true}
            readOnly
          />
        </ComponentDemo>

        <ComponentDemo
          title="Error State"
          description="Show validation errors for required checkboxes."
        >
          <Checkbox
            label="I agree to the terms of service"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            error={!termsAccepted ? "You must accept the terms to continue" : undefined}
          />
        </ComponentDemo>

        <ComponentDemo
          title="Disabled State"
          description="Indicate unavailable or predetermined options."
        >
          <Checkbox
            label="Miniatures included (not applicable for this game)"
            disabled
          />
        </ComponentDemo>
      </section>

      {/* Real Marketplace Examples */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Real Marketplace Examples</h2>

        <ComponentDemo
          title="Game Completeness Checklist"
          description="Typical listing form section where sellers document what's included."
        >
          <div className="bg-snow-white shadow-sm rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold text-polar-night mb-4">What&apos;s Included?</h3>
            <p className="text-sm text-polar-nightMedium mb-4">
              Be honest about completeness to build trust with buyers.
            </p>
            <div className="space-y-3">
              <Checkbox
                label="All game cards present"
                checked={allCards}
                onChange={(e) => setAllCards(e.target.checked)}
              />
              <Checkbox
                label="Original rulebook included"
                checked={rulebook}
                onChange={(e) => setRulebook(e.target.checked)}
              />
              <Checkbox
                label="Original box in good condition"
                checked={originalBox}
                onChange={(e) => setOriginalBox(e.target.checked)}
                helperText="Minor shelf wear is acceptable"
              />
            </div>
          </div>
        </ComponentDemo>

        <ComponentDemo
          title="Multi-Select Filter Panel"
          description="Buyers selecting multiple categories to browse simultaneously."
        >
          <div className="bg-snow-white shadow-sm rounded-lg p-6 max-w-sm">
            <h3 className="text-lg font-semibold text-polar-night mb-4">Filter by Category</h3>
            <div className="space-y-3">
              <Checkbox label="Strategy Games" defaultChecked />
              <Checkbox label="Party Games" />
              <Checkbox label="Cooperative" defaultChecked />
              <Checkbox label="Card Games" />
              <Checkbox label="Family Games" />
            </div>
          </div>
        </ComponentDemo>
      </section>

      {/* Touch Targets */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Touch Accessibility</h2>

        <div className="bg-snow-white shadow-sm rounded-lg p-6 border border-border">
          <p className="text-polar-nightMedium leading-relaxed mb-4">
            While the checkbox itself is visually 20px × 20px, the actual clickable area extends
            to 44px height to meet WCAG touch target guidelines. The label also increases the
            clickable area - clicking anywhere on the label text toggles the checkbox.
          </p>
          <div className="p-6 bg-frost-ice/5 border-2 border-frost-ice/30 rounded-lg">
            <Checkbox
              label="Hover over this entire area to see the extended clickable region"
              helperText="The cursor changes to pointer across the full 44px height"
            />
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
                <span>Always provide labels - checkboxes without context are confusing</span>
              </li>
              <li className="flex gap-2">
                <span className="text-success mt-1">•</span>
                <span>Use checkboxes for independent choices that don&apos;t exclude each other</span>
              </li>
              <li className="flex gap-2">
                <span className="text-success mt-1">•</span>
                <span>Group related checkboxes together with a clear section heading</span>
              </li>
              <li className="flex gap-2">
                <span className="text-success mt-1">•</span>
                <span>Use helper text to clarify what checking/unchecking means</span>
              </li>
            </ul>
          </div>

          {/* Don't */}
          <div className="border-2 border-error rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-error rounded-full flex items-center justify-center text-white text-sm font-bold">✗</div>
              <h3 className="text-lg font-semibold text-polar-night">Don&apos;t</h3>
            </div>
            <ul className="space-y-3 text-polar-nightMedium">
              <li className="flex gap-2">
                <span className="text-error mt-1">•</span>
                <span>Use checkboxes for mutually exclusive options - use Radio instead</span>
              </li>
              <li className="flex gap-2">
                <span className="text-error mt-1">•</span>
                <span>Create dependencies between checkboxes without clear indication</span>
              </li>
              <li className="flex gap-2">
                <span className="text-error mt-1">•</span>
                <span>Use negative phrasing like &quot;Don&apos;t include original box&quot; - confusing</span>
              </li>
              <li className="flex gap-2">
                <span className="text-error mt-1">•</span>
                <span>Pre-check boxes for actions that benefit you over the user</span>
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

import { Checkbox } from '@second-turn/design-system';
import { useState } from 'react';

function GameCompletenessForm() {
  const [allCards, setAllCards] = useState(true);
  const [rulebook, setRulebook] = useState(true);
  const [originalBox, setOriginalBox] = useState(false);

  return (
    <div>
      <h3>What's Included?</h3>

      <Checkbox
        label="All game cards present"
        checked={allCards}
        onChange={(e) => setAllCards(e.target.checked)}
      />

      <Checkbox
        label="Original rulebook included"
        checked={rulebook}
        onChange={(e) => setRulebook(e.target.checked)}
        helperText="Digital copies don't count"
      />

      <Checkbox
        label="Original box in good condition"
        checked={originalBox}
        onChange={(e) => setOriginalBox(e.target.checked)}
      />
    </div>
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
            <h3 className="font-semibold text-polar-night mb-2">Keyboard Navigation</h3>
            <p className="text-polar-nightMedium">
              Space key toggles checkbox state. Tab moves focus to next form element.
              Focus ring is clearly visible (3px frost ice at 30% opacity).
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Touch Targets</h3>
            <p className="text-polar-nightMedium">
              44px minimum clickable area meets WCAG 2.5.5 guidelines. The entire label
              is also clickable, extending the interaction area naturally.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Screen Reader Support</h3>
            <p className="text-polar-nightMedium">
              Proper label association via htmlFor. Helper text and errors linked via
              aria-describedby. Invalid states announced via aria-invalid.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Visual Feedback</h3>
            <p className="text-polar-nightMedium">
              Frost ice background when checked provides clear visual confirmation.
              Error state uses aurora red border without relying solely on color.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
