# US-005 — Add Work Experience to a Candidate

## User Story

**As a** recruiter,  
**I want to** attach one or more work experience records to a candidate,  
**So that** I can evaluate their professional background when making hiring decisions.

---

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Add work experience to a candidate

  Scenario: Successfully add a candidate with one work experience entry
    Given the recruiter submits a candidate payload with a work experience entry:
      | Field       | Value      |
      | company     | Coca Cola  |
      | position    | SWE        |
      | description | Backend dev|
      | startDate   | 2011-01-13 |
      | endDate     | 2013-01-17 |
    When the request is processed
    Then the system saves the candidate and the work experience record
    And returns HTTP 201

  Scenario: Successfully add a candidate with multiple work experience records
    Given the recruiter submits a candidate with two work experience entries
    When the request is processed
    Then the system saves both records linked to the candidate
    And returns HTTP 201

  Scenario: Work experience with no endDate indicates current position
    Given the recruiter submits a work experience entry with startDate "2022-03-01" and no endDate
    When the request is processed
    Then the system saves the experience with a null endDate
    And returns HTTP 201

  Scenario: Work experience description is optional
    Given the recruiter submits a work experience without the "description" field
    When the request is processed
    Then the system saves the experience with a null description
    And returns HTTP 201

  Scenario: Save a candidate without any work experience records
    Given the recruiter does not include the "workExperiences" field in the payload
    When the request is processed
    Then the system saves the candidate with no work experience
    And returns HTTP 201
```

---

## Edge Cases

```gherkin
  Scenario: Work experience with missing company is rejected
    Given the recruiter submits a work experience without the "company" field
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid company"

  Scenario: Company name exceeds 100 characters
    Given the recruiter submits a company name with 101 characters
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid company"

  Scenario: Work experience with missing position is rejected
    Given the recruiter submits a work experience without the "position" field
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid position"

  Scenario: Position exceeds 100 characters
    Given the recruiter submits a position with 101 characters
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid position"

  Scenario: Description exceeds 200 characters
    Given the recruiter submits a description with 201 characters
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid description"

  Scenario: Work experience with missing startDate is rejected
    Given the recruiter submits a work experience without the "startDate" field
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid date"

  Scenario: startDate in non-ISO format is rejected
    Given the recruiter submits a startDate as "January 2011"
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid date"

  Scenario: endDate before startDate is flagged (business rule to be enforced)
    Given the recruiter submits a work experience with startDate "2013-01-01" and endDate "2011-01-01"
    When the request is processed
    Then the system should reject it with a date-range validation error
```
