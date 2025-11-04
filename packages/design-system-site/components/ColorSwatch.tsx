interface ColorSwatchProps {
  name: string;
  value: string;
  usage: string;
}

export function ColorSwatch({ name, value, usage }: ColorSwatchProps) {
  return (
    <div className="space-y-3">
      <div
        className="h-24 rounded-lg border border-border-subtle shadow-sm"
        style={{ backgroundColor: value }}
      />
      <div>
        <div className="font-semibold text-polar-night capitalize">
          {name.replace(/([A-Z])/g, ' $1').trim()}
        </div>
        <div className="text-sm text-text-secondary font-mono">
          {value}
        </div>
        <div className="text-sm text-text-secondary mt-1">
          {usage}
        </div>
      </div>
    </div>
  );
}
