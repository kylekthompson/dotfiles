"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Plug
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

call plug#begin('~/.config/nvim/bundle')

" File stuff
Plug '/usr/local/opt/fzf' | Plug 'junegunn/fzf.vim'
Plug 'danro/rename.vim'

" Language stuff
Plug 'othree/yajs.vim'
Plug 'othree/es.next.syntax.vim'
Plug 'mxw/vim-jsx'
Plug 'tpope/vim-rails'
Plug 'tpope/vim-rake'
Plug 'vim-ruby/vim-ruby'
Plug 'elixir-lang/vim-elixir'
Plug 'HerringtonDarkholme/yats.vim'
Plug 'mhartington/nvim-typescript'

" Utility stuff
Plug 'vim-airline/vim-airline'
Plug 'airblade/vim-gitgutter'
Plug 'scrooloose/nerdtree'
Plug 'Xuyuanp/nerdtree-git-plugin'
Plug 'christoomey/vim-tmux-navigator'

" Style stuff
Plug 'kien/rainbow_parentheses.vim'
Plug 'morhetz/gruvbox'
Plug 'ntpeters/vim-better-whitespace'

" Editor stuff
Plug 'neomake/neomake'
Plug 'tpope/vim-surround'
Plug 'tomtom/tcomment_vim'
Plug 'Shougo/deoplete.nvim', { 'do': ':UpdateRemotePlugins' }

" Miscellaneous stuff
Plug 'easymotion/vim-easymotion'
Plug 'tpope/vim-repeat'

call plug#end()
