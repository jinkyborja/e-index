-- REVIEW ONLY: not executed.
-- Target verified read-only: MySQL 8.4.8; 13 E-Index tables.
-- This creates only removable [DEMO AY 2026-2027] rows. It does not insert or
-- update users, colleges, registrations, authentication credentials, or schema.
-- It assigns five demo classes to the single existing approved teacher so that
-- teacher can see the demo roster, attendance, and grades after signing in.
-- It cannot create teacher/student accounts, college links for students/classes,
-- pending approval accounts, exam entities, or grading tasks with this schema.
-- Run in one MySQL session. Stop if the preflight result is not READY.
-- If a statement fails before COMMIT, run ROLLBACK and do not continue.

-- Preflight: this reviewed database currently has exactly one approved admin
-- and one approved teacher. These variables are session-local, not stored.
SET @demo_admin_id = (
  SELECT id FROM eindex_users
  WHERE role = 'ADMIN' AND status = 'APPROVED'
  ORDER BY id LIMIT 1
);
SET @demo_teacher_id = (
  SELECT id FROM eindex_users
  WHERE role = 'TEACHER' AND status = 'APPROVED'
  ORDER BY id LIMIT 1
);
SET @demo_seed_ready = (
  (SELECT COUNT(*) FROM eindex_users WHERE role = 'ADMIN' AND status = 'APPROVED') = 1
  AND
  (SELECT COUNT(*) FROM eindex_users WHERE role = 'TEACHER' AND status = 'APPROVED') = 1
);

SELECT
  (SELECT COUNT(*) FROM eindex_users WHERE role = 'ADMIN' AND status = 'APPROVED') AS approved_admins,
  (SELECT COUNT(*) FROM eindex_users WHERE role = 'TEACHER' AND status = 'APPROVED') AS approved_teachers,
  IF(@demo_seed_ready, 'READY', 'STOP: expected exactly one approved admin and teacher') AS seed_preflight;

-- Temporary, session-only helpers. These do not alter persistent schema.
DROP TEMPORARY TABLE IF EXISTS _eindex_demo_numbers;
DROP TEMPORARY TABLE IF EXISTS _eindex_demo_digits;
DROP TEMPORARY TABLE IF EXISTS _eindex_demo_classes;

CREATE TEMPORARY TABLE _eindex_demo_classes (
  classNo TINYINT UNSIGNED NOT NULL PRIMARY KEY,
  id VARCHAR(191) NOT NULL UNIQUE,
  name VARCHAR(191) NOT NULL UNIQUE,
  course VARCHAR(191) NOT NULL,
  program VARCHAR(191) NOT NULL,
  yearLevel VARCHAR(191) NOT NULL,
  sectionName VARCHAR(191) NOT NULL,
  schedule VARCHAR(191) NOT NULL
) ENGINE=MEMORY;

INSERT INTO _eindex_demo_classes
  (classNo, id, name, course, program, yearLevel, sectionName, schedule)
