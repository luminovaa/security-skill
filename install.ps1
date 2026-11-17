param(
  [string]$Repo = (Split-Path -Parent $MyInvocation.MyCommand.Path),
  [string]$Target = (Join-Path $env:USERPROFILE ".agents\skills")
)

$skills = Join-Path $Repo "skills"
if (-not (Test-Path $skills)) { Write-Error "no skills/ under $Repo"; exit 1 }
if (-not (Test-Path $Target)) { New-Item -ItemType Directory -Path $Target -Force | Out-Null }

foreach ($dir in Get-ChildItem $skills -Directory) {
  $link = Join-Path $Target $dir.Name
  $src = $dir.FullName
  if (Test-Path $link) {
    $item = Get-Item $link -Force
    if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
      Write-Host "relink  $($dir.Name)"
      cmd /c rmdir "`"$link`"" | Out-Null
    } else {
      Write-Warning "skip $($dir.Name): $link exists and is not a link (move it away first)"
      continue
    }
  } else { Write-Host "link    $($dir.Name)" }
  cmd /c mklink /J "`"$link`"" "`"$src`"" | Out-Null
  if (-not (Test-Path (Join-Path $link "SKILL.md"))) { Write-Error "link failed: $link"; exit 1 }
}
Write-Host "`ninstalled into $Target"