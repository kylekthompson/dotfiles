####
#### EXPORTS
####

set -x EDITOR "zed -w"

# ~/bin
if not contains ~/bin $PATH
  set -gx --prepend PATH ~/bin
end

# ~/.local/bin
if not contains ~/.local/bin $PATH
  set -gx --prepend PATH ~/.local/bin
end

# homebrew
if not contains /opt/homebrew/bin $PATH
  set -gx --prepend PATH /opt/homebrew/bin
end
if not contains /opt/homebrew/sbin $PATH
  set -gx --prepend PATH /opt/homebrew/sbin
end
if not contains /opt/homebrew/opt/gnu-tar/libexec/gnubin $PATH
  set -gx --prepend PATH /opt/homebrew/opt/gnu-tar/libexec/gnubin
end
if not contains /opt/homebrew/opt/gnu-sed/libexec/gnubin $PATH
  set -gx --prepend PATH /opt/homebrew/opt/gnu-sed/libexec/gnubin
end

# Setup mise
if which mise &>/dev/null
  mise activate fish | source
end

# Postgres
if not contains /opt/homebrew/opt/libpq/bin $PATH
  set -gx --prepend PATH /opt/homebrew/opt/libpq/bin
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

# Added by OrbStack: command-line tools and integration
# This won't be added again if you remove it.
source ~/.orbstack/shell/init2.fish 2>/dev/null || :
