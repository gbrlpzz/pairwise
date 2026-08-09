# Pairwise

A private, browser-based decision tool for Analytic Hierarchy Process (AHP) and pairwise comparison. Pairwise turns a complex choice into a guided sequence: define criteria, compare them two at a time, inspect the resulting weights, and evaluate candidate options.

Live at [compare.gbrlpzz.com](https://compare.gbrlpzz.com/).

## Product principles

- **Local by default.** Calculations and saved progress remain in the browser.
- **No account or tracking.** The app has no backend, analytics script, or user identity.
- **Progressive decisions.** Each screen asks for one kind of input and makes the next action explicit.
- **System before style.** Controls follow familiar platform conventions before adding visual character.
- **Accessible at every size.** The same workflow works with touch, mouse, keyboard, zoom, and assistive technology.

## The workflow

1. **Setup** — enter one criterion per line (commas also work) or import a previously exported matrix. Pairwise rejects duplicate names and previews the exact number of comparisons before starting.
2. **Compare** — tap either criterion or choose one of five clearly labelled preference levels.
3. **Results** — inspect criterion weights in a ranked summary or detailed matrix and export the data.
4. **Evaluate** — move through one candidate option at a time, select a 1–5 level for each criterion, and calculate the final ranking from the guided flow.

The app saves in-progress work to `localStorage`. Starting over removes decision data while preserving the selected appearance.

## Interface system

The 2026 interface overhaul rebuilt the presentation layer around platform-native expectations, using Apple Human Interface Guidelines and accessibility guidance as the baseline rather than as decorative inspiration.

### Foundations

- system font stack with Dynamic-Type-like responsive sizing
- 17 px default body text and at least 44 px interactive targets
- semantic buttons for navigation, tabs, appearance, and actions
- familiar grouped controls, filled primary actions, and restrained secondary actions
- optically normalized 44 px header controls with explicit 18 px icon boxes
- content hierarchy based on title, explanation, control group, and next action
- a single vertical workspace that remains legible at high zoom

### Responsive behavior

- four-stage progress navigation uses full labels on desktop and numbered compact controls on narrow screens
- pairwise criteria remain side by side where space permits and stack into a clear A/or/B sequence on mobile
- comparison and evaluation share one compact five-level picker built from native buttons, avoiding browser-specific range rendering
- action rows become full-width, thumb-reachable controls on small screens
- result tables use bounded horizontal scrolling instead of shrinking controls or text
- evaluation uses one responsive option page at a time and folds stable page and completion text into the fourth workflow step rather than adding another progress panel or moving fill
- destructive option controls follow the same 44 px circular icon-button treatment as the rest of the interface
- the detailed criteria matrix is desktop-only; mobile keeps the ranked summary and CSV export

### Accessibility

- visible `:focus-visible` rings with system-blue semantics
- correctly labelled progress, radio groups, tabs, step navigation, file input, and theme control
- inline error status and focus recovery for invalid or incomplete tasks
- live criteria validation, duplicate detection, workload preview, and `Ctrl/⌘ + Enter` submission
- persistent labels and instructions; meaning never depends on placeholder text alone
- selected, invalid, completed, and current states are exposed semantically as well as visually
- `prefers-reduced-motion` removes non-essential animation and smooth scrolling
- `prefers-contrast: more` strengthens separators, labels, and surface boundaries
- light and dark appearances use semantic color tokens and respect the initial system preference
- tables retain explicit row/column structure and keyboard-accessible inputs
- print mode removes controls and preserves readable results

### Visual character

Pairwise keeps its original lime accent and grid mark. They now sit on top of standard control behavior, neutral system surfaces, restrained depth, and consistent corner geometry. Animation is limited to short state transitions and subtle press feedback; no content depends on motion.

## Decision model

For criteria \(i\) and \(j\), each comparison creates reciprocal matrix entries:

- much more important: `5` and `1/5`
- more important: `3` and `1/3`
- equal: `1` and `1`

The diagonal remains `1`. Criterion weights are derived from normalized row totals. Candidate scores are the sum of each 1–5 rating multiplied by its criterion weight.

This implementation is intended as a practical decision aid. For research or high-stakes applications, validate the chosen AHP method and consistency requirements independently.

## Data and exports

- comparison progress is stored under `pairwiseData` in browser `localStorage`
- imported matrices are parsed locally from CSV
- comparison matrices and final rankings are generated as local CSV downloads
- no decision content is sent over the network

## Development

Pairwise is intentionally dependency-free: plain HTML, CSS, and JavaScript with no build step.

```bash
git clone https://github.com/gbrlpzz/pairwise.git
cd pairwise
python3 -m http.server 4173
```

Open `http://localhost:4173`. Serving over HTTP is preferable to opening `index.html` directly because it matches production browser behavior.

### Verification

Before publishing changes:

```bash
node --check script.js
git diff --check
```

Then exercise the following at desktop and mobile widths:

1. create a comparison from the example
2. complete all pairwise choices with keyboard and pointer input
3. switch result tabs and export the matrix
4. add, rename, and remove evaluation options
5. complete ratings and export final rankings
6. verify light/dark appearance, reduced motion, 200% zoom, and horizontal table scrolling

## License

MIT. See [LICENSE](LICENSE).
