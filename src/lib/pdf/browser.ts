import { asset } from '$app/paths';
import type { ClaimPayload } from '../claim.ts';
import { buildTripleSPacket } from './packet.ts';
import type { PacketOptions } from './packet.ts';

export async function packetObjectUrl(payload: ClaimPayload, opts: PacketOptions = {}): Promise<string> {
	const res = await fetch(asset('forms/triple-s-reembolso.pdf'));
	if (!res.ok) throw new Error(`no se pudo cargar el formulario (${res.status})`);
	const template = new Uint8Array(await res.arrayBuffer());
	const bytes = await buildTripleSPacket(template, payload.provider, payload.visit, payload.patient, opts);
	return URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }));
}
