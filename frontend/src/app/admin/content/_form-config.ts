import type { ContentBlockKey } from '@kmg/shared';

import type { ArrayFieldColumn } from './_components/array-object-field';

/**
 * Declarative field config per content block — drives a single generic form renderer
 * (`ContentBlockForm`) instead of 13 bespoke layouts. Each block is one or more "groups"
 * (rendered as a `<Card>`); each group is a flat list of fields. `name` is a dotted path
 * into that block's data object, matching the shape in `CONTENT_BLOCK_SCHEMAS`.
 */
export type FieldConfig =
  | { kind: 'text'; name: string; label: string; placeholder?: string }
  | { kind: 'textarea'; name: string; label: string; rows?: number; maxLength?: number; placeholder?: string }
  | { kind: 'stringList'; name: string; label: string; addLabel?: string; placeholder?: string; description?: string }
  | { kind: 'paragraphList'; name: string; label: string; addLabel?: string; description?: string }
  | {
      kind: 'arrayObject';
      name: string;
      label: string;
      columns: ArrayFieldColumn[];
      emptyRow: Record<string, unknown>;
      addLabel?: string;
      description?: string;
    };

export interface FieldGroup {
  title: string;
  description?: string;
  fields: FieldConfig[];
}

const titleDesc: ArrayFieldColumn[] = [
  { key: 'title', label: 'Title', kind: 'text' },
  { key: 'description', label: 'Description', kind: 'textarea' },
];

const iconTitleDesc: ArrayFieldColumn[] = [
  { key: 'icon', label: 'Icon', kind: 'icon' },
  { key: 'title', label: 'Title', kind: 'text' },
  { key: 'description', label: 'Description', kind: 'textarea' },
];

