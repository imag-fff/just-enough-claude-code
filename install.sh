#!/usr/bin/env bash
#
# Install the just-enough-claude-code harness into a target project.
#
# This is the ONLY install path. It copies the harness's .claude/ directory
# into the target project, merging settings.json if one already exists.
# Existing files are never overwritten unless --force is given.
#
# Usage:
#   ./install.sh /path/to/your/project [--dry-run] [--force]
#
# Requirements: bash 3.2+, node 18+ (hooks runtime and settings merge).

set -euo pipefail

HARNESS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
  sed -n '2,13p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
}

TARGET=""
DRY_RUN=false
FORCE=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --force) FORCE=true ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "Unknown option: $arg" >&2; usage >&2; exit 1 ;;
    *)
      if [ -n "$TARGET" ]; then
        echo "Error: multiple target directories given." >&2; exit 1
      fi
      TARGET="$arg"
      ;;
  esac
done

# --- Validation ------------------------------------------------------------

if [ -z "$TARGET" ]; then
  echo "Error: target project directory is required." >&2
  usage >&2
  exit 1
fi
if [ ! -d "$TARGET" ]; then
  echo "Error: '$TARGET' is not a directory." >&2
  exit 1
fi
TARGET="$(cd "$TARGET" && pwd)"
if [ "$TARGET" = "$HARNESS_DIR" ]; then
  echo "Error: target is the harness repo itself." >&2
  exit 1
fi
if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is required (hooks runtime). Install Node.js 18+ first." >&2
  exit 1
fi

note()  { echo "  $1"; }
doing() { if $DRY_RUN; then echo "  [dry-run] $1"; else echo "  $1"; fi; }

# Copy a single file, respecting --dry-run/--force. Skips existing files.
copy_file() {
  src="$1"; dest="$2"
  if [ -e "$dest" ] && ! $FORCE; then
    note "skip (exists): ${dest#"$TARGET"/}"
    return 0
  fi
  doing "install: ${dest#"$TARGET"/}"
  if ! $DRY_RUN; then
    mkdir -p "$(dirname "$dest")"
    cp "$src" "$dest"
  fi
}

echo "Installing just-enough-claude-code into: $TARGET"

# --- Components: agents, commands, skills, hooks ---------------------------

for dir in agents commands skills hooks; do
  echo "• $dir"
  find "$HARNESS_DIR/.claude/$dir" -type f | while read -r src; do
    rel="${src#"$HARNESS_DIR"/}"
    copy_file "$src" "$TARGET/$rel"
  done
done

# --- settings.json: copy when absent, merge when present -------------------

echo "• settings.json"
SETTINGS="$TARGET/.claude/settings.json"
if [ ! -e "$SETTINGS" ]; then
  copy_file "$HARNESS_DIR/.claude/settings.json" "$SETTINGS"
elif $DRY_RUN; then
  note "[dry-run] merge hooks/permissions into existing settings.json"
else
  node "$HARNESS_DIR/scripts/merge-settings.js" "$SETTINGS" "$HARNESS_DIR/.claude/settings.json"
  note "merged hooks/permissions into existing settings.json"
fi

# --- Supporting files -------------------------------------------------------

echo "• misc"
copy_file "$HARNESS_DIR/.claude/.gitignore" "$TARGET/.claude/.gitignore"
if [ ! -e "$TARGET/CLAUDE.md" ]; then
  copy_file "$HARNESS_DIR/templates/CLAUDE.md.template" "$TARGET/CLAUDE.md"
else
  note "skip (exists): CLAUDE.md — see templates/CLAUDE.md.template for suggested sections"
fi

echo ""
echo "Done. Next steps:"
echo "  1. cd $TARGET && claude   (restart Claude Code if already running)"
echo "  2. Run /hooks inside Claude Code to confirm the 4 hooks are registered."
echo "  3. Fill in the TODO sections of CLAUDE.md."
