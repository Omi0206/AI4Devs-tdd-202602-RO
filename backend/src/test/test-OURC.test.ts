/**
 * Consolidated test suite
 *
 * Mocking strategy:
 *  - candidateService is auto-mocked → used by controller tests (HTTP layer)
 *  - Domain models (Candidate, Education, WorkExperience, Resume) are auto-mocked → used by service tests
 *  - multer is mocked with a controllable handler → used by file-upload tests
 *  - Service tests call jest.requireActual to get the real addCandidate implementation
 *    while still using the mocked domain models.
 *  - validator tests need no mocks at all (pure functions).
 */

import { Request, Response } from 'express';

// ── multer mock setup (must be declared before jest.mock factory runs) ───────

const multerBehavior: {
  handler: ((req: any, res: any, cb: Function) => void) | null;
} = { handler: null };

class MockMulterError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'MulterError';
  }
}

// ── Mock registrations ────────────────────────────────────────────────────────

jest.mock('../application/services/candidateService');
jest.mock('../domain/models/Candidate');
jest.mock('../domain/models/Education');
jest.mock('../domain/models/WorkExperience');
jest.mock('../domain/models/Resume');
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

// ── Imports (after mock registrations) ───────────────────────────────────────

import { addCandidateController } from '../presentation/controllers/candidateController';
import { addCandidate } from '../application/services/candidateService';
import { Candidate } from '../domain/models/Candidate';
import { Education } from '../domain/models/Education';
import { WorkExperience } from '../domain/models/WorkExperience';
import { Resume } from '../domain/models/Resume';
import { uploadFile } from '../application/services/fileUploadService';
import multer from 'multer';
import { validateCandidateData } from '../application/validator';

// ── Typed mock references ─────────────────────────────────────────────────────

const mockAddCandidate = addCandidate as jest.MockedFunction<typeof addCandidate>;
const MockedCandidate = Candidate as jest.MockedClass<typeof Candidate>;
const MockedEducation = Education as jest.MockedClass<typeof Education>;
const MockedWorkExperience = WorkExperience as jest.MockedClass<typeof WorkExperience>;
const MockedResume = Resume as jest.MockedClass<typeof Resume>;

// Real service bypasses the auto-mock so service-layer tests can exercise real logic
const realAddCandidate: typeof addCandidate = (
  jest.requireActual('../application/services/candidateService') as any
).addCandidate;

// Captured once at module load before any beforeEach clears mock history
const multerInitConfig = (multer as jest.MockedFunction<typeof multer>).mock.calls[0]?.[0] as any;

// ── Shared test helpers ───────────────────────────────────────────────────────

const validPayload = {
  firstName: 'Albert',
  lastName: 'Saelices',
  email: 'albert@example.com',
};

const savedCandidateResult = { id: 1, ...validPayload };

function makeReqRes(body: object = {}) {
  const req = { body } as Request;
  const res = { status: jest.fn(), json: jest.fn() } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  (res.json as jest.Mock).mockReturnValue(res);
  return { req, res };
}

function makeUploadRes() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

function makeMockCandidateInstance(saveResult = savedCandidateResult) {
  return {
    save: jest.fn().mockResolvedValue(saveResult),
    education: [] as any[],
    workExperience: [] as any[],
    resumes: [] as any[],
    candidateId: undefined as number | undefined,
  };
}

function makeMockRelatedInstance() {
  return {
    save: jest.fn().mockResolvedValue({}),
    candidateId: undefined as number | undefined,
  };
}

// ── Global reset ──────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  multerBehavior.handler = null;
});

// =============================================================================
// CONTROLLER TESTS  (HTTP layer — candidateService is mocked)
// =============================================================================

