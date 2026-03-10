'use client';

import { User, LocationPin as MapPin, Phone, Email as Mail } from '@/lib/icons';
import { CountryDisplay } from '@second-turn/design-system';
import type { ShippingDestination, ParcelSize } from './types';

interface ShippingInfoCardProps {
  destination: ShippingDestination;
  parcelSize?: ParcelSize;
  title?: string;
  showReceiverInfo?: boolean;
  /** When false, hides receiver phone number (seller view) */
  showPhone?: boolean;
  className?: string;
}

export function ShippingInfoCard({
  destination,
  parcelSize,
  title = 'Delivery',
  showReceiverInfo = true,
  showPhone = true,
  className = '',
}: ShippingInfoCardProps) {

  return (
    <div className={className}>
      {title && (
        <h3 className="text-sm font-semibold text-polar-night mb-3">
          {title}
        </h3>
      )}

      <div className="space-y-3">
        {/* Terminal location */}
        {destination.terminal_name && (
          <div className="flex items-start gap-3 p-3 bg-bg-elevated rounded-lg">
            <MapPin className="w-5 h-5 text-frost-ice flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-polar-night">
                {destination.terminal_name}
              </p>
              {destination.terminal_address && (
                <p className="text-sm text-text-secondary mt-1">
                  {destination.terminal_address}
                </p>
              )}
              <CountryDisplay countryCode={destination.country} mode="full" className="text-sm text-text-muted mt-1" />
            </div>
          </div>
        )}

        {/* Parcel size */}
        {parcelSize && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-secondary">Parcel Size:</span>
            <span className="font-medium text-polar-night">
              {parcelSize}
            </span>
          </div>
        )}

        {/* Receiver information */}
        {showReceiverInfo && destination.receiver_name && (
          <div className="space-y-2 text-sm pt-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-text-muted" />
              <span className="text-text-secondary">Recipient:</span>
              <span className="font-medium text-polar-night">
                {destination.receiver_name}
              </span>
            </div>
            {destination.receiver_phone && showPhone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-text-muted" />
                <span className="text-text-secondary">Phone:</span>
                <span className="font-medium text-polar-night">
                  {destination.receiver_phone}
                </span>
              </div>
            )}
            {destination.receiver_email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-text-muted" />
                <span className="text-text-secondary">Email:</span>
                <span className="font-medium text-polar-night">
                  {destination.receiver_email}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
