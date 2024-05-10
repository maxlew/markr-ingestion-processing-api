import express from 'express';
import bodyParser from 'body-parser';
import xmlbodyparser from 'body-parser-xml';
import snakeCase from 'lodash/snakeCase.js';

import TestResults from './testResults.mjs';
import { buildTestResult } from './dataFormatter.mjs';

const app = express();
xmlbodyparser(bodyParser);


app.use(bodyParser.xml({
  type: 'text/xml+markr',
  limit: '5mb',
  // https://github.com/Leonidas-from-XIV/node-xml2js#options
  xmlParseOptions: {
    normalizeTags: true,
    normalize: true,
    explicitArray: false,
    mergeAttrs: true,
    attrNameProcessors: [(name) => snakeCase(name)],
    tagNameProcessors: [(name) => snakeCase(name)],
  }
}));

const PORT = process.env.PORT || 3000;

const testResults = new TestResults(
  process.env.DATABASE_URL || 'postgres://postgres:password@db:5432/mydatabase'
);


app.get('/results/:test_id', async (req, res) => {
  try {
    const results = await testResults.getTestResults(req.params.test_id);
    res.json(results);
  } catch (err) {
    res.status(500).send("Error " + err);
  }
});

app.get('/results/:test_id/aggregate', async (req, res) => {
  try {
    const aggregates = await testResults.getAggregateTestResults(req.params.test_id);
    res.json(aggregates);
  } catch (err) {
    res.status(500).send("Error " + err);
  }
});

app.post('/import', async (req, res) => {
  try {
    // eww - body-parser-xml doesn't give us a great output, but we can do some black magic to make it useable
    const parsedBody = JSON.parse(JSON.stringify(req.body));
    const resultsObject = parsedBody['mcq_test_results']['mcq_test_result'];

    // we've set explicitArray in our xml parser, so we do need to handle this potential array/object situation
    let results = [resultsObject];
    if (Array.isArray(resultsObject)) {
      results = [...resultsObject];
    }

    // Sending back both errors/warnings and successful tests
    const response = {
      errors: [],
      success: [],
    };

    for (const result of results) {
      const testResult = buildTestResult(result);

      // Check if this student already has a result for this test
      const existingEntry = await testResults.getTestResult(testResult.test_id, testResult.student_number);
      if (existingEntry) {
        // Check if this is a re-scan with higher available score
        if (testResult.marks_available > existingEntry.marks_available) {
          await testResults.updateTestResult(testResult, ['marks_obtained', 'marks_available', 'percentage_score']);
          // add re-scan as warning, note updated row though
          response.errors.push(`Warn: test_id_${testResult.test_id} has already been received for student_${testResult.student_number}, row updated due to more complete data`);
          response.success.push(testResult);
        } else {
          // add re-scan to errors array but continue
          response.errors.push(`Error: test_id_${testResult.test_id} has already been received for student_${testResult.student_number}`);
        }

      } else {
        // New result add it to the database
        await testResults.addTestResult(testResult);
        response.success.push(testResult);
      }
    }

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error " + err);
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
