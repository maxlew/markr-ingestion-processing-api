CREATE TABLE IF NOT EXISTS test_results (
  test_id INT NOT NULL,
  student_number INT NOT NULL,
  scanned_on DATE NOT NULL,
  first_name varchar(250) NOT NULL,
  last_name varchar(250) NOT NULL,
  marks_obtained INT NOT NULL,
  marks_available INT NOT NULL,
  percentage_score DECIMAL NOT NULL,
  PRIMARY KEY (test_id, student_number)
);
