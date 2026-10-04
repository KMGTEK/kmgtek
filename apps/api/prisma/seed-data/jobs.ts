import type { EmploymentType, ProcessStep, ScreeningQuestion, WorkMode } from '@kmg/shared';

export interface JobSeed {
  slug: string;
  title: string;
  department: string; // JobCategory name
  summary: string;
  description: string; // HTML
  skills: string[];
  responsibilities: string[];
  requirements: string[];
  preferredSkills: string[];
  benefits: string[];
  hiringProcess: ProcessStep[];
  screeningQuestions: ScreeningQuestion[];
  experienceMin: number;
  experienceMax?: number;
  employmentType: EmploymentType;
  workMode: WorkMode;
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryPeriod?: 'YEAR' | 'MONTH' | 'HOUR';
  showSalary?: boolean;
  openings?: number;
}

export const JOB_CATEGORIES = [
  'Cloud & Infrastructure',
  'DevOps & SRE',
  'Software Engineering',
  'Data & AI',
  'Security',
  'Quality Engineering',
];

export const STANDARD_BENEFITS = [
  'Competitive salary with annual performance review',
  'Medical, dental and vision coverage for you and your dependents',
  '401(k) with company match',
  'Unlimited PTO plus 10 paid holidays',
  'Annual $2,500 certification and training budget (AWS, CKA, Terraform, Azure)',
  'Remote-friendly culture with flexible hours',
  'Home office stipend and modern hardware',
  'H-1B / green card sponsorship for the right candidate',
];

const PROCESS_STANDARD: ProcessStep[] = [
  { title: 'Recruiter screen', description: '30-minute call covering your background, motivations and logistics.' },
  { title: 'Technical interview', description: '60 minutes with a senior engineer: hands-on problem solving in your core stack.' },
  { title: 'System design / deep dive', description: '60 minutes designing or troubleshooting a realistic production scenario.' },
  { title: 'Hiring manager conversation', description: '45 minutes on delivery experience, collaboration and career goals.' },
  { title: 'Offer', description: 'Reference check and an offer within 48 hours of the final round.' },
];

const PROCESS_SHORT: ProcessStep[] = [
  { title: 'Recruiter screen', description: '30-minute introductory call.' },
  { title: 'Technical interview', description: '60-minute hands-on technical conversation with the team.' },
  { title: 'Client / manager round', description: '45 minutes with the hiring manager or client stakeholder.' },
  { title: 'Offer', description: 'Offer and onboarding details within two business days.' },
];

const QUESTIONS_STANDARD: ScreeningQuestion[] = [
  { id: 'work-auth', question: 'Are you authorized to work in the United States without sponsorship?', type: 'yesno', required: true },
  { id: 'notice', question: 'What is your notice period (in weeks)?', type: 'number', required: true },
  { id: 'why', question: 'Briefly describe a production system you are proud of and your role in it.', type: 'textarea', required: false },
];

const QUESTIONS_CONTRACT: ScreeningQuestion[] = [
  { id: 'work-auth', question: 'What is your current work authorization status?', type: 'text', required: true },
  { id: 'rate', question: 'What is your expected hourly rate (USD)?', type: 'number', required: true },
  { id: 'onsite', question: 'Are you able to be onsite in Edison, NJ when required?', type: 'yesno', required: true },
];

const html = (intro: string, extra: string[]): string =>
  `<p>${intro}</p>${extra.map((paragraph) => `<p>${paragraph}</p>`).join('')}`;

