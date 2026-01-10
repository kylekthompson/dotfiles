return {
  -- ensure preferred lsps and such are installed
  {
    "mason-org/mason.nvim",
    opts = {
      ensure_installed = {
        -- shell
        "shellcheck",

        -- golang
        "gopls",
        "delve",
        "golangci-lint",

        -- ruby
        "ruby-lsp",
        "rubocop",

        -- typescript
        "eslint-lsp",
        "prettier",

        -- terraform
        "terraform",
        "terraform-ls",
      },
    },
  },
}
