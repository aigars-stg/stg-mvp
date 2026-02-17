'use client';

import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownLink,
  DropdownSeparator,
  DropdownLabel,
  DropdownGroup,
  Button,
} from '@second-turn/design-system';
import { ComponentDemo } from '@/components/ComponentDemo';

export default function DropdownPage() {
  return (
    <div className="space-y-12">
      {/* Overview */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">Dropdown</h1>
        <p className="text-lg text-polar-nightMedium max-w-3xl leading-relaxed">
          Dropdowns display a list of actions or options when triggered.
          They&apos;re perfect for menus, settings, and contextual actions.
        </p>
      </section>

      {/* Marketplace Use Case */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Marketplace Context</h2>
        <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-6">
          <p className="text-polar-nightMedium leading-relaxed mb-4">
            Dropdowns provide contextual actions throughout the marketplace:
          </p>
          <ul className="space-y-2 text-polar-nightMedium">
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>User menu:</strong> Profile, settings, sign out options</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Listing actions:</strong> Edit, share, mark as sold, delete</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Sort options:</strong> Price, date, relevance sorting</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Bulk actions:</strong> Select multiple items and perform actions</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Basic Usage */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Basic Usage</h2>

        <ComponentDemo
          title="Simple Dropdown"
          description="Basic dropdown with action items."
        >
          <Dropdown>
            <DropdownTrigger>
              <Button variant="secondary">Options</Button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownItem onClick={() => console.log('Edit')}>Edit</DropdownItem>
              <DropdownItem onClick={() => console.log('Duplicate')}>Duplicate</DropdownItem>
              <DropdownSeparator />
              <DropdownItem onClick={() => console.log('Delete')} destructive>
                Delete
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        </ComponentDemo>

        <ComponentDemo
          title="With Icons"
          description="Dropdown items with leading icons."
        >
          <Dropdown>
            <DropdownTrigger>
              <Button>Actions</Button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownItem
                icon={
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                }
              >
                Edit Listing
              </DropdownItem>
              <DropdownItem
                icon={
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                }
              >
                Share
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                destructive
                icon={
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                }
              >
                Delete
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        </ComponentDemo>
      </section>

      {/* With Descriptions */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">With Descriptions</h2>

        <ComponentDemo
          title="Descriptive Items"
          description="Add descriptions to explain each option."
        >
          <Dropdown>
            <DropdownTrigger>
              <Button>Listing Status</Button>
            </DropdownTrigger>
            <DropdownContent className="w-64">
              <DropdownItem description="Visible to all buyers">
                Active
              </DropdownItem>
              <DropdownItem description="Hidden from search results">
                Draft
              </DropdownItem>
              <DropdownItem description="No longer available for purchase">
                Sold
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        </ComponentDemo>
      </section>

      {/* Groups and Labels */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Groups and Labels</h2>

        <ComponentDemo
          title="Grouped Items"
          description="Organize items into logical sections."
        >
          <Dropdown>
            <DropdownTrigger>
              <Button variant="secondary">User Menu</Button>
            </DropdownTrigger>
            <DropdownContent className="w-56">
              <DropdownLabel>My Account</DropdownLabel>
              <DropdownGroup>
                <DropdownItem>Profile</DropdownItem>
                <DropdownItem>My Listings</DropdownItem>
                <DropdownItem>Saved Games</DropdownItem>
              </DropdownGroup>
              <DropdownSeparator />
              <DropdownLabel>Settings</DropdownLabel>
              <DropdownGroup>
                <DropdownItem>Account Settings</DropdownItem>
                <DropdownItem>Notifications</DropdownItem>
              </DropdownGroup>
              <DropdownSeparator />
              <DropdownItem destructive>Sign Out</DropdownItem>
            </DropdownContent>
          </Dropdown>
        </ComponentDemo>
      </section>

      {/* Links */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Navigation Links</h2>

        <ComponentDemo
          title="With Links"
          description="Use DropdownLink for navigation items."
        >
          <Dropdown>
            <DropdownTrigger>
              <Button>Navigation</Button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownLink href="/browse">Browse Games</DropdownLink>
              <DropdownLink href="/sell">Sell a Game</DropdownLink>
              <DropdownLink href="/wanted">Wanted Games</DropdownLink>
              <DropdownSeparator />
              <DropdownLink href="/help" target="_blank" rel="noopener noreferrer">
                Help Center
              </DropdownLink>
            </DropdownContent>
          </Dropdown>
        </ComponentDemo>
      </section>

      {/* Alignment */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Alignment</h2>

        <ComponentDemo
          title="Dropdown Alignment"
          description="Control where the dropdown appears relative to the trigger."
        >
          <div className="flex gap-4 flex-wrap">
            <Dropdown>
              <DropdownTrigger>
                <Button variant="secondary">Align Start</Button>
              </DropdownTrigger>
              <DropdownContent align="start">
                <DropdownItem>First Item</DropdownItem>
                <DropdownItem>Second Item</DropdownItem>
              </DropdownContent>
            </Dropdown>

            <Dropdown>
              <DropdownTrigger>
                <Button variant="secondary">Align Center</Button>
              </DropdownTrigger>
              <DropdownContent align="center">
                <DropdownItem>First Item</DropdownItem>
                <DropdownItem>Second Item</DropdownItem>
              </DropdownContent>
            </Dropdown>

            <Dropdown>
              <DropdownTrigger>
                <Button variant="secondary">Align End</Button>
              </DropdownTrigger>
              <DropdownContent align="end">
                <DropdownItem>First Item</DropdownItem>
                <DropdownItem>Second Item</DropdownItem>
              </DropdownContent>
            </Dropdown>
          </div>
        </ComponentDemo>
      </section>

      {/* Code Example */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Code Example</h2>

        <div className="bg-polar-night rounded-lg p-6">
          <pre className="text-sm text-snow-white overflow-x-auto">
            <code>{`import {
  Dropdown,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownLink,
  DropdownSeparator,
  DropdownLabel,
  DropdownGroup,
  Button,
} from '@second-turn/design-system';

// Basic dropdown
<Dropdown>
  <DropdownTrigger>
    <Button>Options</Button>
  </DropdownTrigger>
  <DropdownContent>
    <DropdownItem onClick={handleEdit}>Edit</DropdownItem>
    <DropdownItem onClick={handleShare}>Share</DropdownItem>
    <DropdownSeparator />
    <DropdownItem onClick={handleDelete} destructive>
      Delete
    </DropdownItem>
  </DropdownContent>
</Dropdown>

// With icons and descriptions
<Dropdown>
  <DropdownTrigger>
    <Button>Actions</Button>
  </DropdownTrigger>
  <DropdownContent className="w-64">
    <DropdownItem
      icon={<EditIcon />}
      description="Modify listing details"
    >
      Edit Listing
    </DropdownItem>
    <DropdownItem
      icon={<ShareIcon />}
      description="Copy link or share on social"
    >
      Share
    </DropdownItem>
  </DropdownContent>
</Dropdown>

// Grouped menu
<Dropdown>
  <DropdownTrigger>
    <Avatar name="User" />
  </DropdownTrigger>
  <DropdownContent align="end">
    <DropdownLabel>Account</DropdownLabel>
    <DropdownGroup>
      <DropdownLink href="/profile">Profile</DropdownLink>
      <DropdownLink href="/settings">Settings</DropdownLink>
    </DropdownGroup>
    <DropdownSeparator />
    <DropdownItem destructive>Sign Out</DropdownItem>
  </DropdownContent>
</Dropdown>`}</code>
          </pre>
        </div>
      </section>

      {/* Accessibility */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Accessibility</h2>

        <div className="bg-snow-white shadow-sm rounded-lg p-6 border border-border space-y-4">
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Keyboard Support</h3>
            <ul className="text-polar-nightMedium space-y-1 text-sm">
              <li><code className="bg-bg-secondary px-1 rounded">Enter</code> / <code className="bg-bg-secondary px-1 rounded">Space</code> - Open dropdown or activate item</li>
              <li><code className="bg-bg-secondary px-1 rounded">Escape</code> - Close dropdown</li>
              <li><code className="bg-bg-secondary px-1 rounded">Arrow Down/Up</code> - Navigate between items</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Click Outside</h3>
            <p className="text-polar-nightMedium">
              Clicking outside the dropdown automatically closes it, matching user expectations.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Focus Management</h3>
            <p className="text-polar-nightMedium">
              When opened, focus moves to the dropdown content. On close, focus returns to the trigger.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
