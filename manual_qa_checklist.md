# WordAhead Reading Experiment - Manual QA Checklist

This checklist contains the visual-judgment, typographic, and subjective quality assurance items that cannot be completely verified through automated tests (Pytest/Playwright).

---

## 1. Hebrew Localization & Right-to-Left (RTL) Layout
- [ ] **Natural Text Flow**: Verify that the Hebrew UI translations read naturally and avoid direct machine-translation phrasing.
- [ ] **RTL Container Alignment**:
  - The `.app-container` must have `dir="rtl"`.
  - Sidebars, headers, and buttons should be aligned to the right by default.
  - Text inputs and dropdown forms (e.g. on demographics and survey screens) must align their labels and inputs from right-to-left.
- [ ] **English Text Elements**: The reading passage container and quiz questions must carry `dir="ltr"` so that English grammar and layout display correctly.
- [ ] **No Overlaps**: Check that Hebrew text does not overlap with icons, buttons, or border edges on smaller viewports.

---

## 2. GP-TSM Text Rendering (Gray-level & Highlights)
- [ ] **Gray-level Contrast**: 
  - Ensure that words are grayed out according to their CEFR levels and grammatical importance in the `+WA` conditions.
  - Check that the grayed-out words are still readable but clearly secondary in contrast to the full-weight text.
- [ ] **Highlight Distinctiveness**: Hover translations must make the corresponding word's highlights pop with proper visual cue changes.
- [ ] **Font Aesthetics**: The English text must use a clean system font (like Inter) with appropriate line-height (`1.6` - `1.8`) to facilitate reading.

---

## 3. Translation Panel & Interactivity
- [ ] **Hover/Click Activation**:
  - Hovering on a highlighted word should reveal the translation panel smoothly.
  - Clicking on a word should keep the translation visible in the panel or show a sticky translation.
- [ ] **No Layout Shifting**: The translation panel must be a fixed overlay or float in a way that does not push the reading text or resize the viewport.
- [ ] **Premium Aesthetics**:
  - Visual styling must use smooth border-radius, modern glassmorphism (backdrop-filter), and subtle drop shadows.
  - The panel must not obscure the reading progress controls.

---

## 4. Attention Checks & UI Responsiveness
- [ ] **Attention Check Placement**: Verify that the attention check questions look like regular questions to not reveal their screening nature, but their phrasing is clear.
- [ ] **Gating Responsiveness**:
  - Demographics "Complete Experiment" button should visually enable/disable instantly when form validation rules are met.
  - Per-task survey and post-study survey submit buttons must disable until all questions are answered, showing a disabled pointer/color state.
- [ ] **Micro-animations**: Hovering over submit/action buttons must trigger a subtle scale or color transition.
