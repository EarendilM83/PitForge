# SEO tab UX analysis — Yoast patterns → PitForge

Goal: make the SEO tab explainable to a non-technical marketer in one walkthrough.
Reference: Yoast SEO (WordPress), plus the Atlassian Design System for the overall chrome.

## Yoast patterns adopted

| Yoast pattern | What it does for the user | Where it lives in PitForge |
|---|---|---|
| **Focus keyphrase first** | Anchors the whole analysis to one business question: "what do we want to rank for?" | Top card of the SEO tab. The usage row (H1 / URL / Title / Meta / Body ×N) renders as green/grey stat pills that react live. |
| **Google snippet preview above the editor** | People understand "this is what shows up in Google" instantly; editing right under it makes the cause/effect obvious. | "Google preview" card: a result-styled preview (site name, URL breadcrumb, blue title, grey description) with SEO title, slug and meta description inputs directly beneath ("snippet editor"), each with a slim length meter. |
| **Traffic-light findings** | Red/orange/green dots let anyone triage without reading. | Every check row starts with a coloured dot: red = fail, orange = warn, green = pass. |
| **Groups: Problems / Improvements / Good results** | Separates "must fix" from "nice to have" from "working" — and collapsing the green group keeps the list short. | The 15 checks are grouped exactly this way, with count lozenges in the group headers. Problems and Improvements default open; Good results collapsed. |
| **Plain-language headlines** | "Meta description length", never `desc-length`. | A `CHECK_TITLES` map translates every check ID to a marketer-readable headline. The field keys still exist, but small, monospace, secondary. |
| **Expandable findings with a fix** | Detail on demand: what’s wrong, and one sentence on how to fix it. | Each finding expands (`<details>`) to show the technical detail plus a "How to fix:" line. |

## What we deliberately did differently

- **Everything stays editable in place.** Yoast splits snippet editing across metaboxes; PitForge keeps title/slug/description directly under the preview because our preview is live, not a mock.
- **"Follows the page content" badges** replace Yoast's manual duplication: derived fields (title, description, slug, social image) track the page's real H1/subtitle until the user overrides them, and can be reset with one click. This is the derivative-sync concept Yoast doesn't have.
- **Blocked schema types are explained, not just hidden.** Review/Product/AggregateRating/Offer are not selectable, and the card says why (self-assigned ratings on affiliate pages draw manual actions).

## Atlassian Design System mapping (whole Studio chrome)

- **Palette:** app background `#F7F8F9`, white card surfaces, hairline borders `#091E4224`, text `#172B4D`, secondary `#44546F`/`#626F86`, accent `#0C66E4`, status green/orange/red with tinted backgrounds (`#DCFFF1`, `#FFF7ED`, `#FFEBEB`, info `#E9F2FF`).
- **Type:** system stack, 14px base, 600-weight card titles, sentence case everywhere.
- **Spacing & shape:** 8px spacing grid, 3px radius on controls, 8px on cards, borders instead of shadows.
- **Components:** underline tabs in the topbar; segmented controls (rail panels, canvas widths); lozenges for Saved / Saving…, group counts, follow-state badges; one primary action per view (accent "Download ZIP").

## Before / after

Screenshots in `shots/`: `admin-seo-before.png` vs `admin-seo-full-after.png` (full tab),
`admin-edit-before.png` vs `admin-edit-after2.png` (edit tab + inspector).

## WordPress flow (follow-up)

The tabs were a developer model; the Studio now follows WordPress:

- **Sites list** = WP "Pages" screen: a table of sites with Edit/Export actions.
- **Editor** = Gutenberg: the canvas is the default view, no mode tabs. The right
  sidebar has "Page" (the Yoast panels from above, now as collapsible accordions)
  and "Field" (the inspector for the selected element). Like Gutenberg's Post/Block
  tabs, selecting an element on the canvas switches the sidebar to "Field"
  automatically.
- **List view** = Gutenberg's document outline, as a left overlay.
- **Preview** = WP Preview: a canvas mode with an explicit exit, not a separate tab.
The SEO panels themselves are unchanged — same Yoast patterns, narrower frame.