VALUES
  (1,  'DEMO-AY26-27-CLS-01', '[DEMO AY 2026-2027] BSCS CS101 Section A', 'Computer Programming 101', 'BS Computer Science', '1st Year', 'Section A', 'M 08:00 AM'),
  (2,  'DEMO-AY26-27-CLS-02', '[DEMO AY 2026-2027] BSCS CS201 Section A', 'Database Systems', 'BS Computer Science', '2nd Year', 'Section A', 'T 10:00 AM'),
  (3,  'DEMO-AY26-27-CLS-03', '[DEMO AY 2026-2027] BSCS CS301 Section B', 'Web Development', 'BS Computer Science', '3rd Year', 'Section B', 'W 01:00 PM'),
  (4,  'DEMO-AY26-27-CLS-04', '[DEMO AY 2026-2027] BSCS CS305 Section A', 'Human Computer Interaction', 'BS Computer Science', '3rd Year', 'Section A', 'Th 09:00 AM'),
  (5,  'DEMO-AY26-27-CLS-05', '[DEMO AY 2026-2027] BSCS CS401 Section B', 'Information Management', 'BS Computer Science', '4th Year', 'Section B', 'F 02:00 PM'),
  (6,  'DEMO-AY26-27-CLS-06', '[DEMO AY 2026-2027] BSIT IT201 Section A', 'Web Systems and Technologies', 'BS Information Technology', '2nd Year', 'Section A', 'M 10:00 AM'),
  (7,  'DEMO-AY26-27-CLS-07', '[DEMO AY 2026-2027] BSIT IT202 Section A', 'Network Administration', 'BS Information Technology', '2nd Year', 'Section A', 'T 01:00 PM'),
  (8,  'DEMO-AY26-27-CLS-08', '[DEMO AY 2026-2027] BSIT IT301 Section B', 'Systems Integration', 'BS Information Technology', '3rd Year', 'Section B', 'W 10:00 AM'),
  (9,  'DEMO-AY26-27-CLS-09', '[DEMO AY 2026-2027] BSBA BA101 Section A', 'Financial Accounting', 'BS Business Administration', '1st Year', 'Section A', 'Th 08:00 AM'),
  (10, 'DEMO-AY26-27-CLS-10', '[DEMO AY 2026-2027] BSBA BA201 Section A', 'Marketing Management', 'BS Business Administration', '2nd Year', 'Section A', 'F 10:00 AM'),
  (11, 'DEMO-AY26-27-CLS-11', '[DEMO AY 2026-2027] BSBA BA301 Section B', 'Business Analytics', 'BS Business Administration', '3rd Year', 'Section B', 'M 01:00 PM'),
  (12, 'DEMO-AY26-27-CLS-12', '[DEMO AY 2026-2027] BSBA BA401 Section B', 'Operations Management', 'BS Business Administration', '4th Year', 'Section B', 'T 03:00 PM'),
  (13, 'DEMO-AY26-27-CLS-13', '[DEMO AY 2026-2027] BSN N101 Section A', 'Fundamentals of Nursing', 'BS Nursing', '1st Year', 'Section A', 'W 08:00 AM'),
  (14, 'DEMO-AY26-27-CLS-14', '[DEMO AY 2026-2027] BSN N201 Section A', 'Health Assessment', 'BS Nursing', '2nd Year', 'Section A', 'Th 10:00 AM'),
  (15, 'DEMO-AY26-27-CLS-15', '[DEMO AY 2026-2027] BSN N301 Section B', 'Community Health Nursing', 'BS Nursing', '3rd Year', 'Section B', 'F 01:00 PM'),
  (16, 'DEMO-AY26-27-CLS-16', '[DEMO AY 2026-2027] BSED ED101 Section A', 'Child and Adolescent Learners', 'BSEd English', '1st Year', 'Section A', 'M 03:00 PM'),
  (17, 'DEMO-AY26-27-CLS-17', '[DEMO AY 2026-2027] BSED ED201 Section A', 'Assessment of Learning', 'BSEd English', '2nd Year', 'Section A', 'T 08:00 AM'),
  (18, 'DEMO-AY26-27-CLS-18', '[DEMO AY 2026-2027] BSED ED301 Section B', 'The Teaching Profession', 'BSEd English', '3rd Year', 'Section B', 'W 03:00 PM'),
  (19, 'DEMO-AY26-27-CLS-19', '[DEMO AY 2026-2027] BSCE CE101 Section A', 'Engineering Drawing', 'BS Civil Engineering', '1st Year', 'Section A', 'Th 01:00 PM'),
  (20, 'DEMO-AY26-27-CLS-20', '[DEMO AY 2026-2027] BSCE CE201 Section A', 'Structural Theory', 'BS Civil Engineering', '2nd Year', 'Section A', 'F 08:00 AM'),
  (21, 'DEMO-AY26-27-CLS-21', '[DEMO AY 2026-2027] BSCE CE301 Section B', 'Transportation Engineering', 'BS Civil Engineering', '3rd Year', 'Section B', 'M 02:00 PM'),
  (22, 'DEMO-AY26-27-CLS-22', '[DEMO AY 2026-2027] BSCRIM CJ101 Section A', 'Criminal Jurisprudence', 'BS Criminology', '1st Year', 'Section A', 'T 02:00 PM'),
  (23, 'DEMO-AY26-27-CLS-23', '[DEMO AY 2026-2027] BSCRIM CJ201 Section A', 'Police Organization', 'BS Criminology', '2nd Year', 'Section A', 'W 02:00 PM'),
  (24, 'DEMO-AY26-27-CLS-24', '[DEMO AY 2026-2027] BSCRIM CJ301 Section B', 'Forensic Science', 'BS Criminology', '3rd Year', 'Section B', 'Th 03:00 PM'),
  (25, 'DEMO-AY26-27-CLS-25', '[DEMO AY 2026-2027] BSCRIM CJ401 Section B', 'Criminal Investigation', 'BS Criminology', '4th Year', 'Section B', 'F 03:00 PM'),
  (26, 'DEMO-AY26-27-CLS-26', '[DEMO AY 2026-2027] BSHM HM101 Section A', 'Food and Beverage Service', 'BS Hospitality Management', '1st Year', 'Section A', 'M 09:00 AM'),
  (27, 'DEMO-AY26-27-CLS-27', '[DEMO AY 2026-2027] BSHM HM201 Section A', 'Tourism Planning', 'BS Hospitality Management', '2nd Year', 'Section A', 'T 09:00 AM'),
  (28, 'DEMO-AY26-27-CLS-28', '[DEMO AY 2026-2027] BSHM HM301 Section B', 'Front Office Operations', 'BS Hospitality Management', '3rd Year', 'Section B', 'W 09:00 AM'),
  (29, 'DEMO-AY26-27-CLS-29', '[DEMO AY 2026-2027] BSHM HM401 Section B', 'Philippine Tourism', 'BS Hospitality Management', '4th Year', 'Section B', 'Th 02:00 PM'),
  (30, 'DEMO-AY26-27-CLS-30', '[DEMO AY 2026-2027] BSITech T101 Section A', 'Industrial Safety', 'BS Industrial Technology', '1st Year', 'Section A', 'F 09:00 AM'),
  (31, 'DEMO-AY26-27-CLS-31', '[DEMO AY 2026-2027] BSITech T201 Section A', 'Electronics Technology', 'BS Industrial Technology', '2nd Year', 'Section A', 'M 11:00 AM'),
  (32, 'DEMO-AY26-27-CLS-32', '[DEMO AY 2026-2027] BSITech T301 Section B', 'Quality Control', 'BS Industrial Technology', '3rd Year', 'Section B', 'T 11:00 AM');

