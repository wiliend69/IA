Pront
# Software Requirements Specification (SRS) & Production Prompt: 3D Interactive Corporate Training Platform

## Role and Context
You are an expert Full-Stack 3D Web Developer, Instructional Designer, and Game Mechanics Architect. Your task is to build a fully functional, highly interactive, production-ready 3D web-based educational and corporate training platform. The platform gamifies enterprise upskilling using a top-down / satellite-style camera tracking system that follows the player character through an evolving corporate academy.

## Tech Stack Constraints & Architecture
- **3D Engine & Physics:** Three.js or Babylon.js (utilizing standard primitive shapes, basic GLTF loading protocols, and Raycasting for click/interactivity and bounding-box collision detection).
- **UI / Layout / Frontend:** HTML5, CSS3, and Bootstrap 5 (loaded via CDN) superimposed over the 3D Canvas wrapper.
- **Logic & State Management:** Vanilla JavaScript (ES6+), structured cleanly using a Modular Component Architecture or State Pattern to handle player attributes, inventory, energy, and progression metrics natively without external database dependencies for this prototype phase.

---

## Localization & Language Constraints (CRITICAL)
- **Development & Prompt Language:** English (All code comments, variable names, system logs, and developer documentation must be in English).
- **In-Game User Interface (UI):** **SPANISH (Español)**. All visible text inside the 3D canvas, HUD overlays, text notifications, onboarding steps, onboarding screens, and main menus must be localized in Spanish (e.g., "Energía", "Perfil", "Clasificación").
- **Academy Content:** 
  - **Technical & Soft Skills Academies:** Instruction, dialogues, tutorials, and challenges must be completely in **Spanish**.
  - **Language Academy (English Wing):** Immersive learning environment. Instruction and system directions are in **Spanish**, but actual test prompts, verbal exercises, and dynamic language challenges must be fully in **English**.

---

## Functional Requirements

### 1. Onboarding & Character Customization (Initial Screen)
- **User Initialization:** Text input field to declare a username (validated to prevent blank entries).
- **Avatar Customization Elements:** 
  - Gender Toggle (Male / Female representation models).
  - 3 Distinct 3D geometric/material-based presets showcasing varying clothing palettes, skin tones, and accessory configurations.
- **Corporate Alignment:** A drop-down selection for the user to pick their corporate department (e.g., Ventas, Desarrollo, Recursos Humanos) which alters the styling of their identification badge inside the UI.

### 2. Central Hub & Corporate Main Area
- **Camera Mechanics:** Satellite / Top-Down orthogonal perspective camera tracking player location with smooth interpolation (lerping).
- **Rest & Idle Zone:** A centralized interactive lounge. Pressing an interaction key ('E' or on-screen button) triggers a seating animation states, rendering a temporary passive UI component labeled "Zona de Descanso".
- **Dynamic Introduction & Onboarding Station:** Located at the core of the hub. An automated NPC chatbot or interactive terminal that explains platform navigation, goals, and daily tasks in Spanish.
- **Corporate Economy (New):** Integration of "Talent Tokens" (Monedas de Talento). Completing challenges or lessons awards tokens, which can be spent at a Hub kiosk to unlock visual character cosmetic overrides.

### 3. Right Wing: Technical Academy (Full-Stack Evolution)
- **Environment:** Interactive developmental laboratory area with an adaptive syllabus terminal.
- **Procedural Knowledge Progression Engine (Evolving Curriculum):** The curriculum unlocks linearly based on prerequisite mastery.
  - **Phase 1 (Front-End Basics):** HTML5 & CSS3 layout architecture challenges (e.g., CSS Flexbox sorting grid).
  - **Phase 2 (Responsive & Frameworks):** Bootstrap framework implementation tests and grid system puzzles.
  - **Phase 3 (Programming Logic):** Core programming fundamentals taught via Python script diagnostics (fixing syntax bugs).
  - **Phase 4 (Advanced Back-End Transition - New):** Introduction to server environments, REST APIs, and database fundamentals (SQL queries) utilizing visual node routing puzzles.
