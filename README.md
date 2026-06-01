# Kinyarwanda Exercises

A small static web app for building Kinyarwanda lesson exercises.

Open `index.html` in a browser to use it locally. Lessons, exercises, and questions are saved in browser local storage. Use **Export** to download a JSON backup and **Import** to restore it.

## Current Features

- Add, rename, and delete lessons.
- Add, rename, and delete exercises inside a lesson.
- Add, edit, and delete questions inside an exercise.
- Store a prompt, correct answer, and optional hint for each question.
- Export and import all lesson data as JSON.
- Sync lesson data across devices with a private GitHub Gist.

## Sync Setup

1. Open the app and press **Sync**.
2. Create a GitHub token with `gist` permission.
3. Paste the token into the app and press **Connect**.
4. Press **Save to GitHub** on the device with your latest lessons.
5. On another device, connect with the same token and press **Load from GitHub**.

The sync file is `kinyarwanda-lessons-data.json`, so it is separate from any other apps that use GitHub Gist sync.

## GitHub Pages

Because this is a static app with no build step, GitHub Pages can serve it directly from the repository root.
