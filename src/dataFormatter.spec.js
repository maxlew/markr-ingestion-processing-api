import { buildTestResult } from "./dataFormatter.mjs";
import mockTestResult from '../testData/mockInput.json';

describe('buildTestResult', () => {

  it('should format a testResult and return it under ideal conditions', () => {
    const result = buildTestResult(mockTestResult);
    expect(result).toEqual({
      first_name: "Jean",
      last_name: "Stephanie",
      marks_available: 20,
      marks_obtained: 8,
      percentage_score: "40.00",
      scanned_on: "2017-12-04T13:51:10+11:00",
      student_number: 2398,
      test_id: 9863,
    });
  });

  const fields = Object.keys(mockTestResult);

  it.each(fields)('should throw an error when %s field is missing', (field) => {
    const input = {
      ...mockTestResult
    };
    delete input[field];

    expect(() => buildTestResult(input)).toThrow(`Invalid Test: missing values ${field}`);
  });

  it.each(['test_id', 'student_number'])('should coerce %s to be a number type', (field) => {
    const result = buildTestResult(mockTestResult);

    expect(typeof mockTestResult[field]).toEqual('string')
    expect(typeof result[field]).toEqual('number')
  });

  it('should calculate the percentage score of the test result', () => {
    // These aren't actually changing but it makes the test more obvious and less flakey
    mockTestResult.summary_marks.available = 20;
    mockTestResult.summary_marks.obtained = 8;

    const result = buildTestResult(mockTestResult);
    expect(result.percentage_score).toEqual('40.00');
  })
});
