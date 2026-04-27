# US-003 — Validate Email and Phone Format

## User Story

**As a** system administrator,  
**I want to** enforce format validation on email and phone fields,  
**So that** only well-formed contact information is stored, preventing data quality issues.

---

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Validate candidate email and phone formats

  Scenario: Valid email is accepted
    Given the recruiter provides the email "john.doe@company.co.uk"
    When the candidate is submitted
    Then the system accepts the email and saves the candidate

  Scenario: Invalid email is rejected
    Given the recruiter provides the email "not-an-email"
    When the candidate is submitted
    Then the system returns HTTP 400
    And the error message is "Invalid email"

  Scenario: Valid Spanish phone number is accepted (starts with 6, 7, or 9)
    Given the recruiter provides the phone "612345678"
    When the candidate is submitted
    Then the system accepts the phone and saves the candidate

  Scenario: Phone field is optional — candidate can be saved without phone
    Given the recruiter does not provide a phone number
    When the candidate is submitted
    Then the system saves the candidate without a phone
    And returns HTTP 201

  Scenario: Invalid phone number format is rejected
    Given the recruiter provides the phone "123456789"
    When the candidate is submitted
    Then the system returns HTTP 400
    And the error message is "Invalid phone"
```

---

## Edge Cases

```gherkin
  Scenario: Email with multiple consecutive dots is rejected
    Given the recruiter provides the email "john..doe@example.com"
    When the candidate is submitted
    Then the system returns HTTP 400
    And the error message is "Invalid email"

  Scenario: Email without domain is rejected
    Given the recruiter provides the email "john@"
    When the candidate is submitted
    Then the system returns HTTP 400
    And the error message is "Invalid email"

  Scenario: Phone number with fewer than 9 digits is rejected
    Given the recruiter provides the phone "61234"
    When the candidate is submitted
    Then the system returns HTTP 400
    And the error message is "Invalid phone"

  Scenario: Phone number with more than 9 digits is rejected
    Given the recruiter provides the phone "6123456789"
    When the candidate is submitted
    Then the system returns HTTP 400
    And the error message is "Invalid phone"

  Scenario: Phone number starting with an invalid prefix is rejected
    Given the recruiter provides the phone "812345678"
    When the candidate is submitted
    Then the system returns HTTP 400
    And the error message is "Invalid phone"

  Scenario: Phone number containing letters is rejected
    Given the recruiter provides the phone "6ABCDEFGH"
    When the candidate is submitted
    Then the system returns HTTP 400
    And the error message is "Invalid phone"
```
