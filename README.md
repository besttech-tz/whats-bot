# Astra — interactive 3D website

Astra is a dependency-free WebGL experience. The animated object responds to
scrolling and pointer movement while the page moves through four full-screen
sections.

## See it locally

You only need **Node.js**. Python and package installation are not required.

```bash
npm run dev
```

Then open **http://localhost:5173** in a WebGL-capable browser. Keep the terminal
running while viewing the site. Stop the server with <kbd>Ctrl</kbd>+<kbd>C</kbd>.

On Windows, run this command from Git Bash, PowerShell, Command Prompt, or the
VS Code terminal after changing into the cloned `whats-bot` folder.

> If the project is running on a remote machine or cloud workspace, expose or
> forward port `5173`, then open the forwarded URL instead of `localhost`.

## What to try

- Move the pointer over the page to rotate and distort the 3D form.
- Scroll through all four sections to move the object across the composition.
- Use the right-side progress line to see your position in the experience.
- Resize the browser or open mobile device emulation to see the responsive view.

## Test the production build

```bash
npm run build
npm run preview
```

Open **http://localhost:4173**. The generated static site is placed in `dist/`
and can be deployed to any static hosting provider.

## Quick checks

```bash
node --check src/main.js
npm run build
```

If the page is blank, confirm that hardware acceleration and WebGL are enabled
in the browser. Also open the browser developer console to check for shader or
WebGL errors.
