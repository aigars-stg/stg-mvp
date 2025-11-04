import { Input } from '@second-turn/design-system';
import { ComponentDemo } from '@/components/ComponentDemo';

export default function InputPage() {
  return (
    <div className="space-y-12">
      {/* Overview */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">Input</h1>
        <p className="text-lg text-text-secondary max-w-3xl">
          Form inputs for user data entry with clear labels, helpful error states, and 44px touch
          targets. Every input is accessible by default with proper ARIA labels and keyboard
          navigation.
        </p>
      </section>

      {/* Basic Usage */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Basic Usage</h2>

        <ComponentDemo title="With Label" description="Always provide visible labels for clarity.">
          <div className="max-w-md">
            <Input
              label="Email"
              type="email"
              placeholder="your@email.com"
            />
          </div>
        </ComponentDemo>

        <ComponentDemo title="With Helper Text" description="Provide guidance without waiting for errors.">
          <div className="max-w-md">
            <Input
              label="Password"
              type="password"
              helperText="At least 8 characters with one number and one symbol"
            />
          </div>
        </ComponentDemo>

        <ComponentDemo title="With Error" description="Errors replace helper text and change border color.">
          <div className="max-w-md">
            <Input
              label="Game Title"
              type="text"
              value="Ca"
              error="Game title must be at least 3 characters"
            />
          </div>
        </ComponentDemo>
      </section>

      {/* With Icons */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">With Icons</h2>

        <ComponentDemo title="Left Icon" description="Visual context for input purpose.">
          <div className="max-w-md">
            <Input
              label="Search Games"
              placeholder="Search by title, designer, category..."
              leftIcon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
        </ComponentDemo>

        <ComponentDemo title="Right Icon" description="Useful for actions like password visibility toggle.">
          <div className="max-w-md">
            <Input
              label="Price"
              type="number"
              placeholder="25.00"
              rightIcon={
                <span className="text-sm font-medium">EUR</span>
              }
            />
          </div>
        </ComponentDemo>
      </section>

      {/* Sizes */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Sizes</h2>

        <ComponentDemo title="All Sizes" description="Use md (44px) as default for accessibility.">
          <div className="max-w-md space-y-4">
            <Input label="Small (36px)" inputSize="sm" placeholder="Use in dense interfaces only" />
            <Input label="Medium (44px)" inputSize="md" placeholder="Default - meets accessibility minimum" />
            <Input label="Large (48px)" inputSize="lg" placeholder="Comfortable for primary actions" />
          </div>
        </ComponentDemo>
      </section>

      {/* Marketplace Usage */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Marketplace Usage</h2>

        <ComponentDemo title="List a Game Form" description="Typical input usage in marketplace forms.">
          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle max-w-md space-y-6">
            <Input
              label="Game Title"
              type="text"
              placeholder="e.g. Settlers of Catan"
              helperText="Enter the full official name"
            />

            <Input
              label="Price (EUR)"
              type="number"
              placeholder="25.00"
              rightIcon={<span className="text-sm font-medium">€</span>}
            />

            <Input
              label="Description"
              type="text"
              placeholder="Describe the game's condition..."
              helperText="Include details about box, components, and any wear"
            />

            <Input
              label="Your Location"
              type="text"
              placeholder="City, Country"
              leftIcon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
          </div>
        </ComponentDemo>
      </section>

      {/* Usage Guidelines */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Usage Guidelines</h2>

        <div className="space-y-6">
          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✓ Always provide visible labels
            </h3>
            <p className="text-text-secondary">
              Never rely on placeholder text alone. Labels remain visible when input has content.
              This is essential for accessibility and prevents user confusion.
            </p>
          </div>

          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✓ Use helper text for formatting guidance
            </h3>
            <p className="text-text-secondary">
              Tell users upfront what format you expect. "At least 8 characters" beats showing an
              error after they submit. Nordic design values clarity over surprise.
            </p>
          </div>

          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✓ Show errors immediately after blur
            </h3>
            <p className="text-text-secondary">
              Validate when user leaves the field, not on every keystroke. This feels less naggy
              while still providing fast feedback. Clear errors as soon as input becomes valid.
            </p>
          </div>

          <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle">
            <h3 className="font-semibold text-polar-night mb-2">
              ✗ Don't use inputs for actions
            </h3>
            <p className="text-text-secondary">
              If clicking should trigger an action (like search), use a button. Inputs are for
              data entry, buttons are for actions. Keep semantics clear.
            </p>
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Code Example</h2>

        <div className="bg-polar-night rounded-lg p-6">
          <pre className="text-sm text-snow-white overflow-x-auto">
            <code>{`import { Input } from '@second-turn/design-system';

function ListGameForm() {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const handleBlur = () => {
    if (title.length < 3) {
      setError('Title must be at least 3 characters');
    } else {
      setError('');
    }
  };

  return (
    <Input
      label="Game Title"
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onBlur={handleBlur}
      error={error}
      helperText={!error && "Enter the full official name"}
    />
  );
}`}</code>
          </pre>
        </div>
      </section>

      {/* Accessibility */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Accessibility</h2>

        <div className="bg-bg-elevated rounded-lg p-6 border border-border-subtle space-y-4">
          <div>
            <h3 className="font-semibold text-polar-night mb-2">ARIA Labels</h3>
            <p className="text-text-secondary">
              Labels are automatically linked to inputs via htmlFor. Errors are announced via
              aria-describedby. Screen readers get complete context.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Error Indication</h3>
            <p className="text-text-secondary">
              aria-invalid is set when errors are present. Don't rely on red color alone—the
              text explicitly states what's wrong.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Focus States</h3>
            <p className="text-text-secondary">
              3px frost ice ring appears on focus. Border changes to frost ice. Both visual cues
              make focus unmistakable for keyboard navigation.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-polar-night mb-2">Touch Targets</h3>
            <p className="text-text-secondary">
              Default height is 44px (11×4px) meeting WCAG minimum. The entire input area is
              clickable, not just the text inside.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
