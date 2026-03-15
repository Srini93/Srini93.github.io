# Case Study Template — Schema & Agent Instructions

This document defines the **block-based case study format** used in this portfolio. Use it to turn an uploaded document (Word, Google Doc, Markdown, or plain text) into a well-formatted case study HTML page. The same schema can drive a **subagent** that accepts a doc and outputs HTML.

---

## 1. Overview

- **Template file:** `case-study-template.html`
- **Styles:** `style-2.css` (typography, layout) + `case-study-components.css` (cards, progress bar, slideshow, callout, back button)
- **Content wrapper:** Main content lives inside `<main class="frame">` with `max-width: 1440px` and centered layout.

**Block types** are marked with `data-block-type="..."` so agents can:
- Identify which blocks to emit
- Omit blocks that have no content in the source doc
- Reorder or repeat blocks as needed

---

## 2. Block Types Reference

| Block type | Purpose | When to use |
|------------|---------|-------------|
| `hero` | Title + full-width cover image | Start of every case study |
| `overview` | About the project + meta (role, timeline, platform) | Right after hero |
| `text_only` | Section heading + body, no image | Problem, vision, process, insights |
| `text_only_wide` | Same but single wider column | “My Role”, “Objective” |
| `image_full` | Single centered image, optional caption | Diagrams, flows, single screenshot |
| `image_with_text` | Image on one side, text on the other | Wireframes + description, mockup + insight |
| `cards` | 3-column insight cards with accent borders | User segments, key insights, takeaways |
| `callout` | Highlighted message (green box) | Quote, key takeaway, CTA |
| `slideshow` | Image carousel (Cycle.js) | Multiple screens, variants, before/after |
| `video_embed` | YouTube iframe | Demo, walkthrough |
| `video_native` | HTML5 &lt;video&gt; (e.g. .mp4) | Short clips, GIF-like |
| `back_button` | “Back to Works” link | End of case study |

---

## 3. Placeholders (Variables)

Replace these `{{PLACEHOLDER}}` strings when generating from a doc. Paths are relative to the case study HTML file (e.g. `images/case2/head.png`).

### Global / Hero
| Placeholder | Description | Example |
|-------------|-------------|--------|
| `{{TITLE}}` | Page &lt;title&gt; and context | `Zoho Sheet \| Spreadsheet Software` |
| `{{HERO_TITLE}}` | Main headline (can include &lt;br&gt;) | `Zoho Sheet - View, edit spreadsheets on your handhelds` |
| `{{HERO_IMAGE}}` | Hero/cover image path | `images/case2/head.png` |
| `{{HERO_IMAGE_ALT}}` | Alt text for hero image | `Zoho Sheet on mobile devices` |

### Overview
| Placeholder | Description |
|-------------|-------------|
| `{{ABOUT_PROJECT}}` | 1–3 paragraphs about the project |
| `{{PROJECT_TYPE}}` | e.g. “Work for Zoho Corporation - Product Design” |
| `{{TIMELINE}}` | e.g. “Jan 2016 - May 2017” |
| `{{PLATFORM}}` | e.g. “iOS & Android” or “iOS, Android & Web” |

### Text-only sections
| Placeholder | Description |
|-------------|-------------|
| `{{SECTION_HEADING}}` | e.g. “Problem”, “Vision and strategy” |
| `{{SECTION_BODY}}` | Body HTML (paragraphs, lists) |
| `{{ROLE_HEADING}}` | e.g. “My Role” |
| `{{ROLE_BODY}}` | Role description |

### Image
| Placeholder | Description |
|-------------|-------------|
| `{{IMAGE_SRC}}` | Image path |
| `{{IMAGE_ALT}}` | Alt text |
| `{{IMAGE_CAPTION}}` | Optional caption below image |
| `{{IMAGE_SECTION_HEADING}}` | Heading next to image (image_with_text) |
| `{{IMAGE_SECTION_BODY}}` | Body next to image (image_with_text) |

### Cards (repeat structure for 2–4 cards if needed)
| Placeholder | Description |
|-------------|-------------|
| `{{CARD_1_TITLE}}` | e.g. “Beginners” |
| `{{CARD_1_SUBTITLE}}` | Short line, e.g. “Uses spreadsheet at least once in 10 days” |
| `{{CARD_1_BODY}}` | Card body text |
| `{{CARD_2_*}}`, `{{CARD_3_*}}` | Same for 2nd and 3rd card |

### Callout
| Placeholder | Description |
|-------------|-------------|
| `{{CALLOUT_TITLE}}` | Callout heading |
| `{{CALLOUT_BODY}}` | Callout body |

### Slideshow
| Placeholder | Description |
|-------------|-------------|
| `{{SLIDE_1}}`, `{{SLIDE_2}}`, `{{SLIDE_3}}` | Image paths (add more &lt;div class="cycle-slide"&gt; if needed) |

### Video
| Placeholder | Description |
|-------------|-------------|
| `{{YOUTUBE_ID}}` | e.g. `JsoeU1jjdAU` from `https://www.youtube.com/embed/JsoeU1jjdAU` |
| `{{VIDEO_MP4}}` | Path to .mp4 file |
| `{{VIDEO_CAPTION}}` | Caption below video |

---

## 4. Mapping a Document to Blocks

### 4.1 Suggested flow for an agent

