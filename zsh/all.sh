#!/bin/sh

set -e

curl -fsSL https://raw.githubusercontent.com/robbyrussell/oh-my-zsh/master/tools/install.sh

if [[ $ZSH_NAME != "zsh" ]]; then
  echo "Changing Default Shell to ZSH"
  chsh -s /bin/zsh
fi
