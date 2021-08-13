# ~/

These are my dotfiles! They are an always-changing WIP, so feel free to use them, but be careful!

## For a new mac

```bash
git clone https://github.com/kylekthompson/dotfiles ~/src/kylekthompson/dotfiles
cd ~/src/kylekthompson/dotfiles

curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
python get-pip.py --user
rm get-pip.py

export PATH=$PATH:~/Library/Python/2.7/bin
pip install ansible

./apply new-mac

# close and re-open your terminal, set up a GitHub SSH key

./apply personal
```

### By hand

1. Set up GPG key for GitHub

## For subsequent updates

```bash
./apply personal
```
