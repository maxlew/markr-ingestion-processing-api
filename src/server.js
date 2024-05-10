import express from 'express';
import bodyParser from 'body-parser';
import xmlbodyparser from 'body-parser-xml';
import snakeCase from 'lodash/snakeCase.js';

import TestResults from './testResults.js';
import { importResults } from './importResults.js';

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
const testResults = new TestResults(process.env.DATABASE_URL);

app.get('/results/:test_id', async (req, res) => {
  try {
    const results = await testResults.getTestResults(req.params.test_id);
    res.json(results);
  } catch (err) {
    res.status(500).send('Error ' + err);
  }
});

app.get('/results/:test_id/aggregate', async (req, res) => {
  try {
    const aggregates = await testResults.getAggregateTestResults(req.params.test_id);
    res.json(aggregates);
  } catch (err) {
    res.status(500).send('Error ' + err);
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

    // ingest results to DB
    const response = await importResults(results, testResults);

    res.json(response);
  } catch (err) {
    // Handle invalid payloads with a 400 Bad Request rejection
    if (err.type === 'Invalid Payload') {
      console.error(err.message);
      res.status(400).send(err.message);
    } else {
      console.error(err);
      res.status(500).send(err.toString());
    }
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} 🚀`);
});
