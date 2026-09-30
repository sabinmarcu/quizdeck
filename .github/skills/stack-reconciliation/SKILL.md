---
name: stack-reconciliation
description: "Inspect repository changes for AI stack applicability, choose apply or repair from reconcile diagnostics, obtain approval, and reconcile managed AI assets through the ai CLI."
user-invocable: true
disable-model-invocation: false
---
<!-- Managed by @sabinmarcu/ai from baseline/stack-reconciliation@1. Do not edit directly. -->

# Stack Reconciliation

Use this skill after repository or workspace changes may have altered applicable
AI modules.

## Procedure

1. Run `ai reconcile` to inspect fresh repository and workspace detection,
   selected modules, effective dependencies, active mixins, managed drift, and
   local override effects.
2. Classify the preview before proposing an action:
   - Use `ai reconcile --repair` when the preview reports an unknown module or
     a `drifted`, `stale-drifted`, or `untracked` managed-file error.
   - Use `ai reconcile --apply` for a clean plan, including ordinary selection,
     dependency, mixin, `missing`, `outdated`, or `stale` changes.
3. Summarize the proposed selection changes, automatic dependency and mixin
   consequences, managed-file changes, drift, and local override effects.
   State the exact command selected and motivate it: apply safely realizes a
   clean plan, while repair is required to remove unknown selections and may
   overwrite or remove protected managed-file changes. Name the affected paths
   and consequences when proposing repair.
4. Prompt the user to confirm the selected action. Do not mutate the stack or
   managed files without explicit approval.
5. After approval, run the exact command proposed in step 3. Do not edit
   `.ai/stack.yml`, managed files, or `.ai/AGENTS.md` directly. If the preview
   changes before execution, stop and repeat the classification and approval
   flow instead of switching actions silently.
6. Treat the command's post-mutation report as the authoritative final state;
   do not repeat consumed preview diagnostics as current issues. Run `ai status`
   and report the resulting validation state. Leave failed or declined changes
   unapplied.