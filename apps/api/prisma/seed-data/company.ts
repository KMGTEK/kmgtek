export interface TeamMemberSeed {
  name: string;
  title: string;
  bio: string;
  linkedinUrl?: string;
  isLeadership: boolean;
  order: number;
}

export interface TestimonialSeed {
  authorName: string;
  authorTitle: string;
  company: string;
  quote: string;
  rating: number;
  featured: boolean;
  order: number;
}

export const TEAM_MEMBERS: TeamMemberSeed[] = [
  {
    name: 'Krishna M. Gupta',
    title: 'Founder & Chief Executive Officer',
    bio: 'Krishna founded KMG Technologies in 2020 after fifteen years leading analytics and infrastructure teams at financial services firms. He spends most of his time with clients, helping executive teams turn data into decisions and ambitious modernization goals into sequenced, fundable programs.',
    linkedinUrl: 'https://www.linkedin.com/company/kmgtek',
    isLeadership: true,
    order: 1,
  },
  {
    name: 'Meera Raghavan',
    title: 'Chief Technology Officer',
    bio: 'Meera leads our analytics practice and sets the standards behind every engagement — data modeling, governance and the BI platforms our clients rely on. She has designed reporting platforms for healthcare and banking clients processing millions of records.',
    linkedinUrl: 'https://www.linkedin.com/company/kmgtek',
    isLeadership: true,
    order: 2,
  },
  {
    name: 'Daniel Okafor',
    title: 'VP, Cloud Data Platforms',
    bio: 'Daniel has run more than forty cloud data platform migrations across AWS and Azure. He is happiest in a data-modeling session, arguing about warehouse design and access controls before a single table moves.',
    linkedinUrl: 'https://www.linkedin.com/company/kmgtek',
    isLeadership: true,
    order: 3,
  },
  {
    name: 'Priya Desai',
    title: 'Director of Talent Solutions',
    bio: 'Priya built our recruitment practice from the ground up. She is obsessive about candidate experience — every applicant hears back, and every shortlist is technically vetted by an analyst or engineer before it reaches a client.',
    linkedinUrl: 'https://www.linkedin.com/company/kmgtek',
    isLeadership: true,
    order: 4,
  },
  {
    name: 'Alex Whitfield',
    title: 'Principal Data Platform Engineer',
    bio: 'Alex leads our data reliability practice, from pipeline monitoring to incident response. He has kept board-level reporting online through month-end close every quarter and writes the postmortems everyone actually reads.',
    isLeadership: false,
    order: 5,
  },
  {
    name: 'Sanjana Iyer',
    title: 'Lead Data & AI Analyst',
    bio: 'Sanjana builds the predictive models and retrieval pipelines behind our advanced analytics engagements. She specializes in getting AI-assisted reporting past the demo stage and into production with evaluation, guardrails and cost control.',
    isLeadership: false,
    order: 6,
  },
];

export const TESTIMONIALS: TestimonialSeed[] = [
  {
    authorName: 'Rachel Simmons',
    authorTitle: 'VP of Engineering',
    company: 'Northbridge Financial',
    quote:
      'KMG took us from quarterly releases to deploying several times a day inside six months. What impressed me most was that they left our team able to run everything themselves — no dependency, no black boxes.',
    rating: 5,
    featured: true,
    order: 1,
  },
  {
    authorName: 'Marcus Chen',
    authorTitle: 'Chief Information Officer',
    company: 'Vertex Health Systems',
    quote:
      'Our AWS migration touched 140 applications and finished two weeks early with zero unplanned downtime. The wave planning and rollback rehearsals made the difference.',
    rating: 5,
    featured: true,
    order: 2,
  },
  {
    authorName: 'Elena Kowalski',
    authorTitle: 'Director of Platform Engineering',
    company: 'Lumen Retail Group',
    quote:
      'The Kubernetes platform KMG designed handled our holiday peak at four times normal traffic without a single page. Their engineers argued us out of a few bad ideas, which is exactly what we were paying for.',
    rating: 5,
    featured: true,
    order: 3,
  },
  {
    authorName: 'David Osei',
    authorTitle: 'Head of Talent Acquisition',
    company: 'Corvus Logistics',
    quote:
      'We filled five hard DevOps roles in seven weeks. Every candidate KMG sent had already been technically screened — our hiring managers stopped dreading interviews.',
    rating: 5,
    featured: false,
    order: 4,
  },
  {
    authorName: 'Aisha Rahman',
    authorTitle: 'Chief Technology Officer',
    company: 'Brightpath Insurance',
    quote:
      'Their DevSecOps work got us through a SOC 2 audit with no findings on the engineering side. Scanning, signing and policy enforcement were all automated rather than documented and ignored.',
    rating: 5,
    featured: false,
    order: 5,
  },
  {
    authorName: 'Tom Bergeron',
    authorTitle: 'Senior Director, Data Platform',
    company: 'Halcyon Media',
    quote:
      'KMG replaced a fragile nightly ETL with a properly orchestrated platform, then helped us ship a retrieval-augmented search feature our editors actually use every day.',
    rating: 5,
    featured: false,
    order: 6,
  },
];

