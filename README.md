# Notebook support for Wolfram Language in VS Code

## Prerequisites

- `wolframscript`, shipped with [Wolfram Mathematica](https://www.wolfram.com/mathematica/) / [Wolfram Engine](https://www.wolfram.com/engine/) 12.0 or higher;
- OpenSSH (optional), for remote kernel support.

Install this extension from [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=njpipeorgan.wolfram-language-notebook).

## Getting Started

To create a new Wolfram Language notebook, execute **Create New Wolfram Language Notebook** in the Command Palette, or create a new file with `.wlnb` extension.

Execute **Manage Kernels** command and choose **Use wolframscript** to add `wolframscript` to the kernel configuration and connect to it. The status of the kernel will be shown in the status bar.

Add a code cell, type Wolfram language code in the cell, and evaluate it.

![getting-started](images/getting-started.gif)

## Features

**Syntax Highlighting**: The notebook highlights Wolfram language syntax, common built-in functions, and full character names, e.g. `\[Alpha]`.

**Auto-completion and Usages**: Auto-completion for built-in functions are provided. Their usage information is displayed when typing and hovering.

**Output Renderer**: The notebook renders common Wolfram language expressions into HTML for better presentations. Graphics are shown as rasterized images.

**Export as Wolfram notebook**: The notebooks can be exported as Wolfram notebooks, containing markdown cells, code cells and their outputs.

**Remote development**: When configured, the notebook can establish a tunnel or an SSH connection to the remote machine, and the computations are done remotely. Code and outputs can be stored either on the remote machine or locally.

## Kernel Configuration

To add a new kernel, click **⨉ Wolfram Kernel** in the status bar and choose **Add a new kernel** (when no kernel is currently connected). By default, the command launching the kernels is `wolframscript` and the port is randomly selected between 49152 and 65535. To edit or remove kernel configurations, find `kernel.configurations` in the extension settings page, and edit settings.json.

## Remote Development

### Use VS Code Remote Tunnel

With this approach, you connect to a remote machine through a secure tunnel following [this guide](https://code.visualstudio.com/docs/remote/tunnels). When configured, you can work with the files and the kernel on the remote system from a web browser. In short, you need to:

  1. Install `code` [CLI](https://code.visualstudio.com/download) on the remote machine.
  2. Create a tunnel with the command `code tunnel`, where a URL will be printed as `https://vscode.dev/tunnel/.../...`.
  3. Open the URL in a web browser.
  4. Click **⨉ Wolfram Kernel** to add or launch a kernel on the remote system.

### Use VS Code Remote Development

With this approach, you use VS Code to connect to remote machines, containers, or [WSL](https://docs.microsoft.com/windows/wsl/). You work with the files and the kernel on the remote system. To do this, you need to:

1. Install [Remote Development Extension Pack](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack);
2. [Follow the guide](https://code.visualstudio.com/docs/remote/remote-overview#_getting-started) to connect to a remote system; and
3. Click **⨉ Wolfram Kernel** to add or launch a kernel on the remote system.

### Launch Remote Kernel via SSH

With this approach, you launch and connect to a remote kernel via SSH: code and files are stored locally, and the communication with the remote kernel is managed by the extension.

To add a remote kernel, choose **On a remote machine**, and provide the private key file for ssh authentication (skip the private key if it is already available to `ssh`).

To edit or remove kernel configurations, find `kernel.configurations` in the extension settings page, and edit settings.json. Each kernel is an entry with the kernel name as the key and the following configurations as the value:

| Key               | Value                                              |
| ----------------- | -------------------------------------------------- |
| type              | "local"/"remote"                                   |
| command           | command to launch the kernel, e.g. "wolframscript" |
| ports             | ranges of numbers, e.g. "1,3,6-9"                  |
| sshCommand        | the ssh command, e.g. "ssh"                        |
| sshHost           | user@hostname                                      |
| sshPort           | port of ssh server (default: 22)                   |
| sshCredentialType | "key"/"none"                                       |
| sshCredential     | path to the ssh credential                         |

## Release Notes

Check [Release Notes](https://github.com/njpipeorgan/wolfram-language-notebook/wiki/Release-Notes).

## FAQ

**The notebook failed to connect to a kernel.**

- Check that `wolframscript` is installed, and it can be used in the terminal.
- Wolfram Mathematica/Engine limits the number of kernels running simultaneously. Try [closing all Wolfram processes](https://support.wolfram.com/36360) before connecting to a kernel from the notebook.
- If the problem persists, [Open an issue](https://github.com/njpipeorgan/wolfram-language-notebook/issues) with the content in the Output panel (Ctrl+Shift+U / ⇧⌘U) "Wolfram Language Notebook" tab.

**The output of an evaluation was not what I expected.**

- Please [open an issue](https://github.com/njpipeorgan/wolfram-language-notebook/issues) with the actual and expected output. Note that the extension only supports a limited number of styling options for now.
- The brightness of the images is inverted by default in dark and high-contrast themes. Uncheck `rendering.invertBrightnessInDarkThemes` in the extension settings to disable this feature (outputs are updated after re-evaluations).

**How can I use the notebook with [Wolfram Language Server](https://github.com/kenkangxgwe/lsp-wl)?**

- With Wolfram Language Server installed, the features, like hover and completion, are enabled in Wolfram Language cells.
- Meanwhile, you can uncheck `editor.languageFeatures` in the extension settings to disable the built-in language features provided by Wolfram Language Notebook.
