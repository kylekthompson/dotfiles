source ~/.orbstack/shell/init.zsh 2>/dev/null || :

if command -v mise >/dev/null 2>&1; then
  eval "$(mise activate zsh)"
fi
