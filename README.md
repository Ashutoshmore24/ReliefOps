# 🛡️ ReliefOps — Smart Disaster Relief Kit Optimizer

### Limited Capacity. Maximum Impact.

**ReliefOps** is an interactive, web-based educational platform that demonstrates how the **Branch and Bound algorithm** solves the 0/1 Knapsack Problem to assemble high-impact disaster relief kits under limited carrying capacity.

Instead of treating algorithm analysis as static theory, ReliefOps turns optimization into an interactive experience. Users can build disaster-response scenarios, visualize supplies being packed into a virtual emergency kit, explore branching and pruning decisions, compare greedy and optimal solutions, and learn the algorithm through a guided learning journey.

Built with React, TypeScript, and modern frontend technologies, ReliefOps combines algorithmic correctness with visual simulation and beginner-friendly explanations.

- Live Demo : https://relief-ops-six.vercel.app/

---

## ✨ Key Features

- **🎒 Live Relief Kit Simulation** — Watch supplies get packed into a virtual emergency kit with live weight, capacity, and priority updates.
- **🌳 Branch and Bound Explorer** — Visualize the search tree, branching decisions, upper bounds, and pruning.
- **⚖️ Greedy vs. Optimal Comparison** — Compare selected supplies, total weight, and priority scores to understand why greedy selection can fail.
- **🧭 Interactive Learning Journey** — Learn Branch and Bound through nine beginner-friendly lessons connected to the algorithm explorer.
- **🎤 Presentation Mode** — Demonstrate the algorithm using guided topics, execution traces, and playback controls.
- **🎨 Light and Dark Themes** — Switch between elegant light and dark modes with saved preferences.
- **🧰 Mission Editor** — Create and customize scenarios by adding supplies and adjusting their weights, priority values, and carrying capacity.

---

## 🧠 The Algorithm Behind ReliefOps

ReliefOps uses the **Branch and Bound algorithm** to solve the **0/1 Knapsack Problem**.

The goal is to select supplies with the highest total priority without exceeding the available carrying capacity. Each supply must either be selected entirely or excluded.

### Mathematical Formulation

Let:

- `n` = number of available supplies
- `wᵢ` = weight of supply `i`
- `vᵢ` = priority value of supply `i`
- `C` = maximum carrying capacity
- `xᵢ ∈ {0, 1}` = 1 if supply `i` is selected, otherwise 0

**Objective — Maximize total priority:**

```text
Maximize: Σ (vᵢ × xᵢ), for i = 1 to n
```

**Constraint — Total weight must not exceed capacity:**

```text
Σ (wᵢ × xᵢ) ≤ C, for i = 1 to n
```

Each supply must either be selected entirely or excluded.

### How Branch and Bound Works

1. **Branching:** Explore two choices for each supply: include or exclude.
2. **Bounding:** Estimate the maximum priority a branch could achieve using a fractional-knapsack upper bound.
3. **Incumbent:** Track the best feasible kit found so far.
4. **Pruning:** Discard branches that exceed capacity or cannot improve the best solution.
5. **Optimality:** When the search completes successfully, the best feasible solution is proven optimal.

ReliefOps visualizes these steps through its interactive search tree and recorded execution trace.

### Time Complexity

Branch and Bound can reduce unnecessary exploration through pruning, but its worst-case time complexity remains exponential.

```text
Worst-case time complexity: O(2ⁿ)
```

Actual performance depends on the number of supplies and how effectively the algorithm prunes branches.
---

## 🏗️ Technology Stack

<table>
  <tr>
    <td valign="middle"><img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" /></td>
    <td valign="middle">Component-based user interface</td>
  </tr>
  <tr>
    <td valign="middle"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></td>
    <td valign="middle">Type-safe application logic</td>
  </tr>
  <tr>
    <td valign="middle"><img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" /></td>
    <td valign="middle">Development server and production builds</td>
  </tr>
  <tr>
    <td valign="middle"><img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /></td>
    <td valign="middle">Utility-first styling</td>
  </tr>
  <tr>
    <td valign="middle"><img src="https://img.shields.io/badge/Lucide_React-F56565?style=for-the-badge&logo=lucide&logoColor=white" alt="Lucide React" /></td>
    <td valign="middle">Icons and visual indicators</td>
  </tr>
  <tr>
    <td valign="middle"><img src="https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" alt="Vitest" /></td>
    <td valign="middle">Unit and component testing</td>
  </tr>
  <tr>
    <td valign="middle"><img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" /></td>
    <td valign="middle">Custom styling and themes</td>
  </tr>
  <tr>
    <td valign="middle"><img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" /></td>
    <td valign="middle">Frontend deployment</td>
  </tr>
</table>


The application performs optimization and visualization in the browser. The current implementation does not require a dedicated application backend or external AI API.

---

## 🏛️ Architecture Overview

