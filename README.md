# Markr Ingestion & Processing service

This service is designed to take an XML based POST request from the multiple-choice exam marking machines, store the data, and provide some basic aggregate information about each processed test.

It's a fairly simple application, a NodeJS Express server with a Postgres database attached to it. It takes some data by the `/import` endpoint and returns some data on the `/results` endpoints. Postgres and the body-parser-xml library are doing most of the heavy lifting. The logic that's owned by Markr is really around ensuring the data fits an expected structure before it's persisted.

## Major Data Structures
### JS Objects
```js
 /** JSDoc Types
 @typedef {Object} TestResult
 @param {number} test_id - Unique identifier for the test.
 @param {number} student_number - Unique number of the student.
 @param {string} scanned_on - The date when the test was scanned.
 @param {string} first_name - First name of the student.
 @param {string} last_name - Last name of the student.
 @param {number} marks_obtained - Marks obtained by the student.
 @param {number} marks_available - Total marks available for the test.
 @param {number} percentage_score - Pre calculated percentage score for the test.

 @typedef {Object} AggregateData
 @param {number} mean - mean/average of all test scopes
 @param {number} stddev - Standard Deviation of test scores
 @param {number} min - Minimum/lowest score of all tests
 @param {number} max - Maximum/highest score of all tests
 @param {number} percentile_25 - 25th percentile of results
 @param {number} percentile_50 - median/50th percentile of results
 @param {number} percentile_75 - 75th percentile of results
```

### Database Table
#### test_results
| Column Name | Type | Restriction |
| ---- | --- | --- |
| test_id | INT | NOT NULL |
| student_number | INT | NOT NULL |
| scanned_on | DATE | NOT NULL |
| first_name | varchar(250) | NOT NULL |
| last_name | varchar(250) | NOT NULL |
| marks_obtained | INT | NOT NULL |
| marks_available | INT | NOT NULL |
| percentage_score | DECIMAL | NOT NULL |

**Primary Key**: test_id + student_number

## API Endpoints

### `GET /results/:test_id`
Returns a JSON response for all tests with the specified testId. This isn't strictly a listed requirement, but was handy for debugging so was left in.

### `GET /results/:test_id/aggregate`
Returns a JSON response of type `AggregateData` for the test_id required. This information is calculated at request time by postgres.

Depending on the total dataset size this might become a scaling issue, although postgres should handle that for a long while.
Someone did say "every school system in Europe & North America" though.

Recommendation is to calculate aggregate data asynchronously after ingestion occurs. Aggregate data would then be stored in it's own table.
This could be simply after commiting the import txn, make an unawaited HTTP call to itself before returning. Or if we're really scaling use something more eventy like RabbitMQ.

### `POST /import`
Receives an XML payload from the marking machines, processes that data and updates it in postgres.

There is currently a 5mb limit on payload size. Unsure if this would become an issue in future a single 20 question test is around 2KB, so in theory this would scale to roughly 2,500 tests per import. Although many different machines all sending 5mb of data into this service is probably not gonna go well, you'll want to probably deploy it into something that can scale automatically i.e a Lambda or a really well configured K8s instance.

Returns a JSON object containing a `warnings`, `updated`, and `added` array. Errors array contains warnings that occur during ingestion, these are normally duplicate scans. Updated and Added returns an array of JSON objects of the tests that were either added or updated in the database.


## Assumptions
There's a whole world of questions around if this will receive 1 test at a time, or an array of tests. Because the sample.xml file contains multiple I'm going with that - i.e. It must accept 1 or more tests at once into the import endpoint.

However, the following requirement is really great

> Sometimes, the machines mess up and post you a document missing some important bits. When this happens, it's important that you reject the _entire_ document with an appropriate HTTP error. This causes the machine to print out the offending document (yes, print, as in, on paper) and some poor work experience kid then enters the whole thing manually. If you've already accepted part of the document, that'll cause some confusion which is _way_ above their paygrade.

What's a "_Document_" is that one test, is that a whole series of tests. What is "_Sometimes_", "_appropriate HTTP error_", "_important bits_"!

Because it says HTTP error i'm assuming it's _everything_, so the whole array of tests that got passed in that request cannot bit commited to the DB. And I'm assuming important bits are everything, so I've made the DB not like NULL values anywhere. Even though I'm not using the `<answer>` values, I'm still expecting some of them too.

Although how it'll manage to print the specific document that failed if it's a batch of multiple I've no idea, I'm sending back a 500 with the Test and Student Number and praying for the work experience kid (and that it's not the Test or Student Number that's missing).

### Other less dramatic assumptions

When the lights go out the postgres database contents are maintained. I'm not quite sure if AWS deletes the file storage volumes if you don't pay you bills, I assume they just stop the running instances... but at some point surely they kill the whole account. If that happened all the test data would be lost, that would be bad.

The postgres library is handling SQL injection issues for me. It says so, I trust it, but I didn't explicitly test it. If it doesn't there's a whole lot of validation code that should go here.

I didn't use Typescript. This isn't really an assumption more of a statement. Adding a build step to this was more than I really had time for, although it probably would have helped things in retrospect. I did get to play around with using JSDoc as a replacement for Typescript which is a thinking that's been gaining more and more popularity. Now I've done it I don't mind it, for something small a few return types to worry about it works and removes some of the 'weight' of TypeScript. Although when I started refactoring things I noticed that I longed from a bit more structure in my types.

## How to run
This whole app is designed to run inside of docker with docker-compose.

You can run the application simply by running `docker-compose up`. Assuming you have docker installed of course.

### Development
Because I love pain and hate good DX I didn't make this part very nice. If you make a change you'll need to reboot your `app` container. I spent about 30 seconds trying to get nodemon to work before my patience waned. The trick is to hit it twice with `ctrl + c` then press `up arrow`, `enter`, with some muscle memory you'll forget about all that fancy local development.


### Testing in Development
I've used Postman to build and test the whole thing. There's a sample.xml file that can be used as an import payload.

Also the docker-compose file is set up to expose port `5432` so if you have a SQL Client you like (TablePlus is my recommended one if you're on a Mac) you can connect to it easily. That's also a good way of checking things are working as expected, I've been burnt before, don't trust a HTTP response, validate the actual data.

### Automated Testing
I went a bit crazy with esm modules and Node 22 before learning that Jest doesn't place nice with this yet. So to run Jest requires ensuring the `--experimental-vm-modules` is set. This is done automatically with `npm run test`, but it also means the nice little `Run | Debug` options in VSCode don't work.

There's not a whole lot of unit testing happening here. I focused on `dataFormatter.js` which is handling validation of the input as that's the area that's most likely to break. The `importResults.js` file also has a test and that could be much more expansive.
