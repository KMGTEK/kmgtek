import type { Benefit, FAQ, ProcessStep } from '../types';

export interface ServiceSeed {
  slug: string;
  title: string;
  icon: string; // lucide-react icon name
  shortDescription: string;
  overview: string;
  benefits: Benefit[];
  process: ProcessStep[];
  technologies: string[]; // technology slugs
  faqs: FAQ[];
}

const discover: ProcessStep = {
  title: 'Discover & Assess',
  description: 'Workshops with your stakeholders to map current state, constraints, risks and business goals.',
};
const roadmap: ProcessStep = {
  title: 'Strategy & Roadmap',
  description: 'A prioritized, costed roadmap with clear milestones, success metrics and quick wins.',
};
const handover: ProcessStep = {
  title: 'Enable & Handover',
  description: 'Documentation, runbooks and hands-on enablement so your teams own the outcome.',
};

/**
 * KMG's core practice is business analytics; cloud and AI are supporting capabilities that
 * extend it. Analytics services lead the list (and therefore the nav/footer/homepage teaser),
 * with a small set of cloud/AI/managed-services offerings after them.
 */
export const SERVICES: ServiceSeed[] = [
  {
    slug: 'business-intelligence-reporting',
    title: 'Business Intelligence & Reporting',
    icon: 'LayoutDashboard',
    shortDescription:
      'Turn scattered spreadsheets into governed dashboards and reports your leadership actually trusts.',
    overview:
      'We design and build BI platforms — from data modeling to self-service dashboards — so decision-makers get accurate, timely answers without waiting on a report request queue. Every metric is defined once, governed centrally, and trusted everywhere it appears.',
    benefits: [
      { icon: 'LayoutDashboard', title: 'Self-service dashboards', description: 'Give teams answers on demand instead of waiting on a report backlog.' },
      { icon: 'ShieldCheck', title: 'One source of truth', description: 'Metrics defined once and governed centrally — no more dueling spreadsheets.' },
      { icon: 'Gauge', title: 'Faster decisions', description: 'Real-time and near-real-time reporting replaces month-end surprises.' },
      { icon: 'Users', title: 'Adoption that sticks', description: 'Hands-on training and change management so dashboards actually get used.' },
    ],
    process: [discover, { title: 'Data Modeling', description: 'Define a governed semantic layer so every report agrees with every other report.' }, { title: 'Build Dashboards', description: 'Ship the first dashboards in weeks, then iterate with real user feedback.' }, handover],
    technologies: ['powerbi', 'tableau', 'looker', 'excel', 'postgresql'],
    faqs: [
      { question: 'We already have Power BI or Tableau — can you just fix what we have?', answer: 'Yes. Most engagements start with an audit of existing reports and a plan to consolidate and fix the ones worth keeping.' },
      { question: 'How long until we see our first dashboard?', answer: 'Typically 2–4 weeks for a first governed dashboard, once source data access is in place.' },
      { question: 'Do you work with our existing BI tool?', answer: 'Yes — we are tool-agnostic across Power BI, Tableau and Looker, and will recommend a change only when it clearly pays for itself.' },
    ],
  },
  {
    slug: 'data-analytics-visualization',
    title: 'Data Analytics & Visualization',
    icon: 'PieChart',
    shortDescription:
      'Exploratory analysis and storytelling that turns raw data into decisions your stakeholders act on.',
    overview:
      'Our analysts dig into your data to answer the questions dashboards can’t — why something happened, what is driving a trend, and what to do about it. We pair statistical rigor with visualization craft so findings are both correct and persuasive.',
    benefits: [
      { icon: 'Search', title: 'Root-cause analysis', description: 'Understand why metrics moved, not just that they did.' },
      { icon: 'PenTool', title: 'Visualization craft', description: 'Charts and narratives built for the audience, not just the analyst.' },
      { icon: 'Clock', title: 'Fast turnaround', description: 'Ad hoc analysis in days, not the next sprint.' },
      { icon: 'Lightbulb', title: 'Actionable findings', description: 'Every analysis ends with a recommendation, not just a chart.' },
    ],
    process: [discover, { title: 'Explore', description: 'Statistical exploration and hypothesis testing on your actual data.' }, { title: 'Visualize', description: 'Build the chart or narrative that makes the finding undeniable.' }, { title: 'Present & Decide', description: 'Walk stakeholders through findings and agree on next steps.' }],
    technologies: ['python', 'r', 'tableau', 'powerbi', 'postgresql'],
    faqs: [
      { question: 'Can you work with our existing data, warts and all?', answer: 'Yes — most engagements start with the data you have. We flag quality issues rather than waiting for perfect data.' },
      { question: 'Do you only deliver a report, or help us act on it?', answer: 'We present findings with clear recommendations and stay engaged through the decision, not just the analysis.' },
    ],
  },
  {
    slug: 'data-warehousing-etl',
    title: 'Data Warehousing & ETL',
    icon: 'Database',
    shortDescription:
      'Reliable pipelines and a governed warehouse so every report and model draws from clean, consistent data.',
    overview:
      'We design cloud data warehouses and the ETL/ELT pipelines that feed them — consolidating scattered source systems into a single, tested, well-documented foundation your analytics and AI can build on.',
    benefits: [
      { icon: 'GitBranch', title: 'Single source of truth', description: 'Every source system lands in one governed warehouse.' },
      { icon: 'CheckCircle2', title: 'Tested pipelines', description: 'Automated data-quality tests catch issues before dashboards do.' },
      { icon: 'Clock', title: 'Fresh data', description: 'Scheduled or near-real-time pipelines keep reporting current.' },
      { icon: 'FileCheck', title: 'Documented lineage', description: 'Know exactly where every number in a report came from.' },
    ],
    process: [discover, roadmap, { title: 'Build Pipelines', description: 'Ingest, transform and test — with lineage and monitoring from day one.' }, handover],
    technologies: ['snowflake', 'dbt', 'databricks', 'airflow', 'aws'],
    faqs: [
      { question: 'We have data in a dozen different systems — where do you start?', answer: 'We prioritize the sources that feed your highest-value reports first, then expand the warehouse incrementally.' },
      { question: 'Snowflake, Databricks or something else?', answer: 'It depends on your data volumes, existing stack and team skills. We run a short evaluation before recommending a platform.' },
    ],
  },
  {
    slug: 'predictive-advanced-analytics',
    title: 'Predictive & Advanced Analytics',
    icon: 'TrendingUp',
    shortDescription:
      'Forecasting, statistical modeling and machine learning that tell you what is likely to happen next.',
    overview:
      'We build forecasting and predictive models — demand, churn, risk, fraud — grounded in your historical data and validated against real outcomes, so decisions are based on evidence rather than gut feel.',
    benefits: [
      { icon: 'LineChart', title: 'Reliable forecasts', description: 'Demand, revenue and staffing forecasts validated against history.' },
      { icon: 'ShieldAlert', title: 'Risk & fraud detection', description: 'Statistical models that flag what a rules engine misses.' },
      { icon: 'Repeat', title: 'Continuously validated', description: 'Models are re-tested against new outcomes, not shipped and forgotten.' },
      { icon: 'Cpu', title: 'Production-ready models', description: 'Deployed into the reporting your team already uses.' },
    ],
    process: [{ title: 'Use-Case Discovery', description: 'Identify and prioritize the predictions that would actually change a decision.' }, { title: 'Model & Validate', description: 'Build, test and validate models against held-out real-world outcomes.' }, { title: 'Deploy & Monitor', description: 'Put models into production reporting with drift monitoring.' }, handover],
    technologies: ['python', 'r', 'scikit-learn', 'tensorflow', 'pytorch'],
    faqs: [
      { question: 'How accurate will the forecast be?', answer: 'We report accuracy honestly against held-out historical data before you rely on it — there are no guarantees, only evidence.' },
      { question: 'Do we need a data science team to maintain this?', answer: 'No. We hand over models with monitoring and documentation, and offer ongoing support through Managed Analytics Services.' },
    ],
  },
  {
    slug: 'business-process-analytics',
    title: 'Business Process Analytics',
    icon: 'Workflow',
    shortDescription:
      'Find where time, money and quality are lost inside your operations — and fix it with data, not guesswork.',
    overview:
      'We analyze operational and process data — throughput, cycle time, defect rates, handoffs — to find where your organization is actually losing time and money, then build the dashboards that keep it fixed.',
    benefits: [
      { icon: 'Search', title: 'Process mining', description: 'See how work actually flows, not how the org chart says it should.' },
      { icon: 'Gauge', title: 'KPI clarity', description: 'Operational metrics everyone agrees on and can act on.' },
      { icon: 'TrendingDown', title: 'Waste reduction', description: 'Find rework, delay and quality issues with statistical evidence.' },
      { icon: 'Target', title: 'Operational accountability', description: 'Dashboards that keep the fix from quietly regressing.' },
    ],
    process: [discover, { title: 'Map the Process', description: 'Reconstruct the real process from operational data, not assumptions.' }, { title: 'Find the Leaks', description: 'Identify bottlenecks, rework and quality issues with statistical evidence.' }, { title: 'Track & Improve', description: 'Stand up KPI dashboards that keep the fix from regressing.' }],
    technologies: ['powerbi', 'tableau', 'python', 'postgresql'],
    faqs: [
      { question: 'What kind of processes can you analyze?', answer: 'Anything with a data trail — claims processing, order fulfillment, underwriting, patient flow, service desks and more.' },
      { question: 'How is this different from a consulting process review?', answer: 'We work from your actual system data, not interviews and assumptions, so findings are evidence-based and reproducible.' },
    ],
  },
  {
    slug: 'cloud-data-platforms',
    title: 'Cloud Data Platforms',
    icon: 'CloudUpload',
    shortDescription:
      'Move your data warehouse and analytics workloads to the cloud — sized and secured for analytics, not generic IT.',
    overview:
      'We migrate and modernize data platforms onto AWS, Azure or GCP — scaling storage and compute for analytics workloads, without the general-purpose cloud migration overhead you don’t need. This is a supporting capability alongside our core analytics practice.',
    benefits: [
      { icon: 'PiggyBank', title: 'Lower data-platform TCO', description: 'Pay for the storage and compute your analytics actually use.' },
      { icon: 'Gauge', title: 'Elastic analytics compute', description: 'Scale up for month-end reporting, scale down the rest of the time.' },
      { icon: 'Lock', title: 'Secure by design', description: 'Access controls and encryption built in from the first migration wave.' },
      { icon: 'Timer', title: 'Minimal disruption', description: 'Wave-based cutovers so reporting keeps running throughout.' },
    ],
    process: [discover, { title: 'Landing Zone', description: 'A right-sized cloud foundation for data workloads — not a full enterprise migration.' }, { title: 'Migrate & Modernize', description: 'Move the warehouse and pipelines with tested cutovers.' }, handover],
    technologies: ['aws', 'azure', 'gcp', 'snowflake'],
    faqs: [
      { question: 'Do you handle full application migrations too, or just data?', answer: 'Our focus is data and analytics workloads — warehouses, pipelines and BI. We partner with infrastructure specialists for broader application migrations.' },
      { question: 'Which cloud should we choose for our data platform?', answer: 'It depends on your existing stack — Azure pairs naturally with Power BI and Microsoft data tools, while AWS and GCP suit teams already invested there.' },
    ],
  },
  {
    slug: 'applied-ai-machine-learning',
    title: 'Applied AI & Machine Learning',
    icon: 'BrainCircuit',
    shortDescription:
      'Practical AI that extends your analytics — from natural-language reporting to production ML models.',
    overview:
      'We apply AI where it genuinely extends the analytics you already have — natural-language querying over your data, automated insight generation, and production-grade machine learning — evaluated and governed like any other business system. AI is a supporting capability layered onto our analytics core, not a separate practice.',
    benefits: [
      { icon: 'Bot', title: 'AI-assisted reporting', description: 'Ask questions of your data in plain language, grounded in governed metrics.' },
      { icon: 'Database', title: 'Grounded in your data', description: 'Retrieval and models that respect the access controls you already have.' },
      { icon: 'LineChart', title: 'Measured business impact', description: 'Use cases prioritized by measurable ROI, not novelty.' },
      { icon: 'ShieldCheck', title: 'Evaluated & governed', description: 'Every model is tested and monitored like any production system.' },
    ],
    process: [{ title: 'Use-Case Discovery', description: 'Identify where AI actually extends your analytics — not AI for its own sake.' }, { title: 'Prototype', description: 'Rapid proof of value with real data and evaluation.' }, { title: 'Productionize', description: 'Harden with guardrails, monitoring and human review.' }, handover],
    technologies: ['openai', 'python', 'scikit-learn', 'azure'],
    faqs: [
      { question: 'Is this a big AI transformation, or something smaller?', answer: 'Almost always something smaller and grounded — we start with one well-scoped use case that clearly extends existing analytics.' },
      { question: 'How do you keep our data private?', answer: 'We deploy within your cloud boundary, enforce your existing access controls and use providers with zero data retention where required.' },
    ],
  },
  {
    slug: 'managed-analytics-services',
    title: 'Managed Analytics Services',
    icon: 'Headset',
    shortDescription:
      'Ongoing support for your BI platform, data pipelines and cloud data infrastructure — so insights keep flowing.',
    overview:
      'We keep your dashboards accurate, your pipelines running and your cloud data platform healthy after go-live — monitoring, fixing broken pipelines before anyone notices, and evolving the platform as your business changes.',
    benefits: [
      { icon: 'Clock', title: 'Proactive monitoring', description: 'Broken pipelines get fixed before a stakeholder notices a stale dashboard.' },
      { icon: 'Wallet', title: 'Predictable cost', description: 'Fixed monthly pricing instead of hiring a full analytics platform team.' },
      { icon: 'FileText', title: 'Transparent reporting', description: 'Monthly reviews covering SLA, incidents and platform health.' },
      { icon: 'Activity', title: 'Fast issue resolution', description: 'Defined response times when a report or pipeline breaks.' },
    ],
    process: [{ title: 'Transition', description: 'Knowledge transfer and monitoring onboarding for your platform.' }, { title: 'Steady State', description: 'Monitor, fix and support your BI and data platform under SLA.' }, { title: 'Continuous Improvement', description: 'Evolve dashboards and pipelines as your business changes.' }],
    technologies: ['powerbi', 'tableau', 'snowflake', 'airflow'],
    faqs: [
      { question: 'Can we start with just our BI platform, not the whole data stack?', answer: 'Yes. Many clients begin with dashboard and pipeline support and expand coverage as trust builds.' },
      { question: 'What happens if a pipeline breaks at 2am?', answer: 'Critical pipelines are monitored with alerting and defined response times, so issues are caught and triaged before the business day starts.' },
    ],
  },
];

