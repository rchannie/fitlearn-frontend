Design a complete UI/UX for a web application called "FitWork" — an AI-powered productivity and mental health monitoring platform for remote workers.

---

BRAND IDENTITY
App name: FitWork
Tagline: "Work Smart. Stay Well."
Personality: Trustworthy, modern, calm, and empowering — like a personal health coach meets a productivity tool.
Logo concept: Eye icon merged with a heartbeat line, suggesting both vision tracking and health monitoring.

---

COLOR SYSTEM
Primary: Deep teal (#0F6E56) — conveys health, trust, calmness
Accent: Vivid cyan-green (#1D9E75) — for CTAs and highlights
Warning: Warm amber (#BA7517) — for break warnings and alerts
Danger: Soft red (#E24B4A) — for critical stress indicators
Background: Off-white (#F8FAF9) light mode, deep charcoal (#1A1F1E) dark mode
Support both light and dark mode across all screens.

---

TYPOGRAPHY
Font pairing: "Inter" for UI text (body, labels, buttons) + "Sora" or "DM Sans" for headings
Heading scale: H1 32px, H2 24px, H3 18px — weight 600
Body text: 14-16px, weight 400, line-height 1.6
Data labels: 13px monospaced for metrics and numbers

---

SCREENS TO DESIGN (7 screens total):

[1] ONBOARDING / LOGIN SCREEN
- Split layout: left side = animated illustration of a person working at a desk with subtle AI visual overlays (eye tracking rings, gesture trails, health waves)
- Right side = clean login form with email + password, Google SSO button
- Tagline: "Your intelligent work companion" below the logo
- Bottom: Privacy badge "Your data is private & encrypted"

[2] MAIN DASHBOARD
- Top navigation bar: FitWork logo left, notification bell + user avatar right
- Greeting header: "Good morning, [Name] — Your focus score today: 87/100" with a circular progress ring
- 4 metric cards in a row: Today's Focus Score, Stress Level, Active Work Hours, Break Compliance
- Center: Line chart showing "Productivity vs Stress Index" over the last 8 hours — dual-line, teal for productivity, amber for stress
- Right sidebar: "AI Insights" panel with 3 smart recommendations in card format
- Bottom: "Live Session" strip showing current eye tracking and gesture status (green dot = active)

[3] HEALTH MONITORING ANALYSIS SCREEN
- Header: "Health Monitoring — Real-time Analysis"
- Left panel: Camera feed placeholder with overlaid facial landmark dots (show eye, nose, mouth points as a subtle mesh), PERCLOS indicator bar at bottom of feed
- Center: 3 live metric widgets — Heart Rate (bpm via rPPG), Pupil Dilation Index, Fatigue Score — displayed as animated gauge rings
- Right panel: "Timeline" — a vertical scrollable log of health events over the session (e.g., "2:30 PM — Stress spike detected", "2:15 PM — Eye strain warning")
- Color-coded status bar at top: Green (Normal) / Amber (Caution) / Red (Alert)

[4] BREAK WARNING ALERT — MODAL OVERLAY
- Design as a full-screen soft overlay (semi-transparent dark backdrop) with a centered modal card
- Modal card: Large amber clock icon at top, bold heading "Time for a Break", subtext "You've been working for 52 minutes. A short break improves your focus by up to 30%."
- Three recommended micro-break options as horizontal cards: "2-min Eye Rest", "5-min Stretch", "10-min Walk" — each with an icon and brief instruction
- Two buttons: "Start Break Now" (primary teal) and "Remind Me in 5 min" (ghost)
- Progress ring around a 5-minute countdown timer in the corner

[5] HEALTH RECOMMENDATION SCREEN
- Full-screen layout with a personalized feed design
- Top: Summary card "Today's Health Score: 74/100 — Moderate Risk" with a horizontal colored bar
- Below: Category tabs — Mental, Physical, Nutrition, Sleep
- Each tab shows 3-4 recommendation cards with: icon, title, short description, and estimated impact badge (e.g., "+12% focus")
- Bottom CTA: "Share with HR" and "Export as PDF" buttons
- Right: Radar/spider chart showing scores across 5 dimensions: Focus, Stress, Fatigue, Posture, Cognitive Load

[6] EYE TRACKING & GESTURE CONTROL PANEL
- Header: "Smart Control Center — Non-invasive Navigation"
- Left: Camera view with live eye gaze point visualized as a glowing dot on screen
- Center: Gesture guide — illustrated hand gesture reference cards (4 gestures: Cursor Move, Click, Scroll, Zoom) in a 2x2 grid with animation cues
- Right: Calibration status panel — accuracy meter showing 92% with a green checkmark, recalibrate button below
- Bottom: Toggle switches for "Eye Tracking", "Gesture Recognition", "Auto-sensitivity"

[7] SETTINGS & PROFILE SCREEN
- Top: Profile card with avatar, name, job title, company
- Sections: Account, Notifications, Privacy & Data, Integrations, Help
- Privacy section prominently shows data controls: "Camera access", "Health data sharing", "HR visibility toggle" — all with clear on/off toggles
- Integration cards: Connect with Slack, Google Calendar, Microsoft Teams — each as a branded mini-card

---

UX PRINCIPLES TO APPLY
- Progressive disclosure: show only what's needed at each moment, reveal detail on interaction
- Non-intrusive monitoring: visualize AI activity as subtle ambient indicators, never overwhelming
- Accessibility: minimum 4.5:1 contrast ratio, focus states on all interactive elements, keyboard-navigable
- Empty states: design a friendly empty state for each screen (e.g., "Start your first session to see data")
- Micro-interactions: loading skeletons for metric cards, pulse animation on live indicators, smooth modal transitions
- Mobile-responsive: design desktop (1440px) as primary, include a mobile (390px) variant for the Dashboard and Break Warning screens

---

COMPONENT LIBRARY TO GENERATE
- Navigation bar (desktop + mobile)
- Metric card (4 variants: normal, warning, alert, inactive)
- Gauge ring widget (animated, 3 sizes)
- Timeline event item (3 types: info, warning, critical)
- Recommendation card (with icon, tag, impact badge)
- Break warning modal
- Toggle switch (on/off/disabled)
- Primary button, ghost button, icon button
- Gesture reference card
- User avatar with status dot

---

OVERALL DESIGN DIRECTION
Clean, modern, clinical-yet-warm aesthetic. Think: the clarity of Linear + the health trust of Fitbit + the intelligence feel of Notion AI. No cluttered dashboards. Every screen should feel like it was designed with intentional whitespace. Use subtle card elevations, thin dividers, and consistent 8px spacing grid.
