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
map <silent> <leader>vs :source ~/.config/nvim/init.vim<CR>:filetype detect<CR>:exe ":echo 'vimrc reloaded!'"<CR>

" Fast saving
map <Esc><Esc> :update<CR>
map <Leader>w :update<CR>

" Close the quickfix window
map <Leader>cl :cclose<CR>

" Fast access to : commands
nnoremap <Space> :
