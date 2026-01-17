'use client';

import { Avatar, AvatarGroup } from '@second-turn/design-system';
import { ComponentDemo } from '@/components/ComponentDemo';

export default function AvatarPage() {
  const sampleUsers = [
    { name: 'Anna Kowalska', image: 'https://i.pravatar.cc/150?u=1' },
    { name: 'Jan Novak', image: 'https://i.pravatar.cc/150?u=2' },
    { name: 'Maria Schmidt', image: 'https://i.pravatar.cc/150?u=3' },
    { name: 'Peter Muller', image: 'https://i.pravatar.cc/150?u=4' },
    { name: 'Eva Berg', image: 'https://i.pravatar.cc/150?u=5' },
  ];

  return (
    <div className="space-y-12">
      {/* Overview */}
      <section>
        <h1 className="text-4xl font-bold text-polar-night mb-4">Avatar</h1>
        <p className="text-lg text-polar-nightMedium max-w-3xl leading-relaxed">
          Avatars represent users visually with photos or initials.
          They help personalize the experience and build trust between buyers and sellers.
        </p>
      </section>

      {/* Marketplace Use Case */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Marketplace Context</h2>
        <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-6">
          <p className="text-polar-nightMedium leading-relaxed mb-4">
            Avatars create personal connections throughout the marketplace:
          </p>
          <ul className="space-y-2 text-polar-nightMedium">
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Seller identification:</strong> Show seller avatars on listings to build trust</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Messages:</strong> Display conversation participants with visual identity</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Reviews:</strong> Associate feedback with reviewer photos</span>
            </li>
            <li className="flex gap-2">
              <span className="text-frost-ice mt-1">-</span>
              <span><strong>Navigation:</strong> Show user avatar in header for account access</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Basic Usage */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Basic Usage</h2>

        <ComponentDemo
          title="With Image"
          description="Avatar displaying a user photo."
        >
          <div className="flex items-center gap-4">
            <Avatar src="https://i.pravatar.cc/150?u=seller1" name="Anna Kowalska" />
            <div>
              <p className="font-medium text-polar-night">Anna Kowalska</p>
              <p className="text-sm text-text-muted">Verified Seller</p>
            </div>
          </div>
        </ComponentDemo>

        <ComponentDemo
          title="With Initials Fallback"
          description="When no image is available, initials are shown."
        >
          <div className="flex items-center gap-4">
            <Avatar name="Jan Novak" />
            <Avatar name="Maria Schmidt" />
            <Avatar name="Peter" />
            <Avatar name="Eva Berg" />
          </div>
        </ComponentDemo>
      </section>

      {/* Sizes */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Sizes</h2>

        <ComponentDemo
          title="Avatar Sizes"
          description="Different sizes for different contexts."
        >
          <div className="flex items-end gap-4 flex-wrap">
            <div className="text-center">
              <Avatar name="A" size="xs" />
              <span className="text-xs text-text-muted mt-2 block">xs (24px)</span>
            </div>
            <div className="text-center">
              <Avatar name="B" size="sm" />
              <span className="text-xs text-text-muted mt-2 block">sm (32px)</span>
            </div>
            <div className="text-center">
              <Avatar name="C" size="md" />
              <span className="text-xs text-text-muted mt-2 block">md (40px)</span>
            </div>
            <div className="text-center">
              <Avatar name="D" size="lg" />
              <span className="text-xs text-text-muted mt-2 block">lg (48px)</span>
            </div>
            <div className="text-center">
              <Avatar name="E" size="xl" />
              <span className="text-xs text-text-muted mt-2 block">xl (64px)</span>
            </div>
            <div className="text-center">
              <Avatar name="F" size="2xl" />
              <span className="text-xs text-text-muted mt-2 block">2xl (80px)</span>
            </div>
          </div>
        </ComponentDemo>
      </section>

      {/* Status Indicators */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Status Indicators</h2>

        <ComponentDemo
          title="Online Status"
          description="Show user availability with status indicators."
        >
          <div className="flex items-center gap-6 flex-wrap">
            <div className="text-center">
              <Avatar name="Online" status="online" size="lg" />
              <span className="text-xs text-text-muted mt-2 block">Online</span>
            </div>
            <div className="text-center">
              <Avatar name="Offline" status="offline" size="lg" />
              <span className="text-xs text-text-muted mt-2 block">Offline</span>
            </div>
            <div className="text-center">
              <Avatar name="Away" status="away" size="lg" />
              <span className="text-xs text-text-muted mt-2 block">Away</span>
            </div>
            <div className="text-center">
              <Avatar name="Busy" status="busy" size="lg" />
              <span className="text-xs text-text-muted mt-2 block">Busy</span>
            </div>
          </div>
        </ComponentDemo>
      </section>

      {/* Ring/Selection State */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Selection State</h2>

        <ComponentDemo
          title="Ring Highlight"
          description="Use ring prop to indicate selection or focus."
        >
          <div className="flex items-center gap-4">
            <Avatar name="Normal" size="lg" />
            <Avatar name="Selected" size="lg" ring />
          </div>
        </ComponentDemo>
      </section>

      {/* Avatar Group */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Avatar Group</h2>

        <ComponentDemo
          title="Stacked Avatars"
          description="Display multiple users in a compact stack."
        >
          <div className="space-y-6">
            <div>
              <p className="text-sm text-text-muted mb-2">Max 3 visible</p>
              <AvatarGroup max={3}>
                {sampleUsers.map((user, i) => (
                  <Avatar key={i} src={user.image} name={user.name} />
                ))}
              </AvatarGroup>
            </div>
            <div>
              <p className="text-sm text-text-muted mb-2">Max 5 visible</p>
              <AvatarGroup max={5}>
                {sampleUsers.map((user, i) => (
                  <Avatar key={i} src={user.image} name={user.name} />
                ))}
              </AvatarGroup>
            </div>
            <div>
              <p className="text-sm text-text-muted mb-2">Different sizes</p>
              <AvatarGroup max={4} size="lg">
                {sampleUsers.map((user, i) => (
                  <Avatar key={i} src={user.image} name={user.name} />
                ))}
              </AvatarGroup>
            </div>
          </div>
        </ComponentDemo>
      </section>

      {/* Real Marketplace Examples */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Real Marketplace Examples</h2>

        <ComponentDemo
          title="Seller Info on Listing"
          description="How avatars appear on listing cards."
        >
          <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg max-w-xs">
            <Avatar
              src="https://i.pravatar.cc/150?u=seller"
              name="GameTrader"
              size="md"
              status="online"
            />
            <div>
              <p className="font-medium text-polar-night text-sm">GameTrader</p>
              <p className="text-xs text-text-muted">42 sales - 4.9 rating</p>
            </div>
          </div>
        </ComponentDemo>

        <ComponentDemo
          title="Message Thread"
          description="Avatars in conversation context."
        >
          <div className="space-y-4 max-w-sm">
            <div className="flex gap-3">
              <Avatar name="Seller" size="sm" />
              <div className="flex-1 bg-bg-secondary p-3 rounded-lg rounded-tl-none">
                <p className="text-sm text-polar-night">Hi! Is this game still available?</p>
              </div>
            </div>
            <div className="flex gap-3 flex-row-reverse">
              <Avatar src="https://i.pravatar.cc/150?u=me" name="You" size="sm" />
              <div className="flex-1 bg-frost-ice/10 p-3 rounded-lg rounded-tr-none">
                <p className="text-sm text-polar-night">Yes! Would you like to make an offer?</p>
              </div>
            </div>
          </div>
        </ComponentDemo>
      </section>

      {/* Code Example */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Code Example</h2>

        <div className="bg-polar-night rounded-lg p-6">
          <pre className="text-sm text-snow-white overflow-x-auto">
            <code>{`import { Avatar, AvatarGroup } from '@second-turn/design-system';

// With image
<Avatar
  src="/user-photo.jpg"
  name="Anna Kowalska"
  size="lg"
/>

// Initials fallback (no image)
<Avatar name="Jan Novak" />

// With status indicator
<Avatar
  name="Seller"
  status="online"
  size="md"
/>

// With selection ring
<Avatar name="Selected User" ring />

// Avatar group
<AvatarGroup max={3} size="md">
  <Avatar src="/user1.jpg" name="User 1" />
  <Avatar src="/user2.jpg" name="User 2" />
  <Avatar name="User 3" />
  <Avatar name="User 4" />
</AvatarGroup>`}</code>
          </pre>
        </div>
      </section>

      {/* Accessibility */}
      <section>
        <h2 className="text-2xl font-semibold text-polar-night mb-6">Accessibility</h2>

        <div className="bg-snow-white shadow-sm rounded-lg p-6 border border-border space-y-4">
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Alt Text</h3>
            <p className="text-polar-nightMedium">
              The name prop is used as alt text for the image. Always provide a meaningful name.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Color Contrast</h3>
            <p className="text-polar-nightMedium">
              Initials use frost-ice background with white text for sufficient contrast ratio.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-polar-night mb-2">Status Indicators</h3>
            <p className="text-polar-nightMedium">
              Status dots include accessible labels and use distinct colors with good contrast.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