describe('US-001 — addCandidateController', () => {
  const savedCandidate = { id: 1, ...validPayload };

  it('returns HTTP 201 with the created candidate on success', async () => {
    mockAddCandidate.mockResolvedValue(savedCandidate as any);
    const { req, res } = makeReqRes(validPayload);

    await addCandidateController(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Candidate added successfully',
      data: savedCandidate,
    });
  });

  it('calls addCandidate with the request body', async () => {
    mockAddCandidate.mockResolvedValue(savedCandidate as any);
    const { req, res } = makeReqRes(validPayload);

    await addCandidateController(req, res);

    expect(mockAddCandidate).toHaveBeenCalledWith(validPayload);
  });

  it('returns HTTP 400 with the error message when validation fails', async () => {
    mockAddCandidate.mockRejectedValue(new Error('Invalid name'));
    const { req, res } = makeReqRes({ lastName: 'Saelices', email: 'albert@example.com' });

    await addCandidateController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Error adding candidate',
      error: 'Invalid name',
    });
  });

  it('returns HTTP 400 when email is already in use (duplicate)', async () => {
    mockAddCandidate.mockRejectedValue(
      new Error('The email already exists in the database')
    );
    const { req, res } = makeReqRes(validPayload);

    await addCandidateController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Error adding candidate',
      error: 'The email already exists in the database',
    });
  });

  it('returns HTTP 400 with "Unknown error" for non-Error rejections', async () => {
    mockAddCandidate.mockRejectedValue('something went wrong');
    const { req, res } = makeReqRes(validPayload);

    await addCandidateController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Error adding candidate',
      error: 'Unknown error',
    });
  });

  it('returns HTTP 400 when email is invalid', async () => {
    mockAddCandidate.mockRejectedValue(new Error('Invalid email'));
    const { req, res } = makeReqRes({ ...validPayload, email: 'not-an-email' });

    await addCandidateController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid email' })
    );
  });

  it('returns HTTP 400 when phone format is invalid', async () => {
    mockAddCandidate.mockRejectedValue(new Error('Invalid phone'));
    const { req, res } = makeReqRes({ ...validPayload, phone: '123456789' });

    await addCandidateController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid phone' })
    );
  });
});

// =============================================================================
// SERVICE TESTS  (service layer — domain models are mocked, real addCandidate)
// =============================================================================