CREATE TEMPORARY TABLE _eindex_demo_digits (
  digit TINYINT UNSIGNED NOT NULL PRIMARY KEY
) ENGINE=MEMORY;

INSERT INTO _eindex_demo_digits (digit)
VALUES (0), (1), (2), (3), (4), (5), (6), (7), (8), (9);

CREATE TEMPORARY TABLE _eindex_demo_numbers (
  n SMALLINT UNSIGNED NOT NULL PRIMARY KEY
) ENGINE=MEMORY;

INSERT INTO _eindex_demo_numbers (n)
SELECT generated.n
FROM (
  SELECT hundreds.digit * 100 + tens.digit * 10 + ones.digit + 1 AS n
  FROM _eindex_demo_digits AS hundreds
  CROSS JOIN _eindex_demo_digits AS tens
  CROSS JOIN _eindex_demo_digits AS ones
) AS generated
WHERE generated.n BETWEEN 1 AND 480;

START TRANSACTION;

-- 1. Classes/courses and sections (the schema has no separate Subject or
-- AcademicYear table; course is stored on eindex_classes). These records feed
-- the Administrator Portal and the five assigned classes feed the Teacher Portal.
INSERT INTO eindex_classes (id, name, course, yearLevel, schedule, createdAt, updatedAt)
SELECT c.id, c.name, c.course, c.yearLevel, c.schedule, NOW(3), NOW(3)
FROM _eindex_demo_classes AS c
WHERE @demo_seed_ready = 1
  AND NOT EXISTS (
  SELECT 1 FROM eindex_classes AS existingClass
  WHERE existingClass.id = c.id OR existingClass.name = c.name
);

