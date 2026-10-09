import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFileSync } from 'node:fs';
const doc = await getDocument({ data: new Uint8Array(readFileSync(process.argv[2])) }).promise;
const page = await doc.getPage(Number(process.argv[3] ?? 1));
const { items } = await page.getTextContent();
for (const it of items) if (it.str.trim()) console.log(it.transform[4].toFixed(0), it.transform[5].toFixed(0), it.height.toFixed(1), JSON.stringify(it.str));