describe('US-001 — addCandidate service', () => {
  it('saves a candidate with required fields and returns the saved record', async () => {
    const mockInstance = makeMockCandidateInstance();
    MockedCandidate.mockImplementation(() => mockInstance as any);

    const result = await realAddCandidate(validPayload);

    expect(MockedCandidate).toHaveBeenCalledWith(validPayload);
    expect(mockInstance.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual(savedCandidateResult);
  });

  it('saves a candidate with all optional fields', async () => {
    const fullPayload = { ...validPayload, phone: '612345678', address: 'Calle Mayor 1, Madrid' };
    const mockInstance = makeMockCandidateInstance({ id: 2, ...fullPayload });
    MockedCandidate.mockImplementation(() => mockInstance as any);

    const result = await realAddCandidate(fullPayload);

    expect(result).toMatchObject({ id: 2, email: 'albert@example.com' });
  });

  it('throws a validation error when firstName is missing', async () => {
    await expect(
      realAddCandidate({ lastName: 'Saelices', email: 'albert@example.com' })
    ).rejects.toThrow('Invalid name');
  });

  it('throws a validation error when lastName is missing', async () => {
    await expect(
      realAddCandidate({ firstName: 'Albert', email: 'albert@example.com' })
    ).rejects.toThrow('Invalid name');
  });

  it('throws a validation error when email is missing', async () => {
    await expect(
      realAddCandidate({ firstName: 'Albert', lastName: 'Saelices' })
    ).rejects.toThrow('Invalid email');
  });

  it('does not call Candidate.save when validation fails', async () => {
    const mockInstance = makeMockCandidateInstance();
    MockedCandidate.mockImplementation(() => mockInstance as any);

    await expect(realAddCandidate({})).rejects.toThrow();
    expect(mockInstance.save).not.toHaveBeenCalled();
  });
});

describe('US-002 — Prevent Duplicate Candidates', () => {
  it('throws "The email already exists in the database" on Prisma P2002 error', async () => {
    const duplicateError = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    const mockInstance = makeMockCandidateInstance();
    mockInstance.save.mockRejectedValue(duplicateError);
    MockedCandidate.mockImplementation(() => mockInstance as any);

    await expect(realAddCandidate(validPayload)).rejects.toThrow(
      'The email already exists in the database'
    );
  });

  it('saves a candidate with a unique email successfully', async () => {
    const mockInstance = makeMockCandidateInstance();
    MockedCandidate.mockImplementation(() => mockInstance as any);

    await expect(realAddCandidate(validPayload)).resolves.toEqual(savedCandidateResult);
  });

  it('propagates non-duplicate DB errors unchanged', async () => {
    const dbError = new Error('DB connection refused');
    const mockInstance = makeMockCandidateInstance();
    mockInstance.save.mockRejectedValue(dbError);
    MockedCandidate.mockImplementation(() => mockInstance as any);

    await expect(realAddCandidate(validPayload)).rejects.toThrow('DB connection refused');
  });
});

describe('US-004 — addCandidate with education records', () => {
  const education = {
    institution: 'UC3M',
    title: 'Computer Science',
    startDate: '2006-12-31',
    endDate: '2010-12-26',
  };

  it('saves a single education record and links it to the candidate', async () => {
    const mockCandidate = makeMockCandidateInstance();
    const mockEdu = makeMockRelatedInstance();
    MockedCandidate.mockImplementation(() => mockCandidate as any);
    MockedEducation.mockImplementation(() => mockEdu as any);

    await realAddCandidate({ ...validPayload, educations: [education] });

    expect(MockedEducation).toHaveBeenCalledWith(education);
    expect(mockEdu.candidateId).toBe(savedCandidateResult.id);
    expect(mockEdu.save).toHaveBeenCalledTimes(1);
  });

  it('saves multiple education records', async () => {
    const edu2 = { institution: 'MIT', title: 'MBA', startDate: '2012-01-01', endDate: '2014-06-30' };
    const mockCandidate = makeMockCandidateInstance();
    const mockEdu1 = makeMockRelatedInstance();
    const mockEdu2 = makeMockRelatedInstance();
    MockedCandidate.mockImplementation(() => mockCandidate as any);
    MockedEducation.mockImplementationOnce(() => mockEdu1 as any)
                   .mockImplementationOnce(() => mockEdu2 as any);

    await realAddCandidate({ ...validPayload, educations: [education, edu2] });

    expect(MockedEducation).toHaveBeenCalledTimes(2);
    expect(mockEdu1.save).toHaveBeenCalledTimes(1);
    expect(mockEdu2.save).toHaveBeenCalledTimes(1);
  });

  it('saves a candidate without education records when educations is omitted', async () => {
    const mockCandidate = makeMockCandidateInstance();
    MockedCandidate.mockImplementation(() => mockCandidate as any);

    await realAddCandidate(validPayload);

    expect(MockedEducation).not.toHaveBeenCalled();
  });

  it('saves an ongoing education with no endDate', async () => {
    const ongoingEdu = { institution: 'UC3M', title: 'Computer Science', startDate: '2020-01-01' };
    const mockCandidate = makeMockCandidateInstance();
    const mockEdu = makeMockRelatedInstance();
    MockedCandidate.mockImplementation(() => mockCandidate as any);
    MockedEducation.mockImplementation(() => mockEdu as any);

    await expect(
      realAddCandidate({ ...validPayload, educations: [ongoingEdu] })
    ).resolves.not.toThrow();
    expect(mockEdu.save).toHaveBeenCalledTimes(1);
  });

  it('throws "Invalid institution" when education is missing institution', async () => {
    await expect(
      realAddCandidate({
        ...validPayload,
        educations: [{ title: 'Computer Science', startDate: '2006-12-31' }],
      })
    ).rejects.toThrow('Invalid institution');
  });

  it('throws "Invalid title" when education is missing title', async () => {
    await expect(
      realAddCandidate({
        ...validPayload,
        educations: [{ institution: 'UC3M', startDate: '2006-12-31' }],
      })
    ).rejects.toThrow('Invalid title');
  });

  it('throws "Invalid date" when education startDate is missing', async () => {
    await expect(
      realAddCandidate({
        ...validPayload,
        educations: [{ institution: 'UC3M', title: 'Computer Science' }],
      })
    ).rejects.toThrow('Invalid date');
  });
});

describe('US-005 — addCandidate with work experience records', () => {
  const experience = {
    company: 'Coca Cola',
    position: 'SWE',
    description: 'Backend dev',
    startDate: '2011-01-13',
    endDate: '2013-01-17',
  };

  it('saves a single work experience record and links it to the candidate', async () => {
    const mockCandidate = makeMockCandidateInstance();
    const mockExp = makeMockRelatedInstance();
    MockedCandidate.mockImplementation(() => mockCandidate as any);
    MockedWorkExperience.mockImplementation(() => mockExp as any);

    await realAddCandidate({ ...validPayload, workExperiences: [experience] });

    expect(MockedWorkExperience).toHaveBeenCalledWith(experience);
    expect(mockExp.candidateId).toBe(savedCandidateResult.id);
    expect(mockExp.save).toHaveBeenCalledTimes(1);
  });

  it('saves multiple work experience records', async () => {
    const exp2 = { company: 'Google', position: 'SRE', startDate: '2014-03-01', endDate: '2018-07-31' };
    const mockCandidate = makeMockCandidateInstance();
    const mockExp1 = makeMockRelatedInstance();
    const mockExp2 = makeMockRelatedInstance();
    MockedCandidate.mockImplementation(() => mockCandidate as any);
    MockedWorkExperience.mockImplementationOnce(() => mockExp1 as any)
                        .mockImplementationOnce(() => mockExp2 as any);

    await realAddCandidate({ ...validPayload, workExperiences: [experience, exp2] });

    expect(MockedWorkExperience).toHaveBeenCalledTimes(2);
    expect(mockExp1.save).toHaveBeenCalledTimes(1);
    expect(mockExp2.save).toHaveBeenCalledTimes(1);
  });

  it('saves a current position (no endDate) without error', async () => {
    const currentJob = { company: 'Coca Cola', position: 'SWE', startDate: '2022-03-01' };
    const mockCandidate = makeMockCandidateInstance();
    const mockExp = makeMockRelatedInstance();
    MockedCandidate.mockImplementation(() => mockCandidate as any);
    MockedWorkExperience.mockImplementation(() => mockExp as any);

    await expect(
      realAddCandidate({ ...validPayload, workExperiences: [currentJob] })
    ).resolves.not.toThrow();
    expect(mockExp.save).toHaveBeenCalledTimes(1);
  });

  it('saves an experience without description (optional field)', async () => {
    const { description, ...noDesc } = experience;
    const mockCandidate = makeMockCandidateInstance();
    const mockExp = makeMockRelatedInstance();
    MockedCandidate.mockImplementation(() => mockCandidate as any);
    MockedWorkExperience.mockImplementation(() => mockExp as any);

    await expect(
      realAddCandidate({ ...validPayload, workExperiences: [noDesc] })
    ).resolves.not.toThrow();
  });

  it('saves a candidate without work experience when workExperiences is omitted', async () => {
    const mockCandidate = makeMockCandidateInstance();
    MockedCandidate.mockImplementation(() => mockCandidate as any);

    await realAddCandidate(validPayload);

    expect(MockedWorkExperience).not.toHaveBeenCalled();
  });

  it('throws "Invalid company" when work experience is missing company', async () => {
    await expect(
      realAddCandidate({
        ...validPayload,
        workExperiences: [{ position: 'SWE', startDate: '2011-01-13' }],
      })
    ).rejects.toThrow('Invalid company');
  });

  it('throws "Invalid position" when work experience is missing position', async () => {
    await expect(
      realAddCandidate({
        ...validPayload,
        workExperiences: [{ company: 'Coca Cola', startDate: '2011-01-13' }],
      })
    ).rejects.toThrow('Invalid position');
  });

  it('throws "Invalid date" when work experience startDate is missing', async () => {
    await expect(
      realAddCandidate({
        ...validPayload,
        workExperiences: [{ company: 'Coca Cola', position: 'SWE' }],
      })
    ).rejects.toThrow('Invalid date');
  });
});

describe('US-006 — addCandidate with CV reference', () => {
  const cv = { filePath: 'uploads/1715760936750-cv.pdf', fileType: 'application/pdf' };

  it('saves a Resume record and links it to the candidate when cv is provided', async () => {
    const mockCandidate = makeMockCandidateInstance();
    const mockResume = makeMockRelatedInstance();
    MockedCandidate.mockImplementation(() => mockCandidate as any);
    MockedResume.mockImplementation(() => mockResume as any);

    await realAddCandidate({ ...validPayload, cv });

    expect(MockedResume).toHaveBeenCalledWith(cv);
    expect(mockResume.candidateId).toBe(savedCandidateResult.id);
    expect(mockResume.save).toHaveBeenCalledTimes(1);
  });

  it('does not create a Resume when cv is omitted', async () => {
    const mockCandidate = makeMockCandidateInstance();
    MockedCandidate.mockImplementation(() => mockCandidate as any);

    await realAddCandidate(validPayload);

    expect(MockedResume).not.toHaveBeenCalled();
  });

  it('does not create a Resume when cv is an empty object', async () => {
    const mockCandidate = makeMockCandidateInstance();
    MockedCandidate.mockImplementation(() => mockCandidate as any);

    await realAddCandidate({ ...validPayload, cv: {} });

    expect(MockedResume).not.toHaveBeenCalled();
  });

  it('throws "Invalid CV data" when filePath is missing from cv', async () => {
    await expect(
      realAddCandidate({ ...validPayload, cv: { fileType: 'application/pdf' } })
    ).rejects.toThrow('Invalid CV data');
  });

  it('throws "Invalid CV data" when fileType is missing from cv', async () => {
    await expect(
      realAddCandidate({ ...validPayload, cv: { filePath: 'uploads/cv.pdf' } })
    ).rejects.toThrow('Invalid CV data');
  });
});

// =============================================================================
// FILE UPLOAD TESTS  (multer is mocked with controllable handler)
// =============================================================================

describe('US-006 — uploadFile middleware', () => {
  describe('Successful uploads', () => {
    it('returns HTTP 200 with filePath and fileType for a valid PDF', () => {
      multerBehavior.handler = (req, _res, cb) => {
        req.file = { path: 'uploads/1715760936750-cv.pdf', mimetype: 'application/pdf', originalname: 'cv.pdf' };
        cb(null);
      };

      const req = {} as Request;
      const res = makeUploadRes();

      uploadFile(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        filePath: 'uploads/1715760936750-cv.pdf',
        fileType: 'application/pdf',
      });
    });

    it('returns HTTP 200 with the correct MIME type for a DOCX file', () => {
      const docxMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      multerBehavior.handler = (req, _res, cb) => {
        req.file = { path: 'uploads/1715760936750-cv.docx', mimetype: docxMime, originalname: 'cv.docx' };
        cb(null);
      };

      const req = {} as Request;
      const res = makeUploadRes();

      uploadFile(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        filePath: 'uploads/1715760936750-cv.docx',
        fileType: docxMime,
      });
    });

    it('uses a timestamp-based filename strategy to avoid collisions', () => {
      const timestamp = Date.now();
      multerBehavior.handler = (req, _res, cb) => {
        req.file = { path: `uploads/${timestamp}-cv.pdf`, mimetype: 'application/pdf', originalname: 'cv.pdf' };
        cb(null);
      };

      const req = {} as Request;
      const res = makeUploadRes();

      uploadFile(req, res as unknown as Response);

      expect((res.json.mock.calls[0][0] as any).filePath).toMatch(/uploads\/\d+-cv\.pdf/);
    });
  });

  describe('Rejected uploads', () => {
    it('returns HTTP 400 with "Invalid file type" when no file is attached (filter rejected it)', () => {
      multerBehavior.handler = (_req, _res, cb) => { cb(null); };

      const req = {} as Request;
      const res = makeUploadRes();

      uploadFile(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid file type, only PDF and DOCX are allowed!',
      });
    });

    it('returns HTTP 400 with "Invalid file type" for an unsupported file format (e.g. .txt)', () => {
      multerBehavior.handler = (_req, _res, cb) => { cb(null); };

      const req = {} as Request;
      const res = makeUploadRes();

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
      const res = makeUploadRes();

      uploadFile(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'File too large' });
    });

    it('returns HTTP 500 for any other unexpected error during upload', () => {
      multerBehavior.handler = (_req, _res, cb) => { cb(new Error('Disk full')); };

      const req = {} as Request;
      const res = makeUploadRes();

      uploadFile(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Disk full' });
    });
  });

  describe('File filter configuration', () => {
    it('multer is configured with the 10 MB file size limit', () => {
      expect(multerInitConfig?.limits?.fileSize).toBe(1024 * 1024 * 10);
    });
  });
});

