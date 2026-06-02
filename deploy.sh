#!/usr/bin/env bash
set -euo pipefail

branch="$(git branch --show-current)"
message="${1:-Deploy Kinyarwanda updates}"

if [[ -z "$branch" ]]; then
  echo "Could not determine the current git branch."
  exit 1
fi

echo "Staging changes..."
git add -A

if git diff --cached --quiet; then
  echo "No staged changes to commit."
else
  echo "Committing changes..."
  git commit -m "$message"
fi

echo "Pulling latest changes from origin/$branch..."
git pull --rebase origin "$branch"

echo "Pushing $branch to origin..."
git push origin "$branch"

echo "Deploy complete."
