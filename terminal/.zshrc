# Keep PATH unique, including when opening nested shells.
typeset -U path fpath
source "$HOME/.config/shell/development.sh"
path=(
  "$HOMEBREW_PREFIX/opt/gnu-sed/libexec/gnubin"
  "$HOMEBREW_PREFIX/opt/gnu-tar/libexec/gnubin"
  /Applications/Ghostty.app/Contents/MacOS
  $path
)
fpath=("$HOMEBREW_PREFIX/share/zsh/site-functions" $fpath)

if command -v zed >/dev/null 2>&1; then
  export EDITOR="zed --wait"
else
  export EDITOR="${EDITOR:-vi}"
fi

if command -v mise >/dev/null 2>&1; then
  eval "$(mise activate zsh)"
fi

[[ -r "$HOME/.orbstack/shell/init.zsh" ]] && source "$HOME/.orbstack/shell/init.zsh"

if command -v nvim >/dev/null 2>&1; then
  alias vim=nvim
fi
alias l="ls -lhFG"
alias la="ls -lahFG"
alias sudo='sudo '
alias show="defaults write com.apple.finder AppleShowAllFiles -bool true && killall Finder"
alias hide="defaults write com.apple.finder AppleShowAllFiles -bool false && killall Finder"
alias hidedesktop="defaults write com.apple.finder CreateDesktop -bool false && killall Finder"
alias showdesktop="defaults write com.apple.finder CreateDesktop -bool true && killall Finder"
alias finder="open ./"

HISTFILE="$HOME/.zsh_history"
HISTSIZE=100000
SAVEHIST=100000
setopt append_history share_history hist_ignore_dups hist_ignore_space

autoload -Uz compinit
compinit
zstyle ':completion:*' menu select

bindkey -e
autoload -Uz up-line-or-beginning-search down-line-or-beginning-search
zle -N up-line-or-beginning-search
zle -N down-line-or-beginning-search
bindkey '^[[A' up-line-or-beginning-search
bindkey '^[[B' down-line-or-beginning-search
bindkey '^[OA' up-line-or-beginning-search
bindkey '^[OB' down-line-or-beginning-search

export FZF_DEFAULT_COMMAND='rg --files --no-ignore-vcs --hidden'
export FZF_CTRL_T_COMMAND="$FZF_DEFAULT_COMMAND"
if command -v fzf >/dev/null 2>&1; then
  source <(fzf --zsh)
fi

# Preserve the Fish prompt: status arrow, directory, branch, and dirty marker.
autoload -Uz add-zsh-hook
unsetopt prompt_subst
function _dotfiles_prompt() {
  local exit_status=$? arrow='➜' arrow_color=green
  local repo_type branch dirty repo_info=''
  (( exit_status != 0 )) && arrow_color=red
  [[ "$USER" == root ]] && arrow='#'

  if command -v hg >/dev/null 2>&1 && command hg root >/dev/null 2>&1; then
    repo_type=hg
    branch=$(command hg branch 2>/dev/null)
    dirty=$(command hg status -mard 2>/dev/null)
  elif command git rev-parse --git-dir >/dev/null 2>&1; then
    repo_type=git
    branch=$(command git symbolic-ref --quiet --short HEAD 2>/dev/null || command git rev-parse --short HEAD 2>/dev/null)
    dirty=$(command git status --short --ignore-submodules=dirty 2>/dev/null)
  fi

  if [[ -n "$repo_type" ]]; then
    # Branch names are data, not Zsh prompt escape sequences.
    repo_info=" %F{blue}${repo_type}:(%F{red}${branch//\%/%%}%F{blue})"
    [[ -n "$dirty" ]] && repo_info+=' %F{yellow}✗'
  fi
  PROMPT="%B%F{${arrow_color}}${arrow}  %F{cyan}%1~${repo_info}%f%b "
}
add-zsh-hook precmd _dotfiles_prompt

ZSH_AUTOSUGGEST_HIGHLIGHT_STYLE='fg=#969896'
if [[ -r "$HOMEBREW_PREFIX/share/zsh-autosuggestions/zsh-autosuggestions.zsh" ]]; then
  source "$HOMEBREW_PREFIX/share/zsh-autosuggestions/zsh-autosuggestions.zsh"
fi

[[ -r "$HOME/.config/zsh/override.zsh" ]] && source "$HOME/.config/zsh/override.zsh"

# Syntax highlighting must load after other widgets and local configuration.
if [[ -r "$HOMEBREW_PREFIX/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh" ]]; then
  source "$HOMEBREW_PREFIX/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh"
fi
