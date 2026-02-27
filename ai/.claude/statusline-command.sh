#!/usr/bin/env bash

input=$(cat)

cwd=$(echo "$input" | jq -r '.workspace.current_dir // .cwd // ""')
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
cost=$(echo "$input" | jq -r '.cost.total_cost_usd // 0')
total_tokens=$(echo "$input" | jq -r '(.context_window.total_input_tokens // 0) + (.context_window.total_output_tokens // 0)')
lines_added=$(echo "$input" | jq -r '.cost.total_lines_added // 0')
lines_removed=$(echo "$input" | jq -r '.cost.total_lines_removed // 0')

home="$HOME"
short_cwd="${cwd/#$home/~}"

git_branch=""
if git -C "$cwd" rev-parse --git-dir > /dev/null 2>&1; then
  git_branch=$(git -C "$cwd" symbolic-ref --short HEAD 2>/dev/null || git -C "$cwd" rev-parse --short HEAD 2>/dev/null)
fi

# Format token count (e.g. 1234 -> 1.2k, 1234567 -> 1.2M)
fmt_tokens=$(awk -v t="$total_tokens" 'BEGIN {
  if (t >= 1000000) printf "%.1fM", t / 1000000
  else if (t >= 1000) printf "%.1fk", t / 1000
  else printf "%d", t
}')

parts=()
parts+=("$short_cwd")
[ -n "$git_branch" ] && parts+=("[$git_branch]")
[ -n "$used_pct" ] && parts+=("ctx:${used_pct}%")
[ "$total_tokens" != "0" ] && parts+=("${fmt_tokens}tok")
[ "$lines_added" != "0" ] || [ "$lines_removed" != "0" ] && parts+=("+${lines_added}/-${lines_removed}")
[ "$cost" != "0" ] && parts+=("$(printf '$%.2f' "$cost")")

printf "%s" "${parts[*]}"