export const JOBS: JobSeed[] = [
  {
    slug: 'devops-engineer',
    title: 'DevOps Engineer',
    department: 'DevOps & SRE',
    summary:
      'Build and run the CI/CD pipelines, infrastructure automation and observability that let our client teams ship daily.',
    description: html(
      'As a DevOps Engineer at KMG Technologies you sit inside a client delivery team and own the path from commit to production. You will automate builds and deployments, codify infrastructure with Terraform, and make releases a non-event.',
      [
        'Our engagements range from a fintech modernizing a monolith on AWS to a healthcare platform running multi-tenant Kubernetes. You get exposure to real production systems, senior mentorship and the freedom to choose the right tool for the problem.',
        'This role suits an engineer who likes removing toil, cares about developer experience and can explain trade-offs to both engineers and stakeholders.',
      ],
    ),
    skills: ['Docker', 'Kubernetes', 'Terraform', 'AWS', 'Jenkins', 'GitHub Actions', 'Bash', 'Python'],
    responsibilities: [
      'Design, build and maintain CI/CD pipelines in Jenkins, GitHub Actions or GitLab CI',
      'Codify cloud infrastructure with Terraform modules that other teams can reuse',
      'Containerize applications and deploy them to Kubernetes with Helm or Kustomize',
      'Instrument services with metrics, logs and traces, and define meaningful alerts',
      'Automate away manual operational work and document what remains',
      'Participate in a shared, humane on-call rotation and lead blameless postmortems',
    ],
    requirements: [
      '3+ years in a DevOps, platform or infrastructure engineering role',
      'Hands-on experience with at least one major cloud (AWS, Azure or GCP)',
      'Production experience with Docker and Kubernetes',
      'Strong scripting skills in Bash and Python',
      'Working knowledge of Terraform or another IaC tool',
      'Comfort with Linux internals, networking fundamentals and Git workflows',
    ],
    preferredSkills: [
      'AWS Certified DevOps Engineer or CKA certification',
      'Experience with ArgoCD, Flux or another GitOps tool',
      'Exposure to service meshes (Istio, Linkerd)',
      'Prior consulting or client-facing experience',
    ],
    benefits: STANDARD_BENEFITS,
    hiringProcess: PROCESS_STANDARD,
    screeningQuestions: QUESTIONS_STANDARD,
    experienceMin: 3,
    experienceMax: 7,
    employmentType: 'FULL_TIME',
    workMode: 'HYBRID',
    location: 'Edison, NJ',
    salaryMin: 110000,
    salaryMax: 145000,
    showSalary: true,
    openings: 3,
  },
  {
    slug: 'senior-kubernetes-engineer',
    title: 'Senior Kubernetes Engineer',
    department: 'Cloud & Infrastructure',
    summary:
      'Design and operate multi-tenant Kubernetes platforms that hundreds of developers depend on every day.',
    description: html(
      'We are looking for a Senior Kubernetes Engineer to lead the design of production-grade clusters for enterprise clients — on EKS, AKS, GKE and bare metal.',
      [
        'You will own cluster architecture decisions: networking and CNI choice, multi-tenancy and namespace strategy, autoscaling, upgrade paths, backup and disaster recovery. You will also set the standards other engineers follow.',
        'This is a hands-on senior role with architectural influence, not a management track — though you will mentor engineers and present to client architecture boards.',
      ],
    ),
    skills: ['Kubernetes', 'Helm', 'ArgoCD', 'Istio', 'Terraform', 'Prometheus', 'Go', 'EKS'],
    responsibilities: [
      'Architect secure, multi-tenant Kubernetes platforms and their upgrade strategy',
      'Implement GitOps delivery with ArgoCD or Flux across environments',
      'Define network policy, RBAC, admission control and pod security standards',
      'Tune autoscaling (HPA, VPA, Karpenter) and right-size workloads for cost',
      'Build golden paths and internal documentation so product teams self-serve',
      'Lead incident response for platform-level outages and drive the fixes',
    ],
    requirements: [
      '6+ years of infrastructure experience, including 3+ years running Kubernetes in production',
      'Deep understanding of Kubernetes internals: scheduler, controllers, CRDs, operators',
      'Experience with managed Kubernetes (EKS/AKS/GKE) and cluster lifecycle management',
      'Strong Terraform and Helm skills',
      'Proficiency in Go or Python for tooling and operators',
    ],
    preferredSkills: [
      'CKA / CKS certification',
      'Experience writing custom controllers or operators',
      'Service mesh production experience (Istio, Linkerd)',
      'Contributions to CNCF projects',
    ],
    benefits: STANDARD_BENEFITS,
    hiringProcess: PROCESS_STANDARD,
    screeningQuestions: QUESTIONS_STANDARD,
    experienceMin: 6,
    experienceMax: 12,
    employmentType: 'FULL_TIME',
    workMode: 'REMOTE',
    location: 'Remote (US)',
    salaryMin: 150000,
    salaryMax: 190000,
    showSalary: true,
    openings: 2,
  },
  {
    slug: 'cloud-architect-aws',
    title: 'Cloud Architect (AWS)',
    department: 'Cloud & Infrastructure',
    summary:
      'Lead enterprise cloud migrations and landing-zone design for clients moving critical workloads to AWS.',
    description: html(
      'As a Cloud Architect you are the technical authority on client engagements: you assess the current estate, design the target architecture and guide the delivery team that builds it.',
      [
        'Typical work includes AWS Control Tower landing zones, hub-and-spoke networking, migration waves using the 7 Rs framework, cost optimization reviews and compliance-aligned designs (SOC 2, HIPAA, PCI-DSS).',
        'You will spend part of your time with client stakeholders — architecture review boards, roadmap workshops and executive readouts — and part hands-on in Terraform and the AWS console.',
      ],
    ),
    skills: ['AWS', 'Terraform', 'Well-Architected', 'Networking', 'Control Tower', 'Landing Zone', 'FinOps'],
    responsibilities: [
      'Run discovery and assessment workshops and produce costed migration roadmaps',
      'Design multi-account landing zones with guardrails, identity and centralized logging',
      'Own the target architecture for networking, security, data and compute',
      'Review implementation work against the AWS Well-Architected Framework',
      'Advise clients on cost optimization and reserved capacity strategy',
      'Mentor engineers and act as escalation point for complex technical decisions',
    ],
    requirements: [
      '8+ years in infrastructure/cloud roles with 4+ years architecting on AWS',
      'Proven record of migrating production workloads to the cloud',
      'Expert knowledge of AWS networking, IAM, and multi-account strategy',
      'Strong Terraform skills and an IaC-first mindset',
      'Excellent written and verbal communication with executive stakeholders',
    ],
    preferredSkills: [
      'AWS Solutions Architect Professional certification',
      'Experience with Azure or GCP in a multi-cloud estate',
      'Regulated-industry background (financial services, healthcare)',
      'Experience building FinOps practices',
    ],
    benefits: STANDARD_BENEFITS,
    hiringProcess: PROCESS_STANDARD,
    screeningQuestions: QUESTIONS_STANDARD,
    experienceMin: 8,
    employmentType: 'FULL_TIME',
    workMode: 'HYBRID',
    location: 'Edison, NJ',
    salaryMin: 165000,
    salaryMax: 205000,
    showSalary: true,
    openings: 1,
  },
  {
    slug: 'site-reliability-engineer',
    title: 'Site Reliability Engineer (SRE)',
    department: 'DevOps & SRE',
    summary:
      'Own reliability for high-traffic platforms: SLOs, observability, capacity planning and incident response.',
    description: html(
      'Our SREs make the difference between a platform that survives Black Friday and one that does not. You will define service level objectives with product teams, build the observability to measure them, and spend your error budget deliberately.',
      [
        'You will work on systems handling millions of requests a day, with real latency and cost constraints. Expect to write code — automation, runbooks-as-code, load tests and chaos experiments — not just configure dashboards.',
      ],
    ),
    skills: ['Prometheus', 'Grafana', 'Kubernetes', 'Go', 'Python', 'Terraform', 'OpenTelemetry', 'PostgreSQL'],
    responsibilities: [
      'Define SLIs/SLOs with product teams and report on error budgets',
      'Build observability with Prometheus, Grafana, Loki and OpenTelemetry tracing',
      'Lead incident response, write postmortems and drive corrective actions to completion',
      'Run capacity planning and performance testing ahead of peak events',
      'Reduce toil through automation and self-healing systems',
      'Improve deployment safety with canaries, feature flags and automated rollback',
    ],
    requirements: [
      '4+ years in SRE, production engineering or a similar operational role',
      'Strong Linux, networking and distributed systems fundamentals',
      'Production experience with Kubernetes and cloud infrastructure',
      'Coding ability in Go or Python (you will build tooling, not just scripts)',
      'Experience owning on-call for a customer-facing system',
    ],
    preferredSkills: [
      'Experience with chaos engineering practices',
      'Database performance tuning (PostgreSQL, Redis)',
      'Familiarity with eBPF-based observability tooling',
    ],
    benefits: STANDARD_BENEFITS,
    hiringProcess: PROCESS_STANDARD,
    screeningQuestions: QUESTIONS_STANDARD,
    experienceMin: 4,
    experienceMax: 10,
    employmentType: 'FULL_TIME',
    workMode: 'REMOTE',
    location: 'Remote (US)',
    salaryMin: 135000,
    salaryMax: 175000,
    showSalary: true,
    openings: 2,
  },
  {
    slug: 'platform-engineer',
    title: 'Platform Engineer',
    department: 'DevOps & SRE',
    summary:
      'Build the internal developer platform — golden paths, self-service environments and paved roads to production.',
    description: html(
      'Platform Engineering at KMG is about treating internal developers as customers. You will build the templates, CLIs and portals that let a product team go from empty repository to running service in an afternoon.',
      [
        'Current work includes a Backstage developer portal, Crossplane-based environment provisioning, and a set of opinionated service templates with CI, observability and security scanning built in.',
      ],
    ),
    skills: ['Backstage', 'Crossplane', 'Kubernetes', 'Terraform', 'TypeScript', 'Go', 'ArgoCD'],
    responsibilities: [
      'Design and build self-service workflows for environments, pipelines and databases',
      'Maintain service templates that bake in CI, observability, and security defaults',
      'Run the internal developer portal and measure adoption and developer satisfaction',
      'Partner with security to make the compliant path the easy path',
      'Gather feedback from product teams and iterate on the platform roadmap',
    ],
    requirements: [
      '4+ years in DevOps, platform or backend engineering',
      'Experience building tooling used by other engineers',
      'Solid Kubernetes and Terraform knowledge',
      'Programming ability in Go, TypeScript or Python',
      'Product mindset: you talk to users and measure outcomes',
    ],
    preferredSkills: [
      'Experience with Backstage or another developer portal',
      'Crossplane or Kubernetes operator development',
      'Knowledge of policy-as-code (OPA, Kyverno)',
    ],
    benefits: STANDARD_BENEFITS,
    hiringProcess: PROCESS_STANDARD,
    screeningQuestions: QUESTIONS_STANDARD,
    experienceMin: 4,
    experienceMax: 9,
    employmentType: 'FULL_TIME',
    workMode: 'HYBRID',
    location: 'Edison, NJ',
    salaryMin: 130000,
    salaryMax: 165000,
    showSalary: true,
    openings: 2,
  },
  {
    slug: 'devsecops-engineer',
    title: 'DevSecOps Engineer',
    department: 'Security',
    summary:
      'Shift security left: embed scanning, policy-as-code and supply-chain controls into every pipeline we build.',
    description: html(
      'You will make secure delivery the default. That means SAST/DAST and dependency scanning in CI, signed artifacts and SBOMs, runtime policy enforcement, and secrets management that developers actually like using.',
      [
        'You will work alongside client security teams to translate policy into automated controls, and help engineering teams remediate findings without grinding delivery to a halt.',
      ],
    ),
    skills: ['Trivy', 'Snyk', 'OPA', 'Kyverno', 'Vault', 'Kubernetes', 'Terraform', 'SIEM'],
    responsibilities: [
      'Integrate SAST, DAST, SCA and container scanning into CI/CD pipelines',
      'Implement policy-as-code with OPA/Gatekeeper or Kyverno',
      'Own secrets management with HashiCorp Vault or cloud-native KMS',
      'Harden Kubernetes clusters and cloud accounts against CIS benchmarks',
      'Build software supply-chain controls: SBOMs, artifact signing, provenance',
      'Triage vulnerabilities with engineering teams and track remediation SLAs',
    ],
    requirements: [
      '4+ years in security engineering, DevOps or a blended role',
      'Hands-on experience securing cloud infrastructure and containers',
      'Working knowledge of common frameworks (CIS, NIST, SOC 2)',
      'Automation skills in Python, Bash or Go',
      'Ability to explain risk to engineers and executives alike',
    ],
    preferredSkills: [
      'Certifications such as CKS, AWS Security Specialty or CISSP',
      'Experience with threat modelling workshops',
      'Incident response experience',
    ],
    benefits: STANDARD_BENEFITS,
    hiringProcess: PROCESS_STANDARD,
    screeningQuestions: QUESTIONS_STANDARD,
    experienceMin: 4,
    experienceMax: 10,
    employmentType: 'FULL_TIME',
    workMode: 'REMOTE',
    location: 'Remote (US)',
    salaryMin: 140000,
    salaryMax: 180000,
    showSalary: true,
  },
  {
    slug: 'java-full-stack-developer',
    title: 'Java Full Stack Developer',
    department: 'Software Engineering',
    summary:
      'Build enterprise applications end to end with Spring Boot, React and a cloud-native deployment model.',
    description: html(
      'You will join a client delivery squad building and modernizing business-critical applications — REST and event-driven services in Spring Boot with React front-ends, deployed on Kubernetes.',
      [
        'Expect a codebase with real history: you will refactor as you go, add tests where they are missing, and gradually break apart a monolith into services that can be deployed independently.',
      ],
    ),
    skills: ['Java 17', 'Spring Boot', 'React', 'TypeScript', 'PostgreSQL', 'Kafka', 'Docker', 'JUnit'],
    responsibilities: [
      'Design and implement REST and event-driven services with Spring Boot',
      'Build responsive React + TypeScript interfaces against those APIs',
      'Write meaningful unit and integration tests (JUnit 5, Testcontainers)',
      'Model and tune relational data in PostgreSQL',
      'Participate in code review, architecture discussions and client demos',
      'Support your services in production alongside the platform team',
    ],
    requirements: [
      '5+ years building production Java applications',
      'Strong Spring Boot and JPA/Hibernate experience',
      'Solid front-end skills with React and TypeScript',
      'Comfortable with SQL and relational modelling',
      'Experience with Docker and CI/CD pipelines',
    ],
    preferredSkills: [
      'Kafka or another event-streaming platform',
      'Experience decomposing monoliths into microservices',
      'Familiarity with Kubernetes deployments',
    ],
    benefits: STANDARD_BENEFITS,
    hiringProcess: PROCESS_STANDARD,
    screeningQuestions: QUESTIONS_STANDARD,
    experienceMin: 5,
    experienceMax: 12,
    employmentType: 'FULL_TIME',
    workMode: 'HYBRID',
    location: 'Edison, NJ',
    salaryMin: 120000,
    salaryMax: 155000,
    showSalary: true,
    openings: 2,
  },
  {
    slug: 'data-ai-engineer',
    title: 'Data / AI Engineer',
    department: 'Data & AI',
    summary:
      'Build reliable data pipelines and production LLM features — from ingestion and feature stores to RAG services.',
    description: html(
      'Our Data & AI practice helps clients turn scattered data into products: streaming pipelines, dbt-modelled warehouses and, increasingly, retrieval-augmented generation services that put an LLM safely in front of enterprise knowledge.',
      [
        'You will own pipelines end to end — ingestion, transformation, quality checks, orchestration and monitoring — and work with ML engineers to serve models and embeddings in production.',
      ],
    ),
    skills: ['Python', 'Airflow', 'dbt', 'Spark', 'Snowflake', 'PostgreSQL', 'LangChain', 'Kubernetes'],
    responsibilities: [
      'Build batch and streaming pipelines with Airflow, Spark or Kafka',
      'Model warehouse data with dbt and enforce data quality contracts',
      'Stand up vector stores and retrieval pipelines for RAG applications',
      'Deploy and monitor model-serving endpoints with sensible guardrails',
      'Work with analysts and clients to turn questions into datasets',
      'Document lineage and make pipelines observable and re-runnable',
    ],
    requirements: [
      '4+ years in data engineering or a closely related role',
      'Expert Python and strong SQL',
      'Experience with a workflow orchestrator (Airflow, Dagster, Prefect)',
      'Cloud data platform experience (Snowflake, BigQuery, Redshift or Databricks)',
      'Understanding of data modelling and warehouse design',
    ],
    preferredSkills: [
      'Hands-on experience shipping LLM/RAG features to production',
      'Vector databases (pgvector, Pinecone, Weaviate)',
      'MLOps tooling (MLflow, Kubeflow)',
    ],
    benefits: STANDARD_BENEFITS,
    hiringProcess: PROCESS_STANDARD,
    screeningQuestions: QUESTIONS_STANDARD,
    experienceMin: 4,
    experienceMax: 10,
    employmentType: 'FULL_TIME',
    workMode: 'REMOTE',
    location: 'Remote (US)',
    salaryMin: 135000,
    salaryMax: 175000,
    showSalary: true,
  },
  {
    slug: 'azure-cloud-engineer',
    title: 'Azure Cloud Engineer',
    department: 'Cloud & Infrastructure',
    summary:
      'Deliver Azure landing zones, AKS platforms and Microsoft-centric modernization for enterprise clients.',
    description: html(
      'We need an engineer who knows Azure deeply — Entra ID, subscription and management-group design, networking, AKS and Azure DevOps — to lead the delivery of Microsoft-first engagements.',
      [
        'Work ranges from greenfield Azure landing zones to migrating VM estates and modernizing .NET workloads onto AKS or Container Apps, always codified with Terraform or Bicep.',
      ],
    ),
    skills: ['Azure', 'AKS', 'Terraform', 'Bicep', 'Entra ID', 'Azure DevOps', 'PowerShell'],
    responsibilities: [
      'Implement Azure landing zones aligned to the Cloud Adoption Framework',
      'Build and operate AKS clusters with secure defaults and GitOps delivery',
      'Automate provisioning with Terraform and Bicep and CI/CD in Azure DevOps',
      'Design identity and access with Entra ID, managed identities and PIM',
      'Migrate VM and database workloads with Azure Migrate and DMS',
      'Optimize spend with reservations, autoscaling and right-sizing',
    ],
    requirements: [
      '4+ years working primarily on Azure',
      'Strong knowledge of Azure networking, identity and governance',
      'Production AKS experience',
      'Terraform or Bicep expertise',
      'PowerShell scripting ability',
    ],
    preferredSkills: [
      'AZ-305 or AZ-400 certification',
      'Experience with hybrid connectivity (ExpressRoute, Azure Arc)',
      '.NET application modernization background',
    ],
    benefits: STANDARD_BENEFITS,
    hiringProcess: PROCESS_SHORT,
    screeningQuestions: QUESTIONS_STANDARD,
    experienceMin: 4,
    experienceMax: 10,
    employmentType: 'FULL_TIME',
    workMode: 'HYBRID',
    location: 'Edison, NJ',
    salaryMin: 125000,
    salaryMax: 160000,
    showSalary: true,
  },
  {
    slug: 'python-developer',
    title: 'Python Developer',
    department: 'Software Engineering',
    summary:
      'Contract-to-hire role building automation services and internal APIs in Python for an enterprise client.',
    description: html(
      'A long-running client engagement needs a Python developer to build internal APIs and automation services that connect several enterprise systems.',
      [
        'The stack is FastAPI, Celery, PostgreSQL and Redis on AWS, deployed with GitHub Actions to ECS. The team is small, the ownership is real and the work converts to a permanent position for the right person.',
      ],
    ),
    skills: ['Python', 'FastAPI', 'Celery', 'PostgreSQL', 'Redis', 'AWS', 'Pytest', 'Docker'],
    responsibilities: [
      'Build and document internal REST APIs with FastAPI',
      'Write asynchronous jobs and integrations with Celery',
      'Maintain a high-quality test suite with pytest',
      'Containerize services and keep the deployment pipeline healthy',
      'Work directly with client analysts to refine requirements',
    ],
    requirements: [
      '3+ years of professional Python development',
      'Experience with FastAPI, Flask or Django REST Framework',
      'Solid SQL and data modelling skills',
      'Familiarity with AWS services (ECS, S3, SQS, RDS)',
      'Testing discipline and clean code habits',
    ],
    preferredSkills: [
      'Async Python (asyncio, httpx)',
      'Experience integrating enterprise systems (SAP, Salesforce, ServiceNow)',
      'Basic front-end skills for internal tooling',
    ],
    benefits: [
      'Competitive hourly rate, paid weekly',
      'Conversion to a full-time position after six months',
      'Fully remote with quarterly onsite team weeks',
      'Access to our certification and training budget after conversion',
    ],
    hiringProcess: PROCESS_SHORT,
    screeningQuestions: QUESTIONS_CONTRACT,
    experienceMin: 3,
    experienceMax: 8,
    employmentType: 'CONTRACT_TO_HIRE',
    workMode: 'REMOTE',
    location: 'Remote (US)',
    salaryMin: 60,
    salaryMax: 80,
    salaryPeriod: 'HOUR',
    showSalary: false,
  },
];
