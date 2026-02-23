// TODO: i18n — document names and column headers should come from translation keys

const documents = [
  { name: 'Terms of Service', version: '1.0', lastUpdated: 'November 25, 2025' },
  { name: 'Privacy Policy', version: '1.0', lastUpdated: 'November 25, 2025' },
  { name: 'Seller Agreement', version: '1.0', lastUpdated: 'November 25, 2025' },
  { name: 'Buyer Guide', version: '1.0', lastUpdated: 'January 2026' },
  { name: 'Cookie Policy', version: '1.0', lastUpdated: 'January 2026' },
  { name: 'Fee Schedule', version: '1.0', lastUpdated: 'November 25, 2025' },
];

export function DocumentVersions() {
  return (
    <div className="my-6 overflow-hidden rounded-lg border border-border-subtle print:break-inside-avoid">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle bg-snow-stormLightest">
            <th className="px-4 py-2.5 text-left font-semibold text-polar-night">
              Document
            </th>
            <th className="px-4 py-2.5 text-left font-semibold text-polar-night">
              Current Version
            </th>
            <th className="px-4 py-2.5 text-left font-semibold text-polar-night">
              Last Updated
            </th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc, i) => (
            <tr
              key={doc.name}
              className={
                i < documents.length - 1
                  ? 'border-b border-border-subtle'
                  : ''
              }
            >
              <td className="px-4 py-2.5 text-polar-nightDark">{doc.name}</td>
              <td className="px-4 py-2.5 text-polar-nightDark">
                {doc.version}
              </td>
              <td className="px-4 py-2.5 text-polar-nightDark">
                {doc.lastUpdated}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-border-subtle px-4 py-3 text-sm text-text-secondary">
        We notify registered users by email when we make significant changes to
        these documents.
      </p>
    </div>
  );
}
