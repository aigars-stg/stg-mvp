import { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Globe, Users, Database, MessageSquare, AlertCircle, Shield, Mail, Scale } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service | Second Turn Games',
  description: 'Terms of Service for Second Turn Games - Rules and guidelines for using our peer-to-peer board game marketplace.',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-bg py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-polar-night mb-4">
            Terms of Service
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
              <FileText className="w-6 h-6 text-frost-ice" />
              1. Agreement to Terms
            </h2>
            <p className="text-text-secondary mb-4">
              Welcome to Second Turn Games! These Terms of Service ("Terms") govern your use of the Second Turn Games platform ("Platform", "Service", "we", "our", or "us").
            </p>
            <p className="text-text-secondary mb-4">
              By creating an account or using our Platform, you agree to be bound by these Terms and our{' '}
              <Link href="/privacy" className="text-frost-ice hover:underline">Privacy Policy</Link>. If you do not agree, you may not use our Service.
            </p>
            <div className="bg-frost-ice/10 border border-frost-ice/20 rounded-lg p-4">
              <p className="font-semibold text-polar-night mb-2">Service Provider</p>
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
                <strong>Contact:</strong> {' '}
                <a href="mailto:info@secondturn.games" className="text-frost-ice hover:underline">
                  info@secondturn.games
                </a>
              </p>
            </div>
          </section>

          {/* Platform Description */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <Globe className="w-6 h-6 text-frost-ice" />
              2. Platform Description
            </h2>
            <p className="text-text-secondary mb-4">
              Second Turn Games is a <strong>peer-to-peer marketplace</strong> that connects buyers and sellers of pre-owned board games in the Baltic region (Latvia, Lithuania, Estonia).
            </p>
            <div className="bg-aurora-orange/10 border border-aurora-orange/30 rounded-lg p-4 mb-4">
              <p className="font-semibold text-aurora-orange mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Important: We Are Not a Party to Your Transactions
              </p>
              <p className="text-sm text-text-secondary">
                Second Turn Games provides the platform for users to list and discover board games. <strong>We do not buy, sell, or own any games.</strong> All transactions occur directly between buyers and sellers. We are not responsible for the quality, safety, legality, or delivery of items, nor for the ability of sellers to sell or buyers to pay.
              </p>
            </div>
            <p className="text-text-secondary">
              Our role is limited to:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Providing a platform for listing games</li>
              <li>Facilitating communication between users</li>
              <li>Hosting user-generated content (listings, profiles, messages)</li>
              <li>Maintaining the technical infrastructure</li>
            </ul>
          </section>

          {/* User Accounts */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <Users className="w-6 h-6 text-frost-ice" />
              3. User Accounts
            </h2>

            <h3 className="text-xl font-semibold text-polar-night mb-3">3.1 Account Creation</h3>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-4">
              <li>You must be at least <strong>16 years old</strong> to use this Platform</li>
              <li>You must provide accurate, current, and complete information</li>
              <li>You are responsible for maintaining the security of your password</li>
              <li>You may not share your account with others</li>
              <li>You are responsible for all activity under your account</li>
            </ul>

            <h3 className="text-xl font-semibold text-polar-night mb-3">3.2 Account Security</h3>
            <p className="text-text-secondary mb-4">
              If you suspect unauthorized access to your account, you must immediately:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-4">
              <li>Change your password</li>
              <li>Contact us at {' '}
                <a href="mailto:info@secondturn.games" className="text-frost-ice hover:underline">
                  info@secondturn.games
                </a></li>
              <li>Review your account activity</li>
            </ul>

            <h3 className="text-xl font-semibold text-polar-night mb-3 mt-6">3.3 Account Termination</h3>
            <p className="text-text-secondary mb-4">
              You may delete your account at any time through account settings. We may suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          {/* Listing Rules */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <Database className="w-6 h-6 text-frost-ice" />
              4. Listing Rules for Sellers
            </h2>

            <h3 className="text-xl font-semibold text-polar-night mb-3">4.1 What You Can List</h3>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-4">
              <li><strong>Board games, card games, and tabletop games only</strong></li>
              <li>Items you own and have the right to sell</li>
              <li>Authentic, non-counterfeit items</li>
              <li>Items in the condition you describe</li>
            </ul>

            <h3 className="text-xl font-semibold text-polar-night mb-3">4.2 Listing Requirements</h3>
            <p className="text-text-secondary mb-3">You must:</p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-4">
              <li>Provide accurate game information (name, edition, condition)</li>
              <li>Upload clear, authentic photos of the actual item</li>
              <li>Disclose all defects, missing pieces, or damage</li>
              <li>Set a fair price (no price gouging)</li>
              <li>Specify shipping/pickup options clearly</li>
              <li>Respond to buyer inquiries within a reasonable timeframe</li>
            </ul>

            <h3 className="text-xl font-semibold text-polar-night mb-3">4.3 Prohibited Listings</h3>
            <p className="text-text-secondary mb-3">You may NOT list:</p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Counterfeit or pirated games</li>
              <li>Stolen items</li>
              <li>Items you don't own or can't legally sell</li>
              <li>Offensive, discriminatory, or illegal content</li>
              <li>Items that violate intellectual property rights</li>
              <li>Damaged items not disclosed as such</li>
              <li>Items with misleading descriptions or photos</li>
            </ul>
          </section>

          {/* Buyer Guidelines */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <Users className="w-6 h-6 text-frost-ice" />
              5. Buyer Guidelines
            </h2>
            <p className="text-text-secondary mb-4">
              As a buyer, you agree to:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Contact sellers respectfully and professionally</li>
              <li>Ask questions before committing to purchase</li>
              <li>Honor your commitments to purchase</li>
              <li>Arrange payment and shipping/pickup directly with the seller</li>
              <li>Not harass, spam, or abuse sellers</li>
              <li>Report fraudulent listings or suspicious activity</li>
            </ul>
          </section>

          {/* Transactions */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-frost-ice" />
              6. User-to-User Transactions
            </h2>

            <h3 className="text-xl font-semibold text-polar-night mb-3">6.1 Direct Transactions</h3>
            <p className="text-text-secondary mb-4">
              All transactions occur <strong>directly between buyers and sellers</strong>. You are responsible for:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-4">
              <li>Negotiating price and terms</li>
              <li>Arranging payment method</li>
              <li>Organizing shipping or local pickup</li>
              <li>Resolving disputes</li>
            </ul>

            <h3 className="text-xl font-semibold text-polar-night mb-3">6.2 Payment</h3>
            <p className="text-text-secondary mb-4">
              Second Turn Games does <strong>not process payments</strong>. We do not handle money, escrow, or payment disputes. You choose your own payment method (bank transfer, cash, etc.) at your own risk.
            </p>
            <div className="bg-aurora-orange/10 border border-aurora-orange/30 rounded-lg p-4 mb-4">
              <p className="font-semibold text-aurora-orange mb-2">Safety Tip</p>
              <p className="text-sm text-text-secondary">
                Use secure payment methods (bank transfer, PayPal for goods/services) that offer buyer protection. Avoid sending cash through mail or using untraceable payment methods for high-value items.
              </p>
            </div>

            <h3 className="text-xl font-semibold text-polar-night mb-3">6.3 Shipping & Delivery</h3>
            <p className="text-text-secondary mb-4">
              Sellers and buyers arrange shipping directly. We recommend:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-4">
              <li>Using tracked shipping for items over €20</li>
              <li>Purchasing shipping insurance for valuable items</li>
              <li>Packaging items securely to prevent damage</li>
              <li>For local pickup: meeting in safe, public locations</li>
            </ul>

            <h3 className="text-xl font-semibold text-polar-night mb-3">6.4 Disputes</h3>
            <p className="text-text-secondary mb-4">
              If a transaction goes wrong (item not as described, payment not received, etc.), you must resolve it directly with the other party. Second Turn Games is not a mediator, arbitrator, or dispute resolution service.
            </p>
            <p className="text-text-secondary mb-4">
              If you cannot resolve a dispute, you may:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Report the user to us (we may remove fraudulent accounts)</li>
              <li>Seek legal remedies through Latvian courts or consumer protection agencies</li>
              <li>Contact your payment provider for dispute resolution</li>
            </ul>
          </section>

          {/* Prohibited Conduct */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-frost-ice" />
              7. Prohibited Conduct
            </h2>
            <p className="text-text-secondary mb-3">You may NOT:</p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Violate any laws or regulations</li>
              <li>Infringe on intellectual property rights</li>
              <li>Engage in fraud, scams, or deceptive practices</li>
              <li>Harass, threaten, or abuse other users</li>
              <li>Spam or send unsolicited commercial messages</li>
              <li>Attempt to bypass security measures</li>
              <li>Scrape, crawl, or automated data extraction</li>
              <li>Create multiple accounts to manipulate the Platform</li>
              <li>Interfere with the operation of the Platform</li>
              <li>Impersonate others or misrepresent affiliations</li>
              <li>Post malicious code, viruses, or harmful content</li>
              <li>Circumvent the platform to avoid fees (note: we currently don't charge fees, but this is reserved for future use)</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <Shield className="w-6 h-6 text-frost-ice" />
              8. Intellectual Property
            </h2>

            <h3 className="text-xl font-semibold text-polar-night mb-3">8.1 Platform Content</h3>
            <p className="text-text-secondary mb-4">
              The Second Turn Games platform, including its design, logo, code, and content (excluding user-generated content), is owned by Second Turn Games SIA and protected by copyright and trademark laws.
            </p>

            <h3 className="text-xl font-semibold text-polar-night mb-3">8.2 User-Generated Content</h3>
            <p className="text-text-secondary mb-4">
              You retain ownership of content you post (listings, photos, messages). By posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, display, and reproduce your content for the purpose of operating the Platform.
            </p>

            <h3 className="text-xl font-semibold text-polar-night mb-3">8.3 Game Data from BoardGameGeek</h3>
            <p className="text-text-secondary mb-4">
              Game information (names, images, metadata) is provided by BoardGameGeek. This data is used under their terms of service and is the property of BoardGameGeek LLC.
            </p>
          </section>

          {/* Disclaimers */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-frost-ice" />
              9. Disclaimers and Limitations
            </h2>

            <h3 className="text-xl font-semibold text-polar-night mb-3">9.1 "As Is" Service</h3>
            <p className="text-text-secondary mb-4">
              The Platform is provided "AS IS" and "AS AVAILABLE" without warranties of any kind. We do not guarantee:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-4">
              <li>Uninterrupted or error-free operation</li>
              <li>Accuracy of listings or user information</li>
              <li>Quality, safety, or legality of items</li>
              <li>Truthfulness of user representations</li>
              <li>Successful completion of transactions</li>
            </ul>

            <h3 className="text-xl font-semibold text-polar-night mb-3">9.2 Limitation of Liability</h3>
            <p className="text-text-secondary mb-4">
              To the maximum extent permitted by law, Second Turn Games SIA is not liable for:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-4">
              <li>Losses from user-to-user transactions</li>
              <li>Defective, damaged, or misrepresented items</li>
              <li>User misconduct or violations</li>
              <li>Data loss or security breaches</li>
              <li>Indirect, incidental, or consequential damages</li>
            </ul>
            <p className="text-text-secondary mt-4 mb-3">
              Our total liability to you for any claim shall not exceed €100 or the amount you paid us in fees in the past 12 months (whichever is greater). Since we currently don't charge fees, this would be €100.
            </p>

            <h3 className="text-xl font-semibold text-polar-night mb-3">9.3 Indemnification</h3>
            <p className="text-text-secondary">
              You agree to indemnify and hold harmless Second Turn Games SIA from any claims, damages, or expenses arising from your use of the Platform, your violations of these Terms, or your transactions with other users.
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-frost-ice" />
              10. Termination
            </h2>
            <p className="text-text-secondary mb-4">
              We reserve the right to suspend or terminate your account if you:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-4">
              <li>Violate these Terms</li>
              <li>Engage in fraudulent or illegal activity</li>
              <li>Receive repeated complaints from other users</li>
              <li>Pose a security or legal risk to the Platform</li>
            </ul>
            <p className="text-text-secondary mb-4">
              You may delete your account at any time in account settings. Upon termination:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Your listings will be removed</li>
              <li>Your profile will be hidden</li>
              <li>You can recover your account within 14 days</li>
              <li>After 90 days, your data is permanently deleted (see Privacy Policy)</li>
            </ul>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <Scale className="w-6 h-6 text-frost-ice" />
              11. Governing Law & Dispute Resolution
            </h2>

            <h3 className="text-xl font-semibold text-polar-night mb-3">11.1 Governing Law</h3>
            <p className="text-text-secondary mb-4">
              These Terms are governed by the laws of the <strong>Republic of Latvia</strong>, without regard to conflict of law principles.
            </p>

            <h3 className="text-xl font-semibold text-polar-night mb-3">11.2 Disputes with Second Turn Games</h3>
            <p className="text-text-secondary mb-4">
              For disputes with Second Turn Games SIA:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-4">
              <li>First contact us at {' '}
                <a href="mailto:info@secondturn.games" className="text-frost-ice hover:underline">
                  info@secondturn.games
                </a> to resolve informally</li>
              <li>If unresolved, disputes will be subject to the jurisdiction of the courts of Riga, Latvia, without prejudice to mandatory consumer protection laws that may give EU consumers the right to bring proceedings in their country of residence</li>
              <li>EU consumers may contact their national consumer protection agency or use alternative dispute resolution mechanisms available in their country</li>
            </ul>

            <h3 className="text-xl font-semibold text-polar-night mb-3">11.3 User-to-User Disputes</h3>
            <p className="text-text-secondary">
              Disputes between users are not our responsibility. You may seek resolution through consumer protection agencies, small claims court, or other legal remedies available in your jurisdiction.
            </p>
          </section>

          {/* Changes to Terms */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <FileText className="w-6 h-6 text-frost-ice" />
              12. Changes to These Terms
            </h2>
            <p className="text-text-secondary mb-4">
              We may update these Terms from time to time. Significant changes will be announced via:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-4">
              <li>Email notification to your registered email</li>
              <li>Prominent notice on the Platform</li>
            </ul>
            <p className="text-text-secondary">
              Continued use of the Platform after changes constitutes acceptance of the new Terms. If you don't agree, you must stop using the Platform and delete your account.
            </p>
          </section>

          {/* Miscellaneous */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <FileText className="w-6 h-6 text-frost-ice" />
              13. Miscellaneous
            </h2>

            <h3 className="text-xl font-semibold text-polar-night mb-3">13.1 Entire Agreement</h3>
            <p className="text-text-secondary mb-4">
              These Terms, together with our Privacy Policy, constitute the entire agreement between you and Second Turn Games SIA.
            </p>

            <h3 className="text-xl font-semibold text-polar-night mb-3">13.2 Severability</h3>
            <p className="text-text-secondary mb-4">
              If any provision is found unenforceable, the remaining provisions remain in full effect.
            </p>

            <h3 className="text-xl font-semibold text-polar-night mb-3">13.3 No Waiver</h3>
            <p className="text-text-secondary mb-4">
              Our failure to enforce any right or provision does not constitute a waiver of that right.
            </p>

            <h3 className="text-xl font-semibold text-polar-night mb-3">13.4 Assignment</h3>
            <p className="text-text-secondary mb-4">
              You may not transfer your account or these Terms. We may assign our rights and obligations to a successor entity.
            </p>

            <h3 className="text-xl font-semibold text-polar-night mb-3">13.5 Language</h3>
            <p className="text-text-secondary">
              These Terms are provided in English. If translated, the English version prevails in case of conflict.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-polar-night mb-4 flex items-center gap-3">
              <Mail className="w-6 h-6 text-frost-ice" />
              14. Contact Us
            </h2>
            <p className="text-text-secondary mb-4">
              Questions about these Terms?
            </p>
            <div className="bg-frost-ice/10 border border-frost-ice/20 rounded-lg p-4">
              <p className="text-text-secondary mb-2">
                <strong>Email:</strong>{' '}
                <a href="mailto:info@secondturn.games" className="text-frost-ice hover:underline">
                  info@secondturn.games
                </a>
              </p>
              <p className="text-text-secondary">
                <strong>Address:</strong> Second Turn Games SIA, Evalda Valtera 5-35, Riga, LV-1021, Latvia
              </p>
            </div>
          </section>

          {/* Acknowledgment */}
          <div className="bg-aurora-green/10 border border-aurora-green/30 rounded-lg p-6 mt-8">
            <p className="text-text-secondary text-center">
              By using Second Turn Games, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
            </p>
          </div>
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
