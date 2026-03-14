'use client';

import Image from 'next/image';

interface EvidencePhotoGridProps {
  urls: string[];
  altPrefix: string;
}

export function EvidencePhotoGrid({ urls, altPrefix }: EvidencePhotoGridProps) {
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {urls.map((url, idx) => (
        <a
          key={idx}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative w-20 h-20 rounded-lg overflow-hidden border border-border hover:shadow-md transition-shadow"
        >
          <Image
            src={url}
            alt={`${altPrefix} ${idx + 1}`}
            fill
            className="object-cover"
            sizes="80px"
          />
        </a>
      ))}
    </div>
  );
}
