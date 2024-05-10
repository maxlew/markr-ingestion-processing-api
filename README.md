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
Someone did say "every school system in Europe & North America" thoigh. 

Recommendation is to calculate aggregate data asynchronously after ingestion occurs. Aggregate data would then be stored in it's own table.
This could be simply after commiting the import txn, make an unawaited HTTP call to itself before returning. Or if we're really scaling use something more eventy like RabbitMQ. 

### `POST /import`
Receives an XML payload from the marking machines, there is currently a 5mb limit on payload size. Unsure if this would become an issue in future a single 20 question test is around 2KB, so in theory this would scale to roughly 2,500 tests per import.

Returns a JSON object containing a `errors` array and `success` array. Errors array contains warnings and errors that occur during ingestion, these are normally duplicate scans. Success returns an array of JSON objects of the tests added to the database.


## Assumptions
When the lights go out the postgres database content maintained. I'm not quite sure if AWS deletes the EKS volumes if you don't pay you bills, I assume they just stop the running instances... but at some point surely they kill the whole account. If that happened all the test data would be lost, that would be bad.

The postgres library is handling SQL injection issues for me. It says so, I trust it, but I didn't explicitly test it. If it doesn't there's a whole lot of validation code that should go here.

I didn't use Typescript. This isn't really an assumption more of a statement. Adding a build step to this was more than I really had time for, although it probably would have helped things in retrospect. I did get to play around with using JSDoc as a replacement for Typescript which is a thinking that's been gaining more and more popularity. Now I've done it I don't mind it, for something small like this with a few return types to worry about it works and removes some of the 'weight' of TypeScript.

## How to run
This whole app is designed to run inside of docker with docker-compose.

You can run the application simply by running `docker-compose up`. Assuming you have docker installed of course.

### Development
Because I love pain and hate good DX I didn't make this part very nice. If you make a change you'll need to reboot your `app` container. I spent about 30 seconds trying to get nodemon to work before my patience waned.

I just run this whenever I want to test something

```
docker-compose down && docker-compose build && docker-compose up
```

### Manual Testing
I've also used Postman to test the whole thing, although curl is also pretty easy to. There's a sample.xml file that can be used as an import payload.

Also the docker-compose file is set up to expose port `5432` so if you have a SQL Client you like (TablePlus is my recommended one if you're on a Mac) you can connect to it easily. That's also a good way of checking things are working as expected, I've been burnt before, don't trust a HTTP response, validate the actual data.

### Automated Testing
I'll write unit tests I promise...
