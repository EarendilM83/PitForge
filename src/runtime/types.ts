import { z } from 'zod';

// ---- value shapes (§5.2) ----
export const imageValueSchema = z.object({
  src: z.string(),
  alt: z.string(),
  width: z.number().optional(),
  height: z.number().optional(),
});
export const linkValueSchema = z.object({
  label: z.string(),
  href: z.string(),
  rel: z.string().optional(),
  variant: z.string().optional(),
});
export const videoValueSchema = z.object({
  url: z.string(),
  poster: z.string().optional(),
});
export type ImageValue = z.infer<typeof imageValueSchema>;
export type LinkValue = z.infer<typeof linkValueSchema>;
export type VideoValue = z.infer<typeof videoValueSchema>;

export const contentValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  imageValueSchema,
  linkValueSchema,
  videoValueSchema,
  z.array(z.record(z.unknown())),
  z.array(z.string()),
  z.record(z.unknown()),
]);
export type ContentValue = z.infer<typeof contentValueSchema>;
export type Content = Record<string, ContentValue>;
export const contentSchema = z.record(contentValueSchema);

// ---- manifest (§5.3) ----
const fieldBase = {
  label: z.string(),
  block: z.string(),
  maxLength: z.number().optional(),
  derivedFrom: z.string().optional(),
};
const imageFieldSchema = z.object({
  ...fieldBase,
  type: z.literal('image'),
  ratio: z.string().optional(),
  minWidth: z.number().optional(),
  altRequired: z.boolean().optional(),
  priority: z.boolean().optional(),
});
const iconFieldSchema = z.object({ ...fieldBase, type: z.literal('icon') });
const linkFieldSchema = z.object({
  ...fieldBase,
  type: z.enum(['link', 'button']),
  external: z.boolean().optional(),
  defaultRel: z.string().optional(),
  variant: z.string().optional(),
});
const textFieldSchema = z.object({
  ...fieldBase,
  type: z.enum(['text', 'heading', 'richtext']),
  level: z.number().optional(),
});
const videoFieldSchema = z.object({ ...fieldBase, type: z.literal('video') });

const itemFieldSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([imageFieldSchema, iconFieldSchema, linkFieldSchema, textFieldSchema, videoFieldSchema, repeatFieldSchema])
);
const repeatFieldSchema = z.object({
  ...fieldBase,
  type: z.literal('repeat'),
  min: z.number().optional(),
  max: z.number().optional(),
  item: z.record(itemFieldSchema),
});

export const fieldSchema = z.union([
  imageFieldSchema,
  iconFieldSchema,
  linkFieldSchema,
  textFieldSchema,
  videoFieldSchema,
  repeatFieldSchema,
]);
// Hand-written, permissive Field type — the zod schema above validates on load,
// this type is what the rest of the app consumes.
export interface Field {
  type: 'text' | 'heading' | 'richtext' | 'image' | 'icon' | 'link' | 'button' | 'repeat' | 'video';
  label: string;
  block: string;
  maxLength?: number;
  derivedFrom?: string;
  level?: number;
  ratio?: string;
  minWidth?: number;
  altRequired?: boolean;
  priority?: boolean;
  external?: boolean;
  defaultRel?: string;
  variant?: string;
  min?: number;
  max?: number;
  item?: Record<string, Field>;
}

export const manifestSchema = z.object({
  version: z.number(),
  fields: z.record(fieldSchema),
});
export interface Manifest {
  version: number;
  fields: Record<string, Field>;
}

// ---- pitforge.json (§5.1) ----
export const projectConfigSchema = z.object({
  name: z.string(),
  lang: z.string(),
  blocks: z.array(z.string()),
  domain: z.string().optional().default(''),
  createdBy: z.string().optional(),
});
export type ProjectConfig = z.infer<typeof projectConfigSchema>;

export interface Project {
  id: string;
  config: ProjectConfig;
  manifest: Manifest;
  content: Content;
  tokensCss: string;
  blockPaths: string[];
}

/** Type-appropriate empty value for a manifest field missing from content (§5.3). */
export function emptyValueFor(field: Field): ContentValue {
  switch (field.type) {
    case 'image':
    case 'icon':
      return { src: '', alt: '' };
    case 'link':
    case 'button':
      return { label: '', href: '' };
    case 'video':
      return { url: '' };
    case 'repeat':
      return [];
    default:
      return '';
  }
}

export function getField(manifest: Manifest, key: string): Field | undefined {
  return manifest.fields[key] as Field | undefined;
}
