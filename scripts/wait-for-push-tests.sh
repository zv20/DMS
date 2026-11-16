#!/usr/bin/env bash
set -euo pipefail

: "${GH_TOKEN:?}"
: "${GITHUB_REPOSITORY:?}"
: "${GITHUB_SHA:?}"

for ((attempt = 1; attempt <= 80; attempt++)); do
  run=$(gh api "repos/$GITHUB_REPOSITORY/actions/workflows/windows-checks.yml/runs?head_sha=$GITHUB_SHA&event=push&per_page=100" |
    jq -c --arg sha "$GITHUB_SHA" '[.workflow_runs[] | select(.head_sha == $sha and .event == "push" and .head_branch == "release")] | sort_by(.created_at) | last // empty')
  if [[ -n "$run" ]]; then
    status=$(jq -r '.status' <<< "$run")
    conclusion=$(jq -r '.conclusion // ""' <<< "$run")
    url=$(jq -r '.html_url' <<< "$run")
    if [[ "$status" == completed ]]; then
      if [[ "$conclusion" == success ]]; then
        echo "Push tests passed for $GITHUB_SHA: $url"
        exit 0
      fi
      echo "Push tests did not pass ($conclusion): $url" >&2
      exit 1
    fi
    echo "Waiting for push tests ($status): $url"
  else
    echo "Waiting for a push test run for $GITHUB_SHA"
  fi
  sleep 15
done
echo "Timed out waiting for release branch push tests for $GITHUB_SHA." >&2
exit 1