INSERT INTO eindex_class_sections (id, classId, name)
SELECT CONCAT('DEMO-AY26-27-SEC-', LPAD(c.classNo, 2, '0')), c.id, c.sectionName
FROM _eindex_demo_classes AS c
JOIN eindex_classes AS savedClass
  ON savedClass.id = c.id
 AND savedClass.name = c.name
 AND savedClass.course = c.course
 AND savedClass.yearLevel = c.yearLevel
 AND savedClass.schedule = c.schedule
WHERE NOT EXISTS (
  SELECT 1 FROM eindex_class_sections AS existingSection
  WHERE existingSection.id = CONCAT('DEMO-AY26-27-SEC-', LPAD(c.classNo, 2, '0'))
     OR (existingSection.classId = c.id AND existingSection.name = c.sectionName)
)
  AND @demo_seed_ready = 1;

-- 2. Fictional student records. The actual Student table has no email, college,
-- academic-year, or account/password columns; IDs carry the removable marker.
INSERT INTO eindex_students
  (id, name, program, yearLevel, status, rfid, createdAt, updatedAt)
SELECT
  CONCAT('DEMO-AY26-27-STU-', LPAD(numbers.n, 4, '0')),
  CONCAT(
    ELT(MOD(numbers.n - 1, 20) + 1,
      'Maria', 'Juan', 'Ana', 'Jose', 'Sofia', 'Miguel', 'Isabella', 'Gabriel',
      'Andrea', 'Daniel', 'Patricia', 'Rafael', 'Camille', 'Lorenzo', 'Beatriz',
      'Nico', 'Angela', 'Paolo', 'Catherine', 'Enzo'),
    ' ',
    ELT(FLOOR((numbers.n - 1) / 20) + 1,
      'Santos', 'Reyes', 'Dela Cruz', 'Mendoza', 'Garcia', 'Bautista',
      'Ramos', 'Villanueva', 'Aquino', 'Castillo', 'Navarro', 'Flores',
      'Rivera', 'Torres', 'Lim', 'Cruz', 'Gonzales', 'Fernandez', 'Mercado',
      'Pascual', 'Valdez', 'Manalo', 'Soriano', 'Domingo')
  ),
  c.program,
  c.yearLevel,
  'Active',
  NULL,
  NOW(3),
  NOW(3)
FROM _eindex_demo_numbers AS numbers
JOIN _eindex_demo_classes AS c
  ON c.classNo = CASE
    WHEN numbers.n <= 120 THEN CEILING(numbers.n / 24)
    ELSE 6 + FLOOR((numbers.n - 121) * 27 / 360)
  END
JOIN eindex_classes AS savedClass
  ON savedClass.id = c.id
 AND savedClass.name = c.name
 AND savedClass.course = c.course
 AND savedClass.yearLevel = c.yearLevel
 AND savedClass.schedule = c.schedule
JOIN eindex_class_sections AS savedSection
  ON savedSection.id = CONCAT('DEMO-AY26-27-SEC-', LPAD(c.classNo, 2, '0'))
 AND savedSection.classId = c.id
 AND savedSection.name = c.sectionName
WHERE NOT EXISTS (
  SELECT 1 FROM eindex_students AS existingStudent
  WHERE existingStudent.id = CONCAT('DEMO-AY26-27-STU-', LPAD(numbers.n, 4, '0'))
)
  AND @demo_seed_ready = 1;

-- 3. Assign only the first five demo classes to the existing approved teacher.
-- This inserts demo assignment links; it does not change the teacher account.
INSERT INTO eindex_teacher_classes (teacherId, classId)
SELECT @demo_teacher_id, c.id
FROM _eindex_demo_classes AS c
JOIN eindex_classes AS savedClass
  ON savedClass.id = c.id
 AND savedClass.name = c.name
 AND savedClass.course = c.course
 AND savedClass.yearLevel = c.yearLevel
 AND savedClass.schedule = c.schedule
WHERE c.classNo <= 5
  AND @demo_seed_ready = 1
  AND @demo_teacher_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM eindex_teacher_classes AS existingAssignment
    WHERE existingAssignment.teacherId = @demo_teacher_id
      AND existingAssignment.classId = c.id
  );

