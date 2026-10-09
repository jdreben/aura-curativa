import { PDFDocument } from 'pdf-lib';
import { readFileSync } from 'node:fs';
const doc = await PDFDocument.load(readFileSync(process.argv[2]));
for (const f of doc.getForm().getFields()) {
	for (const w of f.acroField.getWidgets()) {
		const r = w.getRectangle();
		console.log(f.constructor.name.replace('PDF', ''), JSON.stringify(f.getName()), [r.x, r.y, r.width, r.height].map((n) => Math.round(n)).join(','));
	}
}
