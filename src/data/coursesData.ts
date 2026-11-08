export interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: 'concept' | 'code' | 'project';
  summary: string;
  content: string;
  codeSnippet?: string;
  keyTakeaway: string;
}

export interface CourseModule {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  category: 'AI & Data' | 'Development' | 'Career';
  rating: number;
  reviews: string;
  duration: string;
  image: string;
  level: string;
  tag: string;
  tagColor: string;
  description: string;
  modules: CourseModule[];
}

export const productionCourses: Course[] = [
  // -------------------------------------------------------------
  // COURSE 1: PYTHON PROGRAMMING MASTERCLASS
  // -------------------------------------------------------------
  {
    id: 'python',
    title: 'Python Programming Masterclass',
    subtitle: 'From Fundamentals to Algorithmic Problem Solving',
    category: 'Development',
    rating: 4.9,
    reviews: '24.8k',
    duration: '6h 30m',
    image: '/assets/extracted/course_python.svg',
    level: 'Core Requirement',
    tag: 'Trending',
    tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'Master Python fundamentals, clean OOP patterns, memory efficiency, and real-world algorithmic data structures.',
    modules: [
      {
        id: 'py-m1',
        title: 'Module 1: Modern Python Syntax & Data Structures',
        lessons: [
          {
            id: 'py-l1',
            title: '1. Variables, Scopes & Memory References',
            duration: '15 min',
            type: 'concept',
            summary: 'Understand mutable vs immutable objects, namespaces, and memory efficiency in Python.',
            content: `### Variables, Memory & Identity in Python

In Python, every variable is a reference (pointer) to an object allocated in memory. Understanding this distinction is fundamental for building performant software.

#### 1. Mutability vs Immutability
* **Immutable Types**: \`int\`, \`float\`, \`str\`, \`tuple\`, \`frozenset\`. Modifying them creates a new object in memory.
* **Mutable Types**: \`list\`, \`dict\`, \`set\`. Modifying them preserves identity (\`id(obj)\`).

#### 2. Shallow vs Deep Copy
\`\`\`python
import copy

original = [1, [2, 3], 4]
shallow = original.copy()  # Nested list is shared!
deep = copy.deepcopy(original)  # Full independent memory duplicate
\`\`\`
`,
            codeSnippet: `x = [1, 2, 3]
y = x
y.append(4)
print(f"Original x: {x}") # [1, 2, 3, 4] due to shared reference!
print(f"x is y? {x is y}") # True`,
            keyTakeaway: 'Always use copy.deepcopy() when handling nested state to avoid accidental side-effects.',
          },
          {
            id: 'py-l2',
            title: '2. High-Performance List Comprehensions & Generators',
            duration: '20 min',
            type: 'code',
            summary: 'Leverage Python comprehensions and memory-saving generator pipelines.',
            content: `### Efficient Iteration with Comprehensions & Generators

List comprehensions run in C speed within the CPython VM because the iteration loop is executed internally without bytecode overhead.

#### Example Generator Expression:
Generators calculate items on-the-fly via \`yield\`, keeping memory consumption constant $O(1)$ even across millions of data rows.
`,
            codeSnippet: `# Generator pipeline for streaming large datasets
def stream_multiples_of_ten(limit):
    for n in range(1, limit + 1):
        if n % 10 == 0:
            yield n ** 2

squares = stream_multiples_of_ten(1_000_000)
print(f"First output: {next(squares)}") # 100
print(f"Second output: {next(squares)}") # 400`,
            keyTakeaway: 'Prefer generators (yield) over eager lists when processing large datasets or API responses.',
          },
        ],
      },
      {
        id: 'py-m2',
        title: 'Module 2: Advanced OOP, Decorators & Context Managers',
        lessons: [
          {
            id: 'py-l3',
            title: '3. Custom Decorators & Metaprogramming',
            duration: '25 min',
            type: 'code',
            summary: 'Build robust function wrappers, timing benchmarks, and auth gates.',
            content: `### Decorator Internals
Decorators accept a callable and return an enhanced callable. Use \`functools.wraps\` to preserve metadata, docstrings, and signature introspection.
`,
            codeSnippet: `import time
from functools import wraps

def benchmark(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        t0 = time.perf_counter()
        res = fn(*args, **kwargs)
        duration = (time.perf_counter() - t0) * 1000
        print(f"[{fn.__name__}] finished in {duration:.3f}ms")
        return res
    return wrapper

@benchmark
def compute_heavy_sum():
    return sum(i * 2 for i in range(500_000))

compute_heavy_sum()`,
            keyTakeaway: 'Decorators are the cleanest architectural pattern for logging, rate-limiting, and validation.',
          },
          {
            id: 'py-l4',
            title: '4. Context Managers & Resource Lifecycles',
            duration: '20 min',
            type: 'code',
            summary: 'Safely allocate and tear down database connections, file locks, and threads.',
            content: `### Context Managers with \`__enter__\` and \`__exit__\`
Context managers guarantee resource cleanup even if exceptions are raised during execution.
`,
            codeSnippet: `class DatabaseSession:
    def __enter__(self):
        print("Opening database connection pool...")
        return {"connection": "active"}

    def __exit__(self, exc_type, exc_val, exc_tb):
        print("Safely releasing connection back to pool.")
        return False # Propagate exceptions if any

with DatabaseSession() as db:
    print(f"DB status: {db['connection']}")`,
            keyTakeaway: 'Always wrap file handles and database connections in context managers to prevent socket leaks.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------
  // COURSE 2: DATA SCIENCE: BEGINNER TO PRO
  // -------------------------------------------------------------
  {
    id: 'ds',
    title: 'Data Science: Beginner to Pro',
    subtitle: 'Analytics, Visualization & Predictive Modeling',
    category: 'AI & Data',
    rating: 4.9,
    reviews: '14.2k',
    duration: '8h 15m',
    image: '/assets/extracted/course_datascience.svg',
    level: 'Beginner to Advanced',
    tag: 'Trending',
    tagColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    description: 'Practical exploratory data analysis (EDA), Pandas vectorized computing, statistical hypothesis testing, and Seaborn dashboarding.',
    modules: [
      {
        id: 'ds-m1',
        title: 'Module 1: Exploratory Data Analysis & Pandas Pipelines',
        lessons: [
          {
            id: 'ds-l1',
            title: '1. Vectorized Filtering & Aggregations with Pandas',
            duration: '20 min',
            type: 'code',
            summary: 'Replace slow Python loops with SIMD-vectorized Pandas calculations.',
            content: `### Pandas Vectorization

Pandas leverages NumPy ndarray contiguous memory buffers in C to calculate statistics 50x-100x faster than raw Python loops.
`,
            codeSnippet: `import pandas as pd
import numpy as np

df = pd.DataFrame({
    'student_id': [f"STU_{i}" for i in range(1, 6)],
    'study_hours': [12.5, 4.0, 18.2, 7.5, 21.0],
    'quiz_score': [92, 65, 98, 74, 96]
})

# Vectorized conditioning without iterrows()
df['is_high_achiever'] = (df['study_hours'] >= 10.0) & (df['quiz_score'] >= 90)
print(df)`,
            keyTakeaway: 'Never use df.iterrows() for transformations; always leverage vectorized columnar operations.',
          },
          {
            id: 'ds-l2',
            title: '2. Handling Missing Data & Outlier Detection',
            duration: '25 min',
            type: 'concept',
            summary: 'Detect anomalous distributions using IQR and Z-scores before feeding data into models.',
            content: `### Missing Values & Outlier Elimination

Data quality determines model accuracy. Use Interquartile Range (IQR) for non-parametric distributions:
$$IQR = Q_3 - Q_1$$
$$\\text{Outliers} < Q_1 - 1.5 \\times IQR \\quad \\text{or} \\quad > Q_3 + 1.5 \\times IQR$$
`,
            codeSnippet: `import numpy as np

def remove_outliers_iqr(series):
    q1 = series.quantile(0.25)
    q3 = series.quantile(0.75)
    iqr = q3 - q1
    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr
    return series[(series >= lower_bound) & (series <= upper_bound)]`,
            keyTakeaway: 'Always visualize distribution skewness before blindly applying mean imputation.',
          },
        ],
      },
      {
        id: 'ds-m2',
        title: 'Module 2: Statistical Inference & Predictive Regression',
        lessons: [
          {
            id: 'ds-l3',
            title: '3. Hypothesis Testing: A/B Tests & P-Values',
            duration: '25 min',
            type: 'concept',
            summary: 'Formulate null hypotheses, two-sample t-tests, and verify statistical significance.',
            content: `### Significance Testing in Product Analytics
A p-value measures the probability of observing results at least as extreme as the observed data under the null hypothesis ($H_0$). When $p < 0.05$, reject $H_0$ with 95% confidence.
`,
            codeSnippet: `from scipy import stats

# Control group (30 students) vs Experimental AI group (30 students)
control = [72, 75, 68, 79, 81, 74, 70, 78, 80, 71]
treatment = [85, 88, 91, 84, 89, 94, 87, 90, 86, 92]

t_stat, p_val = stats.ttest_ind(treatment, control)
print(f"t-statistic: {t_stat:.2f}, p-value: {p_val:.4f}")
# p-val < 0.001 indicates significant performance improvement`,
            keyTakeaway: 'Ensure sufficient sample size and check normality assumptions before running student t-tests.',
          },
          {
            id: 'ds-l4',
            title: '4. End-to-End Scikit-Learn Regression Pipeline',
            duration: '30 min',
            type: 'project',
            summary: 'Train a regularized Ridge regression pipeline with cross-validation.',
            content: `### Building Production Pipelines with Scikit-Learn
Pipelines bundle StandardScaler, OneHotEncoder, and Ridge Estimator together to prevent data leakage during train/test splits.
`,
            codeSnippet: `from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
from sklearn.model_selection import train_test_split
import numpy as np

X = np.random.randn(100, 5)
y = X[:, 0] * 3.5 + X[:, 1] * -2.0 + np.random.randn(100) * 0.5

pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('model', Ridge(alpha=1.0))
])

pipeline.fit(X, y)
print("Pipeline trained score R^2:", pipeline.score(X, y))`,
            keyTakeaway: 'Always encapsulate preprocessors inside sklearn.pipeline.Pipeline to avoid training set leakage.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------
  // COURSE 3: MACHINE LEARNING & NEURAL NETS
  // -------------------------------------------------------------
  {
    id: 'ml',
    title: 'Machine Learning & Neural Nets',
    subtitle: 'Build Smart Models with PyTorch & Scikit',
    category: 'AI & Data',
    rating: 4.9,
    reviews: '18.5k',
    duration: '10h 30m',
    image: '/assets/extracted/course_ml.svg',
    level: 'Intermediate',
    tag: 'High Demand',
    tagColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    description: 'From regression algorithms and loss surfaces to deep feed-forward neural networks and PyTorch training loops.',
    modules: [
      {
        id: 'ml-m1',
        title: 'Module 1: Gradient Descent & Neural Foundations',
        lessons: [
          {
            id: 'ml-l1',
            title: '1. Gradient Descent & Loss Minimization',
            duration: '25 min',
            type: 'concept',
            summary: 'Understand cost functions, learning rate schedules, and backpropagation.',
            content: `### Gradient Descent Mathematical Formulation

Given a dataset with target $y$ and prediction $\\hat{y} = w \\cdot x + b$:
$$L(w, b) = \\frac{1}{N} \\sum_{i=1}^N (\\hat{y}_i - y_i)^2$$

Parameter updates follow the negative gradient direction:
$$w := w - \\alpha \\frac{\\partial L}{\\partial w}$$
`,
            codeSnippet: `import numpy as np

def linear_regression_gd(X, y, lr=0.01, epochs=200):
    w, b = 0.0, 0.0
    N = len(X)
    for _ in range(epochs):
        y_pred = w * X + b
        dw = (-2 / N) * np.sum(X * (y - y_pred))
        db = (-2 / N) * np.sum(y - y_pred)
        w -= lr * dw
        b -= lr * db
    return w, b`,
            keyTakeaway: 'Selecting the correct learning rate (alpha) prevents divergence while ensuring swift convergence.',
          },
          {
            id: 'ml-l2',
            title: '2. Multi-Layer Perceptrons & Activation Functions',
            duration: '25 min',
            type: 'concept',
            summary: 'Why non-linear activations (ReLU, GELU, Sigmoid) are required to model complex surfaces.',
            content: `### Non-Linear Activations & Universal Approximation
Without non-linear activations, stacking multiple dense layers collapses algebraically into a single linear matrix multiplication: $W_2(W_1 x) = (W_2 W_1) x = W_3 x$.
`,
            codeSnippet: `import numpy as np

def relu(x):
    return np.maximum(0, x)

def softmax(z):
    exp_z = np.exp(z - np.max(z)) # Numerical stability trick
    return exp_z / np.sum(exp_z, axis=-1, keepdims=True)

logits = np.array([2.5, 1.0, 0.1])
print("Class probabilities:", softmax(logits))`,
            keyTakeaway: 'Always subtract the maximum logit before computing softmax to prevent floating point overflow.',
          },
        ],
      },
      {
        id: 'ml-m2',
        title: 'Module 2: PyTorch Deep Learning & Transformers',
        lessons: [
          {
            id: 'ml-l3',
            title: '3. PyTorch Tensors, Autograd & GPU Acceleration',
            duration: '30 min',
            type: 'code',
            summary: 'Construct dynamic computation graphs with torch.autograd and GPU memory management.',
            content: `### PyTorch Computation Graphs
PyTorch uses dynamic eager execution. When \`loss.backward()\` is called, automatic differentiation propagates gradients through the graph back to each tensor's \`.grad\` attribute.
`,
            codeSnippet: `import torch
import torch.nn as nn

# Define a 3-layer neural network
class Net(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(10, 32)
        self.act = nn.ReLU()
        self.fc2 = nn.Linear(32, 1)

    def forward(self, x):
        return self.fc2(self.act(self.fc1(x)))

model = Net()
criterion = nn.MSELoss()
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3)
print(model)`,
            keyTakeaway: 'Remember to call optimizer.zero_grad() at every epoch iteration to prevent gradient accumulation.',
          },
          {
            id: 'ml-l4',
            title: '4. Transformers & Multi-Head Self-Attention',
            duration: '35 min',
            type: 'concept',
            summary: 'Break down Query, Key, Value calculations and scaled dot-product attention.',
            content: `### Attention Is All You Need
$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{Q K^T}{\\sqrt{d_k}}\\right) V$$
Scaling by $\\frac{1}{\\sqrt{d_k}}$ prevents dot products from growing excessively large, which would push softmax gradients into vanishing regions.
`,
            codeSnippet: `import torch
import torch.nn.functional as F

def scaled_dot_product_attention(Q, K, V):
    d_k = Q.size(-1)
    scores = torch.matmul(Q, K.transpose(-2, -1)) / (d_k ** 0.5)
    attention_weights = F.softmax(scores, dim=-1)
    return torch.matmul(attention_weights, V), attention_weights

# Batch=1, SeqLen=4, Dim=8
q = torch.randn(1, 4, 8)
k = torch.randn(1, 4, 8)
v = torch.randn(1, 4, 8)
output, weights = scaled_dot_product_attention(q, k, v)
print("Attention output shape:", output.shape) # [1, 4, 8]`,
            keyTakeaway: 'Self-attention allows tokens to dynamically attend to distant contextual relationships in parallel.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------
  // COURSE 4: MODERN WEB DEV WITH REACT
  // -------------------------------------------------------------
  {
    id: 'web',
    title: 'Modern Web Dev with React',
    subtitle: 'Full Stack SPAs, Tailwind & TypeScript',
    category: 'Development',
    rating: 4.8,
    reviews: '12.1k',
    duration: '12h 45m',
    image: '/assets/extracted/course_webdev.svg',
    level: 'Beginner Friendly',
    tag: 'Popular',
    tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    description: 'Component lifecycles, custom hooks, Tailwind CSS layout techniques, and clean state management.',
    modules: [
      {
        id: 'web-m1',
        title: 'Module 1: React 19 Architecture & Component Patterns',
        lessons: [
          {
            id: 'web-l1',
            title: '1. Custom Hooks & Declarative State Orchestration',
            duration: '20 min',
            type: 'code',
            summary: 'Extract reusable logic into pure, testable custom React hooks.',
            content: `### Crafting Custom Hooks
Custom hooks allow you to package asynchronous effects, abort controllers, and local storage synchronization cleanly.
`,
            codeSnippet: `import { useState, useEffect } from 'react';

export function usePersistentState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);

  return [state, setState] as const;
}`,
            keyTakeaway: 'Custom hooks isolate side effects and keep UI components purely declarative.',
          },
          {
            id: 'web-l2',
            title: '2. High-Performance Memoization & Render Optimization',
            duration: '25 min',
            type: 'code',
            summary: 'Prevent unnecessary re-renders with useMemo, useCallback, and React.memo.',
            content: `### When to Optimize React Renders
React re-renders children when props change by reference. Wrap object literals and handler functions in \`useCallback\` when passing them to memoized components.
`,
            codeSnippet: `import React, { useMemo, useCallback } from 'react';

export const ExpensiveList = React.memo(({ items, onItemClick }: any) => {
  return (
    <ul>
      {items.map((it: any) => (
        <li key={it.id} onClick={() => onItemClick(it.id)}>{it.name}</li>
      ))}
    </ul>
  );
});`,
            keyTakeaway: 'Premature optimization harms readability; only apply memoization when profiling reveals bottlenecks.',
          },
        ],
      },
      {
        id: 'web-m2',
        title: 'Module 2: TypeScript Strict Mode & Tailwind Layouts',
        lessons: [
          {
            id: 'web-l3',
            title: '3. Discriminated Unions & Safe State Modeling',
            duration: '25 min',
            type: 'code',
            summary: 'Eliminate runtime bugs by modeling impossible states as impossible in TypeScript.',
            content: `### Discriminated Unions in UI State
Instead of multiple boolean flags (\`isLoading\`, \`isError\`, \`data\`), represent state as a single tagged union.
`,
            codeSnippet: `type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

function renderUI(state: RequestState<string[]>) {
  switch (state.status) {
    case 'loading': return 'Loading...';
    case 'error': return 'Error: ' + state.message;
    case 'success': return 'Data: ' + state.data.join(', ');
    default: return 'Ready';
  }
}`,
            keyTakeaway: 'Discriminated unions make entire classes of UI bugs impossible at compile time.',
          },
          {
            id: 'web-l4',
            title: '4. Full-Stack REST API & Server-Sent Events',
            duration: '30 min',
            type: 'project',
            summary: 'Stream real-time AI responses to React components using Server-Sent Events (SSE).',
            content: `### Streaming Text with Fetch & ReadableStream
Consume real-time tokens over HTTP/1.1 chunked transfer or HTTP/2 without WebSocket overhead.
`,
            codeSnippet: `async function readStream(url: string, onToken: (text: string) => void) {
  const response = await fetch(url);
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) return;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onToken(decoder.decode(value));
  }
}`,
            keyTakeaway: 'SSE is simpler and more resilient than WebSockets for one-way AI streaming feeds.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------
  // COURSE 5: CLOUD & DEVOPS ARCHITECTURE
  // -------------------------------------------------------------
  {
    id: 'cloud',
    title: 'Cloud & DevOps Architecture',
    subtitle: 'Docker, CI/CD Pipelines & Kubernetes',
    category: 'Development',
    rating: 4.8,
    reviews: '9.4k',
    duration: '9h 20m',
    image: '/assets/extracted/course_cloud.svg',
    level: 'Intermediate',
    tag: '₹18L+ Careers',
    tagColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    description: 'Containerization, microservices security, automated GitHub Actions, and production deployments.',
    modules: [
      {
        id: 'c-m1',
        title: 'Module 1: Multi-Stage Docker Builds & Microservices',
        lessons: [
          {
            id: 'c-l1',
            title: '1. Production Dockerfiles with Zero Attack Surface',
            duration: '18 min',
            type: 'code',
            summary: 'Craft multi-stage minimal container images using Alpine or Distroless bases.',
            content: `### Secure Multi-Stage Builds
Multi-stage Docker builds discard build compilers, SDKs, and intermediate files, shrinking container image footprints from 1.2GB down to ~50MB.
`,
            codeSnippet: `# Multi-stage Node/Bun build
FROM oven/bun:alpine AS builder
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:distroless AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
USER nonroot
EXPOSE 3000
CMD ["dist/server.js"]`,
            keyTakeaway: 'Always run container workloads as nonroot user in production environments.',
          },
          {
            id: 'c-l2',
            title: '2. Docker Compose & Local Service Mesh',
            duration: '22 min',
            type: 'code',
            summary: 'Orchestrate microservices, Redis caching, and databases with persistent volumes.',
            content: `### Multi-Container Coordination
Use internal Docker networks to isolate databases and message queues from public exposure.
`,
            codeSnippet: `version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REDIS_URL=redis://cache:6379
    depends_on:
      - cache
  cache:
    image: redis:7-alpine
    restart: unless-stopped`,
            keyTakeaway: 'Never expose internal databases directly on host ports; connect via Docker network names.',
          },
        ],
      },
      {
        id: 'c-m2',
        title: 'Module 2: CI/CD Automation & Kubernetes Clustering',
        lessons: [
          {
            id: 'c-l3',
            title: '3. GitHub Actions Automated Verification Pipeline',
            duration: '25 min',
            type: 'code',
            summary: 'Automate linting, unit tests, security audits, and container registry publishing.',
            content: `### Continuous Integration Workflows
Run tests on every pull request to guarantee that breaking regressions never merge into main branch.
`,
            codeSnippet: `name: Production CI
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run build
      - run: bun test`,
            keyTakeaway: 'Enforce branch protection rules so master merges require passing CI workflows.',
          },
          {
            id: 'c-l4',
            title: '4. Kubernetes Deployments, Services & Ingress',
            duration: '30 min',
            type: 'concept',
            summary: 'Declarative pod management, rolling zero-downtime updates, and health probes.',
            content: `### Self-Healing Infrastructure
Kubernetes automatically restarts failed pods and reroutes traffic when liveness or readiness probes fail.
`,
            codeSnippet: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: mindpath-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: mindpath-api
  template:
    metadata:
      labels:
        app: mindpath-api
    spec:
      containers:
      - name: api
        image: registry.example.com/api:v1.2.0
        ports:
        - containerPort: 3000`,
            keyTakeaway: 'Always configure both livenessProbe and readinessProbe on production deployments.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------
  // COURSE 6: CYBERSECURITY & DEFENSE
  // -------------------------------------------------------------
  {
    id: 'cyber',
    title: 'Cybersecurity & Defense',
    subtitle: 'Ethical Hacking, Cryptography & Network Security',
    category: 'Development',
    rating: 4.7,
    reviews: '8.6k',
    duration: '11h 00m',
    image: '/assets/extracted/course_cybersecurity.svg',
    level: 'All Levels',
    tag: 'Essential',
    tagColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    description: 'OWASP Top 10 web vulnerabilities, SQL injection prevention, cryptographic hashing, and penetration testing fundamentals.',
    modules: [
      {
        id: 'cy-m1',
        title: 'Module 1: Modern App Defense & Cryptography',
        lessons: [
          {
            id: 'cy-l1',
            title: '1. Scrypt / Argon2 Password Hashing & Timing Protections',
            duration: '22 min',
            type: 'concept',
            summary: 'Eliminate credential stuffing and timing attacks with cryptographically secure key derivation.',
            content: `### Timing Attacks & Salted Scrypt
A timing attack deduces secret values by measuring differences in CPU comparison times. Use constant-time equality comparisons:
\`\`\`ts
crypto.timingSafeEqual(storedHashBuffer, derivedKeyBuffer);
\`\`\`
`,
            codeSnippet: `import crypto from 'node:crypto';

export function secureHash(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = crypto.scryptSync(password, salt, 64).toString('hex');
  return \`\${salt}:\${key}\`;
}`,
            keyTakeaway: 'Always use memory-hard KDF algorithms (scrypt or argon2) with timingSafeEqual.',
          },
          {
            id: 'cy-l2',
            title: '2. OWASP Top 10: SQL Injection & XSS Mitigations',
            duration: '25 min',
            type: 'code',
            summary: 'Defend web APIs against injection payloads using parameterized queries and CSP headers.',
            content: `### Parameterized Queries vs String Concatenation
Never concatenate user input directly into SQL strings. Parameterized queries instruct the database engine to treat inputs strictly as literal values rather than executable syntax.
`,
            codeSnippet: `// VULNERABLE:
// db.query("SELECT * FROM users WHERE id = '" + req.body.id + "'");

// SECURE:
db.query({
  sql: "SELECT * FROM users WHERE id = ? LIMIT 1",
  args: [req.body.id]
});`,
            keyTakeaway: '100% of SQL injections can be prevented by using parameterized database drivers.',
          },
        ],
      },
      {
        id: 'cy-m2',
        title: 'Module 2: Network Forensics & Defensive Architecture',
        lessons: [
          {
            id: 'cy-l3',
            title: '3. TLS Handshakes, Certificates & Public Key Cryptography',
            duration: '25 min',
            type: 'concept',
            summary: 'Analyze Diffie-Hellman key exchange, asymmetric encryption, and digital certificates.',
            content: `### TLS 1.3 Handshake Security
TLS 1.3 establishes encrypted channels in a single round-trip (1-RTT) while enforcing Perfect Forward Secrecy (PFS). Even if long-term private keys are later compromised, past session traffic remains indecipherable.
`,
            codeSnippet: `# Verify TLS certificate validity via OpenSSL
openssl s_client -connect google.com:443 -tls1_3`,
            keyTakeaway: 'Always enforce Perfect Forward Secrecy (PFS) ciphers in production web servers.',
          },
          {
            id: 'cy-l4',
            title: '4. Rate Limiting, CORS & CSRF Defense',
            duration: '25 min',
            type: 'code',
            summary: 'Harden web servers against brute force, DDoS, and cross-site scripting vulnerabilities.',
            content: `### Defense-in-Depth for APIs
Apply sliding window rate limiters to authentication endpoints, set strict CORS whitelist policies, and enforce SameSite cookies.
`,
            codeSnippet: `import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  message: { error: 'Too many login attempts. Please try again later.' }
});`,
            keyTakeaway: 'Rate limiting on authentication routes stops automated credential stuffing cold.',
          },
        ],
      },
    ],
  },

  // -------------------------------------------------------------
  // COURSE 7: CAREER SKILLS & EXECUTIVE PRESENCE
  // -------------------------------------------------------------
  {
    id: 'skills',
    title: 'Career Skills & Executive Presence',
    subtitle: 'Tech Interviews, Resume & Pitching',
    category: 'Career',
    rating: 4.9,
    reviews: '11.8k',
    duration: '5h 30m',
    image: '/assets/extracted/course_softskills.svg',
    level: 'Must-Have',
    tag: 'Placement Ready',
    tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    description: 'System design communication, behavioral STAR technique responses, salary negotiations, and portfolio structuring.',
    modules: [
      {
        id: 'sk-m1',
        title: 'Module 1: The STAR Technique in Technical Interviews',
        lessons: [
          {
            id: 'sk-l1',
            title: '1. Structuring High-Impact Behavioral Responses',
            duration: '15 min',
            type: 'concept',
            summary: 'Formulate Situation, Task, Action, and Result answers with quantifiable metrics.',
            content: `### The STAR Methodology
1. **Situation**: Set the stage with brief context (company, project, constraint).
2. **Task**: What was your specific responsibility?
3. **Action**: The technical actions *you* took (technologies, decisions, hurdles).
4. **Result**: Quantified impact (e.g., latency dropped 45%, costs reduced by $12k/mo).
`,
            codeSnippet: `// Example STAR metric formulation:
// "Redesigned the database indexing strategy in PostgreSQL,
// reducing p99 API query latency from 850ms to 42ms for 250k daily active users."`,
            keyTakeaway: 'Anchor every interview story with concrete, quantifiable engineering numbers.',
          },
          {
            id: 'sk-l2',
            title: '2. High-Impact Technical Resume Engineering',
            duration: '20 min',
            type: 'concept',
            summary: 'Optimize resumes for ATS parsing, eliminate weak passive phrasing, and highlight impact.',
            content: `### Writing for Applicant Tracking Systems (ATS)
* Replace generic phrases ("Responsible for developing API") with strong power verbs ("Architected distributed REST API").
* Use Google's XYZ formula: Accomplished [X] as measured by [Y] by doing [Z].
`,
            codeSnippet: `• Engineered asynchronous worker queue using Redis and Go, processing 5M events/day with 99.98% reliability.
• Reduced AWS infrastructure expenditure by 34% by refactoring monolithic instances to containerized microservices.`,
            keyTakeaway: 'Every bullet point must highlight an engineering action paired with a business outcome.',
          },
        ],
      },
      {
        id: 'sk-m2',
        title: 'Module 2: System Design & Strategic Negotiation',
        lessons: [
          {
            id: 'sk-l3',
            title: '3. Navigating System Design Architecture Interviews',
            duration: '25 min',
            type: 'concept',
            summary: 'Drive system design discussions from scope definition to caching, sharding, and fault tolerance.',
            content: `### 4-Step System Design Blueprint
1. **Scope Requirements**: Estimate QPS, read vs write ratios, latency SLA.
2. **High-Level Design**: Core entities, REST endpoints, and basic service diagram.
3. **Deep Dive Bottlenecks**: Introduce Redis cache, database read-replicas, and CDN edge caching.
4. **Resiliency & Trade-offs**: Discuss CAP theorem trade-offs and disaster recovery.
`,
            codeSnippet: `# Back-of-the-envelope calculation:
# 50M Daily Active Users * 20 requests/day = 1 Billion requests/day
# QPS = 1,000,000,000 / 86,400 ≈ 11,500 Queries Per Second`,
            keyTakeaway: 'Always clarify requirements and quantify scale before jumping into drawing architectures.',
          },
          {
            id: 'sk-l4',
            title: '4. Executive Presence & Compensation Negotiation',
            duration: '20 min',
            type: 'concept',
            summary: 'Negotiate equity, base salary, and bonuses effectively without damaging relationships.',
            content: `### The Art of Compensation Strategy
* Never disclose an arbitrary number first; ask for the band for the level.
* Frame counter-offers around verified market data and specialized skills.
* Evaluate Total Target Compensation (Base + Bonus + Equity vesting schedule).
`,
            codeSnippet: `"Based on my research for Level 4 engineers in Bangalore with distributed systems expertise,
the market band is ₹24L - ₹28L. Given my background in scaling pipelines,
I'm looking for a base of ₹26L to make this an immediate yes."`,
            keyTakeaway: 'Negotiate the total compensation package collaboratively, backed by industry benchmarks.',
          },
        ],
      },
    ],
  },
];
