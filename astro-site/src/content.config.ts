import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Allow empty strings (common in existing markdown) to be treated as
// "no value" for URL fields.
const optionalUrl = z
  .string()
  .url()
  .optional()
  .or(z.literal(''))
  .transform(v => (v === '' ? undefined : v));

const jobs = defineCollection({
  loader: glob({ base: '../content/jobs', pattern: '**/index.md' }),
  schema: z.object({
    date: z.coerce.date(),
    title: z.string(),
    company: z.string(),
    team: z.string().optional(),
    location: z.string().optional(),
    range: z.string(),
    range_abrv: z.string(),
    url: z.string().url(),
  }),
});

const projects = defineCollection({
  loader: glob({ base: '../content/projects', pattern: '**/*.md' }),
  schema: z.object({
    date: z.coerce.date(),
    title: z.string(),
    description: z.string().optional(),
    tech: z.array(z.string()).default([]),
    github: optionalUrl,
    external: optionalUrl,
    ios: optionalUrl,
    android: optionalUrl,
    company: z.string().optional(),
    showInProjects: z.boolean().default(true),
  }),
});

const posts = defineCollection({
  loader: glob({ base: '../content/posts', pattern: '**/index.md' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    slug: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

const featured = defineCollection({
  loader: glob({ base: '../content/featured', pattern: '**/index.md' }),
  schema: z.object({
    date: z.coerce.date(),
    title: z.string(),
    description: z.string().optional(),
    tech: z.array(z.string()).default([]),
    external: optionalUrl,
    github: optionalUrl,
    img: z.string().optional(),
  }),
});

export const collections = { jobs, projects, posts, featured };
