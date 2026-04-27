# US-004 — Add Education History to a Candidate

## User Story

**As a** recruiter,  
**I want to** attach one or more education records to a candidate,  
**So that** I can assess their academic background during the recruitment process.

---

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Add education history to a candidate

  Scenario: Successfully add a candidate with one education record
    Given the recruiter submits a candidate payload with an education entry:
      | Field       | Value            |
      | institution | UC3M             |
      | title       | Computer Science |
      | startDate   | 2006-12-31       |
      | endDate     | 2010-12-26       |
    When the request is processed
    Then the system saves the candidate and the education record
    And returns HTTP 201

  Scenario: Successfully add a candidate with multiple education records
    Given the recruiter submits a candidate with two education entries
    When the request is processed
    Then the system saves both education records linked to the candidate
    And returns HTTP 201

  Scenario: Save a candidate with an ongoing education (no endDate)
    Given the recruiter submits an education entry with startDate "2020-01-01" and no endDate
    When the request is processed
    Then the system saves the education with a null endDate
    And returns HTTP 201

  Scenario: Save a candidate without any education records
    Given the recruiter does not include the "educations" field in the payload
    When the request is processed
    Then the system saves the candidate with no education records
    And returns HTTP 201
```

---

## Edge Cases

```gherkin
  Scenario: Education with missing institution is rejected
    Given the recruiter submits an education entry without the "institution" field
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid institution"

  Scenario: Education institution exceeds 100 characters
    Given the recruiter submits an institution name with 101 characters
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid institution"

  Scenario: Education with missing title is rejected
    Given the recruiter submits an education entry without the "title" field
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid title"

  Scenario: Education title exceeds 100 characters
    Given the recruiter submits a title with 101 characters
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid title"

  Scenario: Education with missing startDate is rejected
    Given the recruiter submits an education entry without the "startDate" field
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid date"

  Scenario: Education startDate in invalid format is rejected
    Given the recruiter submits a startDate as "31/12/2006" (non-ISO format)
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid date"

  Scenario: Education endDate in invalid format is rejected
    Given the recruiter submits an endDate as "December 2010"
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid end date"

  Scenario: Education endDate before startDate is stored (business rule to be enforced)
    Given the recruiter submits an education with startDate "2010-01-01" and endDate "2005-01-01"
    When the request is processed
    Then the system should reject it with a date-range validation error
```
