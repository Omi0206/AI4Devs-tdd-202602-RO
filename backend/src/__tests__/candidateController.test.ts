import { Request, Response } from 'express';
import { addCandidateController } from '../presentation/controllers/candidateController';
import { addCandidate } from '../application/services/candidateService';
import { beforeEach, describe, it } from 'node:test';

jest.mock('../application/services/candidateService');

const mockAddCandidate = addCandidate as jest.MockedFunction<typeof addCandidate>;

function makeReqRes(body: object = {}) {
  const req = { body } as Request;
  const res = { status: jest.fn(), json: jest.fn() } as unknown as Response;
  (res.status as jest.Mock).mockReturnValue(res);
  (res.json as jest.Mock).mockReturnValue(res);
  return { req, res };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─────────────────────────────────────────────
// US-001 — Add a New Candidate (HTTP layer)
// ─────────────────────────────────────────────
describe('US-001 — addCandidateController', () => {
  const savedCandidate = {
    id: 1,
    firstName: 'Albert',
    lastName: 'Saelices',
    email: 'albert@example.com',
  };

  it('returns HTTP 201 with the created candidate on success', async () => {
    mockAddCandidate.mockResolvedValue(savedCandidate as any);
    const { req, res } = makeReqRes({
      firstName: 'Albert',
      lastName: 'Saelices',
      email: 'albert@example.com',
    });

    await addCandidateController(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Candidate added successfully',
      data: savedCandidate,
    });
  });

  it('calls addCandidate with the request body', async () => {
    const payload = { firstName: 'Albert', lastName: 'Saelices', email: 'albert@example.com' };
    mockAddCandidate.mockResolvedValue(savedCandidate as any);
    const { req, res } = makeReqRes(payload);

    await addCandidateController(req, res);

    expect(mockAddCandidate).toHaveBeenCalledWith(payload);
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
    const { req, res } = makeReqRes({
      firstName: 'Albert',
      lastName: 'Saelices',
      email: 'albert@example.com',
    });

    await addCandidateController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Error adding candidate',
      error: 'The email already exists in the database',
    });
  });

  it('returns HTTP 400 with "Unknown error" for non-Error rejections', async () => {
    mockAddCandidate.mockRejectedValue('something went wrong');
    const { req, res } = makeReqRes({
      firstName: 'Albert',
      lastName: 'Saelices',
      email: 'albert@example.com',
    });

    await addCandidateController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Error adding candidate',
      error: 'Unknown error',
    });
  });

  it('returns HTTP 400 when email is invalid', async () => {
    mockAddCandidate.mockRejectedValue(new Error('Invalid email'));
    const { req, res } = makeReqRes({
      firstName: 'Albert',
      lastName: 'Saelices',
      email: 'not-an-email',
    });

    await addCandidateController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid email' })
    );
  });

  it('returns HTTP 400 when phone format is invalid', async () => {
    mockAddCandidate.mockRejectedValue(new Error('Invalid phone'));
    const { req, res } = makeReqRes({
      firstName: 'Albert',
      lastName: 'Saelices',
      email: 'albert@example.com',
      phone: '123456789',
    });

    await addCandidateController(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'Invalid phone' })
    );
  });
});
