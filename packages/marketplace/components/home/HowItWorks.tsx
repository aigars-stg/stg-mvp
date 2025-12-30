const buyerSteps = [
  {
    title: 'Browse & search',
    description: 'Find games by title, category, condition, or location. Filter by what matters to you.',
  },
  {
    title: 'Review details',
    description: 'Check condition photos, completeness info, and seller ratings. Ask questions if needed.',
  },
  {
    title: 'Purchase securely',
    description: 'Pay through our secure system. Your payment is held until you confirm delivery.',
  },
  {
    title: 'Enjoy your game',
    description: 'Receive your game, verify condition, and start playing. Leave a review to help others.',
  },
];

const sellerSteps = [
  {
    title: 'List your game',
    description: 'Add photos, describe condition honestly, and set your price. Takes just 5 minutes.',
  },
  {
    title: 'Connect with buyers',
    description: 'Answer questions, negotiate if you\'re open to offers, and arrange shipping or pickup.',
  },
  {
    title: 'Ship safely',
    description: 'Pack carefully and ship within 2 business days. Payment is released after buyer confirmation.',
  },
  {
    title: 'Get paid',
    description: 'Receive payment securely. List more games or use the funds to buy your next favorite.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-bg-secondary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mb-4">
            How it works
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Simple, secure, and transparent for both buyers and sellers
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* For Buyers */}
          <div>
            <h3 className="text-2xl font-semibold text-text-primary mb-8 flex items-center gap-3">
              <span>For buyers</span>
              <span className="text-sm font-normal text-text-muted bg-frost-ice/10 px-3 py-1 rounded-full">
                Find your game
              </span>
            </h3>
            <div className="space-y-6">
              {buyerSteps.map((step, index) => (
                <div key={index} className="flex gap-4 group">
                  {/* Number badge */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-frost-ice text-snow-white rounded-md flex items-center justify-center font-semibold text-lg shadow-sm group-hover:scale-110 transition-transform duration-200">
                      {index + 1}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <h4 className="font-semibold text-text-primary mb-2 text-lg">
                      {step.title}
                    </h4>
                    <p className="text-text-secondary leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* For Sellers */}
          <div>
            <h3 className="text-2xl font-semibold text-text-primary mb-8 flex items-center gap-3">
              <span>For sellers</span>
              <span className="text-sm font-normal text-text-muted bg-aurora-orange/10 px-3 py-1 rounded-full">
                Earn from your shelf
              </span>
            </h3>
            <div className="space-y-6">
              {sellerSteps.map((step, index) => (
                <div key={index} className="flex gap-4 group">
                  {/* Number badge */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-aurora-orange text-snow-white rounded-md flex items-center justify-center font-semibold text-lg shadow-sm group-hover:scale-110 transition-transform duration-200">
                      {index + 1}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <h4 className="font-semibold text-text-primary mb-2 text-lg">
                      {step.title}
                    </h4>
                    <p className="text-text-secondary leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
