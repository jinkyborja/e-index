-- REVIEW ONLY: not executed.
-- Run only when removing the demo rows created by demo-data-review.sql.
-- All direct deletes use the reserved DEMO-AY26-27- prefix.
-- Rows that have since been referenced by non-demo records are preserved.

START TRANSACTION;

DELETE FROM eindex_notifications
WHERE id LIKE 'DEMO-AY26-27-NOTIF-%';

DELETE FROM eindex_audit_logs
WHERE id LIKE 'DEMO-AY26-27-AUD-%';

DELETE FROM eindex_attendance
WHERE id LIKE 'DEMO-AY26-27-ATT-%';

DELETE FROM eindex_grades
WHERE id LIKE 'DEMO-AY26-27-GRD-%';

DELETE FROM eindex_student_enrollments
WHERE studentId LIKE 'DEMO-AY26-27-STU-%'
  AND sectionId LIKE 'DEMO-AY26-27-SEC-%';

DELETE FROM eindex_teacher_classes
WHERE classId LIKE 'DEMO-AY26-27-CLS-%';

-- Preserve sections/classes if non-demo rows have subsequently referenced them.
DELETE FROM eindex_class_sections AS demoSection
WHERE demoSection.id LIKE 'DEMO-AY26-27-SEC-%'
  AND NOT EXISTS (
    SELECT 1 FROM eindex_student_enrollments AS enrollment
    WHERE enrollment.sectionId = demoSection.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM eindex_attendance AS attendance
    WHERE attendance.sectionId = demoSection.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM eindex_grades AS grade
    WHERE grade.sectionId = demoSection.id
  );

DELETE FROM eindex_students AS demoStudent
WHERE demoStudent.id LIKE 'DEMO-AY26-27-STU-%'
  AND NOT EXISTS (
    SELECT 1 FROM eindex_student_enrollments AS enrollment
    WHERE enrollment.studentId = demoStudent.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM eindex_attendance AS attendance
    WHERE attendance.studentId = demoStudent.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM eindex_grades AS grade
    WHERE grade.studentId = demoStudent.id
  );

DELETE FROM eindex_classes AS demoClass
WHERE demoClass.id LIKE 'DEMO-AY26-27-CLS-%'
  AND NOT EXISTS (
    SELECT 1 FROM eindex_class_sections AS section
    WHERE section.classId = demoClass.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM eindex_teacher_classes AS assignment
    WHERE assignment.classId = demoClass.id
  );

COMMIT;

-- Review any tagged rows intentionally preserved due to downstream references.
SELECT 'students' AS recordType, COUNT(*) AS remainingDemoRows
FROM eindex_students WHERE id LIKE 'DEMO-AY26-27-STU-%'
UNION ALL
SELECT 'classes', COUNT(*) FROM eindex_classes WHERE id LIKE 'DEMO-AY26-27-CLS-%'
UNION ALL
SELECT 'sections', COUNT(*) FROM eindex_class_sections WHERE id LIKE 'DEMO-AY26-27-SEC-%';
