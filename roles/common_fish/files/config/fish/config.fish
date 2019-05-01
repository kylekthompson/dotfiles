####
#### EXPORTS
####

set -x EDITOR code
set -x PATH "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/usr/local/sbin:$PATH"
set -x PATH "$PATH:/usr/local/opt/fzf/bin"
set -x ASDF_DIR "/usr/local/opt/asdf"
set -x GNUPGHOME "$ASDF_DIR/keyrings/nodejs"
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

eval (hub alias -s)

# Setup fzf
set -x FZF_DEFAULT_COMMAND 'rg --files --no-ignore-vcs --hidden'
set -x FZF_CTRL_T_COMMAND "$FZF_DEFAULT_COMMAND"

# Setup asdf
source "$ASDF_DIR/asdf.fish"

# always start tmux
# if which tmux 2>&1 >/dev/null
#   if not set -q TMUX
#     tmux attach -t fish || tmux new -s fish; exit
#   end
# end
