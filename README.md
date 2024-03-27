# LSP Luni ASM

Luni ASM Language Server (work in progress)

## Functionality

This Language Server works for .lsm file. It has the following language features:
- Completions
- Diagnostics regenerated on each file change or configuration change
- Syntax Highlight (wip)

## Install

- Download release extension file (*.vsix)
- Open VSCode.
- Switch to Extensions view.
- Click dots menu.
- Click "Install from VSIX..."
- Choose luniASM-lsp-0.1.0.vsix file

## Build (make your own)
1 Clone this repo

<code> git clone https://github.com/CasperDev/luniASM-lsp.git </code>

2 Make your own changes and compile extension

<code> npm run compile </code>

3 Correct all YOUR errors and compile again

4 Package extension to release

<code> vsce package </code>

5 Install your new awesome extension