- **Day 1 Evaluation Grid:** 3 micro-coding sandbox simulation challenges in Spanish. Successful completion pushes score state to a local persistent Leaderboard (Tabla de Clasificación Técnica).

### 4. Left Wing: Languages & Soft Skills (Evolving Competencies)
- **Environment:** Two specialized acoustic/ergonomic chambers tailored for language acquisition and emotional intelligence tracking.
- **English Language Learning Evolution (Procedural English):**
  - **Level 1 (A1 Starter):** Vocabulary association and standard corporate greeting matching.
  - **Level 2 (A2 Elementary):** Comprehension tasks based on corporate emails and text-based simulated dialogs.
  - **Level 3 (B1 Intermediate - New):** Technical documentation reading comprehension, product pitching syntax, and handling client objections. Challenges inside this section transition entirely to English text prompts.
- **Emotional Intelligence & Soft Skills (Procedural Soft Skills):**
  - **Level 1 (Self-Awareness & Stress):** Interactive branching text choices dealing with immediate stress factors or workload management.
  - **Level 2 (Conflict Resolution & Leadership - New):** Scenario-based mock management simulations where the player mitigates communication breakdowns between project managers and developers.
- **Assessment Engine:** Features 3 specialized interactive evaluation blocks per layer. Rewards dedicated soft skill points and updates the "Líderes de Comunicación" leaderboard.

### 5. Upper Floor: Entertainment & Resource Rejuvenation Zone
- **Access Vectors:** Vertical transport links (3D stair meshes or an elevator lift pad) adjacent to the central hub area.
- **Gamified Break Mechanics:** 3 independent physics-based minigames designed to simulate standard office stress-relief infrastructure.
- **Interactive Ping Pong Simulation vs. CPU:**
  - Fully playable 2D/3D minigame context.
  - Features real-time paddle movement controls, collision detection vectors, score keeping array, and an adjustable AI difficulty engine.
- **Regulatory Energy & Loop System:**
  - **Resource Constraints:** The user state maintains a static 5-point max Energy Bar ("Barra de Energía").
  - **Drain Allocation:** Launching any entertainment minigame session costs 2.5 points immediately.
  - **Anti-Paywall/Hard Lock Guardrail:** Energy points *cannot* be bought or bypassed using currency. Energy is restored exclusively by completing education tracks, passing quizzes, or mastering nodes in the Tech or Soft Skills wings.

### 6. Corporate Analytics Overlay (New - Enterprise Standard)
- **Dashboard Component:** A toggleable HUD panel labeled "Mi Progreso" displaying statistical graphs detailing:
  - Skill coverage breakdown (Radar chart layout using HTML5 canvas/CSS tracking Front-End, Back-End, Soft Skills, and English proficiency percentages).
  - Daily active streak counters and Energy efficiency metrics.

---

## Acceptance Criteria
1. **Seamless Core Canvas Lifecycle:** The application bootstraps directly into a responsive character creation portal. Confirming choices transitions the state smoothly to the 3D space without visual artifacting or runtime script failures.
2. **Deterministic Camera Navigation:** The top-down camera tracks player transformations cleanly across room boundaries, ensuring collision matrices block movement through structural walls.
3. **True Procedural Locking Logic:** Higher-tier courses (e.g., Back-End nodes or B1 English scenarios) remain strictly locked and visually grayed out until preceding challenge states evaluate to a "Passed" status.
4. **Bi-directional Resource Management:** Minigames accurately deduct 2.5 Energy points per initialization. Academy accomplishments correctly refresh the pool by predefined integers up to the maximum capacity of 5.
5. **Robust UI Superimposition:** The Bootstrap user interface overlay scales accurately across viewport dimensions, presenting clear, legible text exclusively in Spanish (with English exceptions applied strictly inside the specialized Language learning blocks).
