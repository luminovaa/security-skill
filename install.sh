#!/usr/bin/env bash
# Links every skill in this repo into ~/.agents/skills (or $SKILLS_DIR).
set -euo pipefail
repo="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
target="${SKILLS_DIR:-$HOME/.agents/skills}"
mkdir -p "$target"

for dir in "$repo"/skills/*/; do
  name="$(basename "$dir")"
  link="$target/$name"
  if [ -L "$link" ] || [ -e "$link" ]; then
    [ -L "$link" ] || { echo "skip $name: $link exists and is not a symlink" >&2; continue; }
    rm -f "$link"
  fi
  ln -s "${dir%/}" "$link"
  [ -f "$link/SKILL.md" ] || { echo "link failed: $link" >&2; exit 1; }
  echo "link    $name"
done
echo
echo "installed into $target"