// =============================================================================
// VALIDATOR TESTS  (pure functions — no mocks needed)
// =============================================================================

describe('US-001 — Add a New Candidate (validator)', () => {
  const base = { firstName: 'Albert', lastName: 'Saelices', email: 'albert@example.com' };

  it('accepts a candidate with only the required fields', () => {
    expect(() => validateCandidateData(base)).not.toThrow();
  });

  it('accepts a candidate with all optional fields filled in', () => {
    expect(() =>
      validateCandidateData({ ...base, phone: '612345678', address: 'Calle Mayor 1, Madrid' })
    ).not.toThrow();
  });

  it('rejects when firstName is missing — returns "Invalid name"', () => {
    expect(() =>
      validateCandidateData({ lastName: 'Saelices', email: 'albert@example.com' })
    ).toThrow('Invalid name');
  });

  it('rejects when lastName is missing — returns "Invalid name"', () => {
    expect(() =>
      validateCandidateData({ firstName: 'Albert', email: 'albert@example.com' })
    ).toThrow('Invalid name');
  });

  it('rejects when email is missing — returns "Invalid email"', () => {
    expect(() =>
      validateCandidateData({ firstName: 'Albert', lastName: 'Saelices' })
    ).toThrow('Invalid email');
  });

  it('rejects a firstName longer than 100 characters — returns "Invalid name"', () => {
    expect(() => validateCandidateData({ ...base, firstName: 'A'.repeat(101) })).toThrow('Invalid name');
  });

  it('rejects a firstName with numbers or symbols — returns "Invalid name"', () => {
    expect(() => validateCandidateData({ ...base, firstName: 'John123' })).toThrow('Invalid name');
  });

  it('rejects a firstName shorter than 2 characters — returns "Invalid name"', () => {
    expect(() => validateCandidateData({ ...base, firstName: 'A' })).toThrow('Invalid name');
  });

  it('accepts firstName with exactly 2 characters', () => {
    expect(() => validateCandidateData({ ...base, firstName: 'Al' })).not.toThrow();
  });

  it('accepts firstName with exactly 100 characters', () => {
    expect(() => validateCandidateData({ ...base, firstName: 'A'.repeat(100) })).not.toThrow();
  });

  it('rejects an address longer than 100 characters — returns "Invalid address"', () => {
    expect(() => validateCandidateData({ ...base, address: 'A'.repeat(101) })).toThrow('Invalid address');
  });

  it('accepts an address with exactly 100 characters', () => {
    expect(() => validateCandidateData({ ...base, address: 'A'.repeat(100) })).not.toThrow();
  });

  it('rejects an empty payload', () => {
    expect(() => validateCandidateData({})).toThrow();
  });

  it('skips all validation when an id is provided (edit mode)', () => {
    expect(() => validateCandidateData({ id: 1 })).not.toThrow();
  });
});

