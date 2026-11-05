# Agent workflow, context maintenance, and Git policy

## Working loop

1. Read `AGENTS.md`, then the router, durable project goal, and active checklist.
   Resume GSD state when present; keep one task-state owner.
2. Inspect Git status, branch, remotes, existing worktrees, and task-owned code.
   Follow the shared skill baseline in `SKILLS.md`.
3. Preserve user work and distinguish pre-existing failures from regressions.
4. Apply YAGNI: check the existing owner before adding anything.
5. Implement one bounded outcome and verify it proportionately.
6. Review the diff for accidental scope, secrets, generated output, and stale
   context.
7. Update the active checklist with evidence, blockers, and the next concrete
   action. Record observed branch/commit/publication state for the next session.
   Publish only when the rules below apply.

## Control-plane update triggers

Update the narrowest canonical file in the same change when any durable fact
changes:

- project goal, non-goal, user workflow, or supported surface;
- module ownership, architecture boundary, external contract, or schema;
- required skill route or verified fallback;
- acceptance criterion, validation command, evidence limit, or release gate;
- security, privacy, safety, licensing, or publication boundary;
- durable decision or repeatedly rediscovered failure mode.

Keep chat transcripts, daily narration, raw logs, private machine paths,
speculative ideas, secrets, and participant data out of durable policy. Keep
short last-observed branch/commit state, blockers, and next action in the active
task handoff owner. Recheck that state at the next session; Git and source
remain authoritative.

## Git checkpoints and publication

Use Git history for versions and rollback. Reuse native Codex worktrees; use
`superpowers-using-git-worktrees` when substantial work needs isolation. Never
create duplicate source folders for versioning. Preserve uncommitted work and
require explicit authorization before destructive resets or worktree removal.

- Inspect status and diff before and after edits.
- Stage explicit paths; never absorb unrelated work to make the tree clean.
- Keep one coherent concern per commit and checkpoint meaningful milestones.
- Push completed, verified work only when requested or covered by continuing
  explicit authorization. Respect the repository's branch/PR policy and keep
  unrelated local changes out of the commit.
- Never force-push, rewrite shared history, bypass branch protection, bypass
  secret scanning, or publish known-broken/private material.
- If credentials, network, CI, conflicts, ownership, or validation block
  publication, report the exact blocker and preserve the ready local state.
- After pushing, verify the remote SHA and applicable CI/deployment. A push by
  itself is not deployment evidence.

## Self-review

Run `for-ai/scripts/check-context.ps1`. Then review control-plane changes for
contradictions, duplication, stale facts, oversized always-read material, and
rules that lack a current consumer. Consolidate or delete rather than append
forever.

## Itemized handoff

- Outcome and affected product surfaces.
- Intended files changed; unrelated work left untouched.
- Verification run, result, and evidence limitations.
- `for-ai/` update: yes/no and why.
- Commit SHA, branch, remote sync, CI/deployment result.
- Remaining blocker or next smallest product decision.
