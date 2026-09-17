# Updating Astra without merge-conflict guesswork

This guide assumes that GitHub's `main` branch is the source of truth and that
you do not write code directly inside the local project. It avoids choosing
between **Accept Current**, **Accept Incoming**, and **Accept Both**.

## The normal process

### 1. On GitHub

1. Keep only the newest pull request for the requested change. Close older,
   superseded pull requests instead of merging all of them.
2. Open the newest pull request and check the **Files changed** tab.
3. If GitHub says the pull request can be merged, select **Merge pull request**
   and then **Confirm merge**.
4. Do not pull on your computer until GitHub shows the pull request as merged.

### 2. On your computer

Open Git Bash in the `whats-bot` folder and run these commands one at a time:

```bash
git status
git branch -f local-backup HEAD
git fetch origin
git switch main
git reset --hard origin/main
npm run dev
```

Then open <http://localhost:5173>.

`git branch -f local-backup HEAD` makes (or refreshes) a safety pointer before the reset. The reset
makes the local `main` exactly match GitHub's `main`, so Git does not attempt to
combine an old local version with the newly merged version.

> `git reset --hard origin/main` discards uncommitted changes in the project.
> Do not use it when you have local code that you need to preserve. Commit that
> work or copy it outside the project first.

## If the pull request itself reports a conflict

Do not guess and do not select **Accept Both** everywhere. Stop before merging
and share the conflicting filename and the complete conflict block. The pull
request should be updated from the latest `main` branch before it is merged.

For the known server conflict in `package.json`, the final scripts must be:

```json
"scripts": {
  "start": "node scripts/serve.mjs",
  "dev": "node scripts/serve.mjs",
  "build": "node scripts/build.mjs",
  "preview": "node scripts/serve.mjs dist 4173"
}
```

Delete the old `python3 -m http.server` commands and delete all `<<<<<<<`,
`=======`, and `>>>>>>>` conflict markers. Never retain both the Python and Node
commands.

## If a pull already created a local conflict

If you have no local work to preserve, cancel the unfinished merge and restore
the exact GitHub version:

```bash
git merge --abort
git fetch origin
git switch main
git reset --hard origin/main
```

It is harmless if `git merge --abort` says that no merge is in progress. Start
the site afterward with `npm run dev`.

## Verify that the correction arrived

Run:

```bash
git status
node -p "require('./package.json').scripts.dev"
```

The second command must print:

```text
node scripts/serve.mjs
```

If it prints a Python command, the corrected pull request is not yet merged into
GitHub's `main` branch. Do not edit conflict buttons at random; return to GitHub
and verify which pull request was merged.
