import { PDFDocument } from 'pdf-lib';
import { readFileSync, writeFileSync } from 'node:fs';
const [input, outDir] = process.argv.slice(2);
const src = await PDFDocument.load(readFileSync(input));
for (const i of src.getPageIndices()) {
	const d = await PDFDocument.create();
	const [p] = await d.copyPages(src, [i]);
	d.addPage(p);
	writeFileSync(`${outDir}/page-${i + 1}.pdf`, await d.save());
}
