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
" fzf.vim
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

nmap <leader>t :Files<CR>
nmap <leader>b :Buffers<CR>

" Find the word under the cursor
nnoremap <Leader>F :Ag <C-R><C-W><CR>

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

autocmd VimEnter * call CustomTabularPatterns()

" shortcut to align text with Tabular
map <Leader>a :Tabularize<space>

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
" gruvbox
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

if $TERM_PROGRAM =~ "iTerm"
  set termguicolors
endif
let g:gruvbox_italic=1
set background=dark
colorscheme gruvbox
