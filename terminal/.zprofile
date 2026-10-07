# Homebrew may not be on PATH in a fresh macOS login shell.
if [[ -x /opt/workbrew/bin/brew ]]; then
  eval "$(/opt/workbrew/bin/brew shellenv)"
elif command -v brew >/dev/null 2>&1; then
  eval "$(brew shellenv)"
elif [[ -x /opt/homebrew/bin/brew ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [[ -x /usr/local/bin/brew ]]; then
  eval "$(/usr/local/bin/brew shellenv)"
fi
