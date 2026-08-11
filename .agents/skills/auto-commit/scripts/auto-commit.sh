#!/usr/bin/env bash
# Helper script for auto-committing changes in current repository
set -e

# Stage changes
git add -A

# Check if there are staged changes
if git diff --cached --quiet; then
    echo "No changes to commit."
    exit 0
fi

# Get custom message or generate default
COMMIT_MSG="${1:-chore: update repository changes}"

git commit -m "$COMMIT_MSG"
echo "Commit created successfully: $(git rev-parse --short HEAD) - $COMMIT_MSG"
