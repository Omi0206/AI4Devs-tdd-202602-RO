import { addCandidate } from '../application/services/candidateService';
import { Candidate } from '../domain/models/Candidate';
import { Education } from '../domain/models/Education';
import { WorkExperience } from '../domain/models/WorkExperience';
import { Resume } from '../domain/models/Resume';

jest.mock('../domain/models/Candidate');
jest.mock('../domain/models/Education');
jest.mock('../domain/models/WorkExperience');
jest.mock('../domain/models/Resume');

const MockedCandidate = Candidate as jest.MockedClass<typeof Candidate>;
const MockedEducation = Education as jest.MockedClass<typeof Education>;
const MockedWorkExperience = WorkExperience as jest.MockedClass<typeof WorkExperience>;
const MockedResume = Resume as jest.MockedClass<typeof Resume>;

const validPayload = {
  firstName: 'Albert',
  lastName: 'Saelices',
  email: 'albert@example.com',
};

const savedCandidateResult = { id: 1, ...validPayload };

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

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────
// US-001 — Add a New Candidate
// ─────────────────────────────────────────────
describe('US-001 — addCandidate service', () => {
  it('saves a candidate with required fields and returns the saved record', async () => {
    const mockInstance = makeMockCandidateInstance();
    MockedCandidate.mockImplementation(() => mockInstance as any);

    const result = await addCandidate(validPayload);

    expect(MockedCandidate).toHaveBeenCalledWith(validPayload);
    expect(mockInstance.save).toHaveBeenCalledTimes(1);
    expect(result).toEqual(savedCandidateResult);
  });

  it('saves a candidate with all optional fields', async () => {
    const fullPayload = {
      ...validPayload,
      phone: '612345678',
      address: 'Calle Mayor 1, Madrid',
    };
    const mockInstance = makeMockCandidateInstance({ id: 2, ...fullPayload });
    MockedCandidate.mockImplementation(() => mockInstance as any);

    const result = await addCandidate(fullPayload);

    expect(result).toMatchObject({ id: 2, email: 'albert@example.com' });
  });

  it('throws a validation error when firstName is missing', async () => {
    await expect(
      addCandidate({ lastName: 'Saelices', email: 'albert@example.com' })
    ).rejects.toThrow('Invalid name');
  });

  it('throws a validation error when lastName is missing', async () => {
    await expect(
      addCandidate({ firstName: 'Albert', email: 'albert@example.com' })
    ).rejects.toThrow('Invalid name');
  });

  it('throws a validation error when email is missing', async () => {
    await expect(
      addCandidate({ firstName: 'Albert', lastName: 'Saelices' })
    ).rejects.toThrow('Invalid email');
  });

  it('does not call Candidate.save when validation fails', async () => {
    const mockInstance = makeMockCandidateInstance();
    MockedCandidate.mockImplementation(() => mockInstance as any);

    await expect(addCandidate({})).rejects.toThrow();
    expect(mockInstance.save).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────
// US-002 — Prevent Duplicate Candidates
// ─────────────────────────────────────────────
describe('US-002 — Prevent Duplicate Candidates', () => {
  it('throws "The email already exists in the database" on Prisma P2002 error', async () => {
    const duplicateError = Object.assign(new Error('Unique constraint failed'), { code: 'P2002' });
    const mockInstance = makeMockCandidateInstance();
    mockInstance.save.mockRejectedValue(duplicateError);
    MockedCandidate.mockImplementation(() => mockInstance as any);

    await expect(addCandidate(validPayload)).rejects.toThrow(
      'The email already exists in the database'
    );
  });

  it('saves a candidate with a unique email successfully', async () => {
    const mockInstance = makeMockCandidateInstance();
    MockedCandidate.mockImplementation(() => mockInstance as any);

    await expect(addCandidate(validPayload)).resolves.toEqual(savedCandidateResult);
  });

  it('propagates non-duplicate DB errors unchanged', async () => {
    const dbError = new Error('DB connection refused');
    const mockInstance = makeMockCandidateInstance();
    mockInstance.save.mockRejectedValue(dbError);
    MockedCandidate.mockImplementation(() => mockInstance as any);

    await expect(addCandidate(validPayload)).rejects.toThrow('DB connection refused');
  });
});

// ─────────────────────────────────────────────
// US-004 — Add Education History to a Candidate
// ─────────────────────────────────────────────
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

    await addCandidate({ ...validPayload, educations: [education] });

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

    await addCandidate({ ...validPayload, educations: [education, edu2] });

    expect(MockedEducation).toHaveBeenCalledTimes(2);
    expect(mockEdu1.save).toHaveBeenCalledTimes(1);
    expect(mockEdu2.save).toHaveBeenCalledTimes(1);
  });

  it('saves a candidate without education records when educations is omitted', async () => {
    const mockCandidate = makeMockCandidateInstance();
    MockedCandidate.mockImplementation(() => mockCandidate as any);

    await addCandidate(validPayload);

    expect(MockedEducation).not.toHaveBeenCalled();
  });

  it('saves an ongoing education with no endDate', async () => {
    const ongoingEdu = { institution: 'UC3M', title: 'Computer Science', startDate: '2020-01-01' };
    const mockCandidate = makeMockCandidateInstance();
    const mockEdu = makeMockRelatedInstance();
    MockedCandidate.mockImplementation(() => mockCandidate as any);
    MockedEducation.mockImplementation(() => mockEdu as any);

    await expect(
      addCandidate({ ...validPayload, educations: [ongoingEdu] })
    ).resolves.not.toThrow();
    expect(mockEdu.save).toHaveBeenCalledTimes(1);
  });

  it('throws "Invalid institution" when education is missing institution', async () => {
    await expect(
      addCandidate({
        ...validPayload,
        educations: [{ title: 'Computer Science', startDate: '2006-12-31' }],
      })
    ).rejects.toThrow('Invalid institution');
  });

  it('throws "Invalid title" when education is missing title', async () => {
    await expect(
      addCandidate({
        ...validPayload,
        educations: [{ institution: 'UC3M', startDate: '2006-12-31' }],
      })
    ).rejects.toThrow('Invalid title');
  });

  it('throws "Invalid date" when education startDate is missing', async () => {
    await expect(
      addCandidate({
        ...validPayload,
        educations: [{ institution: 'UC3M', title: 'Computer Science' }],
      })
    ).rejects.toThrow('Invalid date');
  });
});