export const CONTENT_BLOCK_FORM_CONFIG: Record<ContentBlockKey, FieldGroup[]> = {
  'home.hero': [
    {
      title: 'Hero',
      fields: [
        { kind: 'text', name: 'eyebrow', label: 'Eyebrow badge' },
        { kind: 'text', name: 'headline', label: 'Headline (before the highlight)' },
        { kind: 'text', name: 'headlineHighlight', label: 'Highlighted phrase' },
        { kind: 'text', name: 'headlineSuffix', label: 'Headline suffix (optional)', placeholder: 'e.g. , Cloud & AI' },
        { kind: 'textarea', name: 'description', label: 'Description', rows: 4, maxLength: 600 },
        { kind: 'stringList', name: 'trustPoints', label: 'Trust points', addLabel: 'Add trust point' },
        { kind: 'text', name: 'primaryCtaLabel', label: 'Primary CTA label' },
        { kind: 'text', name: 'secondaryCtaLabel', label: 'Secondary CTA label' },
      ],
    },
  ],
  'home.company_intro': [
    {
      title: 'Section header',
      fields: [
        { kind: 'text', name: 'eyebrow', label: 'Eyebrow' },
        { kind: 'text', name: 'title', label: 'Title' },
        { kind: 'textarea', name: 'description', label: 'Description', rows: 3, maxLength: 600 },
      ],
    },
    {
      title: 'Pillars',
      fields: [
        {
          kind: 'arrayObject',
          name: 'pillars',
          label: 'Pillars',
          columns: titleDesc,
          emptyRow: { title: '', description: '' },
          addLabel: 'Add pillar',
        },
      ],
    },
  ],
  'home.services': [
    {
      title: 'What We Do section',
      fields: [
        { kind: 'text', name: 'eyebrow', label: 'Eyebrow' },
        { kind: 'text', name: 'title', label: 'Title' },
        { kind: 'textarea', name: 'description', label: 'Description', rows: 3, maxLength: 300 },
      ],
    },
  ],
  'home.why_choose_us': [
    {
      title: 'Section header',
      fields: [
        { kind: 'text', name: 'eyebrow', label: 'Eyebrow' },
        { kind: 'text', name: 'title', label: 'Title' },
        { kind: 'textarea', name: 'description', label: 'Description', rows: 2, maxLength: 300 },
      ],
    },
    {
      title: 'Reasons',
      fields: [
        {
          kind: 'arrayObject',
          name: 'reasons',
          label: 'Reasons',
          columns: iconTitleDesc,
          emptyRow: { icon: 'Sparkles', title: '', description: '' },
          addLabel: 'Add reason',
        },
      ],
    },
  ],
  'home.stats': [
    {
      title: 'Statistics',
      description: 'Shown as animated counters. 1–6 items.',
      fields: [
        {
          kind: 'arrayObject',
          name: 'items',
          label: 'Stats',
          columns: [
            { key: 'label', label: 'Label', kind: 'text' },
            { key: 'value', label: 'Value', kind: 'number' },
            { key: 'suffix', label: 'Suffix', kind: 'text', placeholder: '+' },
          ],
          emptyRow: { label: '', value: 0, suffix: '+' },
          addLabel: 'Add stat',
        },
      ],
    },
  ],
  'site.industries': [
    {
      title: 'Section header',
      fields: [
        { kind: 'text', name: 'eyebrow', label: 'Eyebrow' },
        { kind: 'text', name: 'title', label: 'Title' },
        { kind: 'textarea', name: 'description', label: 'Description', rows: 2, maxLength: 300 },
      ],
    },
    {
      title: 'Industries',
      description: 'The slug controls the anchor link (#slug) on /industries — lowercase letters, numbers and hyphens only.',
      fields: [
        {
          kind: 'arrayObject',
          name: 'items',
          label: 'Industries',
          columns: [
            { key: 'name', label: 'Name', kind: 'text' },
            { key: 'slug', label: 'Slug', kind: 'text', placeholder: 'e.g. banking' },
            { key: 'icon', label: 'Icon', kind: 'icon' },
            { key: 'description', label: 'Description', kind: 'textarea' },
          ],
          emptyRow: { slug: '', name: '', icon: 'Sparkles', description: '' },
          addLabel: 'Add industry',
        },
      ],
    },
  ],
  'home.toolchain': [
    {
      title: 'Toolchain section',
      fields: [
        { kind: 'text', name: 'eyebrow', label: 'Eyebrow' },
        { kind: 'text', name: 'title', label: 'Title' },
        { kind: 'textarea', name: 'description', label: 'Description', rows: 3, maxLength: 300 },
      ],
    },
  ],
  'footer.cta': [
    {
      title: 'Footer call-to-action',
      fields: [
        { kind: 'text', name: 'title', label: 'Title (before the highlight)' },
        { kind: 'text', name: 'titleHighlight', label: 'Highlighted word' },
        { kind: 'textarea', name: 'description', label: 'Description', rows: 3, maxLength: 300 },
      ],
    },
  ],
  'about.story': [
    {
      title: 'Our story',
      fields: [
        { kind: 'text', name: 'eyebrow', label: 'Eyebrow' },
        { kind: 'text', name: 'title', label: 'Title' },
        { kind: 'paragraphList', name: 'paragraphs', label: 'Paragraphs', addLabel: 'Add paragraph' },
      ],
    },
  ],
  'about.mission_vision': [
    {
      title: 'Mission',
      fields: [
        { kind: 'text', name: 'missionTitle', label: 'Mission title' },
        { kind: 'textarea', name: 'missionText', label: 'Mission text', rows: 4, maxLength: 600 },
      ],
    },
    {
      title: 'Vision',
      fields: [
        { kind: 'text', name: 'visionTitle', label: 'Vision title' },
        { kind: 'textarea', name: 'visionText', label: 'Vision text', rows: 4, maxLength: 600 },
      ],
    },
  ],
  'about.values': [
    {
      title: 'Section header',
      fields: [
        { kind: 'text', name: 'eyebrow', label: 'Eyebrow' },
        { kind: 'text', name: 'title', label: 'Title' },
      ],
    },
    {
      title: 'Values',
      fields: [
        {
          kind: 'arrayObject',
          name: 'values',
          label: 'Values',
          columns: iconTitleDesc,
          emptyRow: { icon: 'Sparkles', title: '', description: '' },
          addLabel: 'Add value',
        },
      ],
    },
  ],
  'about.certifications': [
    {
      title: 'Section header',
      fields: [
        { kind: 'text', name: 'eyebrow', label: 'Eyebrow' },
        { kind: 'text', name: 'title', label: 'Title' },
      ],
    },
    {
      title: 'Certifications',
      fields: [
        {
          kind: 'arrayObject',
          name: 'items',
          label: 'Certifications',
          columns: [
            { key: 'name', label: 'Name', kind: 'text' },
            { key: 'description', label: 'Description', kind: 'text' },
          ],
          emptyRow: { name: '', description: '' },
          addLabel: 'Add certification',
        },
      ],
    },
  ],
  'about.global_presence': [
    {
      title: 'Section header',
      fields: [
        { kind: 'text', name: 'eyebrow', label: 'Eyebrow' },
        { kind: 'text', name: 'title', label: 'Title' },
      ],
    },
    {
      title: 'Regions',
      fields: [
        {
          kind: 'arrayObject',
          name: 'regions',
          label: 'Regions',
          columns: [
            { key: 'name', label: 'Region name', kind: 'text' },
            { key: 'detail', label: 'Detail', kind: 'textarea' },
          ],
          emptyRow: { name: '', detail: '' },
          addLabel: 'Add region',
        },
      ],
    },
  ],
  'careers.intro': [
    {
      title: 'Hero',
      fields: [
        { kind: 'text', name: 'heroEyebrow', label: 'Eyebrow' },
        { kind: 'text', name: 'heroTitle', label: 'Title (before the highlight)' },
        { kind: 'text', name: 'heroTitleHighlight', label: 'Highlighted phrase' },
        { kind: 'textarea', name: 'heroDescription', label: 'Description', rows: 3, maxLength: 400 },
      ],
    },
    {
      title: 'Why work with us',
      fields: [
        { kind: 'text', name: 'whyUsEyebrow', label: 'Eyebrow' },
        { kind: 'text', name: 'whyUsTitle', label: 'Title' },
        { kind: 'textarea', name: 'whyUsDescription', label: 'Description', rows: 2, maxLength: 300 },
        {
          kind: 'arrayObject',
          name: 'whyUs',
          label: 'Reasons',
          columns: iconTitleDesc,
          emptyRow: { icon: 'Sparkles', title: '', description: '' },
          addLabel: 'Add reason',
        },
      ],
    },
    {
      title: 'Benefits',
      fields: [
        { kind: 'text', name: 'benefitsEyebrow', label: 'Eyebrow' },
        { kind: 'text', name: 'benefitsTitle', label: 'Title' },
        {
          kind: 'arrayObject',
          name: 'benefits',
          label: 'Benefits',
          columns: [
            { key: 'icon', label: 'Icon', kind: 'icon' },
            { key: 'label', label: 'Label', kind: 'text' },
          ],
          emptyRow: { icon: 'Sparkles', label: '' },
          addLabel: 'Add benefit',
        },
      ],
    },
    {
      title: 'Culture',
      fields: [
        { kind: 'text', name: 'cultureEyebrow', label: 'Eyebrow' },
        { kind: 'text', name: 'cultureTitle', label: 'Title' },
        { kind: 'stringList', name: 'culturePoints', label: 'Culture points', addLabel: 'Add point' },
        { kind: 'textarea', name: 'cultureQuote', label: 'Quote', rows: 3, maxLength: 400 },
        { kind: 'text', name: 'cultureQuoteAttribution', label: 'Quote attribution' },
      ],
    },
    {
      title: 'Current openings section',
      fields: [
        { kind: 'text', name: 'openingsEyebrow', label: 'Eyebrow' },
        { kind: 'text', name: 'openingsTitle', label: 'Title' },
      ],
    },
    {
      title: '"No role fits" call-to-action',
      fields: [
        { kind: 'text', name: 'noRoleTitle', label: 'Title' },
        { kind: 'textarea', name: 'noRoleDescription', label: 'Description', rows: 2, maxLength: 300 },
        { kind: 'text', name: 'noRoleButtonLabel', label: 'Button label' },
      ],
    },
  ],
  'services.intro': [
    {
      title: 'Hero',
      fields: [
        { kind: 'text', name: 'heroEyebrow', label: 'Eyebrow' },
        { kind: 'text', name: 'heroTitle', label: 'Title' },
        { kind: 'textarea', name: 'heroDescription', label: 'Description', rows: 3, maxLength: 400 },
      ],
    },
    {
      title: 'Process',
      fields: [
        { kind: 'text', name: 'processEyebrow', label: 'Eyebrow' },
        { kind: 'text', name: 'processTitle', label: 'Title' },
        { kind: 'textarea', name: 'processDescription', label: 'Description', rows: 2, maxLength: 300 },
        {
          kind: 'arrayObject',
          name: 'process',
          label: 'Steps',
          columns: iconTitleDesc,
          emptyRow: { icon: 'Sparkles', title: '', description: '' },
          addLabel: 'Add step',
        },
      ],
    },
  ],
  'contact.hero': [
    {
      title: 'Contact hero',
      fields: [
        { kind: 'text', name: 'eyebrow', label: 'Eyebrow' },
        { kind: 'text', name: 'title', label: 'Title' },
        { kind: 'textarea', name: 'description', label: 'Description', rows: 3, maxLength: 400 },
      ],
    },
  ],
};