export const INDUSTRIES = [
  { slug: 'banking', name: 'Banking', icon: 'Landmark', description: 'Risk, fraud and customer analytics — plus secure cloud platforms — for banks and credit unions.' },
  { slug: 'healthcare', name: 'Healthcare', icon: 'HeartPulse', description: 'Clinical and operational analytics that improve outcomes while staying HIPAA-ready.' },
  { slug: 'insurance', name: 'Insurance', icon: 'Umbrella', description: 'Underwriting, claims and pricing analytics for carriers and MGAs.' },
  { slug: 'telecom', name: 'Telecom', icon: 'RadioTower', description: 'Network performance and customer analytics for telecom operators.' },
  { slug: 'it', name: 'IT', icon: 'Cpu', description: 'Analytics-led modernization and cloud/AI adoption for software and IT services companies.' },
  { slug: 'manufacturing', name: 'Manufacturing', icon: 'Factory', description: 'Production, quality and supply-chain analytics for Industry 4.0 operations.' },
  { slug: 'hospitality', name: 'Hospitality', icon: 'Hotel', description: 'Guest experience, occupancy and revenue analytics for hotels and hospitality groups.' },
  { slug: 'logistics', name: 'Logistics', icon: 'Truck', description: 'Fleet, route and supply-chain analytics that cut cost and delay.' },
  { slug: 'federal', name: 'Federal', icon: 'Building2', description: 'Secure, compliant data and analytics platforms for federal agencies.' },
] as const;