// ─────────────────────────────────────────────
// US-005 — Add Work Experience to a Candidate
// ─────────────────────────────────────────────
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

    await addCandidate({ ...validPayload, workExperiences: [experience] });

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

    await addCandidate({ ...validPayload, workExperiences: [experience, exp2] });

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
      addCandidate({ ...validPayload, workExperiences: [currentJob] })
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
      addCandidate({ ...validPayload, workExperiences: [noDesc] })
    ).resolves.not.toThrow();
  });

  it('saves a candidate without work experience when workExperiences is omitted', async () => {
    const mockCandidate = makeMockCandidateInstance();
    MockedCandidate.mockImplementation(() => mockCandidate as any);

    await addCandidate(validPayload);

    expect(MockedWorkExperience).not.toHaveBeenCalled();
  });

  it('throws "Invalid company" when work experience is missing company', async () => {
    await expect(
      addCandidate({
        ...validPayload,
        workExperiences: [{ position: 'SWE', startDate: '2011-01-13' }],
      })
    ).rejects.toThrow('Invalid company');
  });

  it('throws "Invalid position" when work experience is missing position', async () => {
    await expect(
      addCandidate({
        ...validPayload,
        workExperiences: [{ company: 'Coca Cola', startDate: '2011-01-13' }],
      })
    ).rejects.toThrow('Invalid position');
  });

  it('throws "Invalid date" when work experience startDate is missing', async () => {
    await expect(
      addCandidate({
        ...validPayload,
        workExperiences: [{ company: 'Coca Cola', position: 'SWE' }],
      })
    ).rejects.toThrow('Invalid date');
  });
});

// ─────────────────────────────────────────────
// US-006 — CV File Linked on Candidate Registration
// ─────────────────────────────────────────────
describe('US-006 — addCandidate with CV reference', () => {
  const cv = {
    filePath: 'uploads/1715760936750-cv.pdf',
    fileType: 'application/pdf',
  };

  it('saves a Resume record and links it to the candidate when cv is provided', async () => {
    const mockCandidate = makeMockCandidateInstance();
    const mockResume = makeMockRelatedInstance();
    MockedCandidate.mockImplementation(() => mockCandidate as any);
    MockedResume.mockImplementation(() => mockResume as any);

    await addCandidate({ ...validPayload, cv });

    expect(MockedResume).toHaveBeenCalledWith(cv);
    expect(mockResume.candidateId).toBe(savedCandidateResult.id);
    expect(mockResume.save).toHaveBeenCalledTimes(1);
  });

  it('does not create a Resume when cv is omitted', async () => {
    const mockCandidate = makeMockCandidateInstance();
    MockedCandidate.mockImplementation(() => mockCandidate as any);

    await addCandidate(validPayload);

    expect(MockedResume).not.toHaveBeenCalled();
  });

  it('does not create a Resume when cv is an empty object', async () => {
    const mockCandidate = makeMockCandidateInstance();
    MockedCandidate.mockImplementation(() => mockCandidate as any);

    await addCandidate({ ...validPayload, cv: {} });

    expect(MockedResume).not.toHaveBeenCalled();
  });

  it('throws "Invalid CV data" when filePath is missing from cv', async () => {
    await expect(
      addCandidate({ ...validPayload, cv: { fileType: 'application/pdf' } })
    ).rejects.toThrow('Invalid CV data');
  });

  it('throws "Invalid CV data" when fileType is missing from cv', async () => {
    await expect(
      addCandidate({ ...validPayload, cv: { filePath: 'uploads/cv.pdf' } })
    ).rejects.toThrow('Invalid CV data');
  });
});