-- 4. Enroll all 480 students: 24 in each of the teacher's five classes
-- (120 visible to that teacher), with the other 360 distributed across 27
-- additional classes.
INSERT INTO eindex_student_enrollments (studentId, sectionId)
SELECT
  CONCAT('DEMO-AY26-27-STU-', LPAD(numbers.n, 4, '0')),
  CONCAT('DEMO-AY26-27-SEC-', LPAD(c.classNo, 2, '0'))
FROM _eindex_demo_numbers AS numbers
JOIN _eindex_demo_classes AS c
  ON c.classNo = CASE
    WHEN numbers.n <= 120 THEN CEILING(numbers.n / 24)
    ELSE 6 + FLOOR((numbers.n - 121) * 27 / 360)
  END
JOIN eindex_classes AS savedClass
  ON savedClass.id = c.id
 AND savedClass.name = c.name
 AND savedClass.course = c.course
 AND savedClass.yearLevel = c.yearLevel
JOIN eindex_students AS savedStudent
  ON savedStudent.id = CONCAT('DEMO-AY26-27-STU-', LPAD(numbers.n, 4, '0'))
JOIN eindex_class_sections AS savedSection
  ON savedSection.id = CONCAT('DEMO-AY26-27-SEC-', LPAD(c.classNo, 2, '0'))
 AND savedSection.classId = c.id
 AND savedSection.name = c.sectionName
WHERE NOT EXISTS (
  SELECT 1 FROM eindex_student_enrollments AS existingEnrollment
  WHERE existingEnrollment.studentId = savedStudent.id
    AND existingEnrollment.sectionId = savedSection.id
)
  AND @demo_seed_ready = 1;

-- 5. One attendance row per student in the five teacher-assigned sections.
-- 110/120 are PRESENT; 6 are LATE and 4 ABSENT, which rounds to 92%.
INSERT INTO eindex_attendance
  (id, studentId, sectionId, teacherId, date, status, time, remarks, createdAt, updatedAt)
SELECT
  CONCAT('DEMO-AY26-27-ATT-', LPAD(numbers.n, 4, '0')),
  CONCAT('DEMO-AY26-27-STU-', LPAD(numbers.n, 4, '0')),
  CONCAT('DEMO-AY26-27-SEC-', LPAD(c.classNo, 2, '0')),
  @demo_teacher_id,
  '2026-11-13',
  CASE
    WHEN numbers.n <= 110 THEN 'PRESENT'
    WHEN numbers.n <= 116 THEN 'LATE'
    ELSE 'ABSENT'
  END,
  SUBSTRING(c.schedule, LOCATE(' ', c.schedule) + 1),
  '[DEMO] AY 2026-2027 attendance sample',
  NOW(3),
  NOW(3)
FROM _eindex_demo_numbers AS numbers
JOIN _eindex_demo_classes AS c
  ON c.classNo = CEILING(numbers.n / 24)
JOIN eindex_classes AS savedClass
  ON savedClass.id = c.id
 AND savedClass.name = c.name
 AND savedClass.course = c.course
 AND savedClass.yearLevel = c.yearLevel
JOIN eindex_students AS savedStudent
  ON savedStudent.id = CONCAT('DEMO-AY26-27-STU-', LPAD(numbers.n, 4, '0'))
JOIN eindex_class_sections AS savedSection
  ON savedSection.id = CONCAT('DEMO-AY26-27-SEC-', LPAD(c.classNo, 2, '0'))
 AND savedSection.classId = c.id
 AND savedSection.name = c.sectionName
WHERE numbers.n <= 120
  AND @demo_seed_ready = 1
  AND @demo_teacher_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM eindex_attendance AS existingAttendance
    WHERE existingAttendance.id = CONCAT('DEMO-AY26-27-ATT-', LPAD(numbers.n, 4, '0'))
       OR (
         existingAttendance.studentId = savedStudent.id
         AND existingAttendance.sectionId = savedSection.id
         AND existingAttendance.date = '2026-11-13'
       )
  );

-- 6. Grade records attach to valid students/sections. Grade has no teacherId;
-- the teacher relationship is inferred through section -> class -> assignment.
INSERT INTO eindex_grades
  (id, studentId, sectionId, period, quizzes, examinations, activities, assessments)
