'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@second-turn/design-system';
import { ComponentDemo } from '@/components/ComponentDemo';

export default function TabsPage() {
  return (
    <div className="space-y-12">
      {/* Overview */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">Tabs</h1>
        <p className="text-lg text-polar-nightMedium max-w-3xl leading-relaxed">
          Tabs organize content into separate views where only one is visible at a time.
          Choose from multiple visual variants to match different contexts.
        </p>
      </section>

      {/* Marketplace Use Case */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Marketplace Context</h2>
        <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-6">
          <p className="text-polar-nightMedium leading-relaxed mb-4">
            Tabs help users navigate between related views:
          </p>
          <ul className="space-y-2 text-polar-nightMedium">
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Browse page:</strong> Toggle between "For Sale" and "Wanted" listings</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>My Listings:</strong> Switch between active listings, saved, and wanted</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Profile:</strong> View different sections (listings, reviews, activity)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Filter tabs:</strong> Quick filters for listing status (all, active, sold)</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Variants */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Variants</h2>

        <ComponentDemo
          title="Default Variant"
          description="Standard tabs with underline indicator."
        >
          <Tabs defaultValue="tab1" variant="default">
            <TabsList>
              <TabsTrigger value="tab1">Overview</TabsTrigger>
              <TabsTrigger value="tab2">Specifications</TabsTrigger>
              <TabsTrigger value="tab3">Reviews</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1" className="pt-4">
              <p className="text-polar-nightMedium">Overview content goes here.</p>
            </TabsContent>
            <TabsContent value="tab2" className="pt-4">
              <p className="text-polar-nightMedium">Specifications content goes here.</p>
            </TabsContent>
            <TabsContent value="tab3" className="pt-4">
              <p className="text-polar-nightMedium">Reviews content goes here.</p>
            </TabsContent>
          </Tabs>
        </ComponentDemo>

        <ComponentDemo
          title="Toggle Variant"
          description="Pill-shaped toggle buttons in a container. Great for binary choices."
        >
          <Tabs defaultValue="sell" variant="toggle">
            <TabsList>
              <TabsTrigger value="sell">For Sale</TabsTrigger>
              <TabsTrigger value="wanted" activeColor="orange">Wanted</TabsTrigger>
            </TabsList>
          </Tabs>
        </ComponentDemo>

        <ComponentDemo
          title="Pills Variant"
          description="Separate pill buttons for filter-style navigation."
        >
          <Tabs defaultValue="all" variant="pills">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="sold">Sold</TabsTrigger>
            </TabsList>
          </Tabs>
        </ComponentDemo>

        <ComponentDemo
          title="Cards Variant"
          description="Card-like buttons with shadow. Great for prominent choices."
        >
          <Tabs defaultValue="sell" variant="cards">
            <TabsList className="max-w-md">
              <TabsTrigger value="sell">
                Sell a Game
              </TabsTrigger>
              <TabsTrigger value="wanted" activeColor="orange">
                Post Wanted
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </ComponentDemo>
      </section>

      {/* With Icons and Badges */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">With Icons and Badges</h2>

        <ComponentDemo
          title="Badges for Counts"
          description="Show counts or status indicators on tabs."
        >
          <Tabs defaultValue="listings" variant="default">
            <TabsList>
              <TabsTrigger value="listings" badge={12}>My Listings</TabsTrigger>
              <TabsTrigger value="saved" badge={5}>Saved</TabsTrigger>
              <TabsTrigger value="wanted" badge={3} activeColor="orange">Wanted</TabsTrigger>
            </TabsList>
          </Tabs>
        </ComponentDemo>

        <ComponentDemo
          title="With Icons"
          description="Add icons for visual recognition."
        >
          <Tabs defaultValue="grid" variant="pills">
            <TabsList>
              <TabsTrigger
                value="grid"
                icon={
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </svg>
                }
              >
                Grid
              </TabsTrigger>
              <TabsTrigger
                value="list"
                icon={
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
                  </svg>
                }
              >
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </ComponentDemo>
      </section>

      {/* Active Colors */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Active Colors</h2>

        <ComponentDemo
          title="Custom Active Colors"
          description="Use different colors for different tab types."
        >
          <div className="space-y-6">
            <Tabs defaultValue="frost" variant="toggle">
              <TabsList>
                <TabsTrigger value="frost" activeColor="frost">Frost (Default)</TabsTrigger>
                <TabsTrigger value="orange" activeColor="orange">Orange</TabsTrigger>
                <TabsTrigger value="red" activeColor="red">Red</TabsTrigger>
                <TabsTrigger value="green" activeColor="green">Green</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </ComponentDemo>
      </section>

      {/* Controlled Mode */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Controlled vs Uncontrolled</h2>

        <div className="bg-snow-white shadow-sm rounded-lg p-6 border border-border space-y-4">
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Uncontrolled (defaultValue)</h3>
            <p className="text-polar-nightMedium">
              Use <code className="bg-bg-secondary px-1 rounded">defaultValue</code> when you don't need to track the active tab externally.
              The component manages its own state.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Controlled (value + onValueChange)</h3>
            <p className="text-polar-nightMedium">
              Use <code className="bg-bg-secondary px-1 rounded">value</code> and <code className="bg-bg-secondary px-1 rounded">onValueChange</code> when
              you need to sync tab state with URL params, form state, or other components.
            </p>
          </div>
        </div>
      </section>

      {/* Code Example */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Code Example</h2>

        <div className="bg-polar-night rounded-lg p-6">
          <pre className="text-sm text-snow-white overflow-x-auto">
            <code>{`import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@second-turn/design-system';

// Basic usage (uncontrolled)
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="specs">Specifications</TabsTrigger>
    <TabsTrigger value="reviews" badge={24}>Reviews</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">...</TabsContent>
  <TabsContent value="specs">...</TabsContent>
  <TabsContent value="reviews">...</TabsContent>
</Tabs>

// Toggle variant with custom colors
<Tabs defaultValue="sell" variant="toggle">
  <TabsList>
    <TabsTrigger value="sell">For Sale</TabsTrigger>
    <TabsTrigger value="wanted" activeColor="orange">
      Wanted
    </TabsTrigger>
  </TabsList>
</Tabs>

// Controlled mode
const [tab, setTab] = useState('active');

<Tabs value={tab} onValueChange={setTab} variant="pills">
  <TabsList>
    <TabsTrigger value="all">All</TabsTrigger>
    <TabsTrigger value="active">Active</TabsTrigger>
    <TabsTrigger value="sold">Sold</TabsTrigger>
  </TabsList>
</Tabs>`}</code>
          </pre>
        </div>
      </section>

      {/* Accessibility */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Accessibility</h2>

        <div className="bg-snow-white shadow-sm rounded-lg p-6 border border-border space-y-4">
          <div>
            <h3 className="font-semibold text-polar-night mb-2">ARIA Roles</h3>
            <p className="text-polar-nightMedium">
              Uses proper tablist, tab, and tabpanel roles with aria-selected and aria-controls attributes.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Keyboard Navigation</h3>
            <p className="text-polar-nightMedium">
              Tab key moves focus to the active tab trigger. Arrow keys move between tab triggers.
              Enter/Space activates the focused tab.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Focus Management</h3>
            <p className="text-polar-nightMedium">
              Only the active tab is in the tab order (tabIndex=0). Inactive tabs have tabIndex=-1.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
