## What changed

<!-- One or two sentences. If this came from a code generator, paste its summary table here. -->

## Spec

- [ ] Change follows SPEC.md § ___ (write the section, or "no spec change")
- [ ] If behaviour changed, SPEC.md was updated in this PR / commit first

## Acceptance checks

<!-- Copy the acceptance list from the task/prompt and mark what you actually ran. -->

- [ ] Checked on the live GitHub Pages site (phone or desktop)
- [ ] Streak / cycle behaviour verified by hand where relevant (SPEC §3, §6)

## Safety

- [ ] No real API key in this change — `index.html` still contains only the `__FIREBASE_API_KEY__` placeholder
- [ ] No secrets added to Firestore / `global_config`
- [ ] No features removed to make the change easier

## Notes for reviewer

<!-- Anything the generator flagged as a judgement call goes here. "None" is a valid answer. -->

---
*Owner/admin note: direct pushes to `main` are allowed for the repo owner (SPEC §12). This template is for when a change is big enough to want a PR trail — it is not a gate.*
