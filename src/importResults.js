import { buildTestResult, isEntryHigherQuality } from './dataFormatter.js';

/**
 * Parses results object to do three things
 * 1. Validate all payloads
 * 2. Build all test results to a single array
 * 3. Filter duplicates keeping higher scores
 *
 * @param {array} results - The results objects converted from XML to JSON
 * @returns {TestResult[]} - The newly added test result.
 */
export const parseAndValidateResults = (results) => {
  const parsedResults = results.map(buildTestResult).reduce((acc, result) => {
    // Need to ensure we make a string based key here
    const key = `s_${result.student_number}`;
    const existingEntry = acc[key];
    if (existingEntry) {
      // Does the new result have a higher score, or higher possible score
      if (isEntryHigherQuality(existingEntry, result)) {
        acc[key] = result;
        return acc;
      }
      return acc;
    }
    acc[key] = result;
    return acc;
  }, []);
  return Object.values(parsedResults);
};

/**
 * Imports the Results provided into the postgres DB
 * Handles duplicates in the payload as well as DB
 * Avoids committing anything to the DB until after validation
 * Ideally it'd use a SQL Transaction but we've only so much time in our lives
 *
 * @typedef {Object} ResponseObject
 * @param {array[string]} warnings - Warnings thrown - i.e duplicate entries found
 * @param {array[TestResult]} updated - Updated results, if there was better data provided
 * @param {array[TestResult]} added - New results added into the database
 *
 * @param {array} results - The results objects converted from XML to JSON
 * @param {TestResults} TestResult - DB Wrapper for Test Results table
 * @returns {ResponseObject} - The newly added test result.
 */
export const importResults = async (results, testResults) => {
  // Sending back both errors/warnings and successful tests
  const response = {
    warnings: [],
    updated: [],
    added: [],
  };

  const parsedResults = parseAndValidateResults(results);

  for (const testResult of parsedResults) {
    // Check if this student already has a result for this test in the DB
    const existingEntry = await testResults.getTestResult(testResult.test_id, testResult.student_number);
    if (existingEntry) {
      // Check if this is a re-scan with higher available score or obtained score
      if (isEntryHigherQuality(existingEntry, testResult)) {
        await testResults.updateTestResult(testResult, ['marks_obtained', 'marks_available', 'percentage_score']);
        response.updated.push(testResult);
      } else {
        response.warnings.push(`Warn: test_id_${testResult.test_id} has already been received for student_${testResult.student_number}`);
      }
    } else {
      // New result add it to the database
      await testResults.addTestResult(testResult);
      response.added.push(testResult);
    }
  }

  return response;
};