SELECT
  CONCAT('DEMO-AY26-27-GRD-', LPAD(numbers.n, 4, '0')),
  CONCAT('DEMO-AY26-27-STU-', LPAD(numbers.n, 4, '0')),
  CONCAT('DEMO-AY26-27-SEC-', LPAD(c.classNo, 2, '0')),
  'AY 2026-2027 - 1st Quarter',
  65 + MOD(numbers.n * 7, 36),
  65 + MOD(numbers.n * 11, 36),
  65 + MOD(numbers.n * 13, 36),
  65 + MOD(numbers.n * 17, 36)
FROM _eindex_demo_numbers AS numbers
JOIN _eindex_demo_classes AS c ON c.classNo = CEILING(numbers.n / 24)
JOIN eindex_classes AS savedClass
  ON savedClass.id = c.id
 AND savedClass.name = c.name
 AND savedClass.course = c.course
 AND savedClass.yearLevel = c.yearLevel
JOIN eindex_students AS savedStudent
  ON savedStudent.id = CONCAT('DEMO-AY26-27-STU-', LPAD(numbers.n, 4, '0'))
JOIN eindex_class_sections AS savedSection
  ON savedSection.id = CONCAT('DEMO-AY26-27-SEC-', LPAD(c.classNo, 2, '0'))
 AND savedSection.classId = c.id
 AND savedSection.name = c.sectionName
WHERE numbers.n <= 120
  AND @demo_seed_ready = 1
  AND NOT EXISTS (
    SELECT 1 FROM eindex_grades AS existingGrade
    WHERE existingGrade.id = CONCAT('DEMO-AY26-27-GRD-', LPAD(numbers.n, 4, '0'))
       OR (
         existingGrade.studentId = savedStudent.id
         AND existingGrade.sectionId = savedSection.id
         AND existingGrade.period = 'AY 2026-2027 - 1st Quarter'
       )
  );

-- 7. Notifications are the only existing message-like table. These demo
-- reminders can appear in the user's notification panel, but are not exam,
-- announcement, or grading-task records because no such tables exist.
INSERT INTO eindex_notifications (id, userId, title, detail, `read`, createdAt)
SELECT
  CONCAT('DEMO-AY26-27-NOTIF-', target.roleCode, '-', LPAD(message.messageNo, 2, '0')),
  target.userId,
  message.title,
  message.detail,
  FALSE,
  NOW(3)
FROM (
  SELECT 'ADMIN' AS roleCode, @demo_admin_id AS userId
  UNION ALL
  SELECT 'TEACHER', @demo_teacher_id
) AS target
CROSS JOIN (
  SELECT 1 AS messageNo, '[DEMO] Academic announcement' AS title,
    'Enrollment review for AY 2026-2027 begins this week. Sample notification only.' AS detail
  UNION ALL
  SELECT 2, '[DEMO] Upcoming examination',
    'Midterm examinations are planned for November 23-28, 2026. Sample reminder only; no exam schedule table exists.'
) AS message
WHERE @demo_seed_ready = 1
  AND target.userId IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM eindex_notifications AS existingNotification
    WHERE existingNotification.id =
      CONCAT('DEMO-AY26-27-NOTIF-', target.roleCode, '-', LPAD(message.messageNo, 2, '0'))
  );

-- 8. Mark demo audit rows explicitly. Existing audit rows remain untouched.
INSERT INTO eindex_audit_logs (id, type, action, detail, target, actorId, createdAt)
SELECT
  CONCAT('DEMO-AY26-27-AUD-', target.roleCode, '-', LPAD(entry.entryNo, 2, '0')),
  'DEMO',
  'Demo seed',
  entry.detail,
  entry.target,
  target.userId,
  NOW(3)
FROM (
  SELECT 'ADMIN' AS roleCode, @demo_admin_id AS userId
  UNION ALL
  SELECT 'TEACHER', @demo_teacher_id
) AS target
CROSS JOIN (
  SELECT 1 AS entryNo, '[DEMO] Added student roster preview.' AS detail,
    'DEMO-AY26-27-STUDENT-ROSTER' AS target
  UNION ALL
  SELECT 2, '[DEMO] Added AY 2026-2027 class and attendance preview.',
    'DEMO-AY26-27-ACADEMIC-RECORDS'
) AS entry
WHERE @demo_seed_ready = 1
  AND target.userId IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM eindex_audit_logs AS existingAudit
    WHERE existingAudit.id =
      CONCAT('DEMO-AY26-27-AUD-', target.roleCode, '-', LPAD(entry.entryNo, 2, '0'))
  );

