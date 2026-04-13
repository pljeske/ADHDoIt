---
paths: ["**"]
---

# Code Review Graph — MCP Tool Rules

The knowledge graph auto-updates on file changes via hooks. It is the fastest and most token-efficient way to explore this codebase.

## Mandatory: Use graph tools BEFORE Grep/Glob/Read

| Task | Tool to use |
|------|-------------|
| Find a function or class | `semantic_search_nodes` |
| Trace callers / callees | `query_graph` with `callers_of` or `callees_of` |
| Find what a file imports | `query_graph` with `imports_of` |
| Find tests for a symbol | `query_graph` with `tests_for` |
| Review a code change | `detect_changes` + `get_review_context` |
| Assess impact of a change | `get_impact_radius` |
| Find affected execution paths | `get_affected_flows` |
| Understand architecture | `get_architecture_overview` + `list_communities` |
| Plan a rename or find dead code | `refactor_tool` |

## When to fall back to Grep/Glob/Read

- The symbol was created in the current session and the graph hasn't updated yet.
- You need to read a full file for context (e.g., migration files, config files).
- The graph query returns no results and you suspect the node hasn't been indexed.

## Code Review Workflow

1. `detect_changes` — get risk-scored diff summary.
2. `get_review_context` — fetch relevant source snippets (token-efficient).
3. `get_impact_radius` — identify what else could break.
4. `get_affected_flows` — find execution paths that pass through the changed code.
5. `query_graph` pattern=`tests_for` — confirm test coverage exists.
