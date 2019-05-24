# ~/

These are my dotfiles! They are an always-changing WIP, so feel free to use them, but be careful!

## For a new mac

```bash
git clone https://github.com/kylekthompson/dotfiles ~/.dotfiles
cd ~/.dotfiles

xcode-select --install
sudo xcodebuild -license
curl https://bootstrap.pypa.io/get-pip.py -o get-pip.py
python get-pip.py --user
rm get-pip.py
pip install ansible

./apply new_mac
./apply personal
```

## For subsequent updates

```bash
./apply personal
```