The application separates optimization, mission management, visualization, and educational presentation.
```
ReliefOps.git/
├── .gitignore
├── README.md
├── eslint.config.js
├── index.html
├── package-lock.json
├── package.json
├── src/
│   ├── App.tsx
│   ├── algorithm/
│   │   ├── solver.test.ts
│   │   └── solver.ts
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
│   │   └── simulation/
│   │       ├── EmergencyKitVisual.tsx
│   │       ├── LiveKitSimulation.tsx
│   │       ├── simulation.test.tsx
│   │       └── simulationModel.ts
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
│   └── worker/
│       ├── controller.ts
│       ├── optimizer.worker.ts
│       ├── protocol.ts
│       └── worker.test.ts
├── tsconfig.json
└── vite.config.ts
```

### Engineering principles

- **Single source of truth:** visualizations consume the actual solver execution and results.
- **Deterministic optimization:** consistent inputs and search policies produce reproducible results.
- **Stale-state protection:** mission edits invalidate previous executions and stop dependent playback.
- **Honest result reporting:** incomplete searches are not labelled as proven optimal.
- **Responsive interaction:** the interface adapts to desktop, tablet, and mobile screens.
- **Accessible motion:** reduced-motion preferences are respected.

---

## 🚀 Getting Started

### Prerequisites

Install the following:

