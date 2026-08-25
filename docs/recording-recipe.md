# 30-second demo / recording recipe

This project is intentionally easy to demo in a few seconds. The goal is to show the tool running in a terminal, without checking in a large binary asset.

## Recommended approach

Use a short terminal capture from a local recorder such as:

- `asciinema` for terminal playback
- `vhs` for scripted screen recordings
- Windows Terminal / PowerShell screen recording for quick demos

This keeps the repo lightweight while still giving contributors a clear walkthrough.

## Quick recipe

### Option 1: `asciinema`

```bash
npm install -g asciinema
asciinema rec demo.cast
# run: repoaudit .
# stop with Ctrl+D
asciinema upload demo.cast
```

Then link the uploaded recording from README or docs. This avoids storing a huge video file in the repo.

### Option 2: `vhs`

```bash
npm install -g @vhs/cli
vhs new demo.tape
```

Example `demo.tape`:

```text
Output demo.gif
Set FontSize 18
Set Width 1200
Set Height 700
Type "repoaudit ."
Sleep 500ms
Enter
Sleep 3s
```

Then render:

```bash
vhs demo.tape
```

If you want a GIF, keep it short and optimize it before committing. Prefer a small `demo.gif` under a reasonable size, or keep the recording external and only link it.

### Option 3: Windows Terminal / PowerShell

For a quick contributor demo on Windows:

1. Open PowerShell or Windows Terminal.
2. Set a clean terminal theme and a reasonable font size.
3. Run the essential command:

```powershell
repoaudit .
```
4. Record 20–30 seconds and trim the clip immediately after capture.
5. Save as a small MP4 or GIF if needed, or upload to a hosting service and embed the link.

## Suggested script

Keep the recording around 20–30 seconds and show only these moments:

1. `npm install`
2. `repoaudit .`
3. a short score summary
4. one action like `repoaudit fix .`

That keeps the demo focused and makes the project feel maintained.

## Repo guidance

- Prefer a link to a hosted recording over adding a large binary file to the Git repository.
- If a GIF is included, optimize it aggressively and keep it small.
- Keep the README demo section short and easy to scan.
