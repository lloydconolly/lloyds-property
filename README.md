# Lloyds Property website

The website for lloydsproperty.com. It is a plain static site: one page (`index.html`), a thank-you page for the contact form (`thanks.html`) and an `images` folder. There is no build step and nothing to install.

Hosting: Netlify, connected to this repository. Every change pushed to `main` goes live automatically within a minute or so.

## Status: working draft

- Dotted underlines marked "to confirm" or "draft" are facts still to check. The "Hide review marks" button at the top of the page hides them for a cleaner look.
- Search engines are blocked (`robots.txt` and a `noindex` tag) until launch.

## Common changes

| To change | Where |
|---|---|
| Headline | `index.html`, the `<h1>` line. `data-pt="..."` holds the Portuguese version. |
| Any text | `index.html`, search for the words you want to change. |
| A project photo | Replace the file in `images/` with one of the same name (`nha-estate.jpg`, `holm.jpg`, `city-garden.jpg`). Landscape, about 1600 px wide. |
| Hero image | `images/hero.jpg` |
| Portugal image | `images/portugal-site-plan.jpg` |
| Link preview image | `images/share.jpg`, 1200 × 630 px |

To edit directly on GitHub: open the file, click the pencil icon, make the change, then "Commit changes".

## Contact form

The enquiry form uses Netlify Forms. Submissions appear in Netlify under **Forms > enquiry**. To have each one emailed: in Netlify, **Site configuration > Notifications > Emails and webhooks > Add notification > Email notification**, choose the `enquiry` form and enter your address.

## Launch checklist

1. Replace every "to confirm" and "draft" item with confirmed text, then remove the `review` bar block near the top of `index.html`.
2. Replace the three project photos with images you have permission to use.
3. Delete the line `<meta name="robots" content="noindex, nofollow">` in `index.html` and `thanks.html`.
4. Change `robots.txt` to:
   ```
   User-agent: *
   Allow: /
   ```
5. In Netlify, add the domain `lloydsproperty.com` and update the DNS at the domain registrar. Leave any `MX` (email) records untouched.
6. After the switch, check the padlock appears and send a test enquiry.

## Fonts

Headlines use Libre Caslon Text; everything else uses Cabin. Both are free Google Fonts, loaded from Google.
