---
name: add-password-protection
description: Adds password protection to any HTML page using the reusable password-protect component. Renders a lock dialog over the page, decrypts AES-GCM encrypted content on correct password, and loads it into a full-screen iframe. Use when the user asks to password protect a page, add a password screen, lock a page, or encrypt page content.
---

# Add Password Protection to a Page

Adds the reusable `password-protect.js` / `password-protect.css` component to any HTML page. This is a standalone component — it does not depend on any other skill or component.

## Pre-flight

1. Read the target page to understand its current `<head>` and `<body>` structure.
2. Confirm the encrypted payload (base64 string) is available — either already embedded in the page as `var pl = "..."` or provided by the user.
3. Read `Norton.html` as the completed reference implementation.

## How It Works

The component (`password-protect.js` + `password-protect.css`) is self-contained:
- Looks for `<div id="password-protect" data-payload="...">` in the page
- Injects a full-screen password dialog (gradient background, lock icon, input, submit button, "Get in touch to request access" link)
- Decrypts the payload using AES-GCM (PBKDF2 key derivation, 100k iterations, SHA-256)
- Loads decrypted HTML into a full-screen `<iframe>`
- Hides the parent page's visible elements so the iframe takes over

## Step 1 — Add CSS to `<head>`

Add this link tag (don't duplicate if already present):

```html
<link rel="stylesheet" href="password-protect.css">
```

## Step 2 — Add the payload div and script to `<body>`

Place these in the `<body>`, after other page content:

```html
<div id="password-protect" data-payload="ENCRYPTED_BASE64_PAYLOAD_HERE"></div>
<script src="password-protect.js"></script>
```

The `data-payload` value is the base64-encoded AES-GCM encrypted content. This is the string that was previously stored as `var pl = "..."` in old-style password pages.

## Step 3 — Add `noindex` meta tag

Password-protected pages should not be indexed:

```html
<meta name="robots" content="noindex, nofollow">
```

## Step 4 — Migrating from old inline password pages

If the target page has the old inline password protection (like the original `Norton.html`), follow these steps:

1. **Extract the payload**: Find `var pl = "..."` in the page's `<script>` block. Copy that base64 string.

2. **Remove old inline code**:
   - Remove all password dialog HTML (`#dialogWrap`, `#mainDialog`, `#passArea`, `#contentFrame`, etc.)
   - Remove all password dialog CSS (styles for `#pass`, `#submitPass`, `#dialogWrap`, `.lock-icon`, `#getInTouch`, etc.)
   - Remove the entire decryption `<script>` block (the IIFE containing `var pl = "..."`, `deriveKey()`, `doSubmit()`, `str2ab()`, etc.)

3. **Add the component**: Follow Steps 1–3 above with the extracted payload.

4. **Keep everything else**: Any other page content (navigation, styles, scripts) should remain untouched. The password dialog layers on top of the existing page.

## Step 5 — Verify

1. Open the page in a browser
2. Confirm the password dialog appears with:
   - Gradient background (blue → white → orange)
   - Lock icon
   - Password input field
   - Submit button (disabled until text is entered)
   - "Get in touch to request access" link
3. Enter the correct password and verify:
   - "Success!" message appears briefly
   - Dialog fades, iframe content loads full-screen
   - No console errors

## Reference files

- `Norton.html` — completed example of a password-protected page using this component
- `password-protect.js` — the component logic (decryption, dialog injection, iframe loading)
- `password-protect.css` — the component styles (dialog, input, button, layout)
