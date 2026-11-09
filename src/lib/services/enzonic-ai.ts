import OpenAI from 'openai';

let _enzonicAI: OpenAI | null = null;
export function getEnzonicAI(): OpenAI {
  if (!_enzonicAI) {
    _enzonicAI = new OpenAI({
      baseURL: (typeof process !== 'undefined' && process.env?.ENZONIC_ROTATOR_URL) || 'http://sgp-two.enzonic.com:25836/v1',
      apiKey: (typeof process !== 'undefined' && process.env?.ENZONIC_API_KEY) || 'dummy-key-for-sdk',
      maxRetries: 0,
      dangerouslyAllowBrowser: true,
    });
  }
  return _enzonicAI;
}

export const enzonicAI = {
  get chat() {
    return getEnzonicAI().chat;
  },
};

export const ENZONIC_MODEL = process.env.ENZONIC_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b';

// -------------------------------------------------------------
// TYPES & CONTRACTS
// -------------------------------------------------------------

export interface CareerMilestone {
  title: string;
  topics: string[];
  estimatedWeeks: number;
}

export interface CareerPathPlan {
  career: string;
  title?: string;
  salaryRange?: string;
  matchScore?: number;
  scope?: string;
  description?: string;
  skills?: string[];
  milestones: CareerMilestone[];
  gaps: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface GeneratedQuiz {
  title: string;
  topic: string;
  subtopic?: string;
  questions: QuizQuestion[];
}

// -------------------------------------------------------------
// TIMEOUT PROTECTION UTILITY
// -------------------------------------------------------------

/**
 * Executes a promise with a hard timeout guard.
 * Prevents indefinite event-loop blocking from stalled LLM rotator sockets.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallbackOrError: T | Error | string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  // Prevent unhandled rejection if timeout fires before promise completes
  promise.catch(() => {});

  const timeoutPromise = new Promise<T>((resolve, reject) => {
    timer = setTimeout(() => {
      if (fallbackOrError instanceof Error) {
        reject(fallbackOrError);
      } else if (typeof fallbackOrError === 'string') {
        reject(new Error(fallbackOrError));
      } else {
        resolve(fallbackOrError);
      }
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// -------------------------------------------------------------
// CURATED DOMAIN KNOWLEDGE BASE
// -------------------------------------------------------------

export type DomainCategory =
  | 'computer-science'
  | 'data-science-ai'
  | 'web-development'
  | 'cybersecurity'
  | 'cloud-devops'
  | 'general';

export function resolveDomainCategory(query: string): DomainCategory {
  const lower = String(query || '').toLowerCase().trim();
  if (
    lower.includes('cyber') ||
    lower.includes('security') ||
    lower.includes('infosec') ||
    lower.includes('hacker') ||
    lower.includes('penetration') ||
    lower.includes('soc')
  ) {
    return 'cybersecurity';
  }
  if (
    lower.includes('ai') ||
    lower.includes('machine learning') ||
    lower.includes('data science') ||
    lower.includes('deep learning') ||
    lower.includes('nlp') ||
    lower.includes('vision') ||
    lower.includes('artificial intelligence') ||
    lower.includes('data engineer')
  ) {
    return 'data-science-ai';
  }
  if (
    lower.includes('cloud') ||
    lower.includes('devops') ||
    lower.includes('sre') ||
    lower.includes('kubernetes') ||
    lower.includes('docker') ||
    lower.includes('aws') ||
    lower.includes('infrastructure') ||
    lower.includes('platform')
  ) {
    return 'cloud-devops';
  }
  if (
    lower.includes('web') ||
    lower.includes('fullstack') ||
    lower.includes('full stack') ||
    lower.includes('frontend') ||
    lower.includes('front end') ||
    lower.includes('react') ||
    lower.includes('node') ||
    lower.includes('next.js') ||
    lower.includes('javascript') ||
    lower.includes('typescript')
  ) {
    return 'web-development';
  }
  if (
    lower.includes('computer science') ||
    lower.includes('software') ||
    lower.includes('backend') ||
    lower.includes('systems') ||
    lower.includes('cse') ||
    lower.includes('gate') ||
    lower.includes('algorithm') ||
    lower.includes('c++') ||
    lower.includes('java')
  ) {
    return 'computer-science';
  }
  return 'general';
}

// -------------------------------------------------------------
// CURATED CAREER PATH ROADMAPS (6 STRUCTURED LEVELS)
// -------------------------------------------------------------

const CURATED_CAREER_ROADMAPS: Record<DomainCategory, (goal: string) => CareerPathPlan> = {
  'computer-science': (goal) => ({
    career: goal || 'Computer Science & Systems Engineering',
    title: 'Computer Science & High-Scale Systems Software Engineer',
    salaryRange: '$110,000 - $185,000 / yr (₹18 - ₹42 LPA)',
    matchScore: 96,
    scope: 'Tier-1 Tech & High-Scale Systems • Top 5% Global Demand',
    description:
      'Architect high-performance distributed backends, master data structures, algorithms, low-level memory mechanics, concurrency primitives, and microservice architectures.',
    skills: [
      'Data Structures & Algorithms',
      'C++ / Go / Rust / Java',
      'Distributed Systems & Consensus',
      'System Design & Horizontal Scalability',
      'Linux Internals & TCP/IP Networking',
      'Database Engines & ACID Concurrency',
    ],
    milestones: [
      {
        title: 'Level 1: Absolute Beginner — Programming Foundations & Algorithmic Thinking',
        topics: [
          'Primitive Types, Control Flow & Scoping Mechanics',
          'Procedural & Object-Oriented Design Patterns',
          'Asymptotic Complexity (Big-O Notation & Amortized Analysis)',
          'Pointers, References & Memory Layout Basics',
          'Terminal Navigation, Git & Version Control Workflows',
        ],
        estimatedWeeks: 3,
      },
      {
        title: 'Level 2: Core Fundamentals — Data Structures & System Architecture',
        topics: [
          'Arrays, Linked Lists, Stacks, and FIFO Queues',
          'Hash Tables, Collision Resolution & Amortized O(1) Performance',
          'Binary Search Trees, Heaps & Priority Queues',
          'Computer Organization, CPU Caches & Virtual Memory Architecture',
          'POSIX Socket Programming & TCP/IP Protocol Stack',
        ],
        estimatedWeeks: 4,
      },
      {
        title: 'Level 3: Intermediate — Advanced Algorithms & Database Internals',
        topics: [
          'Graph Algorithms: BFS, DFS, Dijkstra & Minimum Spanning Trees',
          'Dynamic Programming, Memoization & Greedy Techniques',
          'Multi-threading, Race Conditions, Mutexes & Semaphores',
          'Relational Databases: B-Trees, WAL Logs & ACID Transactions',
          'RESTful API Contract Design & Structured Serialization (JSON/Protobuf)',
        ],
        estimatedWeeks: 5,
      },
      {
        title: 'Level 4: Advanced — Distributed Systems & High-Throughput Architecture',
        topics: [
          'Distributed Consensus: Raft, Paxos & Quorum Reads/Writes',
          'CAP Theorem, Eventual Consistency & Vector Clocks',
          'Message Brokers: Kafka, RabbitMQ & Stream Processing Pipelines',
          'Microservice Decomposition & Resilient API Gateways',
          'Load Balancing Algorithms, Reverse Proxies & CDN Caching',
        ],
        estimatedWeeks: 6,
      },
      {
        title: 'Level 5: Real Projects — Production-Scale Distributed Engine Implementation',
        topics: [
          'Building a Distributed Key-Value Store with LSM-Trees',
          'Implementing a High-Concurrency In-Memory Rate Limiter',
          'Designing an Event-Driven Asynchronous Job Processing Queue',
          'Observability Instrumentation: Distributed Tracing, Prometheus & OpenTelemetry',
          'CI/CD Pipeline with Automated Regression & Stress Testing',
        ],
        estimatedWeeks: 5,
      },
      {
        title: 'Level 6: Career Ready — Enterprise System Design, Profiling & Leadership',
        topics: [
          'End-to-End Large Scale System Design (URL Shortener, Chat, Feed)',
          'Kernel Tuning & Profiling CPU/Memory Bottlenecks with eBPF',
          'Zero-Downtime Database Schema Migrations & Blue/Green Deployments',
          'Cost Optimization & Cloud Infrastructure Budgeting',
          'Technical Design Documents (RFCs) & Engineering Mentorship',
        ],
        estimatedWeeks: 4,
      },
    ],
    gaps: [
      'Production distributed debugging experience under network partitions',
      'Hands-on profiling of memory and CPU leaks under heavy concurrency',
      'Experience with zero-downtime data migration strategies in live systems',
    ],
  }),

  'data-science-ai': (goal) => ({
    career: goal || 'AI & Machine Learning Engineering',
    title: 'AI & Machine Learning Research & Systems Engineer',
    salaryRange: '$125,000 - $210,000 / yr (₹22 - ₹50 LPA)',
    matchScore: 98,
    scope: 'Frontier AI & Foundational Models • Rapid Exponential Industry Growth',
    description:
      'Train, fine-tune, and deploy frontier deep learning models, transformer architectures, LLM reasoning pipelines, and scalable distributed ML infrastructure.',
    skills: [
      'Python & PyTorch',
      'Linear Algebra & Numerical Optimization',
      'Transformer Architectures & Attention Mechanisms',
      'Fine-Tuning (LoRA, QLoRA) & RLHF Alignment',
      'Vector Databases & Production RAG Pipelines',
      'MLOps & TensorRT / vLLM Distributed Inference',
    ],
    milestones: [
      {
        title: 'Level 1: Absolute Beginner — Mathematical Foundations & Python for Data Science',
        topics: [
          'Linear Algebra: Matrices, Eigenvectors & Matrix Decompositions',
          'Multivariable Calculus: Gradients, Jacobians & Chain Rule',
          'Probability Distributions, Expectation & Bayes Theorem',
          'Python Scientific Stack: NumPy Vectorization & Pandas DataFrames',
          'Exploratory Data Analysis (EDA) & Data Visualization Pipelines',
        ],
        estimatedWeeks: 3,
      },
      {
        title: 'Level 2: Core Fundamentals — Classical Machine Learning & Statistical Inference',
        topics: [
          'Linear & Logistic Regression with Gradient Descent Optimization',
          'Regularization Techniques: L1 (Lasso), L2 (Ridge) & ElasticNet',
          'Decision Trees, Random Forests & Gradient Boosting (XGBoost/LightGBM)',
          'Dimensionality Reduction: PCA, t-SNE & UMAP',
          'Cross-Validation, Precision-Recall, ROC-AUC & Confusion Matrix Metrics',
        ],
        estimatedWeeks: 4,
      },
      {
        title: 'Level 3: Intermediate — Deep Learning & Neural Network Foundations',
        topics: [
          'Feedforward Neural Networks, Backpropagation & Computational Graphs',
          'Activation Functions: ReLU, GELU, Swish & Vanishing Gradient Mitigation',
          'Optimization Algorithms: AdamW, RMSProp & Learning Rate Schedulers',
          'Convolutional Neural Networks (CNNs) for Computer Vision',
          'Recurrent Architectures, LSTMs & Sequence Modeling Basics',
        ],
        estimatedWeeks: 5,
      },
      {
        title: 'Level 4: Advanced — Transformers, Large Language Models & Generative AI',
        topics: [
          'Transformer Architecture: Scaled Dot-Product & Multi-Head Self-Attention',
          'Positional Encodings: Sinusoidal, RoPE & ALiBi Mechanics',
          'Pretraining Objectives: Masked LM (BERT) vs Causal LM (GPT)',
          'Parameter-Efficient Fine-Tuning: LoRA, QLoRA & Prefix Tuning',
          'Retrieval-Augmented Generation (RAG): Vector Indexing, Chunking & Rerankers',
        ],
        estimatedWeeks: 6,
      },
      {
        title: 'Level 5: Real Projects — Production Agentic AI & Model Deployment',
        topics: [
          'Building an Autonomous Multi-Tool Agent with Function Calling',
          'Production RAG with Hybrid Sparse/Dense Search & Re-ranking',
          'High-Throughput Serving with vLLM, TensorRT-LLM & PagedAttention',
          'Model Quantization: AWQ, GPTQ & GGUF Techniques',
          'Evaluation Frameworks for Hallucination Detection & Truthfulness',
        ],
        estimatedWeeks: 5,
      },
      {
        title: 'Level 6: Career Ready — Distributed Training, AI Safety & Enterprise Systems',
        topics: [
          'Distributed Training: DeepSpeed ZeRO, FSDP & Tensor Parallelism',
          'Reinforcement Learning from Human/AI Feedback (RLHF/RLAIF)',
          'Guardrails, Prompt Injection Defense & Safety Alignment',
          'MLOps: Model Registries, Feature Stores & Drift Monitoring',
          'Technical Portfolio, Research Paper Reproductions & AI System Interviews',
        ],
        estimatedWeeks: 4,
      },
    ],
    gaps: [
      'Experience with distributed GPU cluster training bottlenecks and communication overhead',
      'Practical understanding of inference cost versus latency tradeoffs',
      'Robust evaluation metrics for non-deterministic generative models',
    ],
  }),

  'web-development': (goal) => ({
    career: goal || 'Full-Stack Web Development',
    title: 'Full-Stack Web Architect & Modern Application Engineer',
    salaryRange: '$95,000 - $160,000 / yr (₹14 - ₹32 LPA)',
    matchScore: 94,
    scope: 'SaaS Platforms & Interactive Web Apps • High Continuous Market Need',
    description:
      'Develop high-performance full-stack web applications, responsive user interfaces, serverless API backends, real-time sync systems, and optimized database schemas.',
    skills: [
      'TypeScript & Modern React 19',
      'Next.js & SSR / Streaming SSR',
      'Node.js & Express / Fastify',
      'Tailwind CSS & Responsive UI',
      'PostgreSQL / SQLite & Drizzle ORM',
      'WebSocket / WebRTC & Real-Time Sync',
    ],
    milestones: [
      {
        title: 'Level 1: Absolute Beginner — Modern Web Standards & JavaScript / TypeScript Core',
        topics: [
          'HTML5 Semantic Elements, Accessible DOM Structure (a11y)',
          'CSS3 Flexbox, CSS Grid & Responsive Viewport Design',
          'Modern JavaScript: ES6+, Closures, Promises & Async/Await',
          'TypeScript Type System: Generics, Unions & Type Narrowing',
          'DOM Manipulation, Event Bubbling & Browser Developer Tools',
        ],
        estimatedWeeks: 3,
      },
      {
        title: 'Level 2: Core Fundamentals — Component Architecture & Declarative UI with React',
        topics: [
          'React 19 Hooks: useState, useEffect, useMemo, useCallback & useRef',
          'Component Composition, Props Contracts & Custom Hooks',
          'Form Handling, Validation with Zod & Optimistic UI Updates',
          'Client-Side Routing, Nested Layouts & Dynamic Parameters',
          'Styling Systems: Tailwind CSS Utility Architecture & CSS Modules',
        ],
        estimatedWeeks: 4,
      },
      {
        title: 'Level 3: Intermediate — Backend APIs, Database Persistence & Authentication',
        topics: [
          'Node.js Event Loop, Streams & Express Server Architecture',
          'RESTful API Design Principles & Status Code Semantics',
          'Relational Database Schema Design with SQLite/PostgreSQL & ORMs',
          'Session vs Token Authentication (JWT, httpOnly Cookies, OAuth 2.0)',
          'Password Hashing (Scrypt/Bcrypt) & Timing-Safe Verification',
        ],
        estimatedWeeks: 5,
      },
      {
        title: 'Level 4: Advanced — Full-Stack Frameworks, SSR & Real-Time Systems',
        topics: [
          'Server-Side Rendering (SSR), Static Site Generation (SSG) & Streaming',
          'Server Components vs Client Components Hydration Lifecycle',
          'Real-Time Bi-Directional Communication with WebSockets',
          'Client Cache Synchronization: TanStack Query & Cache Invalidation',
          'Database Indexing, Query Optimization & Transaction Isolation',
        ],
        estimatedWeeks: 6,
      },
      {
        title: 'Level 5: Real Projects — Production Full-Stack SaaS Application',
        topics: [
          'Architecting a Multi-Tenant SaaS with Stripe Billing Integration',
          'Implementing Role-Based Access Control (RBAC) & Organization Teams',
          'Cloud File Storage with S3/R2 & Presigned URL Uploads',
          'Background Asynchronous Worker Tasks & Rate Limiting Queues',
          'End-to-End Testing with Playwright & Integration Testing with Bun/Jest',
        ],
        estimatedWeeks: 5,
      },
      {
        title: 'Level 6: Career Ready — Web Performance Tuning, Security & Operations',
        topics: [
          'Core Web Vitals Optimization: LCP, INP, CLS & Bundle Splitting',
          'Web Security Hardening: CSP, CORS, XSS, CSRF & SQL Injection Defense',
          'Edge Computing, Vercel Serverless Architecture & CDN Caching Strategies',
          'Error Monitoring with Sentry & Real User Monitoring (RUM)',
          'Full-Stack Technical Interview Preparation & System Design',
        ],
        estimatedWeeks: 4,
      },
    ],
    gaps: [
      'Deep browser rendering pipeline & repaint profiling knowledge',
      'Edge caching & distributed session management experience',
      'Complex database deadlock and connection pool exhaustion tuning',
    ],
  }),

  cybersecurity: (goal) => ({
    career: goal || 'Cybersecurity & Information Defense',
    title: 'Cybersecurity Architect & Security Operations Specialist',
    salaryRange: '$105,000 - $175,000 / yr (₹16 - ₹38 LPA)',
    matchScore: 95,
    scope: 'Critical Enterprise Infrastructure Protection • Zero-Unemployment Specialty',
    description:
      'Defend enterprise perimeters, conduct vulnerability assessments, design zero-trust access fabrics, automate threat detection, and engineer cryptographic defenses.',
    skills: [
      'Network Security & Packet Inspection',
      'Zero Trust Architecture & IAM',
      'OWASP Top 10 & Web Exploits',
      'Applied Cryptography & PKI',
      'SIEM / EDR & Incident Response',
      'Cloud Security & DevSecOps',
    ],
    milestones: [
      {
        title: 'Level 1: Absolute Beginner — Security Foundations, OS Internals & Networking Basics',
        topics: [
          'OSI & TCP/IP Model: Headers, Handshakes & Packet Encapsulation',
          'Linux & Windows Security Architecture, Permissions & Privileges',
          'Common Attack Vectors: Phishing, Social Engineering & Malware Types',
          'Security Governance: CIA Triad, NIST Cybersecurity Framework & ISO 27001',
          'Network Scanning Basics with Nmap & Packet Capture with Wireshark',
        ],
        estimatedWeeks: 3,
      },
      {
        title: 'Level 2: Core Fundamentals — Network Defense, Firewalls & Cryptography',
        topics: [
          'Symmetric vs Asymmetric Encryption (AES, RSA, ECC)',
          'Hashing, HMACs, Digital Signatures & Public Key Infrastructure (PKI)',
          'Stateful Firewalls, IDS/IPS Configuration & Snort Rules',
          'Virtual Private Networks (VPNs, WireGuard, IPsec) & Tunneling Protocols',
          'DNS Security (DNSSEC, DoH) & Port Scanning Mitigation',
        ],
        estimatedWeeks: 4,
      },
      {
        title: 'Level 3: Intermediate — Application Security & OWASP Top 10 Defense',
        topics: [
          'SQL Injection (SQLi) In-depth: Blind, Union-Based & Parameterization',
          'Cross-Site Scripting (XSS): Stored, Reflected, DOM & CSP Defense',
          'Cross-Site Request Forgery (CSRF) & SameSite Cookie Directives',
          'Server-Side Request Forgery (SSRF) & Cloud Metadata Attacks',
          'Authentication Flaws: Session Hijacking, JWT Tampering & Credential Stuffing',
        ],
        estimatedWeeks: 5,
      },
      {
        title: 'Level 4: Advanced — Enterprise Identity, Threat Hunting & Cloud Security',
        topics: [
          'Zero Trust Architecture (ZTA): Micro-segmentation & Continuous Auth',
          'Active Directory Security, Kerberos Attacks (Kerberoasting, Pass-the-Hash)',
          'Cloud Security: AWS IAM Least Privilege, S3 Bucket Security & KMS',
          'Security Information & Event Management (SIEM): Splunk / Elastic Security',
          'Endpoint Detection & Response (EDR) Telemetry & Threat Hunting',
        ],
        estimatedWeeks: 6,
      },
      {
        title: 'Level 5: Real Projects — Applied Penetration Testing & Automated SecOps',
        topics: [
          'Conducting an Authorized Web App Penetration Test & Report Generation',
          'Building an Automated Vulnerability Scanner Pipeline in CI/CD (SAST/DAST)',
          'Simulating Incident Response: Containment, Eradication & Post-Mortem',
          'Reverse Engineering Malware Samples in Sandbox Environments (Ghidra)',
          'Container Security: Dockerfile Hardening, Trivy Scanning & K8s RBAC',
        ],
        estimatedWeeks: 5,
      },
      {
        title: 'Level 6: Career Ready — Security Governance, Incident Command & Certifications',
        topics: [
          'Red Team vs Blue Team Exercises & Threat Modeling (STRIDE/PASTA)',
          'Regulatory Compliance Auditing: SOC 2 Type II, GDPR, HIPAA & PCI-DSS',
          'Executive Security Briefings & Quantified Cyber Risk Assessment',
          'Preparation for Industry Certifications (Security+, CISSP, OSCP)',
          'Security System Design & Technical Threat Analysis Interviews',
        ],
        estimatedWeeks: 4,
      },
    ],
    gaps: [
      'Live incident response under adversarial pressure',
      'Advanced kernel-level exploit development and shellcoding',
      'Complex cross-cloud identity federation debugging',
    ],
  }),

  'cloud-devops': (goal) => ({
    career: goal || 'Cloud Architecture & DevOps Engineering',
    title: 'Cloud Infrastructure Architect & Site Reliability Engineer',
    salaryRange: '$115,000 - $190,000 / yr (₹18 - ₹45 LPA)',
    matchScore: 95,
    scope: 'Cloud Infrastructure & Platform Engineering • Universal Enterprise Necessity',
    description:
      'Automate multi-region cloud infrastructures, orchestrate Kubernetes clusters, design CI/CD delivery pipelines, and enforce 99.99% availability SLAs.',
    skills: [
      'Linux Internals & Bash / Python',
      'Docker & Kubernetes Orchestration',
      'Terraform & Infrastructure as Code',
      'AWS / GCP Multi-Region Architecture',
      'CI/CD Pipelines (GitHub Actions / GitLab)',
      'Prometheus, Grafana & Chaos Engineering',
    ],
    milestones: [
      {
        title: 'Level 1: Absolute Beginner — Linux Systems Administration & Shell Scripting',
        topics: [
          'Linux Filesystem Hierarchy, Process Management & Signals',
          'Bash Scripting: Control Flow, Pipes, Redirection & Text Processing (awk/sed)',
          'Git Distributed Version Control & GitFlow/Trunk-Based Development',
          'Networking Fundamentals: CIDR Subnetting, Routing Tables & DNS Resolution',
          'SSH Key Authentication, Bastion Hosts & Secure Remote Administration',
        ],
        estimatedWeeks: 3,
      },
      {
        title: 'Level 2: Core Fundamentals — Containerization with Docker & Cloud Compute Basics',
        topics: [
          'Container Mechanics: Linux Namespaces, Cgroups & Union Filesystems (OverlayFS)',
          'Writing Minimal, Multi-Stage Dockerfiles for Production Runtimes',
          'Docker Compose for Local Multi-Service Development Environments',
          'Cloud Compute Fundamentals: Virtual Machines, Security Groups & VPCs',
          'Object Storage (S3/Blob), Block Storage (EBS) & Lifecycle Rules',
        ],
        estimatedWeeks: 4,
      },
      {
        title: 'Level 3: Intermediate — Infrastructure as Code (IaC) & Continuous Delivery',
        topics: [
          'Declarative Infrastructure with Terraform: State, Modules & Providers',
          'Automated CI/CD Pipelines: Build, Test, Lint & Security Scans',
          'Secrets Management in CI/CD: Vault, Cloud Secrets Manager',
          'Artifact Registries & Semantic Versioning Strategies',
          'Zero-Downtime Deployment Strategies: Rolling, Blue/Green & Canary',
        ],
        estimatedWeeks: 5,
      },
      {
        title: 'Level 4: Advanced — Kubernetes Cluster Orchestration & Networking',
        topics: [
          'Kubernetes Architecture: Control Plane, Kubelet, etcd & Worker Nodes',
          'Workloads: Pods, Deployments, StatefulSets & DaemonSets',
          'K8s Networking: CNI Plugins, ClusterIP, NodePort, LoadBalancer & Ingress',
          'ConfigMaps, Secrets, PersistentVolumes & CSI Storage Drivers',
          'Helm Package Management & GitOps Delivery with ArgoCD or Flux',
        ],
        estimatedWeeks: 6,
      },
      {
        title: 'Level 5: Real Projects — Production High-Availability Platform Implementation',
        topics: [
          'Deploying a Production-Grade Multi-AZ Kubernetes Cluster with Terraform',
          'Implementing Full Observability Stack: Prometheus Metrics & Grafana Dashboards',
          'Centralized Logging: Fluentbit, OpenSearch/Loki & Log Retention Policies',
          'Automated Horizontal Pod Autoscaling (HPA) & Cluster Autoscaler',
          'Disaster Recovery Plan: Automated Multi-Region Database Backups & Failover',
        ],
        estimatedWeeks: 5,
      },
      {
        title: 'Level 6: Career Ready — Site Reliability Engineering (SRE) & Enterprise Operations',
        topics: [
          'SRE Core Principles: SLIs, SLOs, SLAs & Error Budget Policies',
          'Incident Management, On-Call Protocols & Blameless Post-Mortems',
          'Chaos Engineering & Failure Injection Testing (Chaos Mesh / Gremlin)',
          'Cloud Financial Operations (FinOps): Resource Rightsizing & Cost Governance',
          'Cloud Architecture Certification & Platform Engineering Interviews',
        ],
        estimatedWeeks: 4,
      },
    ],
    gaps: [
      'Multi-region cross-continent network latency mitigation experience',
      'Large-scale Kubernetes etcd quorum recovery during network partitions',
      'Advanced eBPF kernel network observability profiling',
    ],
  }),

  general: (goal) => {
    const cleanGoal = String(goal || 'Specialized Technology Track').trim();
    return {
      career: cleanGoal,
      title: `${cleanGoal} Specialist & Applied Practitioner`,
      salaryRange: '$90,000 - $160,000 / yr (₹14 - ₹35 LPA)',
      matchScore: 92,
      scope: 'Specialized Domain Track • Industry Competitive Competencies',
      description: `A comprehensive, rigorous 6-level mastery curriculum for ${cleanGoal}, structured from foundational concepts to enterprise execution.`,
      skills: [
        `${cleanGoal} Foundations`,
        'Analytical Problem Solving',
        'Modern Tooling & Frameworks',
        'System Design & Architecture',
        'Production Engineering',
        'Industry Standards & Best Practices',
      ],
      milestones: [
        {
          title: `Level 1: Absolute Beginner — Foundations & Core Terminology of ${cleanGoal}`,
          topics: [
            `Core Terminology & Theoretical Principles in ${cleanGoal}`,
            'Environment Setup, Essential Tools & Development Workflows',
            'Fundamental Principles & Baseline Problem Solving',
            'Standard Protocols, Syntax & Data Formats',
            'Version Control, Documentation & Collaborative Workflows',
          ],
          estimatedWeeks: 3,
        },
        {
          title: `Level 2: Core Fundamentals — Methodologies & Standard Tooling in ${cleanGoal}`,
          topics: [
            `Standard Methodologies & Standard Tooling in ${cleanGoal}`,
            'Data Handling, Input Validation & State Processing',
            'Core Component Architecture & Decomposition',
            'Testing Foundations: Unit Testing & Automated Assertions',
            'Debugging Techniques, Profiling Tools & Logging Workflows',
          ],
          estimatedWeeks: 4,
        },
        {
          title: `Level 3: Intermediate — Applied Engineering & Problem Solving for ${cleanGoal}`,
          topics: [
            `Applied Engineering & Algorithmic Problem Solving for ${cleanGoal}`,
            'Integration with External APIs & Data Persistence Layers',
            'Concurrency, Asynchronous Execution & Event Handling',
            'Performance Profiling & Bottleneck Mitigation',
            'Security Best Practices, Input Sanitization & Authentication Basics',
          ],
          estimatedWeeks: 5,
        },
        {
          title: `Level 4: Advanced — High-Performance Architecture & Specialized Techniques`,
          topics: [
            `High-Performance Architecture & Specialized Domain Patterns in ${cleanGoal}`,
            'Distributed Execution, Scalability & Resource Optimization',
            'Fault Tolerance, Circuit Breakers & Resiliency Design',
            'Advanced Data Pipelines & Serialization Efficiency',
            'Telemetry Instrumentation, Metrics Collection & Monitoring',
          ],
          estimatedWeeks: 6,
        },
        {
          title: `Level 5: Real Projects — Capstone Implementation & Production Deployment`,
          topics: [
            `End-to-End Capstone Implementation & Production Deployment in ${cleanGoal}`,
            'Automated Continuous Integration & Continuous Deployment (CI/CD)',
            'Load Testing, Benchmark Verification & Stress Simulation',
            'Security Auditing, Compliance Review & Dependency Scanning',
            'Comprehensive Production Documentation & Runbooks',
          ],
          estimatedWeeks: 5,
        },
        {
          title: `Level 6: Career Ready — Industry Leadership, Optimization & Portfolio`,
          topics: [
            `Enterprise System Architecture & Scalability Reviews in ${cleanGoal}`,
            'Disaster Recovery Planning, Incident Response & Runbooks',
            'Cost Governance, Operational Efficiency & Infrastructure Budgeting',
            'Open-Source Contributions & Professional Portfolio Presentation',
            'Technical Architecture Interview Preparation & System Defense',
          ],
          estimatedWeeks: 4,
        },
      ],
      gaps: [
        `Advanced domain-specific failure mode recovery in ${cleanGoal}`,
        'High-throughput production scale testing and benchmark experience',
        'Industry-standard certification and professional portfolio visibility',
      ],
    };
  },
};

/**
 * Returns a high-quality deterministic curated 6-level career roadmap.
 * Used as immediate fallback when LLM generation exceeds timeout or fails.
 */
export function getCuratedCareerPath(careerGoal: string): CareerPathPlan {
  const domain = resolveDomainCategory(careerGoal);
  const factory = CURATED_CAREER_ROADMAPS[domain] || CURATED_CAREER_ROADMAPS.general;
  return factory(careerGoal);
}

// -------------------------------------------------------------
// CURATED DIAGNOSTIC QUIZ QUESTION BANKS
// -------------------------------------------------------------

const CURATED_QUIZ_BANKS: Record<DomainCategory, QuizQuestion[]> = {
  'computer-science': [
    {
      question:
        'What is the worst-case time complexity of Quickselect when deterministic first-element pivoting is used on an already-sorted array?',
      options: ['O(N²)', 'O(N log N)', 'O(N)', 'O(log N)'],
      correctIndex: 0,
      explanation:
        'On an already-sorted array, picking the first element creates heavily unbalanced partitions of size 0 and N-1, leading to O(N²) worst-case comparisons without randomized or median-of-medians pivoting.',
    },
    {
      question:
        'Which storage engine architecture is specifically optimized for high-throughput append-only write workloads via sequential I/O?',
      options: [
        'Log-Structured Merge-Tree (LSM-Tree)',
        'B+ Tree with 4KB page splits',
        'R-Tree spatial index',
        'Extensible Hash Index with bucket chaining',
      ],
      correctIndex: 0,
      explanation:
        'LSM-Trees buffer writes in an in-memory MemTable and flush sequentially to immutable SSTables on disk, maximizing sequential write bandwidth and avoiding expensive random disk writes.',
    },
    {
      question:
        'Under the CAP theorem, how does a CP (Consistent / Partition-Tolerant) distributed database maintain consistency during a network partition?',
      options: [
        'Rejects reads and writes on minority partitions that cannot assemble a quorum',
        'Accepts unsynchronized local writes on all partitions without coordination',
        'Bypasses partitioned routers by broadcasting via UDP multicasts',
        'Immediately terminates all replica nodes to prevent split-brain',
      ],
      correctIndex: 0,
      explanation:
        'CP databases require a strict majority quorum (> N/2 nodes) to process mutations. Nodes in a minority partition cannot establish quorum and must reject writes to prevent divergent state.',
    },
    {
      question:
        'In multi-threaded systems programming, what performance hazard occurs when distinct CPU cores modify independent variables that share the same cache line?',
      options: [
        'False sharing leading to cache-line invalidation storms',
        'Deadlock in the hardware memory arbitration bus',
        'Stack pointer corruption in the CPU register file',
        'Dynamic branch misprediction penalty',
      ],
      correctIndex: 0,
      explanation:
        'False sharing happens when independent variables reside within the same 64-byte cache line. Cores modifying their separate variables trigger cache coherency protocols (MESI), constantly invalidating each other’s L1/L2 caches.',
    },
    {
      question:
        'Which synchronization primitive permits concurrent read access for multiple threads while enforcing exclusive mutual exclusion for write operations?',
      options: [
        'Read-Write Lock (Shared-Exclusive Mutex)',
        'Spinlock with exponential backoff delay',
        'Peterson Algorithm for two-thread coordination',
        'Non-reentrant binary counting semaphore',
      ],
      correctIndex: 0,
      explanation:
        'Read-Write locks permit arbitrary concurrent readers in shared mode, acquiring exclusive lock privileges only when a writer thread executes a mutation.',
    },
    {
      question:
        'What is the primary operational mechanism behind the Two-Phase Commit (2PC) protocol in distributed transactions?',
      options: [
        'A coordinator asks participants to prepare, then issues commit only if all vote affirmatively',
        'Nodes exchange transaction logs peer-to-peer via epidemic gossip',
        'Replicas perform speculative execution and revert via event sourcing if collisions occur',
        'Transactions are timestamped and committed in strict monotonic sequence without voting',
      ],
      correctIndex: 0,
      explanation:
        'In 2PC, Phase 1 (Prepare) requires every participant to lock resources and vote YES/NO. In Phase 2 (Commit), the coordinator commands all nodes to commit if all voted YES, or abort if any node voted NO.',
    },
    {
      question:
        'Which memory management strategy eliminates external memory fragmentation by allocating fixed-size power-of-two blocks?',
      options: [
        'Buddy Memory Allocation system',
        'First-Fit sequential pointer scanning',
        'Mark-and-Sweep garbage collection compaction',
        'Generational nursery heap promotion',
      ],
      correctIndex: 0,
      explanation:
        'The Buddy allocator recursively subdivides memory into power-of-two chunks (buddies) and coalesces adjacent free buddies upon deallocation, preventing external fragmentation.',
    },
    {
      question:
        'Which traversal algorithm produces nodes in strictly non-decreasing sorted order when executed on a Binary Search Tree (BST)?',
      options: [
        'In-order traversal (Left, Root, Right)',
        'Pre-order traversal (Root, Left, Right)',
        'Post-order traversal (Left, Right, Root)',
        'Breadth-first level-order traversal',
      ],
      correctIndex: 0,
      explanation:
        'Because a BST enforces Left < Root < Right, an in-order traversal visits the left subtree, the current node, and then the right subtree, outputting keys in ascending sorted order.',
    },
    {
      question:
        'What is the asymptotic time complexity of building a binary min-heap from an unsorted array of N elements using the bottom-up heapify algorithm?',
      options: ['O(N)', 'O(N log N)', 'O(N²)', 'O(log N)'],
      correctIndex: 0,
      explanation:
        'Bottom-up heap construction runs in O(N) linear time because the majority of nodes reside near the bottom of the tree where the maximum shift-down distance is small (sum of h / 2^h converges to 2).',
    },
    {
      question:
        'Which networking layer protocol guarantees ordered, reliable, error-checked delivery of a stream of octets over an IP network?',
      options: [
        'Transmission Control Protocol (TCP)',
        'User Datagram Protocol (UDP)',
        'Internet Control Message Protocol (ICMP)',
        'Address Resolution Protocol (ARP)',
      ],
      correctIndex: 0,
      explanation:
        'TCP uses sequence numbers, acknowledgments, sliding windows, and retransmissions to guarantee in-order, reliable delivery of data streams over packet-switched IP networks.',
    },
  ],

  'data-science-ai': [
    {
      question:
        'In the Transformer architecture, why is the dot product of queries and keys scaled by 1 / sqrt(d_k) before computing softmax?',
      options: [
        'To prevent dot products from growing large in high dimensions, which pushes softmax into vanishing gradient regions',
        'To reduce the computational complexity of self-attention from O(N²) to O(N)',
        'To make attention weights strictly invariant to sequence length',
        'To eliminate the requirement for residual skip connections',
      ],
      correctIndex: 0,
      explanation:
        'For large key vectors of dimension d_k, the dot products grow large in magnitude, driving softmax into regions with extremely small gradients. Scaling by 1 / sqrt(d_k) preserves stable gradient flow.',
    },
    {
      question:
        'When fine-tuning Large Language Models using LoRA (Low-Rank Adaptation), how are model weights modified?',
      options: [
        'Base weights are frozen and low-rank decomposition matrices (A and B) are trained in parallel',
        'All model weights are retrained with high weight decay and gradient clipping',
        'Zero-weight neurons are pruned and full-rank dense layers are added to every block',
        'Weights are converted to 1-bit integers without parameter adjustments',
      ],
      correctIndex: 0,
      explanation:
        'LoRA freezes the original pre-trained weight matrix W and injects trainable rank decomposition matrices ΔW = B × A (where r << d), drastically minimizing trainable parameters and GPU VRAM.',
    },
    {
      question:
        'Which evaluation metric is most informative when evaluating a model on a highly imbalanced dataset (e.g. 99.8% negative, 0.2% positive fraud detection)?',
      options: [
        'Area Under the Precision-Recall Curve (PR-AUC)',
        'Raw Accuracy score',
        'Mean Squared Error (MSE)',
        'R-squared goodness of fit',
      ],
      correctIndex: 0,
      explanation:
        'Raw accuracy is uninformative on imbalanced data because a trivial model predicting negative achieves 99.8% accuracy. PR-AUC directly evaluates the trade-off between positive precision and recall.',
    },
    {
      question:
        'What is the fundamental difference in parameter shrinkage between L1 (Lasso) and L2 (Ridge) regularization?',
      options: [
        'L1 drives non-informative feature weights strictly to zero, performing feature selection',
        'L2 drives weights to zero while L1 shrinks weights asymptotically',
        'L1 requires calculating second-order Hessian matrices while L2 is derivative-free',
        'L2 can only be applied to deep neural networks while L1 is for linear models',
      ],
      correctIndex: 0,
      explanation:
        'Due to its diamond-shaped L1 norm contour intersecting axis vertices, Lasso penalty drives non-contributing feature coefficients to exactly zero, producing sparse, interpretable models.',
    },
    {
      question:
        'What mathematical operation does Rotary Position Embedding (RoPE) use to inject sequence order into LLM query/key vectors?',
      options: [
        'Applies an orthogonal 2D rotation matrix to paired components of query and key vectors',
        'Adds a static learned positional vector directly to the token embedding',
        'Subtracts the monotonic token index from attention logits prior to softmax',
        'Shuffles token vectors randomly across transformer layers',
      ],
      correctIndex: 0,
      explanation:
        'RoPE represents position by rotating query and key representations in complex vector space, ensuring the inner product between query and key naturally decays as relative token distance increases.',
    },
    {
      question:
        'Which optimization algorithm computes adaptive learning rates per-parameter by dividing gradients by the root-mean-square of recent squared gradients with decoupled weight decay?',
      options: ['AdamW', 'Standard SGD with fixed momentum', 'Adagrad without damping', 'Nesterov Accelerated Gradient'],
      correctIndex: 0,
      explanation:
        'AdamW decouples weight decay from gradient updates, fixing a bug in classical Adam where L2 regularization was scaled by the adaptive moving average variance.',
    },
    {
      question:
        'In Retrieval-Augmented Generation (RAG), what is the primary benefit of deploying a Cross-Encoder Re-ranker after initial vector retrieval?',
      options: [
        'Performs joint self-attention across both query and document to accurately score contextual relevance',
        'Compresses vector database embeddings from 1536 dimensions to 256 dimensions',
        'Translates documents into multiple languages before LLM synthesis',
        'Splits large documents into overlapping 512-token chunks',
      ],
      correctIndex: 0,
      explanation:
        'While bi-encoders generate separate embeddings for speed, cross-encoders feed the query and document together through all attention layers, capturing intricate semantic interactions for superior ranking.',
    },
    {
      question:
        'What phenomenon occurs during deep neural network training when gradients shrink exponentially as they propagate backward through many layers?',
      options: [
        'Vanishing gradient problem',
        'Exploding gradient catastrophe',
        'Catastrophic forgetting during fine-tuning',
        'Dead neuron collapse in leaky activation units',
      ],
      correctIndex: 0,
      explanation:
        'When using activations like sigmoid or tanh, repeated multiplication of derivatives < 1 across many layers causes gradients to vanish exponentially, preventing early layers from updating.',
    },
    {
      question:
        'Which loss function is the industry standard for training autoregressive (causal) large language models on next-token prediction?',
      options: [
        'Cross-Entropy loss on categorical vocabulary distributions',
        'Mean Absolute Error (L1 loss)',
        'Hinge loss with maximum margin',
        'Kullback-Leibler divergence with uniform prior',
      ],
      correctIndex: 0,
      explanation:
        'Autoregressive language models predict the probability distribution of the next token over the entire vocabulary, optimized using categorical cross-entropy (negative log-likelihood).',
    },
    {
      question:
        'What is the primary role of the temperature parameter during LLM inference sampling?',
      options: [
        'Scales the logits before softmax to control the randomness of token selection',
        'Controls the physical clock frequency of the GPU tensor cores',
        'Sets the maximum number of tokens generated before stopping',
        'Filters out tokens whose cumulative probability exceeds top_p',
      ],
      correctIndex: 0,
      explanation:
        'Dividing logits by temperature before softmax sharpens the distribution (low T → deterministic, greedy choice) or flattens it (high T → creative, diverse token sampling).',
    },
  ],

  'web-development': [
    {
      question:
        'In the browser event loop, what is the exact execution priority relationship between Microtasks and Macrotasks?',
      options: [
        'The microtask queue (Promise.then, queueMicrotask) is drained completely before the next macrotask (setTimeout) runs',
        'Macrotasks execute first, followed by microtasks only during idle browser periods',
        'Microtasks and macrotasks are interleaved in an alternating 1:1 order',
        'Microtasks only execute during requestAnimationFrame rendering passes',
      ],
      correctIndex: 0,
      explanation:
        'At the end of each task in the event loop, the JavaScript engine drains all jobs in the microtask queue to completion before yielding to browser rendering or the next macrotask.',
    },
    {
      question:
        'Which cookie attribute flag prevents malicious client-side JavaScript from accessing session authentication tokens via document.cookie?',
      options: [
        'HttpOnly directive in Set-Cookie',
        'Secure directive in Set-Cookie',
        'SameSite=Strict directive',
        'Content-Security-Policy: default-src self',
      ],
      correctIndex: 0,
      explanation:
        'The HttpOnly flag directs the browser that the cookie must not be exposed to client-side scripts (such as document.cookie), mitigating session token exfiltration via Cross-Site Scripting (XSS).',
    },
    {
      question:
        'In React 19 and Modern Next.js, what is the primary runtime characteristic of React Server Components (RSC)?',
      options: [
        'Execute exclusively on the server and transmit zero component JavaScript to the client browser bundle',
        'Cannot accept props or data from parent components',
        'Re-render inside the browser on every mouse movement event',
        'Execute inside a client-side Web Worker thread',
      ],
      correctIndex: 0,
      explanation:
        'Server Components execute on the server and serialize into a compact virtual DOM stream, completely eliminating their dependencies and runtime code from the client browser bundle.',
    },
    {
      question:
        'What is the primary advantage of the Expand-and-Contract (Parallel Run) pattern for high-traffic database migrations?',
      options: [
        'Permits zero-downtime schema migrations where old and new application versions run concurrently',
        'Reduces relational database disk storage by 50% via compression',
        'Automatically converts SQL tables into document collections',
        'Removes the requirement for foreign key constraints in high-scale tables',
      ],
      correctIndex: 0,
      explanation:
        'Expand-and-contract first introduces non-breaking schema additions (expand), deploys updated code across application replicas, and subsequently removes obsolete columns (contract) without downtime.',
    },
    {
      question:
        'Which CSS layout specification provides native two-dimensional alignment controls (controlling both rows and columns simultaneously)?',
      options: [
        'CSS Grid Layout',
        'CSS Flexible Box Layout (Flexbox)',
        'CSS Multi-column Layout',
        'CSS Absolute Positioning with calc()',
      ],
      correctIndex: 0,
      explanation:
        'CSS Grid is designed specifically for two-dimensional layouts (rows and columns simultaneously), whereas Flexbox is designed primarily for one-dimensional layouts (a single row or column).',
    },
    {
      question:
        'What Cross-Origin Resource Sharing (CORS) mechanism does a browser trigger before dispatching non-simple HTTP requests (such as PUT or requests with custom headers)?',
      options: [
        'Dispatches an HTTP OPTIONS preflight request to verify server permissions',
        'Sends a TCP SYN probe to port 443',
        'Downloads the server SSL certificate for client validation',
        'Executes a DNS reverse-lookup query on the origin IP',
      ],
      correctIndex: 0,
      explanation:
        'For non-simple HTTP requests, browsers dispatch an OPTIONS preflight request with Origin and Access-Control-Request-* headers to verify that the server authorizes the cross-origin request.',
    },
    {
      question:
        'In relational database management, what does the ACID "Isolation" property guarantee when multiple transactions execute concurrently?',
      options: [
        'Intermediate uncommitted states of a transaction are invisible to other concurrent transactions according to the isolation level',
        'Committed transactions survive unexpected power loss or server crashes',
        'Database constraints and foreign keys are never violated during execution',
        'All statements in a transaction either complete fully or roll back completely',
      ],
      correctIndex: 0,
      explanation:
        'Isolation prevents concurrent transactions from reading incomplete or inconsistent intermediate states (avoiding dirty reads, non-repeatable reads, or phantom reads based on the configured level).',
    },
    {
      question:
        'Which client-side caching header directive instructs browsers to cache a resource but revalidate with the origin server before every reuse?',
      options: [
        'Cache-Control: no-cache',
        'Cache-Control: no-store',
        'Cache-Control: public, max-age=31536000',
        'Cache-Control: immutable',
      ],
      correctIndex: 0,
      explanation:
        'Cache-Control: no-cache allows the browser to store the asset in cache, but forces it to send an ETag/If-None-Match conditional request to the server before serving it from cache.',
    },
    {
      question:
        'In React, what is the consequence of not providing stable unique keys when rendering dynamic lists of components?',
      options: [
        'React reconciler may misidentify elements, causing state desynchronization and unnecessary DOM re-creations',
        'The JavaScript event loop enters an infinite recursion crash',
        'All client network requests are automatically paused',
        'The CSS stylesheet is unloaded from browser memory',
      ],
      correctIndex: 0,
      explanation:
        'React uses keys during reconciliation to identify which list items were changed, added, or removed. Unstable or missing keys force React to re-mount DOM nodes and can attach state to the wrong item.',
    },
    {
      question:
        'What modern web protocol upgrades HTTP over TCP to run over UDP via QUIC, eliminating head-of-line blocking?',
      options: ['HTTP/3', 'HTTP/2', 'HTTP/1.1 with Pipelining', 'WebSockets (RFC 6455)'],
      correctIndex: 0,
      explanation:
        'HTTP/3 uses QUIC over UDP, ensuring that packet loss on one stream does not stall data transmission on other independent streams (eliminating transport-layer head-of-line blocking).',
    },
  ],

  cybersecurity: [
    {
      question:
        'What is the foundational architectural axiom of the Zero Trust security model?',
      options: [
        '"Never trust, always verify" — treat internal and external network traffic as equally hostile',
        'Trust all connections originating from within the corporate office LAN',
        'Rely entirely on perimeter firewalls to block all external threats',
        'Disable all cryptographic handshakes on internal microservice communications',
      ],
      correctIndex: 0,
      explanation:
        'Zero Trust assumes breach and requires continuous explicit verification, least privilege access, and micro-segmentation regardless of whether the requester is inside or outside the network perimeter.',
    },
    {
      question:
        'In a Blind SQL Injection attack where the application returns no database error messages or reflective data, how can an attacker infer sensitive values?',
      options: [
        'Injecting conditional Boolean expressions or time delays (e.g. SLEEP/pg_sleep) to infer character values from response latency',
        'Flooding the web server with oversized TCP SYN packets',
        'Reading client-side session cookies stored in localStorage',
        'Dispatching HTTP OPTIONS requests to query database catalog metadata',
      ],
      correctIndex: 0,
      explanation:
        'Time-based and Boolean blind SQLi injects conditional clauses (e.g., IF(SUBSTRING(password,1,1)="a", SLEEP(5), 0)), measuring server response delays to reconstruct sensitive data character by character.',
    },
    {
      question:
        'What critical security failure occurs if an authenticated encryption cipher (such as AES-GCM) reuses the same Nonce with the same secret key?',
      options: [
        'Both confidentiality and ciphertext authenticity guarantees are catastrophically compromised',
        'Only encryption throughput decreases slightly',
        'Ciphertext payload length expands to double its original size',
        'Nothing, nonces are optional random padding strings',
      ],
      correctIndex: 0,
      explanation:
        'Reusing a Nonce with the same key in AES-GCM allows attackers to recover the authentication hash key (H) and forge arbitrary messages, destroying both confidentiality and message integrity.',
    },
    {
      question:
        'How does a Content Security Policy (CSP) with a cryptographic nonce protect web applications against Cross-Site Scripting (XSS)?',
      options: [
        'The browser refuses to execute script tags unless their nonce attribute matches the server-generated per-request random token',
        'The browser scrambles all HTML tags in memory before rendering',
        'It converts all inline JavaScript into WebAssembly binaries at runtime',
        'It blocks all outgoing HTTP GET requests from browser scripts',
      ],
      correctIndex: 0,
      explanation:
        'With script-src "nonce-<token>", injected malicious <script> tags lack the random server-generated token and are blocked by the browser, neutralizing reflected and stored XSS execution.',
    },
    {
      question:
        'In Public Key Infrastructure (PKI), what is the function of the Online Certificate Status Protocol (OCSP)?',
      options: [
        'Enables clients to query whether a specific digital certificate has been revoked prior to its scheduled expiration',
        'Issues new asymmetric private keys to connecting browsers automatically',
        'Encrypts user passwords stored in relational databases',
        'Replicates DNS zone records across authoritative nameservers',
      ],
      correctIndex: 0,
      explanation:
        'OCSP allows clients (browsers) to query the issuing Certificate Authority in real time to verify whether a certificate has been revoked due to private key compromise or administrative revocation.',
    },
    {
      question:
        'Which Active Directory attack technique extracts Kerberos service ticket hashes from memory or network captures to crack service account passwords offline?',
      options: [
        'Kerberoasting',
        'Pass-the-Hash',
        'Golden Ticket creation',
        'DNS Cache Poisoning',
      ],
      correctIndex: 0,
      explanation:
        'Kerberoasting requests TGS service tickets for SPN-associated service accounts. Because tickets are encrypted with the target account’s NTLM password hash, attackers crack them offline without alerting domain controllers.',
    },
    {
      question:
        'What vulnerability occurs when an application receives a user-supplied URL and fetches it without restricting access to internal metadata services (e.g. 169.254.169.254)?',
      options: [
        'Server-Side Request Forgery (SSRF)',
        'Cross-Site Request Forgery (CSRF)',
        'Insecure Direct Object Reference (IDOR)',
        'DOM-based Cross-Site Scripting (DOM XSS)',
      ],
      correctIndex: 0,
      explanation:
        'SSRF occurs when an attacker co-opts a backend server into making requests to internal loopback addresses, local subnets, or cloud instance metadata services (e.g., AWS IMDSv1 at 169.254.169.254) to steal credentials.',
    },
    {
      question:
        'Which cryptographic key exchange algorithm allows two parties with no prior shared secrets to establish a shared symmetric encryption key over an insecure channel?',
      options: [
        'Diffie-Hellman Key Exchange (DH / ECDH)',
        'Rivest-Shamir-Adleman (RSA) signatures',
        'Advanced Encryption Standard (AES-256)',
        'Secure Hash Algorithm 256 (SHA-256)',
      ],
      correctIndex: 0,
      explanation:
        'Diffie-Hellman (and Elliptic Curve Diffie-Hellman) enables two communicating entities to compute a shared secret key using modular arithmetic or elliptic curves without transmitting the secret itself over the wire.',
    },
    {
      question:
        'What is the security risk of storing user passwords using fast hashing algorithms like MD5 or SHA-256 instead of adaptive key-derivation functions like Scrypt, Argon2, or Bcrypt?',
      options: [
        'Attickers can compute billions of guesses per second on consumer GPUs using precomputed rainbow tables',
        'Fast hashes cause collision errors that lock valid users out of their accounts',
        'Fast hashes cannot store passwords longer than 16 characters',
        'Browsers automatically refuse to transmit passwords hashed with SHA-256',
      ],
      correctIndex: 0,
      explanation:
        'MD5 and SHA-256 are engineered for raw cryptographic speed. GPUs and ASICs can compute billions of candidate hashes per second, whereas memory-hard algorithms (Argon2, Scrypt) impose strict computational and memory barriers.',
    },
    {
      question:
        'In endpoint security, what telemetry mechanism captures real-time process execution trees, network socket bindings, and memory modifications for incident investigation?',
      options: [
        'Endpoint Detection and Response (EDR) agents',
        'Static file hash signature scanners',
        'Hardware BIOS watchdog timers',
        'Network port mirroring span sessions',
      ],
      correctIndex: 0,
      explanation:
        'EDR agents monitor low-level OS telemetry (process creation, thread injection, registry changes, network sockets), streaming events to security analytics engines for real-time threat hunting and automated isolation.',
    },
  ],

  'cloud-devops': [
    {
      question:
        'In Kubernetes cluster architecture, what is the primary responsibility of the Kubelet daemon on a worker node?',
      options: [
        'Communicates with the control plane to ensure containers declared in assigned PodSpecs are running and healthy',
        'Maintains global distributed consensus state across the etcd datastore',
        'Schedules unscheduled pods onto nodes based on CPU and memory affinity',
        'Serves the web dashboard graphical user interface to cluster administrators',
      ],
      correctIndex: 0,
      explanation:
        'The Kubelet is the node agent that registers the worker node with the API server, watches for Pod assignments, and instructs the container runtime (CRI) to launch, maintain, and monitor containers.',
    },
    {
      question:
        'What is the fundamental architectural advantage of Infrastructure as Code (IaC) tools like Terraform using declarative configuration?',
      options: [
        'Allows desired infrastructure state to be version-controlled, diffed, and deterministically reconciled via automated state drift detection',
        'Completely eliminates cloud hosting and compute billing costs',
        'Directly compiles configuration scripts into native x86 machine assembly',
        'Bypasses all cloud provider API authentication and rate limits',
      ],
      correctIndex: 0,
      explanation:
        'Declarative IaC specifies the target state rather than execution steps, allowing tools like Terraform to build dependency graphs, compute minimal change plans, and reconcile real-world state with version-controlled code.',
    },
    {
      question:
        'Which deployment strategy routes a small percentage of production user traffic (e.g. 5%) to a new revision before committing to a full cluster rollout?',
      options: [
        'Canary deployment',
        'Recreate deployment',
        'Big-bang deployment',
        'Destructive in-place replacement',
      ],
      correctIndex: 0,
      explanation:
        'Canary deployments route a small fraction of live traffic to the new version to monitor telemetry, error rates, and latency under real production conditions before progressing with the full rollout.',
    },
    {
      question:
        'In Site Reliability Engineering (SRE), what does an "Error Budget" formally represent?',
      options: [
        'The maximum allowable unreliability of a service calculated as (100% - SLO) over a rolling measurement window',
        'The quarterly financial monetary budget allocated for cloud hosting costs',
        'The number of compilation errors allowed in the continuous integration pipeline',
        'The buffer of unused RAM allocated to Kubernetes worker nodes',
      ],
      correctIndex: 0,
      explanation:
        'An error budget represents the difference between 100% perfection and the agreed Service Level Objective (e.g. 99.9% SLO = 0.1% error budget). If exhausted, feature deployments are paused to focus on reliability.',
    },
    {
      question:
        'What optimization mechanism in Docker multi-stage builds minimizes final container image size and reduces attack surface?',
      options: [
        'Copying only compiled runtime artifacts from intermediate build stages into a minimal scratch or distroless base image',
        'Compressing intermediate container layers into zip archives before push',
        'Removing all Linux kernel headers from the host hypervisor',
        'Running all application containers in read-only filesystem mode',
      ],
      correctIndex: 0,
      explanation:
        'Multi-stage builds leave heavy compilers, SDKs, and build tooling behind in intermediate stages, copying only the compiled binary or lean production bundle to the final runtime image.',
    },
    {
      question:
        'In Kubernetes networking, which resource acts as an API gateway to manage external HTTP/HTTPS routing, SSL termination, and path-based routing to internal cluster services?',
      options: [
        'Ingress Controller',
        'Kube-Proxy in iptables mode',
        'CoreDNS service discovery daemon',
        'NodeLocal DNSCache DaemonSet',
      ],
      correctIndex: 0,
      explanation:
        'An Ingress Controller (e.g. NGINX, Traefik, Envoy) evaluates Ingress resource rules to accept incoming external traffic, terminate TLS, and proxy requests to internal ClusterIP Services.',
    },
    {
      question:
        'Which Linux kernel feature enables container runtimes to restrict and isolate the resource usage (CPU, memory, disk I/O, network bandwidth) of a process group?',
      options: [
        'Control Groups (Cgroups)',
        'Linux Namespaces',
        'OverlayFS union mounts',
        'Seccomp security profiles',
      ],
      correctIndex: 0,
      explanation:
        'While Namespaces provide visibility isolation (PIDs, mounts, network interfaces), Cgroups (Control Groups) meter, throttle, and enforce limits on physical hardware resources (CPU, RAM, block I/O).',
    },
    {
      question:
        'In distributed monitoring and observability, what does the RED method focus on for microservice request profiling?',
      options: [
        'Rate (requests per second), Errors (failed requests per second), and Duration (latency distribution)',
        'RAM usage, Energy consumption, and Disk I/O throughput',
        'Reliability, Elasticity, and Dependability scores',
        'Replication factor, Encryption status, and Delivery speed',
      ],
      correctIndex: 0,
      explanation:
        'The RED method (popularized by Tom Wilkie) defines the three foundational telemetry metrics for request-driven microservice architectures: Rate, Errors, and Duration.',
    },
    {
      question:
        'What distributed consensus store does Kubernetes use to reliably store all cluster configuration, object specifications, and runtime states?',
      options: [
        'etcd (Raft-based key-value store)',
        'Redis in sentinel replication mode',
        'Apache Cassandra wide-column store',
        'MongoDB distributed replica set',
      ],
      correctIndex: 0,
      explanation:
        'etcd is a strongly consistent, distributed key-value store that implements the Raft consensus algorithm, providing the persistent backing store for all Kubernetes cluster state.',
    },
    {
      question:
        'What is the core principle of Chaos Engineering in cloud distributed systems?',
      options: [
        'Experimenting on a system by injecting controlled failures in production to build confidence in its resilient recovery capabilities',
        'Allowing developers to deploy code without peer code review or automated tests',
        'Disabling all server monitoring alerts during peak traffic periods',
        'Randomly deleting production database records to test backup restoration speeds',
      ],
      correctIndex: 0,
      explanation:
        'Chaos Engineering systematically introduces turbulent conditions (network latency, killed nodes, packet corruption) in a controlled blast radius to uncover systemic weaknesses before real-world outages occur.',
    },
  ],

  general: [
    {
      question:
        'In modern software architecture, what is the primary operational advantage of stateless decoupled services?',
      options: [
        'Horizontal scalability and fault isolation across worker nodes',
        'Elimination of all network serialization overhead',
        'Guaranteed zero latency across multi-region server clusters',
        'Automatic hardware encryption of CPU internal registers',
      ],
      correctIndex: 0,
      explanation:
        'Stateless services decouple persistence from execution, allowing instances to scale horizontally behind load balancers and isolate node crashes without loss of transactional state.',
    },
    {
      question:
        'When analyzing production systems for service degradation, which telemetry signal provides the earliest indicator of user-facing performance regressions?',
      options: [
        'P99 latency spikes and positive error-rate derivatives',
        'Monthly cloud hosting invoice statements',
        'Static binary file hash checksum modifications',
        'Domain name registrar renewal TTL notifications',
      ],
      correctIndex: 0,
      explanation:
        'P99 tail latency increases and positive error rate slopes capture regressions experienced by users well before average metrics or availability SLAs register a breach.',
    },
    {
      question:
        'How should sensitive environment configuration secrets (API keys, DB credentials) be managed across production runtimes?',
      options: [
        'Encrypted via key management services (KMS) and injected dynamically via ephemeral environment secrets managers',
        'Hardcoded as plaintext literals in version-controlled Git repositories',
        'Stored in public client-side browser local storage',
        'Embedded into minified frontend static bundle distributions',
      ],
      correctIndex: 0,
      explanation:
        'Secrets should never be baked into source control; using hardware KMS and dynamic ephemeral secret management minimizes exposure vectors and supports automated credential rotation.',
    },
    {
      question:
        'What testing methodology verifies that individual units of code operate correctly when assembled and interacting across service boundaries?',
      options: [
        'Integration testing',
        'Isolated unit testing with complete mocking',
        'Static lint code style analysis',
        'Production manual user acceptance testing',
      ],
      correctIndex: 0,
      explanation:
        'Integration testing assesses interactions between multiple integrated components, databases, or external services to identify boundary and interface mismatches.',
    },
    {
      question:
        'In asynchronous software architectures, what is the primary purpose of a dead-letter queue (DLQ)?',
      options: [
        'Isolates messages that cannot be processed successfully after maximum retry thresholds for forensic analysis',
        'Accelerates message consumption by skipping validation checks',
        'Compresses message payloads before transmission across network boundaries',
        'Encrypts message bodies using asymmetric public key cryptography',
      ],
      correctIndex: 0,
      explanation:
        'Dead-letter queues collect poisoned or unprocessable messages after retry limits are exhausted, preventing consumer worker loops from stalling while preserving data for debugging.',
    },
  ],
};

// -------------------------------------------------------------
// SUBTOPIC RESOLUTION & TITLE GENERATION
// -------------------------------------------------------------

const DOMAIN_SUBTOPICS: Record<string, string[]> = {
  cybersecurity: [
    'Network Defense & Packet Analysis',
    'Threat Modeling & Zero Trust Architecture',
    'Memory Safety & Exploit Mitigation',
    'Cryptographic Protocols & Key Exchange',
    'Incident Response & Digital Forensics',
    'Identity & Access Management (IAM)',
    'Cloud Security & DevSecOps',
    'Web Application Security & OWASP Top 10',
    'Reverse Engineering & Malware Analysis',
    'Security Operations Center (SOC) Analytics',
  ],
  security: [
    'Network Defense & Packet Analysis',
    'Threat Modeling & Zero Trust Architecture',
    'Memory Safety & Exploit Mitigation',
    'Cryptographic Protocols & Key Exchange',
    'Cloud Security & DevSecOps',
  ],
  ai: [
    'Transformer Architecture & Self-Attention',
    'Loss Functions & Gradient Optimization',
    'Computer Vision & Convolutional Networks',
    'Natural Language Processing & Embeddings',
    'Reinforcement Learning & Policy Gradients',
    'Model Quantization & Distributed Inference',
    'Evaluation Metrics & Bias Mitigation',
  ],
  'machine learning': [
    'Feature Engineering & Dimensionality Reduction',
    'Ensemble Methods & Gradient Boosting',
    'Deep Neural Networks & Backpropagation',
    'Hyperparameter Tuning & Regularization',
    'Model Validation & Cross-Validation Strategies',
  ],
  data: [
    'Distributed ETL Pipelines & Stream Processing',
    'Relational Query Plans & Index Optimization',
    'Statistical Hypothesis Testing & A/B Experiments',
    'Data Warehousing & Dimensional Modeling',
    'Big Data Partitioning & Distributed Storage',
  ],
  software: [
    'Concurrent Rendering & State Management',
    'Distributed Systems & Eventual Consistency',
    'Microservice Communication & API Gateways',
    'Relational Database Indexing & Query Tuning',
    'System Design & Horizontal Scaling',
  ],
  fullstack: [
    'Client-Server State Sync & Optimistic UI',
    'Authentication, Session Cookies & OAuth 2.0',
    'RESTful API Contract & GraphQL Schemas',
    'Database Transaction Isolation & ACID Compliance',
  ],
  cloud: [
    'Kubernetes Cluster Architecture & Workloads',
    'Infrastructure as Code with Terraform',
    'CI/CD Pipeline Automation & Canary Rollouts',
    'Observability with Prometheus & OpenTelemetry',
    'Site Reliability Engineering & SLI/SLO Governance',
  ],
};

export function resolveDomainSubtopics(topic: string): string[] {
  const lower = topic.toLowerCase();
  for (const [key, subtopics] of Object.entries(DOMAIN_SUBTOPICS)) {
    if (lower.includes(key)) return subtopics;
  }
  return [
    'Foundational Principles & Core Architecture',
    'Applied Methodology & Implementation',
    'Advanced Problem Solving & Diagnostics',
    'Optimization & High-Performance Patterns',
    'Edge Case Mitigation & Resiliency',
  ];
}

export function pickUniqueSubtopicTitle(
  topic: string,
  level: string,
  existingTitles: string[] = []
): string {
  const subtopics = resolveDomainSubtopics(topic);
  const normalizedExisting = new Set((existingTitles || []).map((t) => t.toLowerCase().trim()));

  for (const subtopic of subtopics) {
    const candidate = `${topic}: ${subtopic} Diagnostic`;
    const candLower = candidate.toLowerCase().trim();
    const subLower = subtopic.toLowerCase().trim();
    const alreadyUsed =
      normalizedExisting.has(candLower) ||
      normalizedExisting.has(subLower) ||
      Array.from(normalizedExisting).some((e) => e.includes(subLower) || candLower.includes(e));

    if (!alreadyUsed) {
      return candidate;
    }
  }

  for (let stage = 2; stage <= 10; stage++) {
    for (const subtopic of subtopics) {
      const candidate = `${topic}: ${subtopic} Assessment (Stage ${stage})`;
      const candLower = candidate.toLowerCase().trim();
      if (!normalizedExisting.has(candLower)) {
        return candidate;
      }
    }
  }

  return `${topic}: ${level.charAt(0).toUpperCase() + level.slice(1)} Mastery Diagnostic (${Date.now().toString().slice(-4)})`;
}

/**
 * Returns a high-quality deterministic curated diagnostic quiz.
 * Used as immediate fallback when LLM generation exceeds timeout or fails.
 */
export function getCuratedQuiz(
  topic: string,
  level = 'intermediate',
  numQuestions = 5,
  existingTitlesArg?: string[] | any
): GeneratedQuiz {
  const cleanTopic = String(topic || 'Computer Science').trim();
  const domain = resolveDomainCategory(cleanTopic);
  const bank = CURATED_QUIZ_BANKS[domain] || CURATED_QUIZ_BANKS.general;
  const count = Math.max(1, Math.min(numQuestions, bank.length));
  const existingTitles: string[] = Array.isArray(existingTitlesArg) ? existingTitlesArg : [];

  const title = pickUniqueSubtopicTitle(cleanTopic, level, existingTitles);

  // Take requested slice of domain questions
  const selectedQuestions = bank.slice(0, count).map((q) => ({
    question: q.question,
    options: [...q.options],
    correctIndex: q.correctIndex,
    explanation: q.explanation,
  }));

  return {
    title,
    topic: cleanTopic,
    subtopic: title.split(':')[1]?.replace('Diagnostic', '')?.trim() || `${level} Evaluation`,
    questions: selectedQuestions,
  };
}

// -------------------------------------------------------------
// PRIMARY EXPORTS: GENERATE CAREER PATH & GENERATE QUIZ
// (WITH ~7S TIMEOUT GUARDS & AUTOMATIC CURATED FALLBACKS)
// -------------------------------------------------------------

/**
 * Generates a complete 6-level structured learning path.
 * Protected by ~7000ms timeout guard, immediately falling back to curated curriculum.
 */
export async function generateCareerPath(
  userGoal: string,
  timeoutMs = 7000
): Promise<CareerPathPlan> {
  const cleanGoal = String(userGoal || 'Computer Science').trim();

  // In browser runtime, call server API endpoint with client timeout
  if (typeof window !== 'undefined') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch('/api/career/path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: cleanGoal }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data?.path && Array.isArray(data.path.milestones)) {
        return data.path;
      }
      throw new Error('Invalid career path payload from server');
    } catch (clientErr: any) {
      console.warn('Browser career path generation fallback notice:', clientErr?.message || clientErr);
      return getCuratedCareerPath(cleanGoal);
    } finally {
      clearTimeout(timer);
    }
  }

  // Server runtime: Call Enzonic AI rotator with timeout protection
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const completionPromise = enzonicAI.chat.completions.create(
      {
        model: ENZONIC_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are an AI career counselor. Create a structured learning path with exactly 6 levels:
            Level 1: Absolute Beginner
            Level 2: Core Fundamentals
            Level 3: Intermediate
            Level 4: Advanced
            Level 5: Real Projects
            Level 6: Career Ready
            
            For each level provide: title, topics (array of 4-6 strings), and estimatedWeeks (number).
            Output as JSON only with keys: career, milestones (array of {title, topics: string[], estimatedWeeks}), gaps (string[]).`,
          },
          { role: 'user', content: `Create a complete learning path for: ${cleanGoal}` },
        ],
        max_tokens: 4096,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      },
      {
        signal: controller.signal,
        timeout: timeoutMs,
      }
    );

    const completion = await withTimeout(
      completionPromise,
      timeoutMs,
      new Error(`Career path generation timed out after ${timeoutMs}ms`)
    );

    const content = completion.choices[0]?.message?.content || '{}';
    const cleaned = content.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    if (parsed && Array.isArray(parsed.milestones) && parsed.milestones.length >= 3) {
      return {
        career: String(parsed.career || cleanGoal).trim(),
        title: parsed.title ? String(parsed.title).trim() : undefined,
        salaryRange: parsed.salaryRange ? String(parsed.salaryRange).trim() : undefined,
        matchScore: typeof parsed.matchScore === 'number' ? parsed.matchScore : undefined,
        description: parsed.description ? String(parsed.description).trim() : undefined,
        skills: Array.isArray(parsed.skills) ? parsed.skills.map(String) : undefined,
        milestones: parsed.milestones.map((m: any, idx: number) => ({
          title: String(m.title || `Level ${idx + 1}`).trim(),
          topics:
            Array.isArray(m.topics) && m.topics.length > 0
              ? m.topics.map(String)
              : ['Core Principles', 'Practical Application', 'Testing & Verification'],
          estimatedWeeks: Number(m.estimatedWeeks) || 3,
        })),
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps.map(String) : [],
      };
    }
  } catch (err: any) {
    console.warn('Enzonic AI career path generation notice (falling back to curated curriculum):', err?.message || err);
  } finally {
    clearTimeout(timer);
  }

  // Deterministic curated fallback guarantees valid roadmap in <= timeoutMs
  return getCuratedCareerPath(cleanGoal);
}

/**
 * Generates a diagnostic quiz with domain-specific multiple choice questions.
 * Protected by ~7000ms timeout guard, immediately falling back to curated question bank.
 */
export async function generateQuiz(
  topic: string,
  level = 'intermediate',
  numQuestions = 5,
  arg4?: string[] | number,
  arg5?: string[] | number
): Promise<GeneratedQuiz> {
  const cleanTopic = String(topic || 'Computer Science').trim();

  let existingTitles: string[] = [];
  let timeoutMs = 7000;

  if (typeof arg4 === 'number') {
    timeoutMs = arg4;
    if (Array.isArray(arg5)) {
      existingTitles = arg5;
    }
  } else if (Array.isArray(arg4)) {
    existingTitles = arg4;
    if (typeof arg5 === 'number') {
      timeoutMs = arg5;
    }
  } else if (typeof arg5 === 'number') {
    timeoutMs = arg5;
  } else if (Array.isArray(arg5)) {
    existingTitles = arg5;
  }

  // In browser runtime, call server API endpoint with client timeout
  if (typeof window !== 'undefined') {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch('/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: cleanTopic, level, numQuestions, existingTitles }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      if (data?.quiz && Array.isArray(data.quiz.questions)) {
        return data.quiz;
      }
      throw new Error('Invalid quiz payload from server');
    } catch (clientErr: any) {
      console.warn('Browser quiz generation fallback notice:', clientErr?.message || clientErr);
      return getCuratedQuiz(cleanTopic, level, numQuestions, existingTitles);
    } finally {
      clearTimeout(timer);
    }
  }

  // Server runtime: Call Enzonic AI rotator with timeout protection
  const existingTitlesClause =
    existingTitles.length > 0
      ? `\nIMPORTANT: The user has ALREADY completed quizzes with these titles: [${existingTitles.slice(0, 10).map((t) => `"${t}"`).join(', ')}]. DO NOT repeat or closely match any of these titles or subtopics! Focus on a completely different subtopic or angle within "${cleanTopic}".`
      : '';

  const systemPrompt = `You are an elite academic curriculum designer and examination specialist.
Create ${numQuestions} rigorous, high-quality multiple-choice questions for "${cleanTopic}" at the "${level}" level.

TITLE SPECIFICITY REQUIREMENT (STRICT):
1. NEVER generate generic titles like "${cleanTopic} Quiz", "${level} ${cleanTopic} Quiz", "${cleanTopic} Assessment", or "${cleanTopic} Diagnostic".
2. Pick a focused, distinct subtopic, technical competency, or practical architectural domain within "${cleanTopic}".
3. The quiz title MUST be detailed, unique, and clearly reflect the chosen subtopic (e.g. "[Specific Subtopic]: [Domain] Assessment").${existingTitlesClause}
4. Each question must feature 4 realistic, distinct options (options array of 4 strings), the 0-based integer 'correctIndex', and an in-depth 'explanation'.

Output valid JSON only with keys:
{
  "title": string,
  "topic": "${cleanTopic}",
  "subtopic": string,
  "questions": [
    {
      "question": string,
      "options": [string, string, string, string],
      "correctIndex": number,
      "explanation": string
    }
  ]
}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let parsed: any = null;

  try {
    const completionPromise = enzonicAI.chat.completions.create(
      {
        model: ENZONIC_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Generate a challenging, subtopic-specific ${level}-level diagnostic quiz for: ${cleanTopic}` },
        ],
        max_tokens: 4096,
        temperature: 0.7,
        response_format: { type: 'json_object' },
      },
      {
        signal: controller.signal,
        timeout: timeoutMs,
      }
    );

    const completion = await withTimeout(
      completionPromise,
      timeoutMs,
      new Error(`Quiz generation timed out after ${timeoutMs}ms`)
    );

    const content = completion.choices[0]?.message?.content || '{}';
    const cleaned = content.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    parsed = JSON.parse(cleaned);
  } catch (aiErr: any) {
    console.warn('Enzonic AI quiz generation notice (falling back to deterministic curated quiz):', aiErr?.message || aiErr);
    parsed = null;
  } finally {
    clearTimeout(timer);
  }

  // If LLM failed, timed out, or returned invalid questions, fall back to curated bank
  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    return getCuratedQuiz(cleanTopic, level, numQuestions, existingTitles);
  }

  // Ensure title is strictly non-generic and non-duplicate
  const rawTitle = String(parsed?.title || '').trim();
  const lowerRawTitle = rawTitle.toLowerCase();
  const normalizedExisting = new Set(existingTitles.map((t) => t.toLowerCase().trim()));

  const isGeneric =
    !rawTitle ||
    lowerRawTitle === `${cleanTopic.toLowerCase()} quiz` ||
    lowerRawTitle === `${level.toLowerCase()} ${cleanTopic.toLowerCase()} quiz` ||
    lowerRawTitle === `${cleanTopic.toLowerCase()} assessment` ||
    lowerRawTitle === `${cleanTopic.toLowerCase()} diagnostic` ||
    lowerRawTitle === 'diagnostic quiz' ||
    lowerRawTitle === 'assessment quiz' ||
    rawTitle.length < 12;

  const isDuplicate = normalizedExisting.has(lowerRawTitle);

  if (isGeneric || isDuplicate) {
    parsed.title = pickUniqueSubtopicTitle(cleanTopic, level, existingTitles);
  } else {
    parsed.title = rawTitle;
  }

  // Validate each question structure
  parsed.questions = parsed.questions.map((q: any, idx: number) => ({
    question: String(q.question || `Question ${idx + 1} regarding ${cleanTopic}`).trim(),
    options:
      Array.isArray(q.options) && q.options.length >= 4
        ? q.options.slice(0, 4).map(String)
        : ['Option A', 'Option B', 'Option C', 'Option D'],
    correctIndex:
      typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4
        ? q.correctIndex
        : 0,
    explanation: String(q.explanation || 'Detailed explanation verified against technical specifications.'),
  }));

  parsed.topic = cleanTopic;
  return parsed as GeneratedQuiz;
}

/**
 * Executes structured JSON generation with hard timeout protection.
 */
export async function generateStructuredOutput<T>(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 4096,
  timeoutMs = 7000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const completionPromise = enzonicAI.chat.completions.create(
      {
        model: ENZONIC_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      },
      {
        signal: controller.signal,
        timeout: timeoutMs,
      }
    );

    const completion = await withTimeout(
      completionPromise,
      timeoutMs,
      new Error(`generateStructuredOutput timed out after ${timeoutMs}ms`)
    );

    return JSON.parse(completion.choices[0].message.content) as T;
  } finally {
    clearTimeout(timer);
  }
}
