import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

interface DocumentFrontmatter {
  title: string;
  lastUpdated: string;
  description?: string;
}

interface Document {
  slug: string;
  frontmatter: DocumentFrontmatter;
  content: string;
}

function findContentFile(subdir: string, slug: string): string | undefined {
  const possiblePaths = [
    path.join(process.cwd(), `content/${subdir}`, `${slug}.md`),
    path.join(process.cwd(), `packages/marketplace/content/${subdir}`, `${slug}.md`),
  ];
  return possiblePaths.find((p) => fs.existsSync(p));
}

function loadDocument(subdir: string, slug: string): Document {
  const fullPath = findContentFile(subdir, slug);

  if (!fullPath) {
    throw new Error(`Document not found: ${subdir}/${slug}.md`);
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug,
    frontmatter: data as DocumentFrontmatter,
    content,
  };
}

/** Load a legal document (from content/legal/) */
export function getLegalDocument(slug: string, locale: string = 'en'): Document {
  // Try requested locale first, then English, then flat directory
  const localeOrder = locale === 'en' ? ['en'] : [locale, 'en'];
  for (const loc of localeOrder) {
    const localePath = findContentFile(`legal/${loc}`, slug);
    if (localePath) {
      const fileContents = fs.readFileSync(localePath, 'utf8');
      const { data, content } = matter(fileContents);
      return { slug, frontmatter: data as DocumentFrontmatter, content };
    }
  }
  return loadDocument('legal', slug);
}

/** Load a help document (from content/help/en/) */
export function getHelpDocument(slug: string, locale: string = 'en'): Document {
  // Try requested locale first, then English, then flat directory
  const localeOrder = locale === 'en' ? ['en'] : [locale, 'en'];
  for (const loc of localeOrder) {
    const localePath = findContentFile(`help/${loc}`, slug);
    if (localePath) {
      const fileContents = fs.readFileSync(localePath, 'utf8');
      const { data, content } = matter(fileContents);
      return { slug, frontmatter: data as DocumentFrontmatter, content };
    }
  }
  return loadDocument('help', slug);
}

/** List all available help documents */
export function listHelpDocuments(): Document[] {
  const possibleDirs = [
    path.join(process.cwd(), 'content/help/en'),
    path.join(process.cwd(), 'packages/marketplace/content/help/en'),
    path.join(process.cwd(), 'content/help'),
    path.join(process.cwd(), 'packages/marketplace/content/help'),
  ];

  const dir = possibleDirs.find((d) => fs.existsSync(d));
  if (!dir) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const slug = f.replace(/\.md$/, '');
      const fileContents = fs.readFileSync(path.join(dir, f), 'utf8');
      const { data, content } = matter(fileContents);
      return { slug, frontmatter: data as DocumentFrontmatter, content };
    })
    .sort((a, b) => (a.frontmatter.title || '').localeCompare(b.frontmatter.title || ''));
}
