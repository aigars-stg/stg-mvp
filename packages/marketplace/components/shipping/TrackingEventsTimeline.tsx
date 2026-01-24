'use client';

import type { TrackingEvent } from './types';
import { getTrackingEventColor } from './ShippingStatusConfig';
import { formatDateTime } from '@/lib/date-utils';

interface TrackingEventsTimelineProps {
  events: TrackingEvent[];
  title?: string;
  maxHeight?: string;
  showFullTimestamps?: boolean;
  className?: string;
}

export function TrackingEventsTimeline({
  events,
  title = 'Tracking History',
  maxHeight,
  showFullTimestamps: _showFullTimestamps = false,
  className = '',
}: TrackingEventsTimelineProps) {
  if (!events || events.length === 0) {
    return null;
  }

  // Sort events in reverse chronological order (most recent first)
  const sortedEvents = [...events].sort(
    (a, b) =>
      new Date(b.event_timestamp).getTime() - new Date(a.event_timestamp).getTime()
  );

  const formatTimestamp = (timestamp: string) => {
    return formatDateTime(timestamp);
  };

  return (
    <div className={className}>
      {title && (
        <p className="text-xs font-medium text-text-secondary mb-2">{title}</p>
      )}
      <div
        className={`space-y-3 ${maxHeight ? `max-h-[${maxHeight}] overflow-y-auto` : ''}`}
        style={maxHeight ? { maxHeight } : undefined}
      >
        {sortedEvents.map((event, index) => (
          <div key={event.id} className="flex gap-3">
            {/* Timeline indicator */}
            <div className="flex flex-col items-center">
              <div
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getTrackingEventColor(
                  event.state_type
                )}`}
              />
              {index < sortedEvents.length - 1 && (
                <div
                  className="w-0.5 flex-1 bg-border-subtle mt-1"
                  style={{ minHeight: '24px' }}
                />
              )}
            </div>

            {/* Event details */}
            <div className="flex-1 min-w-0 pb-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-polar-night dark:text-snow-white">
                  {event.state_text}
                </p>
                <p className="text-xs text-text-muted whitespace-nowrap flex-shrink-0">
                  {formatTimestamp(event.event_timestamp)}
                </p>
              </div>
              {event.location && (
                <p className="text-xs text-text-secondary mt-0.5">
                  {event.location}
                </p>
              )}
              {event.description && event.description !== event.state_text && (
                <p className="text-xs text-text-muted mt-0.5">
                  {event.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
