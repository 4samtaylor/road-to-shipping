# One-time setup for the Road to Shipping site.
# Needs: git, and the GitHub CLI (winget install GitHub.cli), signed in with `gh auth login`.
#
# Run from this folder:
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1
#   powershell -ExecutionPolicy Bypass -File .\setup.ps1 -Partner their-github-name

param(
  [string]$RepoName = "road-to-shipping",
  [string]$Partner = ""
)

$ErrorActionPreference = "Continue"   # native tools report through $LASTEXITCODE
function Check($what) { if ($LASTEXITCODE -ne 0) { throw "$what failed (exit $LASTEXITCODE). Fix the message above and re-run; the script is safe to run again." } }

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Green }
function Need($cmd, $hint) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { throw "$cmd is not installed. $hint" }
}

Need git "Install it from https://git-scm.com"
Need gh  "Install it with: winget install GitHub.cli   then run: gh auth login"

gh auth status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { throw "The GitHub CLI is not signed in. Run: gh auth login" }

$owner = (gh api user --jq .login).Trim()
$full  = "$owner/$RepoName"
Step "Setting up $full"

# Point the site at this repo
$json = @{ owner = $owner; repo = $RepoName; branch = "main" } | ConvertTo-Json
[IO.File]::WriteAllText((Join-Path $PWD "content\config.json"), $json)

Step "Creating the repository and pushing"
if (-not (Test-Path .git)) {
  git init -b main | Out-Null
}
git add -A
git commit -m "Road to Shipping v11" 2>$null | Out-Null
gh repo view $full 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
  Write-Host "Repo already exists, pushing to it."
  git remote remove origin 2>$null
  git remote add origin "https://github.com/$full.git"
  git push -u origin main; Check "git push"
} else {
  gh repo create $RepoName --public --source . --remote origin --push --description "C game-dev roadmap with synced progress"; Check "Creating the repo"
}

Step "Repo settings: squash merge, auto-merge, delete merged branches"
gh api -X PATCH "repos/$full" -F allow_squash_merge=true -F allow_auto_merge=true -F delete_branch_on_merge=true | Out-Null; Check "Repo settings"

Step "Actions: allow workflows to write and open pull requests"
gh api -X PUT "repos/$full/actions/permissions/workflow" -f default_workflow_permissions=write -F can_approve_pull_request_reviews=true | Out-Null; Check "Actions permissions"

Step "Turning on GitHub Pages (deployed by Actions)"
gh api -X POST "repos/$full/pages" -f build_type=workflow 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  gh api -X PUT "repos/$full/pages" -f build_type=workflow | Out-Null; Check "Turning on Pages"
}

Step "Creating the roadmap-edit label"
gh label create roadmap-edit --repo $full --color 00ff88 --description "Published from the roadmap's edit mode" --force | Out-Null

if ($Partner) {
  Step "Inviting $Partner as a collaborator and allowing their edits to auto-merge"
  gh api -X PUT "repos/$full/collaborators/$Partner" -f permission=push | Out-Null
  gh variable set AUTO_MERGE_USERS --repo $full --body $Partner
}

Step "First deploy"
gh workflow run pages.yml --repo $full --ref main

$site = "https://$($owner.ToLower()).github.io/$RepoName/"
Write-Host ""
Write-Host "Done. Your site will be live in a minute or two:" -ForegroundColor Green
Write-Host "  $site"
Write-Host ""
Write-Host "Next, on each device you want to sync:"
Write-Host "  1. Make a token: https://github.com/settings/personal-access-tokens/new"
Write-Host "     Repository access: Only select repositories -> $RepoName"
Write-Host "     Permissions: Contents = Read and write, Pull requests = Read and write"
Write-Host "  2. Open the site, menu (...) -> Connect this device, paste the token."
Write-Host "  3. Chrome/Edge: click the install icon in the address bar to get a taskbar app."
Write-Host ""
Write-Host "Share your progress with: $($site)?user=$($owner.ToLower())"
