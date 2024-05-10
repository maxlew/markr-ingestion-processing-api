import postgres from 'postgres';

/**
 *
 * JSDoc types, poor mans typescript but works quite well in VSCode
 *
 * TestResult type
 * @typedef {Object} TestResult
 * @param {number} test_id - Unique identifier for the test.
 * @param {string} scanned_on - The date when the test was scanned.
 * @param {number} student_number - Unique number of the student.
 * @param {string} first_name - First name of the student.
 * @param {string} last_name - Last name of the student.
 * @param {number} marks_obtained - Marks obtained by the student.
 * @param {number} marks_available - Total marks available for the test.
 * @param {number} percentage_score - Total marks available for the test.
 *
 *
 * @typedef {Object} AggregateData
 * @param {number} mean - mean/average of all test scopes
 * @param {number} stddev - Standard Deviation of test scores
 * @param {number} min - Minimum/lowest score of all tests
 * @param {number} max - Maximum/highest score of all tests
 * @param {number} percentile_25 - 25th percentile of results
 * @param {number} percentile_50 - median/50th percentile of results
 * @param {number} percentile_75 - 75th percentile of results
 *
 */

// Class to handle database operations for test results.
class TestResults {
  /**
   * Initializes the database connection.
   * @param {string} connectionString - The connection string for the PostgreSQL database.
   */
  constructor(connectionString) {
    this.sql = postgres(connectionString);
  }

  /**
   * Adds a new test result to the database.
   * @param {TestResult} testResult - Unique identifier for the test.
   * @returns {Promise<TestResult>} - The newly added test result.
   */
  async addTestResult(testResult) {
    const columns = [
      'test_id',
      'scanned_on',
      'student_number',
      'first_name',
      'last_name',
      'marks_obtained',
      'marks_available',
      'percentage_score',
    ];

    return this.sql`INSERT INTO test_results ${this.sql(testResult, columns)}`;
  }

  /**
   * Updates an existing test result in the database, only updating the keys provided
   * @param {TestResult} testResult - Unique identifier for the test.
   * @param {string[]} keys - Object containing the fields to update.
   * @returns {Promise<TestResult>} - The updated test result.
   */
  async updateTestResult(testResult, keys) {
    return this.sql`
      UPDATE test_results
      SET ${this.sql(testResult, ...keys)}
      WHERE student_number = ${testResult.student_number}
      AND test_id = ${testResult.test_id};
    `;
  }

  /**
   * Retrieves a test result from the database by test ID.
   * @param {number} test_id - Unique identifier for the test to retrieve.
   * @returns {Promise<Array<TestResult>>} - The requested test result.
   */
  async getTestResults(test_id) {
    return this.sql`
      SELECT * FROM test_results
      WHERE test_id = ${test_id};
    `;
  }

  /**
   * Returns calculated aggregate data for a test
   *
   * @param {number} test_id - Unique identifier for the test to retrieve.
   * @returns {Promise<AggregateData>} - Calculated Aggregate data
   */
  async getAggregateTestResults(test_id) {
    const result = await this.sql`
      SELECT
        round(avg(percentage_score), 2) as mean,
        round(stddev(percentage_score), 2) as stddev,
        min(percentage_score) as min,
        max(percentage_score) as max,
        percentile_cont(0.25) within group (order by percentage_score asc) as p25,
        percentile_cont(0.50) within group (order by percentage_score asc) as p50,
        percentile_cont(0.75) within group (order by percentage_score asc) as p75,
        count(*) as count
      FROM test_results
      WHERE test_id = ${test_id};
    `;
    return result[0];
  }

  /**
   * Retrieves a test result from the database by test ID.
   * @param {number} test_id - Unique identifier for the test to retrieve.
   * @param {number} student_number - Unique identifier for the students test to retrieve.
   * @returns {Promise<TestResult> | null} - The requested test result.
   */
    async getTestResult(test_id, student_number) {
      const result = await this.sql`
        SELECT * FROM test_results
        WHERE test_id = ${test_id}
        AND student_number = ${student_number};
      `;

      // Select will give us an array by default, this is a fetch one fn so let de-array it
      if (result.length) {
        return result[0];
      } else {
        return null;
      }
    }

}

export default TestResults;