describe('US-003 — Validate Email and Phone Format (validator)', () => {
  const base = { firstName: 'John', lastName: 'Doe' };

  describe('Email validation', () => {
    it('accepts a well-formed email', () => {
      expect(() =>
        validateCandidateData({ ...base, email: 'john.doe@company.co.uk' })
      ).not.toThrow();
    });

    it('rejects "not-an-email" — returns "Invalid email"', () => {
      expect(() =>
        validateCandidateData({ ...base, email: 'not-an-email' })
      ).toThrow('Invalid email');
    });

    it('rejects an email without a domain — returns "Invalid email"', () => {
      expect(() => validateCandidateData({ ...base, email: 'john@' })).toThrow('Invalid email');
    });

    it('rejects an email with consecutive dots — returns "Invalid email"', () => {
      expect(() =>
        validateCandidateData({ ...base, email: 'john..doe@example.com' })
      ).toThrow('Invalid email');
    });
  });

  describe('Phone validation', () => {
    it('accepts a valid Spanish phone starting with 6', () => {
      expect(() =>
        validateCandidateData({ ...base, email: 'john@example.com', phone: '612345678' })
      ).not.toThrow();
    });

    it('accepts a valid Spanish phone starting with 7', () => {
      expect(() =>
        validateCandidateData({ ...base, email: 'john@example.com', phone: '712345678' })
      ).not.toThrow();
    });

    it('accepts a valid Spanish phone starting with 9', () => {
      expect(() =>
        validateCandidateData({ ...base, email: 'john@example.com', phone: '912345678' })
      ).not.toThrow();
    });

    it('accepts a candidate with no phone (phone is optional)', () => {
      expect(() =>
        validateCandidateData({ ...base, email: 'john@example.com' })
      ).not.toThrow();
    });

    it('rejects a phone starting with 1 — returns "Invalid phone"', () => {
      expect(() =>
        validateCandidateData({ ...base, email: 'john@example.com', phone: '123456789' })
      ).toThrow('Invalid phone');
    });

    it('rejects a phone starting with 8 — returns "Invalid phone"', () => {
      expect(() =>
        validateCandidateData({ ...base, email: 'john@example.com', phone: '812345678' })
      ).toThrow('Invalid phone');
    });

    it('rejects a phone with fewer than 9 digits — returns "Invalid phone"', () => {
      expect(() =>
        validateCandidateData({ ...base, email: 'john@example.com', phone: '61234' })
      ).toThrow('Invalid phone');
    });

    it('rejects a phone with more than 9 digits — returns "Invalid phone"', () => {
      expect(() =>
        validateCandidateData({ ...base, email: 'john@example.com', phone: '6123456789' })
      ).toThrow('Invalid phone');
    });

    it('rejects a phone containing letters — returns "Invalid phone"', () => {
      expect(() =>
        validateCandidateData({ ...base, email: 'john@example.com', phone: '6ABCDEFGH' })
      ).toThrow('Invalid phone');
    });
  });
});

