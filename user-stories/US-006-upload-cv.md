# US-006 — Upload a CV / Resume File

## User Story

**As a** recruiter,  
**I want to** upload a candidate's CV in PDF or DOCX format,  
**So that** I can access and review their resume directly within the system.

---

## Acceptance Criteria (Gherkin)

```gherkin
Feature: Upload a CV file for a candidate

  Scenario: Successfully upload a PDF file
    Given the recruiter selects a valid PDF file under 10 MB
    When the file is submitted to POST /upload
    Then the system stores the file in the uploads directory
    And returns HTTP 200 with the file path and MIME type:
      | Field    | Value           |
      | filePath | uploads/...pdf  |
      | fileType | application/pdf |

  Scenario: Successfully upload a DOCX file
    Given the recruiter selects a valid DOCX file under 10 MB
    When the file is submitted to POST /upload
    Then the system stores the file
    And returns HTTP 200 with fileType "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

  Scenario: CV file path is linked to the candidate on registration
    Given a file has been successfully uploaded and the recruiter has its filePath and fileType
    When the recruiter registers a candidate and includes the CV reference:
      | Field    | Value                          |
      | filePath | uploads/1715760936750-cv.pdf   |
      | fileType | application/pdf                |
    Then the system stores the CV reference linked to the candidate
    And returns HTTP 201
```

---

## Edge Cases

```gherkin
  Scenario: Upload a file with an unsupported format (e.g., .txt or .jpg) is rejected
    Given the recruiter selects a .txt file
    When the file is submitted to POST /upload
    Then the system returns HTTP 400
    And the error message is "Invalid file type, only PDF and DOCX are allowed!"

  Scenario: Upload a file that exceeds the 10 MB size limit is rejected
    Given the recruiter selects a PDF file of 11 MB
    When the file is submitted to POST /upload
    Then the system returns HTTP 500 with a Multer size limit error

  Scenario: Upload request with no file attached is rejected
    Given the recruiter submits the upload endpoint without attaching any file
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid file type, only PDF and DOCX are allowed!"

  Scenario: CV data with missing filePath is rejected at candidate registration
    Given the recruiter submits a candidate with a cv object missing the "filePath" field
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid CV data"

  Scenario: CV data with missing fileType is rejected at candidate registration
    Given the recruiter submits a candidate with a cv object missing the "fileType" field
    When the request is processed
    Then the system returns HTTP 400
    And the error message is "Invalid CV data"

  Scenario: Empty cv object is ignored (treated as no CV provided)
    Given the recruiter submits a candidate with an empty cv object {}
    When the request is processed
    Then the system saves the candidate without a CV reference
    And returns HTTP 201

  Scenario: Filename collision is handled by prepending a timestamp
    Given two different files with the same original filename are uploaded sequentially
    When both uploads complete
    Then the system stores them under different paths using the timestamp-based naming strategy
```
