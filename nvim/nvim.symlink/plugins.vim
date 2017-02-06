"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Plug
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

call plug#begin('~/.config/nvim/bundle')

" Directory tree
Plug 'scrooloose/nerdtree'
Plug 'Xuyuanp/nerdtree-git-plugin'

" Linting
Plug 'neomake/neomake'

" Better surroundings (cs"')
Plug 'tpope/vim-surround'

" Fuzzy file search
Plug 'ctrlpvim/ctrlp.vim'

" Keyword completion
function! DoRemote(arg)
  UpdateRemotePlugins
endfunction
Plug 'Shougo/deoplete.nvim', { 'do': function('DoRemote') }

" Airline!
Plug 'vim-airline/vim-airline'

" Better commenting
Plug 'tomtom/tcomment_vim'

" Git info in the gutter
Plug 'airblade/vim-gitgutter'

" Javascript syntax highlighting
Plug 'pangloss/vim-javascript'

" JSX syntax highlighting
Plug 'mxw/vim-jsx'

" Super cool motions
Plug 'easymotion/vim-easymotion'

" Rails stuff
Plug 'tpope/vim-rails'
Plug 'tpope/vim-rake'
Plug 'vim-ruby/vim-ruby'

" Cool tabbing
Plug 'godlygeek/tabular'

" Allow repeating plugins
Plug 'tpope/vim-repeat'

" Cool abbreviations and substitutions
Plug 'tpope/vim-abolish'

" Ack for the_silver_searcher
Plug 'mileszs/ack.vim'

" Tmux navigation
Plug 'christoomey/vim-tmux-navigator'

" Elixir support
Plug 'elixir-lang/vim-elixir'

" Pretty parens
Plug 'kien/rainbow_parentheses.vim'

" Rename files easily
Plug 'danro/rename.vim'

" gruvbox styles
Plug 'morhetz/gruvbox'

" Custom text objects
Plug 'kana/vim-textobj-user'

" Show trailing whitespace
Plug 'ntpeters/vim-better-whitespace'

call plug#end()

" Required:
filetype plugin indent on
