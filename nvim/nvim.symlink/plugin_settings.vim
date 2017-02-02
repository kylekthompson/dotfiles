"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
"
" Plugin settings
"
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Nerdtree
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" Open NERDTree when vim starts up
autocmd vimenter * NERDTree

" Even when there are no files chosen
autocmd StdinReadPre * let s:std_in=1
autocmd VimEnter * if argc() == 0 && !exists("s:std_in") | NERDTree | endif

" And when opening a directory
autocmd StdinReadPre * let s:std_in=1
autocmd VimEnter * if argc() == 1 && isdirectory(argv()[0]) && !exists("s:std_in") | exe 'NERDTree' argv()[0] | wincmd p | ene | endif

" But close vim if this is all that is left
autocmd bufenter * if (winnr("$") == 1 && exists("b:NERDTree") && b:NERDTree.isTabTree()) | q | endif

" Keymappings
map <Leader>gt :NERDTreeToggle<CR>

" Settings
let loaded_netrwPlugin=1
let NERDTreeShowHidden=1
let NERDTreeRespectWildIgnore=1

"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Neomake
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" Run Neomake when we should
autocmd! BufWritePost * Neomake

" Add the linters
let g:neomake_javascript_enabled_makers = ['eslint']
let g:neomake_ruby_enabled_makers = ['rubocop']
let g:neomake_error_sign = { 'text': 'E>', 'texthl': 'ErrorMsg' }

"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" ctrlp.vim
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

nmap <leader>t :CtrlP<CR>
nmap <leader>b :CtrlPBuffer<CR>
nmap <leader>r :CtrlPMRU<CR>
nmap <leader>T :CtrlPClearCache<CR>:CtrlP<CR>

" Find the word under the cursor
nnoremap <Leader>F :grep! "\b<C-R><C-W>\b"<CR>:cw<CR>

let g:ctrlp_match_func = { 'match': 'pymatcher#PyMatch' }
let g:ctrlp_working_path_mode = 'r'

if executable('ag')
  " Use The Silver Searcher https://github.com/ggreer/the_silver_searcher
  set grepprg=ag\ --nogroup\ --nocolor
  " Use ag in CtrlP for listing files. Lightning fast, respects .gitignore
  " and .agignore. Ignores hidden files by default.
  let g:ctrlp_user_command = 'ag %s -l --nocolor -f -g ""'
else
  "ctrl+p ignore files in .gitignore
  let g:ctrlp_user_command = ['.git', 'cd %s && git ls-files . -co --exclude-standard', 'find %s -type f']
endif

"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" deoplete.nvim
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

let g:deoplete#enable_at_startup = 1

"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" vim-airline
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

let g:airline_powerline_fonts = 1
let g:airline_theme = "gruvbox"

"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" vim-javascript
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

let g:javascript_plugin_jsdoc = 1

"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" tabular
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
function! CustomTabularPatterns()
  if exists('g:tabular_loaded')
    AddTabularPattern! symbols         / :/l0
    AddTabularPattern! hash            /^[^>]*\zs=>/
    AddTabularPattern! chunks          / \S\+/l0
    AddTabularPattern! assignment      / = /l0
    AddTabularPattern! comma           /^[^,]*,/l1
    AddTabularPattern! colon           /:\zs /l0
    AddTabularPattern! options_hashes  /:\w\+ =>/
  endif
endfunction

" shortcut to align text with Tabular
map <Leader>a :Tabularize<space>

"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" ack.vim
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
if executable('ag')
  let g:ackprg = 'ag --vimgrep'
endif

"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" rainbow_parentheses.vim
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

let g:rbpt_colorpairs = [
      \ [ '13', '#6c71c4'],
      \ [ '5',  '#d33682'],
      \ [ '1',  '#dc322f'],
      \ [ '9',  '#cb4b16'],
      \ [ '3',  '#b58900'],
      \ [ '2',  '#859900'],
      \ [ '6',  '#2aa198'],
      \ [ '4',  '#268bd2'],
      \ ]

au VimEnter * RainbowParenthesesToggle
au Syntax * RainbowParenthesesLoadRound
au Syntax * RainbowParenthesesLoadSquare
au Syntax * RainbowParenthesesLoadBraces

"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Vim Tmux Navigator
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
let g:tmux_is_last_pane = 0
au WinEnter * let g:tmux_is_last_pane = 0

" Like `wincmd` but also change tmux panes instead of vim windows when needed.
function! TmuxWinCmd(direction)
  let nr = winnr()
  let tmux_last_pane = (a:direction == 'p' && g:tmux_is_last_pane)
  if !tmux_last_pane
    " try to switch windows within vim
    exec 'wincmd ' . a:direction
  endif
  " Forward the switch panes command to tmux if:
  " a) we're toggling between the last tmux pane;
  " b) we tried switching windows in vim but it didn't have effect.
  if tmux_last_pane || nr == winnr()
    let cmd = 'tmux select-pane -' . tr(a:direction, 'phjkl', 'lLDUR')
    call system(cmd)
    redraw! " because `exec` fucked up the screen. why is this needed?? arrghh
    let g:tmux_is_last_pane = 1
  else
    let g:tmux_is_last_pane = 0
  endif
endfunction

" navigate between split windows/tmux panes
nmap <c-j> :call TmuxWinCmd('j')<cr>
nmap <c-k> :call TmuxWinCmd('k')<cr>
nmap <c-h> :call TmuxWinCmd('h')<cr>
nmap <c-l> :call TmuxWinCmd('l')<cr>
nmap <c-\> :call TmuxWinCmd('p')<cr>

"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" gruvbox
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

if $TERM_PROGRAM =~ "iTerm"
  set termguicolors
endif
let g:gruvbox_italic=1
set background=dark
colorscheme gruvbox
