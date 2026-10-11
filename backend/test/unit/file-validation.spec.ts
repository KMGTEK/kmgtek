import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { UPLOAD_RULES } from '@kmg/shared';
import { sniffFileType, validateUpload } from '../../src/modules/uploads/file-validation';

const bytes = (...values: number[]) => Buffer.from(values);
const PDF = Buffer.concat([bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34), Buffer.alloc(64)]);
const PNG = Buffer.concat([bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), Buffer.alloc(64)]);
const JPG = Buffer.concat([bytes(0xff, 0xd8, 0xff, 0xe0), Buffer.alloc(64)]);
const GIF = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(64)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), bytes(0, 0, 0, 0), Buffer.from('WEBP'), Buffer.alloc(64)]);
const DOCX = Buffer.concat([bytes(0x50, 0x4b, 0x03, 0x04), Buffer.alloc(64)]);
const DOC = Buffer.concat([bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1), Buffer.alloc(64)]);
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');
const ELF = Buffer.concat([bytes(0x7f, 0x45, 0x4c, 0x46), Buffer.alloc(64)]);

const file = (buffer: Buffer, mimetype: string, originalname = 'file', size = buffer.length) => ({
  buffer,
  mimetype,
  originalname,
  size,
});

describe('sniffFileType', () => {
  it.each([
    [PDF, 'pdf'],
    [PNG, 'png'],
    [JPG, 'jpg'],
    [GIF, 'gif'],
    [WEBP, 'webp'],
    [DOCX, 'zip'],
    [DOC, 'ole'],
    [SVG, 'svg'],
  ])('recognises %#', (buffer, expected) => {
    expect(sniffFileType(buffer as Buffer)).toBe(expected);
  });

  it('returns null for unknown content', () => {
    expect(sniffFileType(ELF)).toBeNull();
  });
});

describe('validateUpload', () => {
  it('accepts a genuine PDF resume', () => {
    expect(() => validateUpload(file(PDF, 'application/pdf', 'cv.pdf'), 'RESUME')).not.toThrow();
  });

  it('accepts a docx resume (zip container)', () => {
    const mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    expect(() => validateUpload(file(DOCX, mime, 'cv.docx'), 'RESUME')).not.toThrow();
  });

  it('accepts images for image purposes', () => {
    expect(() => validateUpload(file(PNG, 'image/png', 'logo.png'), 'LOGO')).not.toThrow();
    expect(() => validateUpload(file(SVG, 'image/svg+xml', 'logo.svg'), 'LOGO')).not.toThrow();
  });

  it('rejects a MIME type that is not allowed for the purpose', () => {
    expect(() => validateUpload(file(PNG, 'image/png', 'logo.png'), 'RESUME')).toThrow(
      BadRequestException,
    );
    // SVG is allowed for LOGO but not for TEAM_PHOTO.
    expect(() => validateUpload(file(SVG, 'image/svg+xml', 'team.svg'), 'TEAM_PHOTO')).toThrow(
      BadRequestException,
    );
  });

  it('rejects a file whose content does not match its declared type', () => {
    expect(() => validateUpload(file(ELF, 'application/pdf', 'malware.pdf'), 'RESUME')).toThrow(
      /content does not match/i,
    );
    expect(() => validateUpload(file(PDF, 'image/png', 'notreally.png'), 'BLOG_IMAGE')).toThrow(
      /content does not match/i,
    );
  });

  it('rejects files over the per-purpose size limit', () => {
    const tooBig = UPLOAD_RULES.RESUME.maxBytes + 1;
    expect(() => validateUpload(file(PDF, 'application/pdf', 'cv.pdf', tooBig), 'RESUME')).toThrow(
      PayloadTooLargeException,
    );
  });

  it('rejects empty uploads and unknown purposes', () => {
    expect(() => validateUpload(file(Buffer.alloc(0), 'application/pdf', 'cv.pdf'), 'RESUME')).toThrow(
      /empty/i,
    );
    expect(() => validateUpload(file(PDF, 'application/pdf'), 'NOT_A_PURPOSE' as never)).toThrow(
      /Unknown upload purpose/,
    );
  });

  it('tolerates a charset suffix on the declared MIME type', () => {
    expect(() =>
      validateUpload(file(SVG, 'image/svg+xml; charset=utf-8', 'logo.svg'), 'LOGO'),
    ).not.toThrow();
  });
});
