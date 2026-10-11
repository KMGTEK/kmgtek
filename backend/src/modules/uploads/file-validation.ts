import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { UPLOAD_RULES, type UploadPurpose } from '@kmg/shared';

export interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Magic-number sniffing for the formats we accept. Implemented by hand because
 * `file-type` is ESM-only and this API compiles to CommonJS.
 */
export type SniffedType =
  | 'pdf'
  | 'zip' // docx (OOXML is a zip container)
  | 'ole' // legacy .doc
  | 'png'
  | 'jpg'
  | 'webp'
  | 'gif'
  | 'svg'
  | null;

const startsWith = (buffer: Buffer, bytes: number[], offset = 0): boolean =>
  buffer.length >= offset + bytes.length && bytes.every((byte, i) => buffer[offset + i] === byte);

export function sniffFileType(buffer: Buffer): SniffedType {
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46])) return 'pdf'; // %PDF
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]) || startsWith(buffer, [0x50, 0x4b, 0x05, 0x06]))
    return 'zip';
  if (startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return 'ole';
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png';
  if (startsWith(buffer, [0xff, 0xd8, 0xff])) return 'jpg';
  if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) && startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8))
    return 'webp';
  if (startsWith(buffer, [0x47, 0x49, 0x46, 0x38])) return 'gif';

  const head = buffer.subarray(0, 1024).toString('utf8').trim().toLowerCase();
  if (head.startsWith('<svg') || (head.startsWith('<?xml') && head.includes('<svg'))) return 'svg';
  return null;
}

/** Content types the sniffed signature is allowed to back. */
const MIME_SIGNATURES: Record<string, SniffedType[]> = {
  'application/pdf': ['pdf'],
  'application/msword': ['ole'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['zip'],
  'image/png': ['png'],
  'image/jpeg': ['jpg'],
  'image/webp': ['webp'],
  'image/gif': ['gif'],
  'image/svg+xml': ['svg'],
};

/**
 * Enforce the `UPLOAD_RULES` for a purpose: size, declared MIME type and the
 * actual file signature (so `resume.pdf` cannot really be an executable).
 *
 * ```ts
 * validateUpload(file, 'RESUME');
 * ```
 */
export function validateUpload(file: UploadedFileLike, purpose: UploadPurpose): void {
  const rules = UPLOAD_RULES[purpose];
  if (!rules) throw new BadRequestException(`Unknown upload purpose "${purpose}"`);

  if (!file?.buffer?.length) throw new BadRequestException('File is empty');
  if (file.size > rules.maxBytes) {
    throw new PayloadTooLargeException(
      `File is larger than ${Math.round(rules.maxBytes / (1024 * 1024))} MB`,
    );
  }

  const mimeType = (file.mimetype || '').split(';')[0].trim().toLowerCase();
  if (!rules.mimeTypes.includes(mimeType)) {
    throw new BadRequestException(
      `Unsupported file type "${mimeType || 'unknown'}". Allowed: ${rules.mimeTypes.join(', ')}`,
    );
  }

  const expected = MIME_SIGNATURES[mimeType];
  if (expected) {
    const actual = sniffFileType(file.buffer);
    if (!actual || !expected.includes(actual)) {
      throw new BadRequestException('File content does not match its type');
    }
  }
}

/** Storage folder per purpose, e.g. `resumes/2026/05/<random>.pdf`. */
export const UPLOAD_FOLDERS: Record<UploadPurpose, string> = {
  RESUME: 'resumes',
  COVER_LETTER: 'cover-letters',
  LOGO: 'branding',
  TEAM_PHOTO: 'team',
  BLOG_IMAGE: 'blog',
  CASE_STUDY_IMAGE: 'case-studies',
  AVATAR: 'avatars',
  GENERAL: 'general',
};