export interface LeadSeed {
  name: string;
  email: string;
  company: string;
  phone?: string;
  country: string;
  serviceSlug?: string;
  serviceInterest?: string;
  message: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';
  source: string;
  daysAgo: number;
}

export const LEADS: LeadSeed[] = [
  {
    name: 'Jonathan Pierce',
    email: 'jpierce@atlasmanufacturing.com',
    company: 'Atlas Manufacturing',
    phone: '(973) 555-0142',
    country: 'United States',
    serviceSlug: 'cloud-data-platforms',
    serviceInterest: 'Cloud Data Platforms',
    message:
      'Our production and quality data is spread across two on-prem systems and our data centre lease ends in fourteen months. We need to move our reporting and warehouse to the cloud ahead of everything else. Who should we talk to?',
    status: 'NEW',
    source: 'contact-form',
    daysAgo: 2,
  },
  {
    name: 'Priyanka Shah',
    email: 'p.shah@meridianbank.com',
    company: 'Meridian Bank',
    phone: '(212) 555-0178',
    country: 'United States',
    serviceSlug: 'business-intelligence-reporting',
    serviceInterest: 'Business Intelligence & Reporting',
    message:
      'Our monthly board reporting takes three weeks and involves 40 manual spreadsheet steps. Looking for a partner to assess our reporting process and propose a 90-day plan to automate it.',
    status: 'CONTACTED',
    source: 'service-page',
    daysAgo: 6,
  },
  {
    name: 'Robert Nakamura',
    email: 'rnakamura@helixbio.com',
    company: 'Helix Biosciences',
    country: 'United States',
    serviceSlug: 'data-warehousing-etl',
    serviceInterest: 'Data Warehousing & ETL',
    message:
      'We have research data spread across three lab systems and nobody fully trusts the numbers in our weekly reports anymore. We would like a data warehouse design and a remediation roadmap.',
    status: 'QUALIFIED',
    source: 'referral',
    daysAgo: 11,
  },
  {
    name: 'Amanda Foster',
    email: 'afoster@cascaderetail.com',
    company: 'Cascade Retail',
    phone: '(503) 555-0113',
    country: 'United States',
    serviceInterest: 'Staffing / Talent Solutions',
    message:
      'We need four contract-to-hire data analysts for a 12-month reporting and analytics programme starting next quarter. Can you share rates and typical time to shortlist?',
    status: 'PROPOSAL',
    source: 'contact-form',
    daysAgo: 15,
  },
  {
    name: 'Michael Brennan',
    email: 'mbrennan@sterlinglogistics.com',
    company: 'Sterling Logistics',
    phone: '(908) 555-0166',
    country: 'United States',
    serviceSlug: 'business-process-analytics',
    serviceInterest: 'Business Process Analytics',
    message:
      'Following our call — we are ready to proceed with the fleet and route analytics scope. Please send the statement of work for legal review.',
    status: 'WON',
    source: 'contact-form',
    daysAgo: 28,
  },
  {
    name: 'Laura Mendes',
    email: 'lmendes@novapayments.com',
    company: 'Nova Payments',
    country: 'United States',
    serviceSlug: 'predictive-advanced-analytics',
    serviceInterest: 'Predictive & Advanced Analytics',
    message:
      'We are building a transaction fraud-risk model ahead of our PCI-DSS reassessment and want an independent partner to validate it before go-live. Budget is being confirmed for next fiscal year.',
    status: 'LOST',
    source: 'contact-form',
    daysAgo: 41,
  },
  {
    name: 'Kevin Osei',
    email: 'kosei@brightlineenergy.com',
    company: 'Brightline Energy',
    phone: '(646) 555-0190',
    country: 'United States',
    serviceSlug: 'applied-ai-machine-learning',
    serviceInterest: 'Applied AI & Machine Learning',
    message:
      'Interested in a proof of concept: a natural-language assistant over our maintenance manuals, grounded in our existing reporting. Roughly 30,000 documents, currently in SharePoint.',
    status: 'NEW',
    source: 'blog',
    daysAgo: 4,
  },
  {
    name: 'Sofia Alvarez',
    email: 'salvarez@corepointhealth.com',
    company: 'Corepoint Health',
    country: 'United States',
    serviceSlug: 'cloud-data-platforms',
    serviceInterest: 'Cloud Data Platforms',
    message:
      'HIPAA-regulated clinical reporting data, currently on-premises. We need a cloud data platform design and a partner who has done this in healthcare before.',
    status: 'CONTACTED',
    source: 'case-study',
    daysAgo: 9,
  },
];