describe('US-004 — Add Education History to a Candidate (validator)', () => {
  const baseCandidate = { firstName: 'Albert', lastName: 'Saelices', email: 'albert@example.com' };
  const validEducation = { institution: 'UC3M', title: 'Computer Science', startDate: '2006-12-31', endDate: '2010-12-26' };

  it('accepts a candidate with one valid education record', () => {
    expect(() =>
      validateCandidateData({ ...baseCandidate, educations: [validEducation] })
    ).not.toThrow();
  });

  it('accepts a candidate with multiple education records', () => {
    const secondEdu = { institution: 'MIT', title: 'MBA', startDate: '2012-01-01', endDate: '2014-06-30' };
    expect(() =>
      validateCandidateData({ ...baseCandidate, educations: [validEducation, secondEdu] })
    ).not.toThrow();
  });

  it('accepts an ongoing education with no endDate', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        educations: [{ institution: 'UC3M', title: 'Computer Science', startDate: '2020-01-01' }],
      })
    ).not.toThrow();
  });

  it('accepts a candidate with no educations field', () => {
    expect(() => validateCandidateData(baseCandidate)).not.toThrow();
  });

  it('rejects an education without institution — returns "Invalid institution"', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        educations: [{ title: 'Computer Science', startDate: '2006-12-31' }],
      })
    ).toThrow('Invalid institution');
  });

  it('rejects an institution name longer than 100 characters — returns "Invalid institution"', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        educations: [{ ...validEducation, institution: 'A'.repeat(101) }],
      })
    ).toThrow('Invalid institution');
  });

  it('rejects an education without title — returns "Invalid title"', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        educations: [{ institution: 'UC3M', startDate: '2006-12-31' }],
      })
    ).toThrow('Invalid title');
  });

  it('rejects a title longer than 100 characters — returns "Invalid title"', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        educations: [{ ...validEducation, title: 'A'.repeat(101) }],
      })
    ).toThrow('Invalid title');
  });

  it('rejects an education without startDate — returns "Invalid date"', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        educations: [{ institution: 'UC3M', title: 'Computer Science' }],
      })
    ).toThrow('Invalid date');
  });

  it('rejects a startDate in non-ISO format "31/12/2006" — returns "Invalid date"', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        educations: [{ ...validEducation, startDate: '31/12/2006' }],
      })
    ).toThrow('Invalid date');
  });

  it('rejects an endDate in non-ISO format "December 2010" — returns "Invalid end date"', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        educations: [{ ...validEducation, endDate: 'December 2010' }],
      })
    ).toThrow('Invalid end date');
  });

  it('rejects an endDate that is before startDate', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        educations: [{ ...validEducation, startDate: '2010-01-01', endDate: '2005-01-01' }],
      })
    ).toThrow();
  });
});

