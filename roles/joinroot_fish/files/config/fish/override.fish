####
#### EXPORTS
####

set -x ROOT_IOS_DIR "$HOME/code/root-mobile/ios"
set -x ROOT_ANDROID_DIR "$HOME/code/root-mobile/android"
set -x ROOT_REACT_NATIVE_DIR "$HOME/code/root-mobile"
set -x ROOT_SERVER_DIR "$HOME/code/root-monorepo/server"
set -x ROOT_MOBILE_DIR "$HOME/code/root-mobile"

set -x JAVA_HOME "/Library/Java/JavaVirtualMachines/jdk1.8.0_201.jdk/Contents/Home/"

set -x PKG_CONFIG_PATH "/usr/local/opt/libffi/lib/pkgconfig"

set -x PATH "$PATH:$HOME/code/root-infrastructure/bin"
set -x PATH "$PATH:$HOME/code/root-infrastructure/sbin"
set -x PATH "$PATH:$HOME/src/kylekthompson/dotfiles/roles/joinroot_fish/files/bin"
set -x PATH "$PATH:$HOME/.local/bin"

####
#### Aliases
####

alias adbr="adb reverse tcp:8081 tcp:8081"
alias android-reset="adb shell pm clear com.joinroot.root"
alias be="bundle exec"
alias pullinf="cd ~/code/root-infrastructure && git pull && bundle install && cd -"
alias rjobs="env TERM_CHILD=1 bundle exec rake resque:work COUNT=1 QUEUE=\"*\""
alias rj="rjobs"
alias rkafka="bundle exec karafka server"
alias rk="rkafka"
alias rs="bundle exec rails server -b 0.0.0.0"
