import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Database, Cookie, Lock, MessageSquare, Eye, FileText, Mail, AlertCircle, Users, Globe } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy | Second Turn Games',
  description: 'Privacy Policy for Second Turn Games - How we collect, use, and protect your personal data in compliance with GDPR.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-bg py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-polar-night mb-4">
            Privacy Policy
          </h1>
          <p className="text-text-secondary">
            Last updated: November 13, 2025
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-polar-night max-w-none space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <Shield className="w-6 h-6 text-frost-ice" />
              1. Introduction
            </h2>
            <p className="text-text-secondary mb-4">
              Second Turn Games SIA ("we", "our", or "us") operates the Second Turn Games marketplace platform. This Privacy Policy explains how we collect, use, store, and protect your personal data when you use our services.
            </p>
            <p className="text-text-secondary mb-4">
              We are committed to protecting your privacy and complying with the General Data Protection Regulation (GDPR) and other applicable data protection laws in Latvia and the European Union.
            </p>
            <div className="bg-frost-ice/10 border border-frost-ice/20 rounded-lg p-4">
              <h3 className="font-semibold text-polar-night mb-2">Data Controller</h3>
              <p className="text-sm text-text-secondary mb-1">
                <strong>Company:</strong> Second Turn Games SIA
              </p>
              <p className="text-sm text-text-secondary mb-1">
                <strong>Registration:</strong> 50203665371
              </p>  
              <p className="text-sm text-text-secondary mb-1">
                <strong>Address:</strong> Evalda Valtera 5-35, Riga, LV-1021, Latvia
              </p>
              <p className="text-sm text-text-secondary">
                <strong>Privacy Contact:</strong> {' '}
                <a href="mailto:security@secondturn.games" className="text-frost-ice hover:underline">
                  security@secondturn.games
                </a>
              </p>
            </div>
          </section>

          {/* What Data We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <Database className="w-6 h-6 text-frost-ice" />
              2. What Personal Data We Collect
            </h2>

            <h3 className="text-xl font-semibold text-polar-night mb-3">2.1 Account Registration Data</h3>
            <p className="text-text-secondary mb-3">When you create an account, we collect:</p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-4">
              <li><strong>Email address</strong> (required) - for account identification and communication</li>
              <li><strong>Password</strong> (required) - stored as an encrypted hash, never in plain text</li>
              <li><strong>Full name</strong> (required) - displayed on your seller profile</li>
              <li><strong>Country</strong> (required) - for local pickup options and marketplace localization</li>
              <li><strong>Phone number</strong> (optional) - if you choose to add it to your profile</li>
              <li><strong>Profile picture</strong> (optional) - if you upload an avatar</li>
            </ul>
            <p className="text-sm text-text-secondary bg-frost-ice/5 p-3 rounded border border-frost-ice/20">
              <strong>Legal Basis:</strong> Contract performance (GDPR Article 6(1)(b)) - necessary to provide marketplace services
            </p>

            <h3 className="text-xl font-semibold text-polar-night mb-3 mt-6">2.2 Listing Data</h3>
            <p className="text-text-secondary mb-3">When you create a listing to sell a board game, we collect:</p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-4">
              <li><strong>Game information</strong> - name, version, publisher, language, condition</li>
              <li><strong>Photos</strong> - images of the game (we strip EXIF metadata including GPS location)</li>
              <li><strong>Price and shipping options</strong></li>
              <li><strong>Pickup city</strong> (optional) - for local pickup arrangements</li>
              <li><strong>Condition notes and descriptions</strong> - free-text fields you provide</li>
            </ul>
            <p className="text-sm text-text-secondary bg-frost-ice/5 p-3 rounded border border-frost-ice/20">
              <strong>Legal Basis:</strong> Contract performance (GDPR Article 6(1)(b)) - necessary to facilitate sales
            </p>

            <h3 className="text-xl font-semibold text-polar-night mb-3 mt-6">2.3 Messaging Data</h3>
            <p className="text-text-secondary mb-3">When you communicate with other users through our messaging system:</p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-4">
              <li><strong>Message content</strong> - all messages you send and receive</li>
              <li><strong>Conversation metadata</strong> - who you're talking to, which listing, timestamps</li>
              <li><strong>Read status</strong> - whether messages have been read</li>
            </ul>
            <div className="bg-aurora-orange/10 border border-aurora-orange/30 rounded-lg p-4 mb-4">
              <p className="text-sm text-aurora-orange font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Important Privacy Notice
              </p>
              <p className="text-sm text-text-secondary">
                Do not share sensitive personal information (phone numbers, addresses) in messages until you're ready to complete a transaction. We cannot control what happens to information you voluntarily share.
              </p>
            </div>
            <p className="text-sm text-text-secondary bg-frost-ice/5 p-3 rounded border border-frost-ice/20">
              <strong>Legal Basis:</strong> Contract performance (GDPR Article 6(1)(b)) - necessary to facilitate buyer-seller communication
            </p>

            <h3 className="text-xl font-semibold text-polar-night mb-3 mt-6 scroll-mt-20" id="security">2.4 Security & Login Activity Data</h3>
            <p className="text-text-secondary mb-3">For security and fraud prevention, we automatically collect:</p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-4">
              <li><strong>IP address</strong> - your internet connection's IP address</li>
              <li><strong>Device information</strong> - browser type, operating system, device type</li>
              <li><strong>Geolocation</strong> - country and city derived from your IP address</li>
              <li><strong>Login timestamps</strong> - when you sign in to your account</li>
            </ul>
            <p className="text-text-secondary mb-4">
              This data is retained for <strong>30 days</strong> and then automatically deleted. It helps us detect suspicious activity, prevent unauthorized access, and comply with security requirements.
            </p>
            <p className="text-sm text-text-secondary bg-frost-ice/5 p-3 rounded border border-frost-ice/20">
              <strong>Legal Basis:</strong> Legitimate interest (GDPR Article 6(1)(f)) - protecting our users and platform from fraud and security threats
            </p>

            <h3 className="text-xl font-semibold text-polar-night mb-3 mt-6">2.5 Technical Data</h3>
            <p className="text-text-secondary mb-3">We may collect:</p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-4">
              <li><strong>Cookies</strong> - see Section 5 below for detailed cookie information</li>
              <li><strong>Local storage data</strong> - saved game searches, listing drafts (stored only on your device)</li>
              <li><strong>Analytics data</strong> - only if you consent (page views, session duration, device type)</li>
            </ul>
          </section>

          {/* How We Use Your Data */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <Eye className="w-6 h-6 text-frost-ice" />
              3. How We Use Your Personal Data
            </h2>
            <p className="text-text-secondary mb-4">We use your personal data to:</p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Create and manage your account</li>
              <li>Display your listings to potential buyers</li>
              <li>Facilitate communication between buyers and sellers</li>
              <li>Process and display your wanted game requests (ISO listings)</li>
              <li>Send transactional emails (verification, password reset, notifications)</li>
              <li>Detect and prevent fraud, abuse, and security threats</li>
              <li>Improve our platform (with your consent for analytics)</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p className="text-text-secondary mt-4">
              <strong>We never sell your personal data to third parties.</strong> We never use your data for marketing without your explicit consent.
            </p>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <Globe className="w-6 h-6 text-frost-ice" />
              4. Third-Party Services (Data Processors)
            </h2>
            <p className="text-text-secondary mb-4">
              We use trusted third-party services to operate our platform. These services process your data on our behalf under Data Processing Agreements (DPAs) that ensure GDPR compliance.
            </p>

            <div className="space-y-4">
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-semibold text-polar-night mb-2">Supabase (Database, Authentication, Storage)</h3>
                <p className="text-sm text-text-secondary mb-2">
                  <strong>Purpose:</strong> Backend infrastructure - stores your account data, listings, messages, and photos
                </p>
                <p className="text-sm text-text-secondary mb-2">
                  <strong>Data Location:</strong> EU (Stockholm, Sweden)
                </p>
                <p className="text-sm text-text-secondary mb-2">
                  <strong>Data Shared:</strong> All data you provide (account info, listings, messages, photos)
                </p>
                <p className="text-sm text-text-secondary">
                  <strong>Privacy Policy:</strong>{' '}
                  <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-frost-ice hover:underline">
                    supabase.com/privacy
                  </a>
                </p>
              </div>

              <div className="border border-border rounded-lg p-4">
                <h3 className="font-semibold text-polar-night mb-2">Vercel (Hosting & Analytics)</h3>
                <p className="text-sm text-text-secondary mb-2">
                  <strong>Purpose:</strong> Website hosting, performance monitoring, analytics (with your consent)
                </p>
                <p className="text-sm text-text-secondary mb-2">
                  <strong>Data Shared:</strong> Server logs (IP addresses, page URLs), performance metrics, analytics (if consented)
                </p>
                <p className="text-sm text-text-secondary">
                  <strong>Privacy Policy:</strong>{' '}
                  <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-frost-ice hover:underline">
                    vercel.com/legal/privacy-policy
                  </a>
                </p>
              </div>

              <div className="border border-border rounded-lg p-4">
                <h3 className="font-semibold text-polar-night mb-2">Cloudflare Turnstile (Bot Protection)</h3>
                <p className="text-sm text-text-secondary mb-2">
                  <strong>Purpose:</strong> Prevent bots and automated abuse during account creation
                </p>
                <p className="text-sm text-text-secondary mb-2">
                  <strong>Data Shared:</strong> IP address, browser fingerprint, challenge responses
                </p>
                <p className="text-sm text-text-secondary">
                  <strong>Privacy Policy:</strong>{' '}
                  <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" className="text-frost-ice hover:underline">
                    cloudflare.com/privacypolicy
                  </a>
                </p>
              </div>

              <div className="border border-border rounded-lg p-4">
                <h3 className="font-semibold text-polar-night mb-2">Upstash Redis (Rate Limiting)</h3>
                <p className="text-sm text-text-secondary mb-2">
                  <strong>Purpose:</strong> Prevent abuse by limiting request rates (anti-spam, DDoS protection)
                </p>
                <p className="text-sm text-text-secondary mb-2">
                  <strong>Data Location:</strong> EU
                </p>
                <p className="text-sm text-text-secondary mb-2">
                  <strong>Data Shared:</strong> Email addresses, IP addresses, user IDs (stored temporarily, auto-expires in 15 minutes to 1 hour)
                </p>
                <p className="text-sm text-text-secondary">
                  <strong>Privacy Policy:</strong>{' '}
                  <a href="https://upstash.com/privacy" target="_blank" rel="noopener noreferrer" className="text-frost-ice hover:underline">
                    upstash.com/privacy
                  </a>
                </p>
              </div>

              <div className="border border-border rounded-lg p-4">
                <h3 className="font-semibold text-polar-night mb-2">BoardGameGeek (Game Data)</h3>
                <p className="text-sm text-text-secondary mb-2">
                  <strong>Purpose:</strong> Fetch board game information (names, images, versions)
                </p>
                <p className="text-sm text-text-secondary mb-2">
                  <strong>Data Shared:</strong> No personal data - only game IDs you search for
                </p>
                <p className="text-sm text-text-secondary">
                  <strong>Privacy Policy:</strong>{' '}
                  <a href="https://boardgamegeek.com/privacy" target="_blank" rel="noopener noreferrer" className="text-frost-ice hover:underline">
                    boardgamegeek.com/privacy
                  </a>
                </p>
              </div>
            </div>
          </section>

          {/* Cookies */}
          <section id="cookies" className="scroll-mt-20">
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <Cookie className="w-6 h-6 text-frost-ice" />
              5. Cookies & Tracking
            </h2>

            <h3 className="text-xl font-semibold text-polar-night mb-3">5.1 What Are Cookies?</h3>
            <p className="text-text-secondary mb-4">
              Cookies are small text files stored on your device by your browser. We use cookies to make our platform work and, with your consent, to understand how you use our site.
            </p>

            <h3 className="text-xl font-semibold text-polar-night mb-3">5.2 Essential Cookies (No Consent Required)</h3>
            <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-4 mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-polar-night">Cookie Name</th>
                    <th className="text-left py-2 text-polar-night">Purpose</th>
                    <th className="text-left py-2 text-polar-night">Duration</th>
                  </tr>
                </thead>
                <tbody className="text-text-secondary">
                  <tr className="border-b border-border/50">
                    <td className="py-2 font-mono text-xs">sb-*-auth-token</td>
                    <td className="py-2">Authentication - keeps you signed in</td>
                    <td className="py-2">Session / 60 days</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-xs text-text-secondary mt-3">
                These cookies are strictly necessary for the platform to function. They cannot be disabled.
              </p>
            </div>

            <h3 className="text-xl font-semibold text-polar-night mb-3">5.3 Analytics Cookies (Requires Consent)</h3>
            <p className="text-text-secondary mb-3">
              With your consent, we use Vercel Analytics and Speed Insights to understand:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-4">
              <li>Which pages are most visited</li>
              <li>How users navigate the site</li>
              <li>Performance metrics (page load times)</li>
              <li>Device and browser statistics</li>
            </ul>
            <p className="text-text-secondary mb-4">
              Vercel's analytics are designed to be privacy-friendly - they don't track you across different websites and don't create detailed user profiles.
            </p>
            <p className="text-text-secondary mb-4">
              You can accept or reject analytics cookies via the cookie consent banner that appears when you first visit our site. You can change your preferences at any time in your account settings.
            </p>

            <h3 className="text-xl font-semibold text-polar-night mb-3">5.4 Local Storage</h3>
            <p className="text-text-secondary mb-3">
              We also use your browser's local storage (similar to cookies but only accessible by our website) for:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li><strong>Saved game searches</strong> - your search history (game IDs only, no personal data)</li>
              <li><strong>Listing drafts</strong> - auto-saves your listing form as you type (stored only on your device)</li>
              <li><strong>Cookie consent preference</strong> - remembers your cookie choices</li>
              <li><strong>UI preferences</strong> - remembers if you've seen certain hints/tutorials</li>
            </ul>
            <p className="text-text-secondary mt-4">
              Local storage data never leaves your device and is not sent to our servers.
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <FileText className="w-6 h-6 text-frost-ice" />
              6. How Long We Keep Your Data
            </h2>
            <div className="space-y-3">
              <div className="border-l-4 border-frost-ice pl-4">
                <p className="font-semibold text-polar-night">Account Data</p>
                <p className="text-sm text-text-secondary">Until you delete your account, plus 90 days after deletion (for legal claims)</p>
              </div>
              <div className="border-l-4 border-frost-ice pl-4">
                <p className="font-semibold text-polar-night">Listings</p>
                <p className="text-sm text-text-secondary">Until you delete them or delete your account</p>
              </div>
              <div className="border-l-4 border-frost-ice pl-4">
                <p className="font-semibold text-polar-night">Messages</p>
                <p className="text-sm text-text-secondary">Until either party deletes the conversation or account</p>
              </div>
              <div className="border-l-4 border-frost-ice pl-4">
                <p className="font-semibold text-polar-night">Login Activity (IP addresses, device info)</p>
                <p className="text-sm text-text-secondary">30 days, then automatically deleted</p>
              </div>
              <div className="border-l-4 border-frost-ice pl-4">
                <p className="font-semibold text-polar-night">Rate Limiting Data</p>
                <p className="text-sm text-text-secondary">15 minutes to 1 hour, then automatically deleted</p>
              </div>
            </div>
          </section>

          {/* User Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <Shield className="w-6 h-6 text-frost-ice" />
              7. Your Rights Under GDPR
            </h2>
            <p className="text-text-secondary mb-4">
              You have the following rights regarding your personal data:
            </p>

            <div className="space-y-4">
              <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-4">
                <h3 className="font-semibold text-polar-night mb-2">✓ Right to Access (Article 15)</h3>
                <p className="text-sm text-text-secondary mb-2">
                  You can view your profile data, listings, and login activity in your account settings.
                </p>
                <p className="text-sm text-text-secondary">
                  <Link href="/account" className="text-frost-ice hover:underline">Go to Account Settings →</Link>
                </p>
              </div>

              <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-4">
                <h3 className="font-semibold text-polar-night mb-2">✓ Right to Data Portability (Article 20)</h3>
                <p className="text-sm text-text-secondary mb-2">
                  You can download all your data in JSON format (machine-readable).
                </p>
                <p className="text-sm text-text-secondary">
                  <Link href="/account" className="text-frost-ice hover:underline">Download My Data →</Link>
                </p>
              </div>

              <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-4">
                <h3 className="font-semibold text-polar-night mb-2">✓ Right to Rectification (Article 16)</h3>
                <p className="text-sm text-text-secondary mb-2">
                  You can edit your profile information, listings, and wanted game requests at any time.
                </p>
                <p className="text-sm text-text-secondary">
                  <Link href="/account" className="text-frost-ice hover:underline">Edit Profile →</Link>
                </p>
              </div>

              <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-4">
                <h3 className="font-semibold text-polar-night mb-2">✓ Right to Erasure / "Right to be Forgotten" (Article 17)</h3>
                <p className="text-sm text-text-secondary mb-2">
                  You can delete your account at any time. We provide a 14-day recovery period, then permanently delete all your data after 90 days.
                </p>
                <p className="text-sm text-text-secondary">
                  <Link href="/account" className="text-frost-ice hover:underline">Delete Account →</Link>
                </p>
              </div>

              <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-4">
                <h3 className="font-semibold text-polar-night mb-2">✓ Right to Object (Article 21)</h3>
                <p className="text-sm text-text-secondary">
                  You can object to data processing based on legitimate interest (e.g., analytics). Use the cookie settings to opt out of analytics.
                </p>
              </div>

              <div className="bg-frost-ice/5 border border-frost-ice/20 rounded-lg p-4">
                <h3 className="font-semibold text-polar-night mb-2">✓ Right to Lodge a Complaint</h3>
                <p className="text-sm text-text-secondary mb-2">
                  If you believe we've mishandled your data, you can file a complaint with the Latvian Data State Inspectorate (DVI).
                </p>
                <p className="text-sm text-text-secondary">
                  <strong>DVI Contact:</strong>{' '}
                  <a href="https://www.dvi.gov.lv/" target="_blank" rel="noopener noreferrer" className="text-frost-ice hover:underline">
                    dvi.gov.lv
                  </a>
                </p>
              </div>
            </div>

            <p className="text-text-secondary mt-4">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:privacy@secondturn.games" className="text-frost-ice hover:underline">
                privacy@secondturn.games
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          {/* Security */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <Lock className="w-6 h-6 text-frost-ice" />
              8. Data Security
            </h2>
            <p className="text-text-secondary mb-4">We protect your data with:</p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li><strong>Encryption in transit:</strong> All connections use HTTPS/TLS encryption</li>
              <li><strong>Encryption at rest:</strong> Database and file storage are encrypted (AES-256)</li>
              <li><strong>Password hashing:</strong> Passwords are hashed with bcrypt (never stored in plain text)</li>
              <li><strong>Access control:</strong> Row-Level Security ensures users can only access their own data</li>
              <li><strong>HTTP-Only cookies:</strong> Authentication cookies cannot be accessed by JavaScript</li>
              <li><strong>Rate limiting:</strong> Prevents brute-force attacks and abuse</li>
              <li><strong>Security monitoring:</strong> Login activity tracking detects suspicious behavior</li>
            </ul>
            <p className="text-text-secondary mt-4">
              While we implement industry-standard security measures, no system is 100% secure. Please use a strong, unique password and enable two-factor authentication when available.
            </p>
          </section>

          {/* International Transfers */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <Globe className="w-6 h-6 text-frost-ice" />
              9. International Data Transfers
            </h2>
            <p className="text-text-secondary mb-4">
              Your data is primarily stored in the European Union (Stockholm, Sweden). Some of our service providers (Vercel, Cloudflare) are US-based companies but have certified compliance with EU-US data transfer frameworks and provide Data Processing Agreements.
            </p>
            <p className="text-text-secondary">
              We ensure that any data transferred outside the EU is protected by appropriate safeguards (Standard Contractual Clauses, adequacy decisions, or DPAs).
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <Users className="w-6 h-6 text-frost-ice" />
              10. Children's Privacy
            </h2>
            <p className="text-text-secondary">
              Our platform is not intended for children under 16. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, please contact us at {' '}
              <a href="mailto:privacy@secondturn.games" className="text-frost-ice hover:underline">
                privacy@secondturn.games
              </a> and we will delete it.
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <FileText className="w-6 h-6 text-frost-ice" />
              11. Changes to This Privacy Policy
            </h2>
            <p className="text-text-secondary">
              We may update this Privacy Policy from time to time. We will notify you of significant changes by email or a prominent notice on our platform. The "Last updated" date at the top shows when this policy was last revised.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <Mail className="w-6 h-6 text-frost-ice" />
              12. Contact Us
            </h2>
            <p className="text-text-secondary mb-4">
              If you have any questions about this Privacy Policy or how we handle your data:
            </p>
            <div className="bg-frost-ice/10 border border-frost-ice/20 rounded-lg p-4">
              <p className="text-text-secondary mb-2">
                <strong>Email:</strong>{' '}
                <a href="mailto:privacy@secondturn.games" className="text-frost-ice hover:underline">
                  privacy@secondturn.games
                </a>
              </p>
              <p className="text-text-secondary mb-2">
                <strong>Support:</strong>{' '}
                <a href="mailto:info@secondturn.games" className="text-frost-ice hover:underline">
                  info@secondturn.games
                </a>
              </p>
              <p className="text-text-secondary">
                <strong>Address:</strong> Second Turn Games SIA, Evalda Valtera 5-35, Riga, LV-1021, Latvia
              </p>
            </div>
          </section>
        </div>

        {/* Back to Home */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center text-frost-ice hover:underline"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