COMMIT;

DROP TEMPORARY TABLE IF EXISTS _eindex_demo_numbers;
DROP TEMPORARY TABLE IF EXISTS _eindex_demo_digits;
DROP TEMPORARY TABLE IF EXISTS _eindex_demo_classes;

-- Verification queries (read-only).
SELECT 'students' AS recordType, COUNT(*) AS demoRows
FROM eindex_students WHERE id LIKE 'DEMO-AY26-27-STU-%'
UNION ALL
SELECT 'classes', COUNT(*) FROM eindex_classes WHERE id LIKE 'DEMO-AY26-27-CLS-%'
UNION ALL
SELECT 'sections', COUNT(*) FROM eindex_class_sections WHERE id LIKE 'DEMO-AY26-27-SEC-%'
UNION ALL
SELECT 'enrollments', COUNT(*) FROM eindex_student_enrollments
WHERE studentId LIKE 'DEMO-AY26-27-STU-%' AND sectionId LIKE 'DEMO-AY26-27-SEC-%'
UNION ALL
SELECT 'teacher class assignments', COUNT(*) FROM eindex_teacher_classes
WHERE classId LIKE 'DEMO-AY26-27-CLS-%'
UNION ALL
SELECT 'attendance', COUNT(*) FROM eindex_attendance WHERE id LIKE 'DEMO-AY26-27-ATT-%'
UNION ALL
SELECT 'grades', COUNT(*) FROM eindex_grades WHERE id LIKE 'DEMO-AY26-27-GRD-%'
UNION ALL
SELECT 'notifications', COUNT(*) FROM eindex_notifications WHERE id LIKE 'DEMO-AY26-27-NOTIF-%'
UNION ALL
SELECT 'audit logs', COUNT(*) FROM eindex_audit_logs WHERE id LIKE 'DEMO-AY26-27-AUD-%';

-- Teacher dashboard relationship/stat checks. Expect 5 classes, 120 active
-- students, 120 attendance rows, and a rounded attendance rate of 92.
SET @demo_teacher_id = (
  SELECT id FROM eindex_users
  WHERE role = 'TEACHER' AND status = 'APPROVED'
  ORDER BY id LIMIT 1
);

SELECT
  COUNT(DISTINCT c.id) AS demoClasses,
  COUNT(DISTINCT CASE WHEN s.status = 'Active' THEN s.id END) AS activeStudents
FROM eindex_teacher_classes AS tc
JOIN eindex_classes AS c ON c.id = tc.classId
JOIN eindex_class_sections AS cs ON cs.classId = c.id
JOIN eindex_student_enrollments AS se ON se.sectionId = cs.id
JOIN eindex_students AS s ON s.id = se.studentId
WHERE tc.teacherId = @demo_teacher_id
  AND c.id LIKE 'DEMO-AY26-27-CLS-%';

SELECT
  COUNT(*) AS demoAttendanceRows,
  SUM(status = 'PRESENT') AS presentRows,
  ROUND(100 * SUM(status = 'PRESENT') / NULLIF(COUNT(*), 0)) AS roundedAttendanceRate
FROM eindex_attendance
WHERE teacherId = @demo_teacher_id
  AND id LIKE 'DEMO-AY26-27-ATT-%';

-- Administrator counts after seeding. Existing teachers, colleges, and
-- registrations are intentionally not increased or modified.
SELECT
  (SELECT COUNT(*) FROM eindex_users WHERE role = 'TEACHER' AND status = 'APPROVED') AS approvedTeachers,
  (SELECT COUNT(*) FROM eindex_students) AS allStudents,
  (SELECT COUNT(*) FROM eindex_colleges WHERE isActive = TRUE) AS activeColleges,
  (SELECT COUNT(*) FROM eindex_teacher_registrations WHERE status = 'PENDING') AS pendingApprovals,
  (SELECT COUNT(*) FROM eindex_classes) AS allClasses;
