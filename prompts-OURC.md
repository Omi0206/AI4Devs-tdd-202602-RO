# Prompts

## 01. Create user stories

Act as expert product owner.

Your task is create the main 6 user stories of the project.

Context: This project is a full-stack application with a React frontend and an Express backend using Prisma as an ORM. The frontend is set up with Create React App, and the backend is written in TypeScript.

Write the User Stories in format BDD and their Criteria Acceptance user Gherkin format. Also analyze and propose the edge cases.

The result should be stored in folder user-stories, one file by US.


## 02. Create Unit Test

Act as a Senior QA Automation Engineer expert in TDD.

Context: This project is a full-stack application with a React frontend and an Express backend using Prisma as an ORM. The frontend is set up with Create React App, and the backend is written in TypeScript.

Your task is Write unit tests using Jest for the User Stories defined in @user-stories.

## 03. Unify test

Create a new file with all test created in @backend/src/test.