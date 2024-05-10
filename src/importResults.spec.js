import { jest } from '@jest/globals';
import { parseAndValidateResults, importResults } from './importResults';
import mockTestResult from '../testData/mockInput.json';

describe('parseAndValidateResults', () => {
  it('should remove the duplicate test result from the array', () => {
    const input = [mockTestResult, mockTestResult];
    const result = parseAndValidateResults(input);
    expect(result).toHaveLength(1);
   });
});

describe('importResults', () => {
  it('should add the test result to the database', async () => {
    const mockDBClass = {
      getTestResult: jest.fn().mockImplementation(() => null),
      updateTestResult: jest.fn(),
      addTestResult: jest.fn(),
    };

    const input = [mockTestResult];
    await importResults(input, mockDBClass);
    expect(mockDBClass.addTestResult).toHaveBeenCalled();
   });
 });
