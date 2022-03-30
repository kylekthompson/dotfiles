####
#### EXPORTS
####

set -x EDITOR code
set -x PATH "/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/sbin:/usr/local/share/dotnet/x64:$PATH"
set -x PATH "$PATH:/opt/homebrew/bin/fzf/bin"
set -x GPG_TTY (tty)

####
#### Aliases
####

alias vim=nvim
alias l="ls -lhFG"
alias la="ls -lahFG"

# Enable aliases to be sudo’ed
alias sudo='sudo '

# Show/hide hidden files in Finder
alias show="defaults write com.apple.finder AppleShowAllFiles -bool true && killall Finder"
alias hide="defaults write com.apple.finder AppleShowAllFiles -bool false && killall Finder"

# Hide/show all desktop icons (useful when presenting)
alias hidedesktop="defaults write com.apple.finder CreateDesktop -bool false && killall Finder"
alias showdesktop="defaults write com.apple.finder CreateDesktop -bool true && killall Finder"

# Open finder where I am
alias finder="open ./"

####
#### Miscellaneous
####

# Setup fzf
set -x FZF_DEFAULT_COMMAND 'rg --files --no-ignore-vcs --hidden'
set -x FZF_CTRL_T_COMMAND "$FZF_DEFAULT_COMMAND"

# Setup asdf
source /opt/homebrew/opt/asdf/libexec/asdf.fish

# Source additional configuration
if test -e ~/.config/fish/override.fish
  source ~/.config/fish/override.fish
end

# always start tmux
if which tmux 2>&1 >/dev/null
  if not set -q TMUX
    exec tmux new -As fish
  end
end

# brew shellenv
eval (/opt/homebrew/bin/brew shellenv)
