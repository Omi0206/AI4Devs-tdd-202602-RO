# US-002 — Prevent Duplicate Candidates

## User Story

**As a** recruiter,  
**I want to** be notified when a candidate with the same email already exists in the system,  
**So that** I avoid creating duplicate records and maintain data integrity.

---

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Prevent duplicate candidates by email

  Background:
    Given a candidate with email "albert@example.com" already exists in the database

  Scenario: Attempt to register a candidate with an existing email
    Given the recruiter fills in the registration form with email "albert@example.com"
    When the recruiter submits the form
    Then the system does not create a new candidate
    And returns HTTP 400
    And the error message is "The email already exists in the database"

  Scenario: Register a candidate with a unique email succeeds
    Given the recruiter fills in the registration form with email "newcandidate@example.com"
    When the recruiter submits the form
    Then the system creates the new candidate
    And returns HTTP 201
```

---

## Edge Cases

```gherkin
  Scenario: Email comparison is case-insensitive
    Given a candidate with email "Albert@Example.com" already exists
    When the recruiter submits a new candidate with email "albert@example.com"
    Then the system treats them as duplicates
    And returns HTTP 400 with an appropriate error message

  Scenario: Email with trailing whitespace is normalized before uniqueness check
    Given a candidate with email "albert@example.com" already exists
    When the recruiter submits a candidate with email "  albert@example.com  "
    Then the system normalizes the email and detects the duplicate
    And returns HTTP 400

  Scenario: Email uniqueness is enforced even after updating a candidate's email to a taken value
    Given candidate A has email "a@example.com" and candidate B has email "b@example.com"
    When the recruiter attempts to update candidate A's email to "b@example.com"
    Then the system returns HTTP 400
    And the error message indicates the email is already taken
```
