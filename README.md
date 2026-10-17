# Lyrefine by Alypradana

Lyrefine is a browser-based writing review tool designed to help users spot repeated or potentially overlapping content. It is built with plain HTML, CSS, and JavaScript and does not require a build step or backend.

## Features
- Word, character, and sentence counts.
- Exact repeated-sentence detection after case, whitespace, and punctuation normalization.
- Exact repeated-paragraph detection.
- Heuristic detection of potentially similar sentences and paragraphs using meaningful-word overlap and curated related-word groups.
- Example text for quickly trying the tool.
- Copyable text report of the analysis.
- Light and dark themes, with theme preference saved locally when browser storage is available.
- Responsive layout for desktop and mobile.
- Text analysis runs locally in the browser; the app code does not upload the text to a server.

## Run locally
1. Extract the ZIP.
2. Open `index.html` in a modern browser.
3. Paste text, choose **Analisis tulisan**, and review the results. Use **Muat contoh** to test the analyzer.

## Hosting
Upload `index.html`, `style.css`, and `script.js` to any static hosting provider. Keep all three files in the same directory. No package installation or build command is required.

## Important limitations
- Related-word groups are a curated helper list, not a complete Indonesian thesaurus. A word can have different meanings depending on context.
- Similarity scores measure lexical overlap; they are not a probability that two passages mean the same thing. This version does not use an AI language model, embeddings, plagiarism database, or external API.
- The tool can miss paraphrases that use substantially different vocabulary and can flag passages that share topic words but make different points. Always review suggestions manually before deleting or rewriting content.
- Exact-repeat detection normalizes punctuation and whitespace, so some differently punctuated sentences may be treated as duplicates.
- Google Fonts are loaded from the internet for typography; the analysis itself runs locally.

## Branding
Product name: **Lyrefine by Alypradana**  
Footer: **© 2026 Alypradana. All rights reserved.**
