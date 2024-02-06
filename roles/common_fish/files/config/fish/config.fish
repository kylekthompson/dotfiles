####
#### EXPORTS
####

set -x EDITOR vim
set -x GPG_TTY (tty)

# homebrew
if not contains /opt/homebrew/bin $PATH
    set -gx --prepend PATH /opt/homebrew/bin
end
if not contains /opt/homebrew/sbin $PATH
    set -gx --prepend PATH /opt/homebrew/sbin
end

# Setup asdf
source /opt/homebrew/opt/asdf/libexec/asdf.fish

# Setup golang
if test -e ~/.asdf/plugins/golang/set-env.fish
  source ~/.asdf/plugins/golang/set-env.fish
end

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
