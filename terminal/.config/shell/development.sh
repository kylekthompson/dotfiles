# Shared by interactive Zsh and the noninteractive Amp runner. Keep POSIX syntax
# here; prompts, aliases, completions, and mise activation belong in .zshrc.
export HOMEBREW_PREFIX="${HOMEBREW_PREFIX:-/opt/homebrew}"
export PATH="$HOME/.amp/bin:$HOME/.local/bin:$HOME/bin:$HOME/.bun/bin:$HOME/.orbstack/bin:$HOME/.local/share/mise/shims:$HOMEBREW_PREFIX/opt/libpq/bin:$HOMEBREW_PREFIX/bin:$HOMEBREW_PREFIX/sbin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

# Build PostgreSQL with mise using the selected macOS developer tools.
if [ "$(uname -s)" = Darwin ]; then
  PKG_CONFIG_PATH="$(brew --prefix icu4c)/lib/pkgconfig:$(brew --prefix curl)/lib/pkgconfig:$(brew --prefix zlib)/lib/pkgconfig"
  MACOSX_DEPLOYMENT_TARGET="$(sw_vers -productVersion)"
  SDKROOT="$(xcrun --sdk macosx --show-sdk-path)"
  export PKG_CONFIG_PATH MACOSX_DEPLOYMENT_TARGET SDKROOT
fi
