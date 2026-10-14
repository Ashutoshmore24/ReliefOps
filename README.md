# 🛡️ ReliefOps — Smart Disaster Relief Kit Optimizer

<div align="center">

[![Live Demo](https://img.shields.io/badge/Demo-Live%20on%20Vercel-success?style=for-the-badge&logo=vercel&logoColor=white)](https://relief-ops-six.vercel.app/)
[![React](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript%205.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Three.js](https://img.shields.io/badge/Three.js%20%2F%20R3F-049EF4?style=for-the-badge&logo=threedotjs&logoColor=white)](https://threejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase%2012-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS%20v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

</div>

---

## 📖 Overview

In catastrophic humanitarian emergencies—such as severe flash flooding, major earthquakes, or acute medical crises—first responders face a critical constraint: **carrying capacity is strictly limited**, while the potential combinations of life-saving supplies are vast. Choosing supplies by intuition or simple heuristic can easily lead to suboptimal outcomes, potentially leaving higher-priority relief supplies behind.

**ReliefOps** transforms algorithmic optimization from abstract mathematical theory into an interactive, visual decision lab. Built with **React 19**, **TypeScript**, **Three.js / React Three Fiber**, and **Tailwind CSS**, ReliefOps allows users to configure emergency disaster scenarios, simulate kit packing in real time, inspect branch-and-bound search trees down to exact rational bounds, explore decisions in a full 3D procedural relief warehouse, compare greedy heuristics against proven optima, and securely save custom missions to the cloud.

---

## ✨ Key Features

### 🎒 Live 2D Relief Kit Simulation
- Visual emergency payload bay with animated item packing and real-time weight meters.
- Live capacity utilization progress tracking with fractional weight precision (up to two decimal places).
- Category-aware visual indicators for medical kits, hydration, nutrition, shelter, and communication.

### 🌐 3D Decision Lab (WebGL Procedural Warehouse)
- High-performance 3D warehouse environment rendered with **React Three Fiber (`@react-three/fiber`)** and **Three.js**.
- Dual-vehicle visualization: dynamically compares the **Current Trial Vehicle** (hypothetical branch) against the **Best-So-Far Vehicle** (incumbent solution).
- Animated procedural cargo transfers, wheel rotation physics on vehicle dispatch, and a dynamic **Decision Spotlight**.
- Demand-driven render loop (`invalidate()`) ensuring 0% GPU draw when idle.
- Seamless, zero-dependency **2D Historical Warehouse fallback** for devices with low WebGL capabilities or reduced motion preferences.

### 🌳 Branch & Bound Algorithm Explorer
- Interactive search tree visualizer mapping parent-child relationships, exploration depth, and branching choices (`include` vs. `exclude`).
- Full execution playback bar with scrubbing, frame-by-frame stepping, and speed multipliers ($0.5\times$, $1\times$, $2\times$, $4\times$).
- Step-by-step node inspector detailing current weight, accumulated priority, upper bounds, and pruning classifications (Overweight vs. Bounding).
- Exact rational bound breakdown displaying fractional relaxation calculations without floating-point inaccuracies.

### ⚖️ Greedy vs. Optimal Comparison
- Side-by-side strategy comparison proving why density-based greedy heuristics fail on 0/1 indivisible packing.
- Clear delta metrics displaying weight differences, score improvements, and percentage performance gains.

### 🧭 9-Lesson Interactive Learning Journey
- Structured pedagogical "Snake Path" curriculum guiding learners from foundational 0/1 knapsack theory to advanced branch-and-bound mechanics.
- Connected deep links allowing students to jump straight into recorded execution events demonstrating specific concepts (e.g., pruning triggers, incumbent updates).

### 🎤 Guided Presentation Mode
- Clean, focused stage mode designed for lectures, demonstrations, and technical presentations.
- Guided stop-by-stop presentation workflow navigating key milestone events with keyboard shortcut navigation (`Esc` to exit).

### ☁️ Cloud Mission Vault & Firebase Authentication
- Secure email/password and Google OAuth sign-in with email verification enforcement.
- Private Cloud Firestore storage allowing verified users to save, manage, and load custom missions into the optimizer.
- Strict security rules (`firestore.rules`) enforcing data ownership, schema validation, and server timestamp integrity.
- **Zero-lockout architecture:** core optimization, learning journeys, and 3D demos remain 100% public without requiring an account.

### ⚡ Dedicated Web Worker Optimizer Engine
- Combinatorial search executes inside a dedicated Web Worker (`optimizer.worker.ts`), preventing main thread UI freezes.
- Configurable resource limits (up to $1,000,000$ inspected nodes and trace events) safeguarding browser performance.
- Honest status reporting: incomplete searches due to resource limits or cancellation are never falsely labeled as optimal.

### 🎨 Design & Accessibility Excellence
- Seamless theme switching between tailored light and dark palettes with localStorage persistence.
- Full compliance with `prefers-reduced-motion`—automatically disables animated camera interpolations and snaps cargo immediately.
- Keyboard-accessible search tree, dialogs, and interactive tables with comprehensive ARIA landmark attributes.

---

## 🧠 The Algorithm Behind ReliefOps

ReliefOps models disaster kit preparation as the classic **0/1 Knapsack Problem**, solving it to mathematical optimality using the **Branch and Bound** paradigm.

### Mathematical Formulation

Given an inventory of $n$ available supplies, each having weight $w_i > 0$ and priority score $v_i \ge 0$, and a transport vehicle with carrying capacity $C$:

$$\text{Maximize } \sum_{i=1}^{n} v_i \cdot x_i$$

$$\text{Subject to } \sum_{i=1}^{n} w_i \cdot x_i \le C, \quad \text{where } x_i \in \{0, 1\}$$

Because items are indivisible ($x_i \in \{0, 1\}$), supplies must either be included in full ($x_i = 1$) or completely left behind ($x_i = 0$).


### Core Algorithmic Steps

1. **Pre-processing & Density Ordering:**  
   Supplies are sorted in non-increasing order of their priority-to-weight ratio:
   $$\frac{v_1}{w_1} \ge \frac{v_2}{w_2} \ge \dots \ge \frac{v_n}{w_n}$$
   Ties are broken deterministically by original inventory order.

2. **Branching:**  
   At each level $i$ of the search tree, two child branches are evaluated:
   - **Include ($x_i = 1$):** Add supply $i$ to the kit, increasing current weight by $w_i$ and priority by $v_i$.
   - **Exclude ($x_i = 0$):** Leave supply $i$ behind, keeping current weight and priority unchanged.

3. **Fractional Bounding (Relaxation):**  
   To determine whether a branch is worth exploring, ReliefOps computes an admissible upper bound using the continuous fractional relaxation:
   $$\text{Upper Bound} = \text{Current Priority} + \sum_{k=\text{depth}}^{j-1} v_k + \left( \frac{C - W_{\text{accumulated}}}{w_j} \right) \cdot v_j$$
   Because the relaxed knapsack problem allows fractional items, its maximum value is guaranteed to be greater than or equal to the best integer solution reachable from that branch.
   > **Precision Engineering:** ReliefOps performs all fractional bound evaluations and comparisons using exact rational arithmetic (`BigInt` numerator and denominator cross-multiplication), eliminating floating-point rounding errors.

4. **Incumbent Maintenance:**  
   The algorithm tracks the highest-priority feasible solution discovered so far ($v_{\text{incumbent}}$). When a feasible leaf node or complete solution exceeds the incumbent, the best-so-far kit is updated.

5. **Pruning (Bounding & Feasibility):**  
   A branch is pruned (discarded without further exploration) if:
   - **Overweight:** Accumulated weight exceeds capacity ($\sum w_i x_i > C$).
   - **Bound Dominated:** The exact rational upper bound is less than or equal to the current incumbent ($\text{Upper Bound} \le v_{\text{incumbent}}$).

6. **Search Strategy:**  
   ReliefOps uses a **Best-Bound-First** priority queue strategy, prioritizing nodes with the highest upper bound to maximize the likelihood of finding strong incumbents early and pruning wider subtrees.

### Complexity & Safety

| Parameter | Theoretical Bound | Practical Behavior in ReliefOps |
|---|---|---|
| **Worst-Case Time** | $\mathcal{O}(2^n)$ | Exponential worst case when pruning cannot eliminate branches |
| **Average Time** | $\mathcal{O}(k \cdot 2^n), \quad k \ll 1$ | Drastically reduced through early pruning with tight fractional bounds |
| **Frontier Memory** | $\mathcal{O}(2^n)$ | Managed via user-configurable node limits (default 10,000; up to 1,000,000) |
| **Trace Storage** | $\mathcal{O}(\text{events})$ | Safeguarded by configurable trace event limits (default 40,000) |

---

## 3D Decision Lab

The **3D Decision Lab** renders the historical branch-and-bound search process inside an interactive WebGL simulation.



---

### 🏗️ Technology Stack

<table>
  <tr>
    <td valign="middle"><img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" /></td>
    <td valign="middle"><code>19.1.1</code></td>
    <td valign="middle">Component-based UI, concurrent rendering, and context management</td>
  </tr>
  <tr>
    <td valign="middle"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></td>
    <td valign="middle"><code>5.9.2</code></td>
    <td valign="middle">Type-safe application logic, domain modeling, and worker protocols</td>
  </tr>
  <tr>
    <td valign="middle"><img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" /></td>
    <td valign="middle"><code>6.3.5</code></td>
    <td valign="middle">Next-generation build tool and hot module replacement development server</td>
  </tr>
  <tr>
    <td valign="middle"><img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></td>
    <td valign="middle"><code>4.1.12</code></td>
    <td valign="middle">Utility-first responsive styling and fluid layout system</td>
  </tr>
  <tr>
    <td valign="middle"><img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=threedotjs&logoColor=white" alt="Three.js" /></td>
    <td valign="middle"><code>0.180.0</code></td>
    <td valign="middle">Core WebGL procedural 3D scene graph and lighting calculations</td>
  </tr>
  <tr>
    <td valign="middle"><img src="https://img.shields.io/badge/React_Three_Fiber-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Three Fiber" /></td>
    <td valign="middle"><code>9.3.0</code></td>
    <td valign="middle">Declarative React renderer for Three.js scene graphs</td>
  </tr>
  <tr>
    <td valign="middle"><img src="https://img.shields.io/badge/React_Three_Drei-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Three Drei" /></td>
    <td valign="middle"><code>10.7.6</code></td>
    <td valign="middle">3D helpers, including RoundedBox, HTML overlays, and OrbitControls</td>
  </tr>
  <tr>
    <td valign="middle"><img src="https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=000000" alt="Firebase" /></td>
    <td valign="middle"><code>12.19.0</code></td>
    <td valign="middle">Cloud Authentication with Email/Password and Google, plus Firestore database</td>
  </tr>
</table>

### Directory Structure

```
ReliefOps.git/
├── .env.example
├── .firebaserc
├── .gitignore
├── LICENSE
├── README.md
├── artifacts/
│   ├── advanced-decision-lab.png
│   ├── authentication-preview.png
│   └── decision-lab-preview.png
├── eslint.config.js
├── firebase.json
├── firestore.rules
├── index.html
├── package-lock.json
├── package.json
├── src/
│   ├── App.tsx
│   ├── algorithm/
│   │   ├── solver.test.ts
│   │   └── solver.ts
│   ├── auth/
│   │   ├── AuthContext.tsx
│   │   ├── AuthPanel.tsx
│   │   ├── authUi.test.tsx
│   │   ├── firebase.test.ts
│   │   ├── firebase.ts
│   │   ├── policy.test.ts
│   │   └── policy.ts
│   ├── components/
│   │   └── Field.tsx
│   ├── domain/
│   │   ├── editor.test.ts
│   │   ├── editor.ts
│   │   └── mission.ts
│   ├── features/
│   │   ├── explorer/
│   │   │   ├── AlgorithmExplorer.tsx
│   │   │   ├── SearchTree.tsx
│   │   │   ├── accessibility.test.tsx
│   │   │   ├── explanations.ts
│   │   │   ├── explorer.test.ts
│   │   │   └── traceModel.ts
│   │   ├── learning/
│   │   │   ├── LearningPanel.tsx
│   │   │   ├── LessonDetailCard.tsx
│   │   │   ├── SnakePathJourney.tsx
│   │   │   ├── learning.test.tsx
│   │   │   ├── lessons.ts
│   │   │   └── workedExample.ts
│   │   ├── mission/
│   │   │   ├── MissionEditor.tsx
│   │   │   └── useMission.ts
│   │   ├── presentation/
│   │   │   ├── PresentationMode.tsx
│   │   │   ├── presentation.test.tsx
│   │   │   └── presentationModel.ts
│   │   ├── results/
│   │   │   ├── ResultFeedback.tsx
│   │   │   ├── ResultsSummary.tsx
│   │   │   ├── StrategyComparison.tsx
│   │   │   ├── resultModel.ts
│   │   │   └── results.test.tsx
│   │   ├── savedMissions/
│   │   │   ├── SavedMissions.tsx
│   │   │   ├── firestoreRules.test.ts
│   │   │   ├── missionStore.test.ts
│   │   │   └── missionStore.ts
│   │   ├── simulation/
│   │   │   ├── EmergencyKitVisual.tsx
│   │   │   ├── LiveKitSimulation.tsx
│   │   │   ├── simulation.test.tsx
│   │   │   └── simulationModel.ts
│   │   └── simulation3d/
│   │       ├── DecisionLab3D.tsx
│   │       ├── ReliefScene.tsx
│   │       ├── WarehouseModels.tsx
│   │       ├── motion.test.ts
│   │       ├── motion.ts
│   │       ├── sceneModel.test.ts
│   │       └── sceneModel.ts
│   ├── main.tsx
│   ├── playback/
│   │   ├── state.test.ts
│   │   ├── state.ts
│   │   └── usePlaybackClock.ts
│   ├── styles.css
│   ├── theme/
│   │   ├── ThemeContext.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── theme.test.tsx
│   │   └── theme.ts
│   ├── vite-env.d.ts
│   └── worker/
│       ├── controller.ts
│       ├── optimizer.worker.ts
│       ├── protocol.ts
│       └── worker.test.ts
├── tsconfig.json
└── vite.config.ts

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your system:
- **Node.js**: Version `18.0.0` or higher (Node `20+` recommended)
- **npm**: Version `9.0.0` or higher
- **Git**: For repository version control

### 1. Clone the Repository

```bash
git clone https://github.com/Ashutoshmore24/ReliefOps.git
cd ReliefOps
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables (Optional)

The application runs fully out-of-the-box in public mode without Firebase. If you wish to enable the **My missions** cloud vault and user sign-in:

1. Copy the example configuration:
   ```bash
   cp .env.example .env.local
   ```
2. Populate `.env.local` with your Firebase Web App credentials:
   ```env
   VITE_FIREBASE_API_KEY="your-api-key"
   VITE_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="your-project-id"
   VITE_FIREBASE_APP_ID="your-app-id"
   ```

### 4. Run the Development Server

```bash
npm run dev
```

For Windows PowerShell users:
```powershell
npm.cmd run dev -- --host 127.0.0.1
```

Open the printed URL (typically `http://localhost:5173` or `http://127.0.0.1:5173`) in your browser.

### 5. Build for Production

```bash
npm run build
```

This compiles TypeScript (`tsc -b`) and generates an optimized production bundle in the `dist/` directory.

### 6. Preview Production Build Locally

```bash
npm run preview
```

---

## 🧪 Testing & Code Quality

ReliefOps maintains a rigorous test suite using **Vitest** covering algorithm correctness, exact rational math, Web Worker protocols, UI accessibility, and Firestore security rules:

```bash
# Run all unit and integration tests
npm test

# Run ESLint for code style and syntax checks
npm run lint
```

## 🎓 Educational Value

ReliefOps was developed as an applied educational platform for **Design and Analysis of Algorithms (DAA)**. It provides a visual bridge between theoretical concepts and practical software engineering:

- **0/1 Knapsack Problem** formulation and constraints.
- **Branch and Bound** state-space tree traversal.
- **Linear Programming Relaxation** for admissible upper bounding.
- **Pruning Mechanics** (bounding vs feasibility).
- **Incumbent Tracking** and optimality proofs.
- **Greedy Approximation Failures** on discrete, indivisible items.
- **Exponential Complexity** ($\mathcal{O}(2^n)$) and resource budgeting.

---

## 👨‍💻 Team

Developed with ❤️ by the engineering team from **Pimpri Chinchwad College of Engineering (PCCOE), Pune**:

| Team Member | Academic Details | GitHub |
|---|---|---|
| **Ashutosh More** | B.Tech — Information Technology, PCCOE Pune | [@Ashutoshmore24](https://github.com/Ashutoshmore24) |
| **Aniket Gawande** | B.Tech — Information Technology, PCCOE Pune | [@aniket-gawande](https://github.com/aniket-gawande) |
| **Ayush Chandwadkar** | B.Tech — Information Technology, PCCOE Pune | [@AyushChandwadkar](https://github.com/AyushChandwadkar) |

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for complete details.

---

<div align="center">

### 🛡️ ReliefOps
**Limited Capacity. Maximum Impact.**

*Thank you for exploring ReliefOps!*

</div>
