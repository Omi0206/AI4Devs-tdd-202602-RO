import { validateCandidateData } from '../application/validator';

// ─────────────────────────────────────────────
// US-001 — Add a New Candidate
// ─────────────────────────────────────────────
describe('US-001 — Add a New Candidate', () => {
  const base = {
    firstName: 'Albert',
    lastName: 'Saelices',
    email: 'albert@example.com',
  };

  it('accepts a candidate with only the required fields', () => {
    expect(() => validateCandidateData(base)).not.toThrow();
  });

  it('accepts a candidate with all optional fields filled in', () => {
    expect(() =>
      validateCandidateData({
        ...base,
        phone: '612345678',
        address: 'Calle Mayor 1, Madrid',
      })
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
    expect(() =>
      validateCandidateData({ ...base, firstName: 'A'.repeat(101) })
    ).toThrow('Invalid name');
  });

  it('rejects a firstName with numbers or symbols — returns "Invalid name"', () => {
    expect(() =>
      validateCandidateData({ ...base, firstName: 'John123' })
    ).toThrow('Invalid name');
  });

  it('rejects a firstName shorter than 2 characters — returns "Invalid name"', () => {
    expect(() =>
      validateCandidateData({ ...base, firstName: 'A' })
    ).toThrow('Invalid name');
  });

  it('accepts firstName with exactly 2 characters', () => {
    expect(() => validateCandidateData({ ...base, firstName: 'Al' })).not.toThrow();
  });

  it('accepts firstName with exactly 100 characters', () => {
    expect(() =>
      validateCandidateData({ ...base, firstName: 'A'.repeat(100) })
    ).not.toThrow();
  });

  it('rejects an address longer than 100 characters — returns "Invalid address"', () => {
    expect(() =>
      validateCandidateData({ ...base, address: 'A'.repeat(101) })
    ).toThrow('Invalid address');
  });

  it('accepts an address with exactly 100 characters', () => {
    expect(() =>
      validateCandidateData({ ...base, address: 'A'.repeat(100) })
    ).not.toThrow();
  });

  it('rejects an empty payload', () => {
    expect(() => validateCandidateData({})).toThrow();
  });

  it('skips all validation when an id is provided (edit mode)', () => {
    expect(() => validateCandidateData({ id: 1 })).not.toThrow();
  });
});

// ─────────────────────────────────────────────
// US-003 — Validate Email and Phone Format
// ─────────────────────────────────────────────
describe('US-003 — Validate Email and Phone Format', () => {
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
      expect(() =>
        validateCandidateData({ ...base, email: 'john@' })
      ).toThrow('Invalid email');
    });

    // NOTE: current regex allows consecutive dots — test documents expected stricter behaviour
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

// ─────────────────────────────────────────────
// US-004 — Add Education History to a Candidate
// ─────────────────────────────────────────────
describe('US-004 — Add Education History to a Candidate', () => {
  const baseCandidate = {
    firstName: 'Albert',
    lastName: 'Saelices',
    email: 'albert@example.com',
  };

  const validEducation = {
    institution: 'UC3M',
    title: 'Computer Science',
    startDate: '2006-12-31',
    endDate: '2010-12-26',
  };

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

  // NOTE: date-range check not yet implemented — test documents required business rule
  it('rejects an endDate that is before startDate', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        educations: [{ ...validEducation, startDate: '2010-01-01', endDate: '2005-01-01' }],
      })
    ).toThrow();
  });
});

// ─────────────────────────────────────────────
// US-005 — Add Work Experience to a Candidate
// ─────────────────────────────────────────────
describe('US-005 — Add Work Experience to a Candidate', () => {
  const baseCandidate = {
    firstName: 'Albert',
    lastName: 'Saelices',
    email: 'albert@example.com',
  };

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

  // NOTE: date-range check not yet implemented — test documents required business rule
  it('rejects an endDate that is before startDate', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        workExperiences: [{ ...validExperience, startDate: '2013-01-01', endDate: '2011-01-01' }],
      })
    ).toThrow();
  });
});

// ─────────────────────────────────────────────
// US-006 — Upload CV / Resume (CV field in candidate payload)
// ─────────────────────────────────────────────
describe('US-006 — CV Field Validation on Candidate Payload', () => {
  const baseCandidate = {
    firstName: 'Albert',
    lastName: 'Saelices',
    email: 'albert@example.com',
  };

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
      validateCandidateData({
        ...baseCandidate,
        cv: { fileType: 'application/pdf' },
      })
    ).toThrow('Invalid CV data');
  });

  it('rejects a cv missing fileType — returns "Invalid CV data"', () => {
    expect(() =>
      validateCandidateData({
        ...baseCandidate,
        cv: { filePath: 'uploads/1715760936750-cv.pdf' },
      })
    ).toThrow('Invalid CV data');
  });

  it('ignores an empty cv object (treated as no CV provided)', () => {
    expect(() =>
      validateCandidateData({ ...baseCandidate, cv: {} })
    ).not.toThrow();
  });

  it('accepts a candidate with no cv field', () => {
    expect(() => validateCandidateData(baseCandidate)).not.toThrow();
  });
});
