import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Legal directory paths are constructed dynamically in getLegalDocument()

// Fallback to process.cwd()/content/legal if the first one doesn't exist
// This is because locally process.cwd() might be the root of the repo OR the package dir 
// depending on how it's run, but in Vercel it's usually the root.
// Actually, in Next.js `process.cwd()` is usually the project root (where package.json is).
// So if running `pnpm dev` in `packages/marketplace`, `process.cwd()` is `.../packages/marketplace`.
// So `packages/marketplace/content/legal` would be `packages/marketplace/packages/marketplace/content/legal` which is wrong.
// If I am running in `packages/marketplace`, then `content/legal` is correct relative to CWD.
// BUT, if I run from root, it might be different.
// The user runs `pnpm dev` in `packages/marketplace`. So `process.cwd()` is `.../packages/marketplace`.
// So path should be `path.join(process.cwd(), 'content/legal')`.

// However, I made the directory at `packages/marketplace/content/legal` relative to the *Repo Root* previously in my `mkdir` command?
// Wait, I ran `mkdir -p packages/marketplace/content/legal` from `c:\Users\aigar\Documents\Claude\stg-mvp`.
// So the folder exists at `c:\Users\aigar\Documents\Claude\stg-mvp\packages\marketplace\content\legal`.
// If `process.cwd()` is `c:\Users\aigar\Documents\Claude\stg-mvp\packages\marketplace`, then `content/legal` is the correct relative path.

export function getLegalDocument(slug: string) {
    // Try finding the file in typical locations to be robust
    const possiblePaths = [
        path.join(process.cwd(), 'content/legal', `${slug}.md`),
        path.join(process.cwd(), 'packages/marketplace/content/legal', `${slug}.md`) // specific for vercel monorepo context if root is CWD
    ];



    const fullPath = possiblePaths.find(p => fs.existsSync(p));

    if (!fullPath) {
        throw new Error(`Legal document not found: ${slug}. Searched in: ${possiblePaths.join(', ')}`);
    }

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
        slug,
        frontmatter: data as { title: string; lastUpdated: string; description?: string },
        content,
    };
}
