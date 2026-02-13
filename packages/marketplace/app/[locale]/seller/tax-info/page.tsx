'use client';

import { useState, useEffect } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { Button, Badge, Input, Select } from '@second-turn/design-system';
import {
  CheckCircleAlt01 as CheckCircle2,
  RefreshCw as Loader2,
  AlertCircle,
  ArrowLeft,
  FileText,
  ShieldCheck,
} from '@/lib/icons';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  validateTaxId,
  getTaxIdLabel,
  getTaxIdPlaceholder,
  getTaxIdFormatDescription,
  type TaxIdCountry,
} from '@/lib/validation/tax-id';
import {
  DAC7_THRESHOLDS,
  getDac7StatusLabel,
  type Dac7ComplianceStatus,
} from '@/lib/types/seller';
import { formatPrice } from '@/lib/services/pricing';

interface TaxInfoStatus {
  complianceStatus: Dac7ComplianceStatus;
  annualTransactionCount: number;
  annualSalesTotal: number;
  reportingYear: number | null;
  hasSubmittedTaxInfo: boolean;
  isVerified: boolean;
  taxInfo: {
    fullLegalName: string | null;
    dateOfBirth: string | null;
    addressStreet: string | null;
    addressCity: string | null;
    addressPostalCode: string | null;
    addressCountry: string | null;
    taxResidencyCountry: string | null;
    taxId: string | null;
    taxIdType: string | null;
  } | null;
}

interface FormData {
  fullLegalName: string;
  dateOfBirth: string;
  addressStreet: string;
  addressCity: string;
  addressPostalCode: string;
  addressCountry: TaxIdCountry;
  taxResidencyCountry: TaxIdCountry;
  taxId: string;
}

const COUNTRY_OPTIONS = [
  { value: 'LV', label: 'Latvia' },
  { value: 'LT', label: 'Lithuania' },
  { value: 'EE', label: 'Estonia' },
];

