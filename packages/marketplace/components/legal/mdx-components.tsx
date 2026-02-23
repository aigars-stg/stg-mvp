import { Link } from '@/i18n/navigation';
import { PlainTermsBox } from './PlainTermsBox';
import { FeeExample } from './FeeExample';
import { ListingType } from './ListingType';
import { PaymentFlow } from './PaymentFlow';
import { SectionNav } from './SectionNav';
import { DocumentVersions } from './DocumentVersions';

export const legalMdxComponents = {
  PlainTermsBox,
  FeeExample,
  ListingType,
  PaymentFlow,
  SectionNav,
  DocumentVersions,
  a: ({
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (href?.startsWith('/')) {
      return (
        <Link
          href={href}
          {...props}
          className="text-frost-ice hover:underline"
        />
      );
    }
    return (
      <a
        target="_blank"
        rel="noopener noreferrer"
        href={href}
        {...props}
        className="text-frost-ice hover:underline"
      />
    );
  },
};