describe('US-005 — Add Work Experience to a Candidate (validator)', () => {
  const baseCandidate = { firstName: 'Albert', lastName: 'Saelices', email: 'albert@example.com' };
  const validExperience = {
    company: 'Coca Cola',
    position: 'SWE',
    description: 'Backend dev',
    startDate: '2011-01-13',
    endDate: '2013-01-17',
  };

  it('accepts a candidate with one valid work experience entry', () => {
    expect(() =>
      validateCandidateData({ ...baseCandidate, workExperiences: [validExperience] })
    ).not.toThrow();
  });

  it('accepts a candidate with multiple work experience entries', () => {
    const second = { company: 'Google', position: 'SRE', startDate: '2014-03-01', endDate: '2018-07-31' };
    expect(() =>
      validateCandidateData({ ...baseCandidate, workExperiences: [validExperience, second] })
    ).not.toThrow();
  });

  it('accepts a current position with no endDate', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        workExperiences: [{ company: 'Coca Cola', position: 'SWE', startDate: '2022-03-01' }],
      })
    ).not.toThrow();
  });

  it('accepts a work experience without description (optional)', () => {
    const { description, ...noDesc } = validExperience;
    expect(() =>
      validateCandidateData({ ...baseCandidate, workExperiences: [noDesc] })
    ).not.toThrow();
  });

  it('accepts a candidate with no workExperiences field', () => {
    expect(() => validateCandidateData(baseCandidate)).not.toThrow();
  });

  it('rejects a work experience without company — returns "Invalid company"', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        workExperiences: [{ position: 'SWE', startDate: '2011-01-13' }],
      })
    ).toThrow('Invalid company');
  });

  it('rejects a company name longer than 100 characters — returns "Invalid company"', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        workExperiences: [{ ...validExperience, company: 'A'.repeat(101) }],
      })
    ).toThrow('Invalid company');
  });

  it('rejects a work experience without position — returns "Invalid position"', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        workExperiences: [{ company: 'Coca Cola', startDate: '2011-01-13' }],
      })
    ).toThrow('Invalid position');
  });

  it('rejects a position longer than 100 characters — returns "Invalid position"', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        workExperiences: [{ ...validExperience, position: 'A'.repeat(101) }],
      })
    ).toThrow('Invalid position');
  });

  it('rejects a description longer than 200 characters — returns "Invalid description"', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        workExperiences: [{ ...validExperience, description: 'A'.repeat(201) }],
      })
    ).toThrow('Invalid description');
  });

  it('accepts a description with exactly 200 characters', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        workExperiences: [{ ...validExperience, description: 'A'.repeat(200) }],
      })
    ).not.toThrow();
  });

  it('rejects a work experience without startDate — returns "Invalid date"', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        workExperiences: [{ company: 'Coca Cola', position: 'SWE' }],
      })
    ).toThrow('Invalid date');
  });

  it('rejects a startDate in non-ISO format "January 2011" — returns "Invalid date"', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        workExperiences: [{ ...validExperience, startDate: 'January 2011' }],
      })
    ).toThrow('Invalid date');
  });

  it('rejects an endDate that is before startDate', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        workExperiences: [{ ...validExperience, startDate: '2013-01-01', endDate: '2011-01-01' }],
      })
    ).toThrow();
  });
});

describe('US-006 — CV Field Validation on Candidate Payload (validator)', () => {
  const baseCandidate = { firstName: 'Albert', lastName: 'Saelices', email: 'albert@example.com' };

  it('accepts a candidate with a valid cv reference', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        cv: { filePath: 'uploads/1715760936750-cv.pdf', fileType: 'application/pdf' },
      })
    ).not.toThrow();
  });

  it('rejects a cv missing filePath — returns "Invalid CV data"', () => {
    expect(() =>
      validateCandidateData({ ...baseCandidate, cv: { fileType: 'application/pdf' } })
    ).toThrow('Invalid CV data');
  });

  it('rejects a cv missing fileType — returns "Invalid CV data"', () => {
    expect(() =>
      validateCandidateData({ ...baseCandidate, cv: { filePath: 'uploads/1715760936750-cv.pdf' } })
    ).toThrow('Invalid CV data');
  });

  it('ignores an empty cv object (treated as no CV provided)', () => {
    expect(() => validateCandidateData({ ...baseCandidate, cv: {} })).not.toThrow();
  });

  it('accepts a candidate with no cv field', () => {
    expect(() => validateCandidateData(baseCandidate)).not.toThrow();
  });
});
