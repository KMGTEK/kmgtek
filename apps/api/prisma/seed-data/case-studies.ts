import type { Metric } from '@kmg/shared';

export interface CaseStudySeed {
  slug: string;
  title: string;
  clientName: string;
  industry: string;
  summary: string;
  challenge: string;
  solution: string;
  architecture: string;
  results: string;
  metrics: Metric[];
  technologies: string[]; // technology slugs
  featured: boolean;
  publishedDaysAgo: number;
}

export const CASE_STUDIES: CaseStudySeed[] = [
  {
    slug: 'financial-services-aws-migration',
    title: 'Migrating a 140-application financial platform to AWS with zero unplanned downtime',
    clientName: 'Northbridge Financial',
    industry: 'Financial Services',
    summary:
      'A wave-based migration of 140 applications and 60 TB of data out of two leased data centres into a compliant AWS landing zone — delivered two weeks early.',
    challenge: `
<p>Northbridge Financial ran its core lending and servicing platform from two leased data centres with an expiring contract and no realistic extension. Eighteen months of runway sounded comfortable until the estate was actually inventoried: 140 applications, 60 TB of data, a mainframe integration nobody wanted to touch, and change controls that required a regulator-visible audit trail for every production change.</p>
<p>Three previous attempts to define a migration plan had stalled because no one could answer two questions with confidence: what depends on what, and what happens if a cutover goes wrong at 2am on a Saturday.</p>
<ul>
  <li>No current dependency map; tribal knowledge concentrated in four people.</li>
  <li>Hard regulatory constraints (SOC 2, GLBA) on data residency, encryption and access logging.</li>
  <li>A batch settlement window that could not slip by more than 30 minutes.</li>
</ul>`.trim(),
    solution: `
<p>We began with a six-week discovery: agent-based dependency discovery, interviews with application owners, and a business-impact rating for every workload. That produced a migration backlog grouped into eleven waves, ordered so that each wave was independently reversible.</p>
<p>In parallel we built the landing zone. A multi-account structure under AWS Control Tower separated production, non-production, security tooling and shared services, with a hub-and-spoke network, centralized logging into an immutable account, and preventative guardrails expressed as service control policies. Everything was Terraform from day one — including the guardrails, so an auditor could read the control as code.</p>
<p>Applications were then moved using the right R for each case: rehost for the long tail of stable workloads, replatform for anything that could adopt managed databases, and refactor for the three services that drove most of the cost. Each wave ran a rehearsal in the non-production account first, including the rollback.</p>`.trim(),
    architecture: `
<p>The target architecture used a three-tier account model: a networking account owning the transit gateway and inspection VPC, workload accounts per environment and business domain, and a security account collecting CloudTrail, Config and GuardDuty findings.</p>
<ul>
  <li><strong>Network:</strong> Transit Gateway hub, private subnets only for workloads, egress through inspection firewalls, Direct Connect back to the remaining on-premises estate during transition.</li>
  <li><strong>Compute:</strong> EC2 Auto Scaling groups for rehosted workloads; ECS Fargate for replatformed services; Lambda for event-driven integrations.</li>
  <li><strong>Data:</strong> Aurora PostgreSQL with cross-region automated backups; DMS with continuous replication for near-zero-downtime cutovers.</li>
  <li><strong>Delivery:</strong> Terraform modules in a shared registry, GitHub Actions pipelines with OIDC to AWS (no long-lived keys), Atlantis for plan review on infrastructure changes.</li>
</ul>`.trim(),
    results: `
<p>The programme finished two weeks ahead of the data-centre exit date with no unplanned downtime. The largest cutover — the settlement database — completed in 22 minutes against a 30-minute window, using DMS replication and a rehearsed DNS switch.</p>
<p>Beyond the move itself, the operating model changed. Infrastructure changes that used to take three weeks of paperwork now go through a Terraform pull request with automated policy checks, and the audit evidence is the merge history. Steady-state infrastructure cost fell 34% against the data-centre baseline after right-sizing and a three-year savings plan.</p>`.trim(),
    metrics: [
      { label: 'Applications migrated', value: '140' },
      { label: 'Unplanned downtime', value: '0 min' },
      { label: 'Infrastructure cost', value: '-34%' },
      { label: 'Delivered ahead of schedule', value: '2 weeks' },
    ],
    technologies: ['aws', 'terraform', 'kubernetes', 'docker', 'github-actions'],
    featured: true,
    publishedDaysAgo: 45,
  },
  {
    slug: 'healthcare-kubernetes-platform',
    title: 'A HIPAA-ready multi-tenant Kubernetes platform for 300 developers',
    clientName: 'Vertex Health Systems',
    industry: 'Healthcare',
    summary:
      'Replacing snowflake clusters with a governed EKS platform and GitOps delivery, cutting environment provisioning from three weeks to under an hour.',
    challenge: `
<p>Vertex Health had nine Kubernetes clusters, each built by a different team, each with its own ingress controller, logging agent and idea of what "secure" meant. Onboarding a new service took three weeks of tickets. Two clusters were three minor versions behind and nobody was willing to upgrade them in production.</p>
<p>Because the platform carried PHI, every gap was also a compliance problem: inconsistent audit logging, network policies that existed in some namespaces and not others, and secrets stored in plain ConfigMaps in two clusters.</p>`.trim(),
    solution: `
<p>We designed a single governed platform on EKS with hard multi-tenancy boundaries, then migrated workloads onto it cluster by cluster rather than rebuilding everything at once.</p>
<p>Tenancy is namespace-based with per-tenant resource quotas, default-deny network policies and Kyverno admission rules that reject workloads without resource limits, non-root users or required labels. Delivery moved to ArgoCD: every environment is a directory in Git, and drift is reconciled automatically.</p>
<p>The piece that changed day-to-day life most was the self-service onboarding flow. A new service opens a pull request against a template repository; merging it provisions the namespace, quotas, RBAC bindings, pipeline, dashboards and alert rules. Three weeks of tickets became a 40-minute pull request.</p>`.trim(),
    architecture: `
<ul>
  <li><strong>Clusters:</strong> Two EKS clusters per region (production and non-production), private endpoints, Karpenter for node provisioning and spot consolidation.</li>
  <li><strong>Tenancy:</strong> Namespace per service, quotas and limit ranges, Kyverno policy enforcement, per-tenant IRSA roles scoped to that tenant's data.</li>
  <li><strong>Delivery:</strong> ArgoCD ApplicationSets generated from the service catalogue; progressive delivery with Argo Rollouts and automated analysis on error-rate and latency.</li>
  <li><strong>Observability:</strong> Prometheus with Thanos for long-term storage, Loki for logs, Grafana dashboards shipped with every service template, OpenTelemetry tracing.</li>
  <li><strong>Security:</strong> External Secrets Operator backed by AWS Secrets Manager, image signing with Cosign, admission gate rejecting unsigned images, encrypted etcd with KMS.</li>
</ul>`.trim(),
    results: `
<p>All nine clusters were consolidated into the new platform over seven months without a customer-visible outage. Cluster upgrades are now routine — the platform team runs them monthly on a blue/green node-group pattern with no application team involvement.</p>
<p>Provisioning a new environment dropped from three weeks to under an hour. Spot consolidation and right-sizing cut compute cost by 41% despite a 20% increase in workload count. The platform passed its HIPAA security assessment with no high findings.</p>`.trim(),
    metrics: [
      { label: 'Environment provisioning', value: '3 weeks → <1 hr' },
      { label: 'Compute cost', value: '-41%' },
      { label: 'Clusters consolidated', value: '9 → 2' },
      { label: 'High-severity audit findings', value: '0' },
    ],
    technologies: ['kubernetes', 'aws', 'terraform', 'docker', 'prometheus', 'grafana'],
    featured: true,
    publishedDaysAgo: 80,
  },
  {
    slug: 'retail-devops-transformation',
    title: 'From quarterly releases to 40 deploys a day at a national retailer',
    clientName: 'Lumen Retail Group',
    industry: 'Retail & E-commerce',
    summary:
      'A 9-month DevOps transformation covering pipelines, test automation, trunk-based development and on-call — measured throughout with DORA metrics.',
    challenge: `
<p>Lumen released four times a year. Each release was a weekend event with a 40-person bridge call, a 14% failure rate and a change-approval board that met on Tuesdays. Engineers had stopped proposing improvements because the cost of shipping them was too high.</p>
<p>The technical problems were real — a shared integration environment, a two-hour manual regression pass, no feature flags — but the harder problem was that nobody could agree on whether things were getting better, because nothing was measured.</p>`.trim(),
    solution: `
<p>We started by instrumenting the four DORA metrics from existing pipeline and incident data, then published them on a dashboard the whole organisation could see. The baseline was uncomfortable and useful: lead time of 46 days, deployment frequency of 4 per year, change failure rate 14%, mean time to restore 9 hours.</p>
<p>From there the work was incremental. Branch-per-release gave way to trunk-based development behind feature flags. The two-hour manual regression pass was replaced by a layered suite — fast unit tests on every commit, contract tests between services, and a focused end-to-end smoke pack against ephemeral environments. Deployments moved to blue/green with automated rollback on error-rate regression.</p>
<p>The change-approval board was the last piece. We showed six months of evidence that automated checks caught more than the board did, and it was replaced by a standard change policy for low-risk deployments.</p>`.trim(),
    architecture: `
<ul>
  <li><strong>Pipelines:</strong> GitLab CI with reusable templates; build once, promote the same artifact through environments.</li>
  <li><strong>Environments:</strong> Ephemeral per-merge-request environments on Kubernetes, destroyed on merge.</li>
  <li><strong>Testing:</strong> Unit + contract tests gating merges; smoke pack and synthetic checks post-deploy.</li>
  <li><strong>Delivery:</strong> Blue/green with automated rollback driven by Prometheus alerts; feature flags via Unleash.</li>
  <li><strong>Peak readiness:</strong> Load tests modelled on prior Black Friday traffic, run weekly from October.</li>
</ul>`.trim(),
    results: `
<p>Nine months in, Lumen deploys around 40 times a day across its service estate. Lead time for change fell from 46 days to under 3 hours, change failure rate to 3.2%, and mean time to restore to 21 minutes.</p>
<p>The holiday peak that year ran at four times normal traffic with no Sev-1 incidents and no deployment freeze — the first year the team shipped fixes during peak rather than queueing them until January.</p>`.trim(),
    metrics: [
      { label: 'Deployment frequency', value: '4/yr → 40/day' },
      { label: 'Lead time for change', value: '46 days → 3 hrs' },
      { label: 'Change failure rate', value: '14% → 3.2%' },
      { label: 'Mean time to restore', value: '9 hrs → 21 min' },
    ],
    technologies: ['gitlab-ci', 'kubernetes', 'docker', 'terraform', 'prometheus'],
    featured: true,
    publishedDaysAgo: 120,
  },
  {
    slug: 'media-data-platform-and-rag-search',
    title: 'A governed data platform and RAG search assistant for a media archive',
    clientName: 'Halcyon Media',
    industry: 'Media & Entertainment',
    summary:
      'Replacing a fragile nightly ETL with an orchestrated lakehouse, then shipping a retrieval-augmented assistant over 1.2 million archived articles.',
    challenge: `
<p>Halcyon's editorial teams sat on thirty years of archive material they could not search properly. The nightly ETL that fed their warehouse was a single 4,000-line script; when it failed, which was roughly twice a week, someone rewound it by hand and the morning dashboards were wrong.</p>
<p>Leadership also wanted an AI-powered research assistant. Two earlier prototypes had produced impressive demos and unusable products — confident answers with no citations, no way to evaluate quality, and costs that scaled alarmingly with usage.</p>`.trim(),
    solution: `
<p>The data work came first, because no retrieval system survives bad inputs. We replaced the monolithic script with Airflow-orchestrated ingestion, dbt models with tests on every published table, and data contracts between producers and consumers. Failed runs now retry idempotently and page a human only when retries are exhausted.</p>
<p>On top of that we built the retrieval layer: chunking tuned to article structure, embeddings stored in pgvector, hybrid search combining BM25 with vector similarity, and a reranking pass. Every answer cites its sources, and the assistant declines to answer when retrieval confidence is low — the single change that moved editors from sceptical to dependent.</p>
<p>Quality is measured, not assumed. A golden set of 400 questions runs in CI against every prompt or model change, scoring retrieval precision and answer groundedness before anything reaches production.</p>`.trim(),
    architecture: `
<ul>
  <li><strong>Ingestion:</strong> Airflow DAGs pulling from CMS, wire services and the archive store; idempotent, partitioned by publication date.</li>
  <li><strong>Storage:</strong> S3 lakehouse with Iceberg tables; PostgreSQL + pgvector for embeddings and metadata filters.</li>
  <li><strong>Transformation:</strong> dbt with schema and freshness tests; lineage published to the data catalogue.</li>
  <li><strong>Retrieval:</strong> Hybrid BM25 + vector search, cross-encoder reranking, citation-enforced prompting.</li>
  <li><strong>Serving:</strong> FastAPI service on EKS, response caching, per-team token budgets and cost dashboards.</li>
</ul>`.trim(),
    results: `
<p>Pipeline failures fell from roughly ninety a quarter to four, all of which self-healed. Morning dashboards are now correct by 06:00 every day, which ended a long-running argument between editorial and analytics.</p>
<p>The assistant went live to 250 editorial staff and is used in about 70% of research sessions. Median time to find a supporting archive reference dropped from 12 minutes to under 90 seconds, and per-query cost stayed 60% below the earlier prototype thanks to caching and reranking a smaller candidate set.</p>`.trim(),
    metrics: [
      { label: 'Pipeline failures per quarter', value: '90 → 4' },
      { label: 'Archive lookup time', value: '12 min → 90 s' },
      { label: 'Documents indexed', value: '1.2M' },
      { label: 'Cost per query', value: '-60%' },
    ],
    technologies: ['aws', 'python', 'kubernetes', 'terraform', 'grafana'],
    featured: false,
    publishedDaysAgo: 25,
  },
];
