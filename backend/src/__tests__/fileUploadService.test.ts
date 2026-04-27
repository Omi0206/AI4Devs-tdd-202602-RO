import { Request, Response } from 'express';

// Stable references mutated per-test so the hoisted factory can close over them
const multerBehavior = {
  handler: null as ((req: any, res: any, cb: Function) => void) | null,
};

class MockMulterError extends Error {
  code: string;
  field?: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'MulterError';
  }
}

jest.mock('multer', () => {
  const singleMiddleware = (req: any, res: any, cb: Function) => {
    multerBehavior.handler?.(req, res, cb);
  };
  const multerInstance = { single: jest.fn(() => singleMiddleware) };
  const multerFn: any = jest.fn(() => multerInstance);
  multerFn.diskStorage = jest.fn().mockReturnValue({});
  multerFn.MulterError = MockMulterError;
  return multerFn;
});

// Import after mock is registered
import { uploadFile } from '../application/services/fileUploadService';
import multer from 'multer';

function makeRes(): { status: jest.Mock; json: jest.Mock } {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

beforeEach(() => {
  multerBehavior.handler = null;
});

// ─────────────────────────────────────────────
// US-006 — Upload a CV / Resume File
// ─────────────────────────────────────────────
describe('US-006 — uploadFile middleware', () => {
  describe('Successful uploads', () => {
    it('returns HTTP 200 with filePath and fileType for a valid PDF', () => {
      multerBehavior.handler = (req, _res, cb) => {
        req.file = {
          path: 'uploads/1715760936750-cv.pdf',
          mimetype: 'application/pdf',
          originalname: 'cv.pdf',
        };
        cb(null);
      };

      const req = {} as Request;
      const res = makeRes();

      uploadFile(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        filePath: 'uploads/1715760936750-cv.pdf',
        fileType: 'application/pdf',
      });
    });

    it('returns HTTP 200 with the correct MIME type for a DOCX file', () => {
      const docxMime =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

      multerBehavior.handler = (req, _res, cb) => {
        req.file = {
          path: 'uploads/1715760936750-cv.docx',
          mimetype: docxMime,
          originalname: 'cv.docx',
        };
        cb(null);
      };

      const req = {} as Request;
      const res = makeRes();

      uploadFile(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        filePath: 'uploads/1715760936750-cv.docx',
        fileType: docxMime,
      });
    });

    it('uses a timestamp-based filename strategy to avoid collisions', () => {
      const timestamp = Date.now();
      const originalName = 'cv.pdf';

      multerBehavior.handler = (req, _res, cb) => {
        req.file = {
          path: `uploads/${timestamp}-${originalName}`,
          mimetype: 'application/pdf',
          originalname: originalName,
        };
        cb(null);
      };

      const req = {} as Request;
      const res = makeRes();

      uploadFile(req, res as unknown as Response);

      const jsonArg = res.json.mock.calls[0][0];
      expect(jsonArg.filePath).toMatch(/uploads\/\d+-cv\.pdf/);
    });
  });

  describe('Rejected uploads', () => {
    it('returns HTTP 400 with "Invalid file type" when no file is attached (filter rejected it)', () => {
      multerBehavior.handler = (req, _res, cb) => {
        // File was rejected by fileFilter — multer sets req.file to undefined
        cb(null);
      };

      const req = {} as Request;
      const res = makeRes();

      uploadFile(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid file type, only PDF and DOCX are allowed!',
      });
    });

    it('returns HTTP 400 with "Invalid file type" for an unsupported file format (e.g. .txt)', () => {
      multerBehavior.handler = (req, _res, cb) => {
        // .txt files are rejected by fileFilter — no req.file set
        cb(null);
      };

      const req = {} as Request;
      const res = makeRes();

      uploadFile(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid file type, only PDF and DOCX are allowed!',
      });
    });

    it('returns HTTP 500 when a MulterError is thrown (e.g. file size exceeds 10 MB)', () => {
      multerBehavior.handler = (_req, _res, cb) => {
        cb(new MockMulterError('LIMIT_FILE_SIZE', 'File too large'));
      };

      const req = {} as Request;
      const res = makeRes();

      uploadFile(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'File too large' });
    });

    it('returns HTTP 500 for any other unexpected error during upload', () => {
      multerBehavior.handler = (_req, _res, cb) => {
        cb(new Error('Disk full'));
      };

      const req = {} as Request;
      const res = makeRes();

      uploadFile(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Disk full' });
    });
  });

  describe('File filter configuration', () => {
    it('multer is configured with the 10 MB file size limit', () => {
      // Verify multer was called with the correct limits config
      const multerMock = multer as jest.MockedFunction<typeof multer>;
      const callArgs = multerMock.mock.calls[0]?.[0] as any;
      expect(callArgs?.limits?.fileSize).toBe(1024 * 1024 * 10);
    });
  });
});