1. **Parse the uploaded doc** (text, headings, lists, images, links).
2. **Identify content types:**
   - Title / project name → `hero` (HERO_TITLE) + `TITLE`
   - Short “about” + role/timeline/platform → `overview`
   - Headings + paragraphs with no image → `text_only` or `text_only_wide`
   - Single standout image → `image_full`
   - Image + explanatory text → `image_with_text` (choose image_left or image_right from context)
   - 2–4 parallel insights or segments → `cards`
   - Highlighted quote or key message → `callout`
   - Multiple screens or variants → `slideshow`
   - Demo link (YouTube) → `video_embed`; local video → `video_native`
3. **Emit HTML** by copying the template and:
   - Replacing all `{{...}}` placeholders for the blocks you use.
   - **Removing** entire `&lt;section data-block-type="..."&gt;...&lt;/section&gt;` blocks that have no content.
   - Keeping block order logical (hero → overview → problem/context → process → visuals → results → back).
4. **Assets:** If the doc references images or videos, either use existing paths under `images/` or add placeholder paths and note in the response that the user should add the files.

### 4.2 Layout variants

- **image_with_text:** To put image on the right, swap the two inner divs (image div second). Optionally add `data-layout="image_right"` and use CSS if you need to drive layout from that.
- **cards:** For only 2 cards, use two `Card` divs and remove the third; keep class `Cards` on the parent. For 4+ cards, add more `Card` divs and consider `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));` in a custom style.

### 4.3 Optional page chrome

- **Nav + chatbot:** Use the skill in [`.cursor/skills/apply-nav-chatbot/SKILL.md`](.cursor/skills/apply-nav-chatbot/SKILL.md) to add the unified nav and chatbot to the generated case study page.
- **Reading progress bar:** The template includes the progress bar; remove the `header` + `progress-container` block if you don’t want it.
- **Slideshow:** If you use `slideshow`, uncomment and include `jquery.js` and `jquery.cycle2.js` in the page.

---

## 5. Subagent Usage

When building a **subagent** that “takes a doc and produces a case study”:

1. **Input:** Accept a document (file path or pasted content) and optionally:
   - Case study title/slug
   - Output path (e.g. `MyProject.html`)
   - Image folder (e.g. `images/case6/`)

2. **Instructions for the subagent:**
   - “Use the block types and placeholders in `CASE_STUDY_SCHEMA.md` and the structure in `case-study-template.html`.”
   - “Output one HTML file that uses `style-2.css` and `case-study-components.css`.”
   - “Only include sections for which the document provides content; remove unused blocks.”
   - “Preserve `data-block-type` on each section for future tooling.”

3. **Output:** Single HTML file (and optionally a short report: which blocks were used, which placeholders still need assets).

---

## 6. File Checklist

| File | Purpose |
|------|--------|
| `case-study-template.html` | Master template with all block patterns and placeholders |
| `case-study-components.css` | Styles for cards, progress bar, slideshow, callout, back button |
| `style-2.css` | Base typography and layout (.frame, .h1, .txt3, .txt4, .Container) |
| `CASE_STUDY_SCHEMA.md` | This schema and agent/subagent instructions |

Existing case studies (e.g. `Zoho Sheet.html`, `Holachef.html`, `Prioritize.html`, `zeta.html`) are real examples that follow these patterns; use them as reference for tone and structure when filling the template from a doc.

---

## 7. Machine-readable block spec (for subagents)

```json
{
  "blocks": [
    { "id": "hero", "required": true, "fields": ["HERO_TITLE", "HERO_IMAGE", "HERO_IMAGE_ALT"] },
    { "id": "overview", "required": true, "fields": ["ABOUT_PROJECT", "PROJECT_TYPE", "TIMELINE", "PLATFORM"] },
    { "id": "text_only", "required": false, "fields": ["SECTION_HEADING", "SECTION_BODY"] },
    { "id": "text_only_wide", "required": false, "fields": ["ROLE_HEADING", "ROLE_BODY"] },
    { "id": "image_full", "required": false, "fields": ["IMAGE_SRC", "IMAGE_ALT", "IMAGE_CAPTION"] },
    { "id": "image_with_text", "required": false, "fields": ["IMAGE_SRC", "IMAGE_ALT", "IMAGE_SECTION_HEADING", "IMAGE_SECTION_BODY"], "variants": ["image_left", "image_right"] },
    { "id": "cards", "required": false, "fields": ["CARD_1_TITLE", "CARD_1_SUBTITLE", "CARD_1_BODY", "CARD_2_TITLE", "CARD_2_SUBTITLE", "CARD_2_BODY", "CARD_3_TITLE", "CARD_3_SUBTITLE", "CARD_3_BODY"] },
    { "id": "callout", "required": false, "fields": ["CALLOUT_TITLE", "CALLOUT_BODY"] },
    { "id": "slideshow", "required": false, "fields": ["SLIDE_1", "SLIDE_2", "SLIDE_3"] },
    { "id": "video_embed", "required": false, "fields": ["YOUTUBE_ID", "VIDEO_CAPTION"] },
    { "id": "video_native", "required": false, "fields": ["VIDEO_MP4", "VIDEO_CAPTION"] },
    { "id": "back_button", "required": false, "fields": [] }
  ],
  "template_path": "case-study-template.html",
  "styles": ["style-2.css", "case-study-components.css"]
}
```
