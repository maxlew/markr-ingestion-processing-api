const expectedKeys = [
  'scanned_on',
  'first_name',
  'last_name',
  'student_number',
  'test_id',
  'answer',
  'summary_marks'
];

export const buildTestResult = (result) => {

  // Throw a specific error if any fields are missing after building the object
  const missingKeys = [];
  for (const key of expectedKeys) {
    if (!result[key]) {
      missingKeys.push(key);
    }
  }
  if (missingKeys.length) {
    throw new Error(`Invalid Test: missing values ${missingKeys.join(',')}`);
  }

  // Coerce some types and calculate the object to be inserted to the DB
  const testResult = {
    test_id: Number(result.test_id),
    student_number: Number(result.student_number),
    scanned_on: result.scanned_on,
    first_name: result.first_name,
    last_name: result.last_name,
    marks_available: Number(result.summary_marks.available),
    marks_obtained: Number(result.summary_marks.obtained),
    percentage_score: (
      (result.summary_marks.obtained / result.summary_marks.available) * 100
    ).toFixed(2),
  };

  // Check that the 'answers' actually equal the available score
  // Spoiler they aren't
  const available = result.answer.length;
  const score = result.answer.reduce((acc, cur) => {
    acc += Number(cur.marks_awarded);
    return acc;
  }, 0);

  if (available !== testResult.marks_available) {
    console.warn('Available does not match', { available, score, testResult });
  }
  if (score !== testResult.marks_obtained) {
    console.warn('Obtained does not match', { available, score, testResult });
  }

  return testResult;
};