export default function SellerTaxInfoPage() {
  const router = useRouter();
  const { user, loading: authLoading, profile } = useAuth();

  const [status, setStatus] = useState<TaxInfoStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    fullLegalName: '',
    dateOfBirth: '',
    addressStreet: '',
    addressCity: '',
    addressPostalCode: '',
    addressCountry: 'LV',
    taxResidencyCountry: 'LV',
    taxId: '',
  });

  const [taxIdError, setTaxIdError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/signin?redirect=/seller/tax-info');
    }
  }, [user, authLoading, router]);

  // Fetch tax info status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/seller/tax-info');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch status');
      }

      setStatus(data);

      // Pre-fill form with user's name and country if available
      if (!data.hasSubmittedTaxInfo && profile) {
        setFormData((prev) => ({
          ...prev,
          fullLegalName: profile.full_name || '',
          addressCountry: (profile.country as TaxIdCountry) || 'LV',
          taxResidencyCountry: (profile.country as TaxIdCountry) || 'LV',
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Validate tax ID on change
  useEffect(() => {
    if (formData.taxId) {
      const result = validateTaxId(formData.taxId, formData.taxResidencyCountry);
      setTaxIdError(result.valid ? null : result.error || 'Invalid tax ID');
    } else {
      setTaxIdError(null);
    }
  }, [formData.taxId, formData.taxResidencyCountry]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate tax ID before submitting
    const taxIdResult = validateTaxId(formData.taxId, formData.taxResidencyCountry);
    if (!taxIdResult.valid) {
      setTaxIdError(taxIdResult.error || 'Invalid tax ID');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch('/api/seller/tax-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit tax information');
      }

      setSuccess(true);
      // Refresh status
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-frost-ice mx-auto mb-4" />
          <p className="text-text-secondary">Loading tax information...</p>
        </div>
      </div>
    );
  }

  if (!user || !status) {
    return null;
  }

  const needsInfo =
    status.complianceStatus === 'approaching' ||
    status.complianceStatus === 'required' ||
    status.complianceStatus === 'blocked';

  const transactionPercent = Math.min(
    100,
    (status.annualTransactionCount / DAC7_THRESHOLDS.TRANSACTION_COUNT) * 100
  );
  const salesPercent = Math.min(
    100,
    (status.annualSalesTotal / DAC7_THRESHOLDS.SALES_TOTAL) * 100
  );

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="bg-frost-ice/5 border-b border-frost-ice/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <Link href="/seller/dashboard">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-frost-ice" />
            <h1 className="text-2xl sm:text-3xl font-bold text-polar-night">
              Tax information
            </h1>
          </div>
          <p className="text-text-secondary">
            EU DAC7 compliance requires platforms to collect seller tax information
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-aurora-green/10 border border-aurora-green/20 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-aurora-green flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-aurora-green font-medium">
                Tax information submitted
              </p>
              <p className="text-sm text-text-secondary mt-1">
                Your tax information has been saved. You can continue selling on the
                platform.
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-aurora-red/10 border border-aurora-red/20 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-aurora-red flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-aurora-red font-medium">Error</p>
              <p className="text-sm text-text-secondary mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Status Card */}
        <div className="bg-snow-white border-2 border-border rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-polar-night mb-1">
                DAC7 Compliance Status
              </h2>
              <p className="text-sm text-text-secondary">
                {status.hasSubmittedTaxInfo
                  ? 'Your tax information is on file'
                  : needsInfo
                    ? 'Tax information is required to continue selling'
                    : 'No action required at this time'}
              </p>
            </div>
            <Badge
              variant={
                status.complianceStatus === 'compliant'
                  ? 'success'
                  : status.complianceStatus === 'exempt'
                    ? 'default'
                    : status.complianceStatus === 'blocked'
                      ? 'error'
                      : 'warning'
              }
            >
              {status.complianceStatus === 'compliant' && (
                <CheckCircle2 className="w-3 h-3 mr-1" />
              )}
              {(status.complianceStatus === 'approaching' ||
                status.complianceStatus === 'required' ||
                status.complianceStatus === 'blocked') && (
                <AlertCircle className="w-3 h-3 mr-1" />
              )}
              {getDac7StatusLabel(status.complianceStatus)}
            </Badge>
          </div>

          {/* Progress Bars */}
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-secondary">Transactions this year</span>
                <span className="font-medium">
                  {status.annualTransactionCount} / {DAC7_THRESHOLDS.TRANSACTION_COUNT}
                </span>
              </div>
              <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    transactionPercent >= 100
                      ? 'bg-aurora-red'
                      : transactionPercent >= 80
                        ? 'bg-aurora-yellow'
                        : 'bg-frost-ice'
                  }`}
                  style={{ width: `${transactionPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-text-secondary">Sales total this year</span>
                <span className="font-medium">
                  {formatPrice(status.annualSalesTotal)} / {formatPrice(DAC7_THRESHOLDS.SALES_TOTAL)}
                </span>
              </div>
              <div className="h-2 bg-bg-elevated rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    salesPercent >= 100
                      ? 'bg-aurora-red'
                      : salesPercent >= 80
                        ? 'bg-aurora-yellow'
                        : 'bg-frost-ice'
                  }`}
                  style={{ width: `${salesPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Info about thresholds */}
          <p className="text-xs text-text-muted mt-4">
            EU DAC7 requires reporting when you exceed 30 transactions OR €2,000 in
            annual sales. You&apos;ll be asked to provide tax information when
            approaching these thresholds.
          </p>
        </div>

        {/* Already Submitted Info */}
        {status.hasSubmittedTaxInfo && status.taxInfo && (
          <div className="bg-snow-white border-2 border-border rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-aurora-green" />
              <h3 className="font-semibold text-polar-night">
                Submitted information
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-muted">Full legal name</p>
                <p className="font-medium">{status.taxInfo.fullLegalName}</p>
              </div>
              <div>
                <p className="text-text-muted">Date of birth</p>
                <p className="font-medium">{status.taxInfo.dateOfBirth}</p>
              </div>
              <div>
                <p className="text-text-muted">Address</p>
                <p className="font-medium">
                  {status.taxInfo.addressStreet}, {status.taxInfo.addressCity},{' '}
                  {status.taxInfo.addressPostalCode}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Tax residency</p>
                <p className="font-medium">
                  {COUNTRY_OPTIONS.find(
                    (c) => c.value === status.taxInfo?.taxResidencyCountry
                  )?.label || status.taxInfo.taxResidencyCountry}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Tax ID</p>
                <p className="font-medium font-mono">{status.taxInfo.taxId}</p>
              </div>
            </div>
            <p className="text-xs text-text-muted mt-4">
              To update your tax information, please contact support.
            </p>
          </div>
        )}

        {/* Tax Info Form - only show if needs info and hasn't submitted */}
        {needsInfo && !status.hasSubmittedTaxInfo && (
          <form onSubmit={handleSubmit}>
            <div className="bg-snow-white border-2 border-border rounded-xl p-6">
              <h3 className="font-semibold text-polar-night mb-4">
                Provide your tax information
              </h3>
              <p className="text-sm text-text-secondary mb-6">
                This information will be reported to tax authorities as required by
                EU DAC7 regulations. Please ensure all information is accurate.
              </p>

              <div className="space-y-4">
                {/* Full Legal Name */}
                <div>
                  <label className="block text-sm font-medium text-polar-night mb-1">
                    Full legal name (as on official documents)
                  </label>
                  <Input
                    value={formData.fullLegalName}
                    onChange={(e) =>
                      handleInputChange('fullLegalName', e.target.value)
                    }
                    placeholder="John Smith"
                    required
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-polar-night mb-1">
                    Date of birth
                  </label>
                  <Input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) =>
                      handleInputChange('dateOfBirth', e.target.value)
                    }
                    required
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-polar-night mb-1">
                    Street address
                  </label>
                  <Input
                    value={formData.addressStreet}
                    onChange={(e) =>
                      handleInputChange('addressStreet', e.target.value)
                    }
                    placeholder="123 Main Street, Apt 4"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-polar-night mb-1">
                      City
                    </label>
                    <Input
                      value={formData.addressCity}
                      onChange={(e) =>
                        handleInputChange('addressCity', e.target.value)
                      }
                      placeholder="Riga"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-polar-night mb-1">
                      Postal code
                    </label>
                    <Input
                      value={formData.addressPostalCode}
                      onChange={(e) =>
                        handleInputChange('addressPostalCode', e.target.value)
                      }
                      placeholder="LV-1010"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-polar-night mb-1">
                    Country
                  </label>
                  <Select
                    value={formData.addressCountry}
                    onChange={(value) =>
                      handleInputChange('addressCountry', value)
                    }
                    options={COUNTRY_OPTIONS}
                  />
                </div>

                {/* Tax Residency */}
                <div>
                  <label className="block text-sm font-medium text-polar-night mb-1">
                    Country of tax residency
                  </label>
                  <Select
                    value={formData.taxResidencyCountry}
                    onChange={(value) => {
                      handleInputChange('taxResidencyCountry', value);
                      // Clear tax ID when country changes
                      handleInputChange('taxId', '');
                    }}
                    options={COUNTRY_OPTIONS}
                  />
                  <p className="text-xs text-text-muted mt-1">
                    Your tax information will be reported to this country&apos;s tax
                    authority
                  </p>
                </div>

                {/* Tax ID */}
                <div>
                  <label className="block text-sm font-medium text-polar-night mb-1">
                    {getTaxIdLabel(formData.taxResidencyCountry)} (Tax ID)
                  </label>
                  <Input
                    value={formData.taxId}
                    onChange={(e) => handleInputChange('taxId', e.target.value)}
                    placeholder={getTaxIdPlaceholder(formData.taxResidencyCountry)}
                    className={taxIdError ? 'border-aurora-red' : ''}
                    required
                  />
                  {taxIdError ? (
                    <p className="text-xs text-aurora-red mt-1">{taxIdError}</p>
                  ) : (
                    <p className="text-xs text-text-muted mt-1">
                      {getTaxIdFormatDescription(formData.taxResidencyCountry)}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={submitting || !!taxIdError}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit tax information'
                  )}
                </Button>
              </div>
            </div>
          </form>
        )}

        {/* Info Box */}
        <div className="mt-6 p-4 sm:p-6 bg-bg-elevated rounded-lg">
          <h4 className="font-medium text-polar-night mb-3">About DAC7</h4>
          <ul className="text-xs sm:text-sm text-text-secondary space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-frost-ice mt-0.5 flex-shrink-0">•</span>
              <span>
                DAC7 is an EU directive requiring digital platforms to collect and
                report seller information to tax authorities
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-frost-ice mt-0.5 flex-shrink-0">•</span>
              <span>
                Reporting is required when sellers exceed 30 transactions OR €2,000
                in annual sales
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-frost-ice mt-0.5 flex-shrink-0">•</span>
              <span>
                Information is reported annually to the tax authority in your country
                of tax residency
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-frost-ice mt-0.5 flex-shrink-0">•</span>
              <span>
                Your data is stored securely and only used for regulatory compliance
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
