export interface TechnologySeed {
  name: string;
  slug: string;
  description: string;
  websiteUrl?: string;
  /** Simple Icons slug (https://simpleicons.org) used to render a logo on the web. */
  icon?: string;
}

export interface TechnologyCategorySeed {
  name: string;
  slug: string;
  technologies: TechnologySeed[];
}

/**
 * KMG is a business analytics consultancy first, with cloud and AI as supporting
 * capabilities — so the BI/analytics and data-engineering categories lead, and the
 * cloud/AI toolchain is kept intentionally small.
 */
export const TECHNOLOGY_CATEGORIES: TechnologyCategorySeed[] = [
  {
    name: 'Analytics & BI',
    slug: 'analytics-bi',
    technologies: [
      { name: 'Power BI', slug: 'powerbi', icon: 'powerbi', websiteUrl: 'https://powerbi.microsoft.com', description: 'Self-service dashboards and enterprise reporting on Microsoft data stacks.' },
      { name: 'Tableau', slug: 'tableau', icon: 'tableau', websiteUrl: 'https://www.tableau.com', description: 'Best-in-class data visualization and exploratory analysis.' },
      { name: 'Looker', slug: 'looker', icon: 'looker', websiteUrl: 'https://cloud.google.com/looker', description: 'Governed, model-driven BI on top of the cloud data warehouse.' },
      { name: 'Excel', slug: 'excel', icon: 'microsoftexcel', websiteUrl: 'https://www.microsoft.com/microsoft-365/excel', description: 'Still where most business analysis starts — modeling, ad hoc reporting and finance.' },
    ],
  },
  {
    name: 'Data Engineering',
    slug: 'data-engineering',
    technologies: [
      { name: 'Snowflake', slug: 'snowflake', icon: 'snowflake', websiteUrl: 'https://www.snowflake.com', description: 'Cloud data warehouse that scales storage and compute independently.' },
      { name: 'dbt', slug: 'dbt', icon: 'dbt', websiteUrl: 'https://www.getdbt.com', description: 'SQL-based transformation and data modeling with tests and lineage.' },
      { name: 'Databricks', slug: 'databricks', icon: 'databricks', websiteUrl: 'https://www.databricks.com', description: 'Unified lakehouse for large-scale data engineering and machine learning.' },
      { name: 'Apache Airflow', slug: 'airflow', icon: 'apacheairflow', websiteUrl: 'https://airflow.apache.org', description: 'Orchestration for reliable, scheduled data pipelines.' },
    ],
  },
  {
    name: 'Cloud',
    slug: 'cloud',
    technologies: [
      { name: 'AWS', slug: 'aws', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/amazonwebservices/amazonwebservices-original-wordmark.svg', websiteUrl: 'https://aws.amazon.com', description: 'Cloud hosting for data platforms — compute, storage and managed data services.' },
      { name: 'Azure', slug: 'azure', icon: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg', websiteUrl: 'https://azure.microsoft.com', description: 'Enterprise cloud with deep Power BI and Microsoft data-stack integration.' },
      { name: 'GCP', slug: 'gcp', icon: 'googlecloud', websiteUrl: 'https://cloud.google.com', description: 'BigQuery and a data- and analytics-native cloud platform.' },
    ],
  },
  {
    name: 'AI & Machine Learning',
    slug: 'ai-ml',
    technologies: [
      { name: 'OpenAI', slug: 'openai', icon: 'openai', websiteUrl: 'https://openai.com', description: 'Large language models for AI-assisted analysis and natural-language reporting.' },
      { name: 'scikit-learn', slug: 'scikit-learn', icon: 'scikitlearn', websiteUrl: 'https://scikit-learn.org', description: 'Classical machine learning for forecasting, classification and clustering.' },
      { name: 'TensorFlow', slug: 'tensorflow', icon: 'tensorflow', websiteUrl: 'https://www.tensorflow.org', description: 'Deep learning for higher-complexity predictive modeling.' },
      { name: 'PyTorch', slug: 'pytorch', icon: 'pytorch', websiteUrl: 'https://pytorch.org', description: 'Research-friendly deep learning framework used across our AI engagements.' },
    ],
  },
  {
    name: 'Programming & Data',
    slug: 'programming',
    technologies: [
      { name: 'Python', slug: 'python', icon: 'python', websiteUrl: 'https://www.python.org', description: 'The default language for analytics, data engineering and applied AI.' },
      { name: 'R', slug: 'r', icon: 'r', websiteUrl: 'https://www.r-project.org', description: 'Statistical computing for advanced modeling and academic-grade rigor.' },
      { name: 'SQL / PostgreSQL', slug: 'postgresql', icon: 'postgresql', websiteUrl: 'https://www.postgresql.org', description: 'The universal language of data — querying, warehousing and reporting.' },
    ],
  },
  {
    name: 'Data Governance & Security',
    slug: 'security',
    technologies: [
      { name: 'Prisma Cloud', slug: 'prisma-cloud', icon: 'paloaltonetworks', websiteUrl: 'https://www.paloaltonetworks.com/prisma/cloud', description: 'Cloud-native security posture management for regulated data platforms.' },
      { name: 'SonarQube', slug: 'sonarqube', icon: 'sonarqubeserver', websiteUrl: 'https://www.sonarsource.com/products/sonarqube/', description: 'Code quality and security inspection for analytics pipelines and apps.' },
      { name: 'Trivy', slug: 'trivy', icon: 'aqua', websiteUrl: 'https://trivy.dev', description: 'Vulnerability scanning for containers and infrastructure as code.' },
      { name: 'Snyk', slug: 'snyk', icon: 'snyk', websiteUrl: 'https://snyk.io', description: 'Dependency and container security for the data platforms we build.' },
    ],
  },
];

export const ALL_TECHNOLOGIES = TECHNOLOGY_CATEGORIES.flatMap((c) =>
  c.technologies.map((t) => ({ ...t, categorySlug: c.slug, categoryName: c.name })),
);
