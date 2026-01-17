'use client';

import {
  ActionSheet,
  ActionSheetSection,
  ActionSheetItem,
  ActionSheetCard,
  ActionSheetCancel,
  ActionSheetDivider,
  Button,
} from '@second-turn/design-system';
import { ComponentDemo } from '@/components/ComponentDemo';
import { useState } from 'react';

export default function ActionSheetPage() {
  const [basicOpen, setBasicOpen] = useState(false);
  const [cardsOpen, setCardsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="space-y-12">
      {/* Overview */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">ActionSheet</h1>
        <p className="text-lg text-polar-nightMedium max-w-3xl leading-relaxed">
          ActionSheet is a mobile-optimized bottom sheet for presenting actions or content.
          It slides up from the bottom with a native feel on mobile devices.
        </p>
      </section>

      {/* Marketplace Use Case */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Marketplace Context</h2>
        <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-6">
          <p className="text-polar-nightMedium leading-relaxed mb-4">
            ActionSheets provide mobile-friendly interactions:
          </p>
          <ul className="space-y-2 text-polar-nightMedium">
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Sell menu:</strong> Choose between "Sell a Game" or "Post Wanted"</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Profile menu:</strong> Quick access to account options on mobile</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Listing actions:</strong> Edit, share, or delete listing options</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Sort/filter:</strong> Mobile-friendly sorting and filtering options</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Basic Usage */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Basic Usage</h2>

        <ComponentDemo
          title="Simple ActionSheet"
          description="Basic action sheet with menu items."
        >
          <Button onClick={() => setBasicOpen(true)}>Open ActionSheet</Button>
          <ActionSheet
            isOpen={basicOpen}
            onClose={() => setBasicOpen(false)}
            title="Choose an Action"
          >
            <ActionSheetSection>
              <ActionSheetItem
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                }
                onClick={() => setBasicOpen(false)}
              >
                Edit Listing
              </ActionSheetItem>
              <ActionSheetItem
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                }
                onClick={() => setBasicOpen(false)}
              >
                Share
              </ActionSheetItem>
              <ActionSheetDivider />
              <ActionSheetItem
                color="red"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                }
                onClick={() => setBasicOpen(false)}
              >
                Delete
              </ActionSheetItem>
            </ActionSheetSection>
            <ActionSheetCancel onClick={() => setBasicOpen(false)} />
          </ActionSheet>
        </ComponentDemo>
      </section>

      {/* Card Actions */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Card Actions</h2>

        <ComponentDemo
          title="ActionSheetCard"
          description="Prominent card-style actions for important choices."
        >
          <Button variant="primary" onClick={() => setCardsOpen(true)}>
            Create New
          </Button>
          <ActionSheet
            isOpen={cardsOpen}
            onClose={() => setCardsOpen(false)}
            title="What would you like to do?"
          >
            <div className="p-4 space-y-3">
              <ActionSheetCard
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                }
                title="Sell a Game"
                description="List a board game you want to sell"
                color="frost"
                onClick={() => setCardsOpen(false)}
              />
              <ActionSheetCard
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                }
                title="Post Wanted"
                description="Tell sellers what game you're looking for"
                color="orange"
                onClick={() => setCardsOpen(false)}
              />
            </div>
          </ActionSheet>
        </ComponentDemo>
      </section>

      {/* Sections with Badges */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Sections with Badges</h2>

        <ComponentDemo
          title="Menu with Sections"
          description="Organized menu with labels and badges."
        >
          <Button onClick={() => setMenuOpen(true)}>Profile Menu</Button>
          <ActionSheet
            isOpen={menuOpen}
            onClose={() => setMenuOpen(false)}
            title="Profile"
          >
            <ActionSheetSection label="My Activity">
              <ActionSheetItem
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                }
                badge={3}
                onClick={() => setMenuOpen(false)}
              >
                Messages
              </ActionSheetItem>
              <ActionSheetItem
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                }
                badge={5}
                onClick={() => setMenuOpen(false)}
              >
                Orders
              </ActionSheetItem>
              <ActionSheetItem
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                }
                color="red"
                badge={12}
                onClick={() => setMenuOpen(false)}
              >
                Saved Games
              </ActionSheetItem>
            </ActionSheetSection>
            <ActionSheetDivider />
            <ActionSheetSection label="Settings">
              <ActionSheetItem
                color="muted"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                }
                showChevron
                onClick={() => setMenuOpen(false)}
              >
                Account Settings
              </ActionSheetItem>
            </ActionSheetSection>
            <ActionSheetDivider />
            <ActionSheetSection>
              <ActionSheetItem
                color="red"
                icon={
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                }
                onClick={() => setMenuOpen(false)}
              >
                Sign Out
              </ActionSheetItem>
            </ActionSheetSection>
          </ActionSheet>
        </ComponentDemo>
      </section>

      {/* Code Example */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Code Example</h2>

        <div className="bg-polar-night rounded-lg p-6">
          <pre className="text-sm text-snow-white overflow-x-auto">
            <code>{`import {
  ActionSheet,
  ActionSheetSection,
  ActionSheetItem,
  ActionSheetCard,
  ActionSheetCancel,
  ActionSheetDivider,
} from '@second-turn/design-system';

// Basic action sheet
<ActionSheet
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Choose an Action"
>
  <ActionSheetSection>
    <ActionSheetItem icon={<EditIcon />} onClick={handleEdit}>
      Edit
    </ActionSheetItem>
    <ActionSheetItem icon={<ShareIcon />} onClick={handleShare}>
      Share
    </ActionSheetItem>
    <ActionSheetDivider />
    <ActionSheetItem
      color="red"
      icon={<DeleteIcon />}
      onClick={handleDelete}
    >
      Delete
    </ActionSheetItem>
  </ActionSheetSection>
  <ActionSheetCancel onClick={() => setIsOpen(false)} />
</ActionSheet>

// Card-style actions
<ActionSheet isOpen={isOpen} onClose={onClose} title="Create">
  <div className="p-4 space-y-3">
    <ActionSheetCard
      icon={<PackageIcon />}
      title="Sell a Game"
      description="List a board game"
      color="frost"
      onClick={handleSell}
    />
    <ActionSheetCard
      icon={<SearchIcon />}
      title="Post Wanted"
      description="Request a game"
      color="orange"
      onClick={handleWanted}
    />
  </div>
</ActionSheet>`}</code>
          </pre>
        </div>
      </section>

      {/* Accessibility */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Accessibility</h2>

        <div className="bg-snow-white shadow-sm rounded-lg p-6 border border-border space-y-4">
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Modal Dialog</h3>
            <p className="text-polar-nightMedium">
              Uses role="dialog" and aria-modal="true" for proper screen reader announcement.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Escape Key</h3>
            <p className="text-polar-nightMedium">
              Pressing Escape closes the sheet, providing keyboard users a quick exit.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Body Scroll Lock</h3>
            <p className="text-polar-nightMedium">
              Prevents background scrolling while sheet is open, keeping focus on the sheet content.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Safe Area</h3>
            <p className="text-polar-nightMedium">
              Respects iOS safe area insets for proper display on devices with notches.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