- [Node.js](https://nodejs.org/) — use a version compatible with the project's dependencies.
- npm, included with Node.js.
- Git, if cloning the repository.

### 1. Clone the repository

```bash
git clone https://github.com/Ashutoshmore24/ReliefOps.git
cd ReliefOps
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

**Windows PowerShell:**

```powershell
npm.cmd run dev -- --host 127.0.0.1
```

Alternatively, use the standard command:

```bash
npm run dev
```

Open the local URL printed by Vite in your browser.

### 4. Build for production

```bash
npm run build
```

### 5. Preview the production build

```bash
npm run preview
```

---

## 🧪 Testing and Code Quality

ReliefOps includes tests for algorithm correctness, mission validation, execution traces, playback, accessibility, results, learning interactions, presentation mode, and the packing simulation.

Run the test suite:

```bash
npm test
```

Run lint:

```bash
npm run lint
```

Build the production application:

```bash
npm run build
```

## 🎮 Try the Flood Relief Demonstration

The prepared Flood Relief scenario provides a concrete example of why optimization matters.

According to the project's documented demonstration:

| Metric | Demonstration |
|---|---:|
| Carrying capacity | 15 kg |
| Greedy priority score | 50 |
| Proven optimal priority score | 60 |
| Improvement | 10 priority points |
| Relative improvement over greedy | 20% |

The scores illustrate that a ratio-based greedy strategy can miss a better combination of indivisible items.

### Suggested demonstration workflow

1. Load the Flood Relief demonstration.
2. Review the available supplies and carrying capacity.
3. Run the optimizer.
4. Compare the greedy and optimal solutions.
5. Launch the live relief-kit packing simulation.
6. Watch the selected supplies enter the virtual payload bay.
7. Open the algorithm explorer to inspect branching, bounds, and pruning.
8. Explore the nine-lesson learning journey.
9. Enter presentation mode for a guided demonstration.

The application should label a solution as optimal only when the search has completed and established optimality.

---

## 🔮 Future Enhancements

Potential future improvements include:

- Exportable mission reports and optimization summaries.
- Additional disaster-response scenarios.
- More detailed search-efficiency analytics.
- Guided algorithm challenges and knowledge checks.
- Optional comparison of multiple search strategies.
- Shareable mission configurations.
- Enhanced presentation controls and downloadable demonstrations.

These are possible future directions, not claims about currently implemented functionality.

---

## 🎓 Educational Value

ReliefOps demonstrates concepts from Design and Analysis of Algorithms through an applied optimization problem.

It connects:

- 0/1 Knapsack formulation.
- Branch and Bound.
- Fractional upper-bound calculations.
- Feasibility checking and pruning.
- Incumbent tracking.
- Greedy heuristics.
- Optimality proofs.
- Exponential worst-case complexity.

By combining actual algorithm execution with visual feedback, the project helps learners understand not only what solution is produced, but also how and why the algorithm reaches it.

---

## 👨‍💻 Team

| Team Member | Details | GitHub |
|---|---|---|
| **Ashutosh More** | B.Tech — IT PCCOE Pune | [@Ashutoshmore24](https://github.com/Ashutoshmore24) |
| **Aniket Gawande** |  B.Tech — IT PCCOE Pune | [@aniket-gawande](https://github.com/aniket-gawande) |
| **Ayush Chandwadkar** | B.Tech — IT PCCOE Pune | [@AyushChandwadkar](https://github.com/AyushChandwadkar) |
---

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

---

<p align="center">
  <strong>ReliefOps</strong><br/>
  Limited Capacity. Maximum Impact.
</p>
<p align="center">
  <strong>Thank You ❤️</strong>
</p>
# 3D Decision Lab

After optimizing a mission, open **3D Decision Lab** in the algorithm explorer.
The existing playback bar controls both the warehouse and search tree. Selecting
a revealed tree node previews its kit without changing historical incumbent data.
Created branches are hypothetical previews; only actual incumbent events update
the best-so-far truck. Best-first jumps reconcile the selected supply sets.

Switch to 2D for a canvas-free historical warehouse. Supply buttons offer keyboard
selection and item details. Orbit controls are optional, with a reset camera and
decision spotlight. A final illustrative dispatch is available only at a completed,
proven optimal event. The results dashboard retains the separate final packing and
greedy comparison views.

All scene geometry is procedural; no models, fonts, or other assets are downloaded.
Three.js/Fiber/Drei load only when the 3D lab is opened. Rendering uses a demand
loop, capped pixel ratio, one shadow light, and at most twelve trial/staging crates
and eight best-kit crates. Additional supplies remain in the HTML inventory and
kit descriptions. Cargo lifts, transfers, and settles using the shared playback
speed; manual steps also animate. Pausing freezes movement, large timeline seeks
restore the selected configuration immediately, and reduced motion skips
interpolation. Retargeting always starts at the current position and never queues
obsolete moves. Truck dispatch rotates its wheels according to distance traveled.
Detailed procedural vehicles, supply containers, warehouse shelving, and tents
use a responsive camera and numbered labels with an HTML identity strip. The
warehouse transport operates the existing shared clock. Context loss and render errors fall back
to the historical 2D warehouse.

The scene model and tests live in `src/features/simulation3d`. The solver and worker
protocol are unchanged. Crate dimensions are illustrative: the model optimizes
configured priority subject to weight capacity, not geometric packing or routes.
# Firebase authentication

Email/password sign-in, account creation, email verification, password reset,
Google sign-in, Google account linking, and sign-out use Firebase Authentication.
Password accounts must verify their email before accessing saved missions.
Firebase resolves the restored session before access is granted. The default
session lasts for the browser session; “Keep me signed in” enables persistent
Firebase-managed sign-in. Passwords are never stored by application code.

Setup:

1. Create a Firebase project and register a Web app in Project settings.
2. Copy `.env.example` to `.env.local`. Set `VITE_FIREBASE_API_KEY`,
   `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and
   `VITE_FIREBASE_APP_ID` from the Web app configuration. These are public client
   configuration values. Never add an Admin service-account key to a Vite variable.
3. In Authentication > Sign-in method, enable Email/Password and Google.
   Google setup requires selecting a project support email.
4. In Authentication > Settings > Authorized domains, add the domains you use:
   `localhost`, `127.0.0.1` if used, and your production hostname. New Firebase
   projects may not include localhost automatically. Use hostnames, not full URLs.
5. Configure a password policy (at least 8 characters; a stronger project policy
   is supported through Firebase's `validatePassword`) and enable email enumeration
   protection. Check verification/password-reset email templates and sender settings.
6. Restart Vite after changing `.env.local`. Add the same values to your hosting
   build environment when you separately choose to deploy.

Optimization, results, lessons, presentation mode and the 3D Decision Lab remain
public. **My missions** is the only protected area. A verified account can save
the current mission, load a saved mission into the editor, and delete one after
confirmation. Saving creates a new snapshot; it does not silently overwrite an
earlier mission. The library shows up to 100 recent records. Changing accounts
clears the private library and removes its listener. Public demo playback remains
usable. Loading a saved mission uses the editor's existing invalidation and undo.
An unconfigured project does not create a fake session or grant library access.

In the Firebase Console, create the default Cloud Firestore database in production
mode and publish **firestore.rules** in the Rules tab before using the library.
Alternatively, after authenticating the Firebase CLI, run
`firebase deploy --only firestore:rules --project reliefops-272c2` when you choose
to deploy rules. No rules or application deployment is performed automatically.
Documents are stored under `users/{uid}/missions/{missionId}`. Rules enforce
verified authentication and ownership on reads, creates, updates, and deletes;
other paths are denied. Server timestamps are required and creation time cannot
be overwritten. Mission inputs are validated on save and again on load. Invalid
stored supply entries are never passed to the optimizer.

Authorization is enforced by Firestore rules, beyond the UI gate. No Admin SDK
credentials belong in the client. A future private API must verify Firebase ID
tokens server-side. Administrative roles, if added later, must be assigned through
trusted Admin SDK custom claims, never a client-selected role.

Tests cover denied/loading/unverified access, password validation, Firebase
gateway calls, reset-error normalization, session refresh races, provider linking,
and observer cleanup. Live provider sign-in requires your configured Firebase
project and has not been validated without it. Firebase docs:
https://firebase.google.com/docs/auth/web/password-auth
https://firebase.google.com/docs/auth/web/google-signin
https://firebase.google.com/docs/auth/admin/custom-claims
