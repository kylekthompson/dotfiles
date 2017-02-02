"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""
" Keybindings
"""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""

" Remap leader to ,
let mapleader = ","
let g:mapleader = ","

" shortcut to save all
nmap <Leader>ss :wa<cr>

" insert blank lines without going into insert mode
nmap go o<esc>
nmap gO O<esc>

" mapping the jumping between splits. Hold control while using vim nav.
nmap <C-J> <C-W>j
nmap <C-K> <C-W>k
nmap <C-H> <C-W>h
nmap <C-L> <C-W>l

" Yank from the cursor to the end of the line, to be consistent with C and D.
nnoremap Y y$

" clean up trailing whitespace
map <Leader>c :StripWhitespace<cr>

" delete all buffers
map <Leader>d :bufdo bd<cr>

" map spacebar to clear search highlight
nnoremap <Leader><space> :noh<cr>

" reindent the entire file
map <Leader>I gg=G``<cr>

" jump to far right or left of line
map L $
map H ^

" Reload vimrc
map <silent> <leader>vs :source ~/.vimrc<CR>:filetype detect<CR>:exe ":echo 'vimrc reloaded!'"<CR>

" Fast saving
map <Esc><Esc> :w<CR>
map <leader>w :w<CR>

" Fast access to : commands
nnoremap <Space> :
