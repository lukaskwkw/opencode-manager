# Fusion agent bundle

Agent prompts vendored from [mihneaptu/opencode-fusion](https://github.com/mihneaptu/opencode-fusion) v1.2.0 (MIT, see `LICENSE.opencode-fusion`). The upstream project is archived and officially targets OpenCode 1.18.x; it does not claim OpenCode 2 support. The prompts load on OpenCode 2, but upstream's mechanical permission guarantees may not hold there.

## Contents

- `agent/*.md` - prompts for the `build`, `plan`, `sidekick`, `research`, `design`, `reviewer`, and `vision` agents. `explore` is an OpenCode built-in agent and has no prompt file.
- `opencode.json` / `opencode.local.json` - role to model assignments (Docker and local variants). The `mcp` block in them is optional; `opencode.json` points at the Docker host gateway.

## Fresh install

Scope the model map from `opencode.local.json`: keep `model`, `small_model`, `experimental.subagent_depth`, and the whole `agent` object; drop the `mcp` block unless you run that MCP server.

Local OpenCode (config base `%USERPROFILE%\.config\opencode`):

1. Copy `agent\*.md` to `%USERPROFILE%\.config\opencode\agent\`.
2. Merge the model map into `%USERPROFILE%\.config\opencode\opencode.jsonc`.
3. Restart OpenCode.

Manager-managed OpenCode (config base `<WORKSPACE_PATH>\.config\opencode`; the Manager sets `XDG_CONFIG_HOME=<WORKSPACE_PATH>\.config`):

1. Copy `agent\*.md` to `<WORKSPACE_PATH>\.config\opencode\agent\`.
2. Merge the model map into `<WORKSPACE_PATH>\.config\opencode\opencode.jsonc`.
3. Restart the Manager (or restart its OpenCode server from the UI) so the config reloads.

PowerShell copy helper for both targets (run from this directory):

```powershell
$targets = @("$env:USERPROFILE\.config\opencode", "$env:OCM_WORKSPACE\.config\opencode")
foreach ($target in $targets) {
  New-Item -ItemType Directory -Force -Path "$target\agent" | Out-Null
  Copy-Item .\agent\*.md "$target\agent\" -Force
}
```