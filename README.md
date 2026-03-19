# AI Support Studio

A browser-first React app for two practical workflows:

- Prepare branded QR payment cards from an image or the first page of a PDF
- Reorder, rotate, split, extract, and merge PDF pages before export

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Netlify

This repo includes `netlify.toml`, so Netlify can use:

- Build command: `npm run build`
- Publish directory: `dist`

## Notes

- Everything runs client-side in the browser
- PDF previews are generated locally before export
- QR exports are saved as PNG files at 631 x 892 pixels
