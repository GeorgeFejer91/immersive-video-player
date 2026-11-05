# Project contract

## Purpose

A GitHub Pages immersive MP4 viewer synchronized with a smartphone remote over BRSP and VDO.Ninja WebRTC.

## Primary goal

Deliver the smallest usable result that satisfies the current user request and
can be verified at its real output surface.

## Goal and session continuity

Overall goal: the purpose above. Product acceptance criteria are **Undecided**
until the first product task defines observable outcomes.

Resume existing GSD `.planning/` state or the established project checklist.
Until an execution workflow owns the state, use this small active checklist:

- [ ] Define the first product outcome and its acceptance evidence.
- [ ] Implement the agreed outcome and retain its verification result.

Replace these bootstrap tasks with the agreed product tasks. Before a session
ends, record the next concrete action, blockers, evidence, and last-observed
branch/commit/publication state in the canonical task owner. Keep one active
checklist and do not close the overall goal before its acceptance criteria pass.

## Non-goals

- No speculative framework, service, abstraction, compatibility layer, or
  deployment system.
- No second implementation tree or duplicate source of truth.
- No capability claim without matching evidence.

Add project-specific non-goals only after they prevent a plausible wrong turn.

## Product/control-plane boundary

- Product source and deliverables: outside `for-ai/`; exact roots are
  **Undecided until the first deliverable selects them**.
- Agent orchestration and durable project memory: `for-ai/`.
- Local generated diagnostics and scratch evidence: `.for-ai-local/` (ignored).

## Architecture and ownership

The implementation stack, modules, external contracts, and deployment surface
are currently **Undecided**. Once selected, record only the top-level ownership
map here and route detailed protocols to task-specific files.

## Current verified state

- Fresh Git repository initialized on 2026-11-05.
- AI control plane created and mechanically checked.
- No product implementation has been scaffolded.

Git and runnable checks are the authority for branch, revision, and behavior.
Do not turn this section into a second status ledger.
