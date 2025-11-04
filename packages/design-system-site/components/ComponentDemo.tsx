import { ReactNode } from 'react';

interface ComponentDemoProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function ComponentDemo({ title, description, children }: ComponentDemoProps) {
  return (
    <div className="mb-8">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-polar-night mb-1">{title}</h3>
        {description && (
          <p className="text-sm text-text-secondary">{description}</p>
        )}
      </div>
      <div className="bg-bg-elevated border border-border-subtle rounded-lg p-8">
        {children}
      </div>
    </div>
  );
}
