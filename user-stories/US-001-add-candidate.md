# US-001 — Add a New Candidate

## User Story

**As a** recruiter,  
**I want to** register a new candidate with their personal information,  
**So that** their profile is stored in the system and available for future recruitment processes.

---

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Add a new candidate

  Background:
    Given the recruiter is authenticated and has access to the candidate registration form

  Scenario: Successfully add a candidate with all required fields
    Given the recruiter fills in the following required fields:
      | Field     | Value              |
      | firstName | Albert             |
      | lastName  | Saelices           |
      | email     | albert@example.com |
    When the recruiter submits the form
    Then the system saves the candidate
    And returns HTTP 201 with the created candidate data

  Scenario: Successfully add a candidate with all optional fields
    Given the recruiter fills in all fields:
      | Field     | Value                            |
      | firstName | Albert                           |
      | lastName  | Saelices                         |
      | email     | albert@example.com               |
      | phone     | 612345678                        |
      | address   | Calle Mayor 1, Madrid            |
    When the recruiter submits the form
    Then the system saves the candidate with all provided data
    And returns HTTP 201 with the created candidate data

  Scenario: Add a candidate via the API endpoint
    Given a valid candidate JSON payload is sent to POST /candidates
    When the API request is processed
    Then the system returns HTTP 201 with the saved candidate object
```

---

## Edge Cases

```gherkin
  Scenario: Missing required field — firstName
    Given the recruiter submits a candidate without the "firstName" field
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid name"

  Scenario: Missing required field — lastName
    Given the recruiter submits a candidate without the "lastName" field
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid name"

  Scenario: Missing required field — email
    Given the recruiter submits a candidate without the "email" field
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid email"

  Scenario: firstName exceeds maximum length of 100 characters
    Given the recruiter provides a firstName with 101 characters
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid name"

  Scenario: firstName contains invalid characters (numbers or symbols)
    Given the recruiter provides a firstName of "John123"
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid name"

  Scenario: firstName is too short (less than 2 characters)
    Given the recruiter provides a firstName of "A"
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid name"

  Scenario: address exceeds maximum length of 100 characters
    Given the recruiter provides an address with 101 characters
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid address"

  Scenario: Empty request body
    Given the recruiter sends an empty JSON payload
    When the request is processed
    Then the system returns HTTP 400
```
