'use client';

import { Select } from '@second-turn/design-system';
import { ComponentDemo } from '@/components/ComponentDemo';
import { useState } from 'react';

export default function SelectPage() {
  const [condition, setCondition] = useState('');
  const [category, setCategory] = useState('strategy');
  const [errorValue, setErrorValue] = useState('');

  const conditionOptions = [
    { value: 'likeNew', label: '📦 Like New' },
    { value: 'veryGood', label: '✨ Very Good' },
    { value: 'good', label: '🎲 Good' },
    { value: 'acceptable', label: '🔧 Acceptable' },
    { value: 'forParts', label: '⚙️ For Parts' },
  ];

  const categoryOptions = [
    { value: 'strategy', label: 'Strategy' },
    { value: 'party', label: 'Party Games' },
    { value: 'family', label: 'Family' },
    { value: 'cooperative', label: 'Cooperative' },
    { value: 'card', label: 'Card Games' },
  ];

  return (
    <div className="space-y-12">
      {/* Overview */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">Select</h1>
        <p className="text-lg text-polar-nightMedium max-w-3xl leading-relaxed">
          Select components provide dropdowns for filters and forms throughout the marketplace.
          Essential for game condition filters, category selection, and listing creation forms.
        </p>
      </section>

      {/* Marketplace Use Case */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Marketplace Context</h2>
        <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-6">
          <p className="text-polar-nightMedium leading-relaxed mb-4">
            The Select component solves critical marketplace needs:
          </p>
          <ul className="space-y-2 text-polar-nightMedium">
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">•</span>
              <span><strong>Browsing filters:</strong> Users need to filter games by condition, category, player count, and complexity</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">•</span>
              <span><strong>Listing creation:</strong> Sellers choose condition grade, category, and game complexity when listing</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">•</span>
              <span><strong>Trust through clarity:</strong> Keyboard navigation and clear focus states build confidence in selections</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Basic Usage */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Basic Usage</h2>

        <ComponentDemo
          title="Condition Filter"
          description="Most common marketplace use case - filtering games by condition grade."
        >
          <Select
            label="Game Condition"
            options={conditionOptions}
            value={condition}
            onChange={setCondition}
            placeholder="Select condition..."
          />
        </ComponentDemo>

        <ComponentDemo
          title="With Initial Value"
          description="Pre-selected values guide users toward common choices."
        >
          <Select
            label="Category"
            options={categoryOptions}
            value={category}
            onChange={setCategory}
          />
        </ComponentDemo>

        <ComponentDemo
          title="With Helper Text"
          description="Provide context to help users make informed choices."
        >
          <Select
            label="Player Count"
            options={[
              { value: '1-2', label: '1-2 Players' },
              { value: '3-4', label: '3-4 Players' },
              { value: '5+', label: '5+ Players' },
            ]}
            helperText="Filter games by supported player count"
            placeholder="Any player count"
          />
        </ComponentDemo>
      </section>

      {/* Sizes */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Sizes</h2>

        <ComponentDemo
          title="All Sizes"
          description="Sizes match Input component for form consistency."
        >
          <div className="space-y-4">
            <Select
              label="Small (36px)"
              selectSize="sm"
              options={categoryOptions}
              value={category}
              onChange={setCategory}
            />
            <Select
              label="Medium (44px) - Default"
              selectSize="md"
              options={categoryOptions}
              value={category}
              onChange={setCategory}
            />
            <Select
              label="Large (48px)"
              selectSize="lg"
              options={categoryOptions}
              value={category}
              onChange={setCategory}
            />
          </div>
        </ComponentDemo>
      </section>

      {/* States */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">States</h2>

        <ComponentDemo
          title="Error State"
          description="Show validation errors to guide users toward valid selections."
        >
          <Select
            label="Condition"
            options={conditionOptions}
            value={errorValue}
            onChange={setErrorValue}
            error="Please select a condition for your listing"
          />
        </ComponentDemo>

        <ComponentDemo
          title="Disabled State"
          description="Indicate unavailable options in specific contexts."
        >
          <Select
            label="Unavailable Filter"
            options={categoryOptions}
            value={category}
            onChange={setCategory}
            disabled
            helperText="This filter is unavailable for the current search"
          />
        </ComponentDemo>
      </section>

      {/* Real Marketplace Example */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Real Marketplace Example</h2>

        <ComponentDemo
          title="Game Listing Filter Panel"
          description="Typical filter sidebar showing multiple Select components working together."
        >
          <div className="bg-snow-white shadow-sm rounded-lg p-6 max-w-sm">
            <h3 className="text-lg font-semibold text-polar-night mb-4">Filter Games</h3>
            <div className="space-y-4">
              <Select
                label="Condition"
                options={conditionOptions}
                placeholder="Any condition"
              />
              <Select
                label="Category"
                options={categoryOptions}
                placeholder="All categories"
              />
              <Select
                label="Price Range"
                options={[
                  { value: 'under20', label: 'Under €20' },
                  { value: '20-40', label: '€20 - €40' },
                  { value: '40-60', label: '€40 - €60' },
                  { value: 'over60', label: 'Over €60' },
                ]}
                placeholder="Any price"
              />
            </div>
          </div>
        </ComponentDemo>
      </section>

      {/* Keyboard Navigation */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Keyboard Navigation</h2>

        <div className="bg-snow-white shadow-sm rounded-lg p-6 border border-border">
          <p className="text-polar-nightMedium mb-4">
            The Select component is fully keyboard accessible, supporting natural navigation patterns:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 bg-polar-nightDark/5 rounded">
              <kbd className="px-2 py-1 bg-polar-night text-snow-white rounded text-sm font-mono">Enter</kbd>
              <span className="text-sm text-polar-nightMedium ml-2">Open dropdown / Select focused option</span>
            </div>
            <div className="p-4 bg-polar-nightDark/5 rounded">
              <kbd className="px-2 py-1 bg-polar-night text-snow-white rounded text-sm font-mono">Space</kbd>
              <span className="text-sm text-polar-nightMedium ml-2">Open dropdown / Select focused option</span>
            </div>
            <div className="p-4 bg-polar-nightDark/5 rounded">
              <kbd className="px-2 py-1 bg-polar-night text-snow-white rounded text-sm font-mono">↓</kbd>
              <span className="text-sm text-polar-nightMedium ml-2">Open dropdown / Move to next option</span>
            </div>
            <div className="p-4 bg-polar-nightDark/5 rounded">
              <kbd className="px-2 py-1 bg-polar-night text-snow-white rounded text-sm font-mono">↑</kbd>
              <span className="text-sm text-polar-nightMedium ml-2">Move to previous option</span>
            </div>
            <div className="p-4 bg-polar-nightDark/5 rounded">
              <kbd className="px-2 py-1 bg-polar-night text-snow-white rounded text-sm font-mono">Esc</kbd>
              <span className="text-sm text-polar-nightMedium ml-2">Close dropdown without selecting</span>
            </div>
            <div className="p-4 bg-polar-nightDark/5 rounded">
              <kbd className="px-2 py-1 bg-polar-night text-snow-white rounded text-sm font-mono">Tab</kbd>
              <span className="text-sm text-polar-nightMedium ml-2">Move focus to next form element</span>
            </div>
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
                <span>Use Select when options are known and limited (5-15 options ideal)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-success mt-1">•</span>
                <span>Provide clear, descriptive labels that explain what's being selected</span>
              </li>
              <li className="flex gap-2">
                <span className="text-success mt-1">•</span>
                <span>Use helper text to clarify the purpose or impact of the selection</span>
              </li>
              <li className="flex gap-2">
                <span className="text-success mt-1">•</span>
                <span>Order options logically (alphabetically, by popularity, or by severity)</span>
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
                <span>Use Select for very few options (2-3) - use Radio buttons instead</span>
              </li>
              <li className="flex gap-2">
                <span className="text-error mt-1">•</span>
                <span>Use Select for many options (20+) - consider search/autocomplete</span>
              </li>
              <li className="flex gap-2">
                <span className="text-error mt-1">•</span>
                <span>Nest selects or create dependencies without clear indication</span>
              </li>
              <li className="flex gap-2">
                <span className="text-error mt-1">•</span>
                <span>Hide critical information in placeholders - use labels and helper text</span>
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

import { Select } from '@second-turn/design-system';
import { useState } from 'react';

function GameListingForm() {
  const [condition, setCondition] = useState('');

  return (
    <form>
      <Select
        label="Game Condition"
        options={[
          { value: 'likeNew', label: '📦 Like New' },
          { value: 'veryGood', label: '✨ Very Good' },
          { value: 'good', label: '🎲 Good' },
          { value: 'acceptable', label: '🔧 Acceptable' },
          { value: 'forParts', label: '⚙️ For Parts' },
        ]}
        value={condition}
        onChange={setCondition}
        error={!condition && 'Please select a condition'}
        helperText="Be honest about condition to build trust"
      />
    </form>
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
            <h3 className="font-semibold text-polar-night mb-2">ARIA Compliance</h3>
            <p className="text-polar-nightMedium">
              Select uses proper ARIA roles (combobox, listbox, option) and attributes
              (aria-expanded, aria-haspopup, aria-selected) for screen reader compatibility.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Keyboard Accessible</h3>
            <p className="text-polar-nightMedium">
              Full keyboard navigation with arrow keys, Enter, Space, and Escape.
              Focused options are clearly indicated with frost blue background.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Focus Management</h3>
            <p className="text-polar-nightMedium">
              Visible 3px frost ice focus ring at 30% opacity. Dropdown uses elevation 3 shadow
              for clear separation from base content.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Error Announcements</h3>
            <p className="text-polar-nightMedium">
              Error messages are linked via aria-describedby and role="alert" so screen
              readers announce validation feedback immediately.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
