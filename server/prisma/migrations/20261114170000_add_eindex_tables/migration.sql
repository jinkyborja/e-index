-- Additive E-Index tables for the existing MySQL database.
-- This draft creates only namespaced tables. It does not modify existing tables or records.
-- Inspect the target database and back it up before applying this migration.

CREATE TABLE `eindex_users` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `passwordHash` VARCHAR(191) NOT NULL,
  `fullName` VARCHAR(191) NOT NULL,
  `role` ENUM('ADMIN', 'TEACHER') NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'INACTIVE') NOT NULL DEFAULT 'PENDING',
  `department` VARCHAR(191) NOT NULL DEFAULT '',
  `staffId` VARCHAR(191) NULL,
  `registeredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastLoginAt` DATETIME(3) NULL,
  `photo` VARCHAR(191) NOT NULL DEFAULT '',
  `notificationPreferences` JSON NOT NULL,
  `appearance` VARCHAR(191) NOT NULL DEFAULT 'Light',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `eindex_users_email_key` (`email`),
  UNIQUE INDEX `eindex_users_staffId_key` (`staffId`),
  INDEX `eindex_users_role_status_idx` (`role`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `eindex_teacher_registrations` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `submittedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `decidedAt` DATETIME(3) NULL,
  UNIQUE INDEX `eindex_teacher_registrations_userId_key` (`userId`),
  INDEX `eindex_teacher_registrations_status_submittedAt_idx` (`status`, `submittedAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `eindex_teacher_registrations_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `eindex_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `eindex_students` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `program` VARCHAR(191) NOT NULL,
  `yearLevel` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'Active',
  `rfid` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `eindex_students_rfid_key` (`rfid`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `eindex_classes` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `course` VARCHAR(191) NOT NULL,
  `yearLevel` VARCHAR(191) NOT NULL,
  `schedule` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `eindex_classes_name_key` (`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `eindex_class_sections` (
  `id` VARCHAR(191) NOT NULL,
  `classId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  UNIQUE INDEX `eindex_class_sections_classId_name_key` (`classId`, `name`),
  INDEX `eindex_class_sections_classId_idx` (`classId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `eindex_class_sections_classId_fkey`
    FOREIGN KEY (`classId`) REFERENCES `eindex_classes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `eindex_teacher_classes` (
  `teacherId` VARCHAR(191) NOT NULL,
  `classId` VARCHAR(191) NOT NULL,
  INDEX `eindex_teacher_classes_classId_idx` (`classId`),
  PRIMARY KEY (`teacherId`, `classId`),
  CONSTRAINT `eindex_teacher_classes_teacherId_fkey`
    FOREIGN KEY (`teacherId`) REFERENCES `eindex_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `eindex_teacher_classes_classId_fkey`
    FOREIGN KEY (`classId`) REFERENCES `eindex_classes` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `eindex_student_enrollments` (
  `studentId` VARCHAR(191) NOT NULL,
  `sectionId` VARCHAR(191) NOT NULL,
  INDEX `eindex_student_enrollments_sectionId_idx` (`sectionId`),
  PRIMARY KEY (`studentId`, `sectionId`),
  CONSTRAINT `eindex_student_enrollments_studentId_fkey`
    FOREIGN KEY (`studentId`) REFERENCES `eindex_students` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `eindex_student_enrollments_sectionId_fkey`
    FOREIGN KEY (`sectionId`) REFERENCES `eindex_class_sections` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `eindex_attendance` (
  `id` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `sectionId` VARCHAR(191) NOT NULL,
  `teacherId` VARCHAR(191) NOT NULL,
  `date` DATE NOT NULL,
  `status` ENUM('PRESENT', 'LATE', 'ABSENT', 'EXCUSED') NOT NULL,
  `time` VARCHAR(191) NOT NULL DEFAULT '—',
  `remarks` VARCHAR(191) NOT NULL DEFAULT '',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `eindex_attendance_studentId_sectionId_date_key` (`studentId`, `sectionId`, `date`),
  INDEX `eindex_attendance_sectionId_idx` (`sectionId`),
  INDEX `eindex_attendance_teacherId_date_idx` (`teacherId`, `date`),
  PRIMARY KEY (`id`),
  CONSTRAINT `eindex_attendance_studentId_fkey`
    FOREIGN KEY (`studentId`) REFERENCES `eindex_students` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `eindex_attendance_sectionId_fkey`
    FOREIGN KEY (`sectionId`) REFERENCES `eindex_class_sections` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `eindex_attendance_teacherId_fkey`
    FOREIGN KEY (`teacherId`) REFERENCES `eindex_users` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `eindex_grades` (
  `id` VARCHAR(191) NOT NULL,
  `studentId` VARCHAR(191) NOT NULL,
  `sectionId` VARCHAR(191) NOT NULL,
  `period` VARCHAR(191) NOT NULL,
  `quizzes` DOUBLE NOT NULL DEFAULT 0,
  `examinations` DOUBLE NOT NULL DEFAULT 0,
  `activities` DOUBLE NOT NULL DEFAULT 0,
  `assessments` DOUBLE NOT NULL DEFAULT 0,
  UNIQUE INDEX `eindex_grades_studentId_sectionId_period_key` (`studentId`, `sectionId`, `period`),
  INDEX `eindex_grades_sectionId_idx` (`sectionId`),
  PRIMARY KEY (`id`),
  CONSTRAINT `eindex_grades_studentId_fkey`
    FOREIGN KEY (`studentId`) REFERENCES `eindex_students` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `eindex_grades_sectionId_fkey`
    FOREIGN KEY (`sectionId`) REFERENCES `eindex_class_sections` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `eindex_notifications` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `detail` VARCHAR(191) NOT NULL,
  `read` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `eindex_notifications_userId_read_createdAt_idx` (`userId`, `read`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `eindex_notifications_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `eindex_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `eindex_audit_logs` (
  `id` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `detail` VARCHAR(191) NOT NULL,
  `target` VARCHAR(191) NOT NULL,
  `actorId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `eindex_audit_logs_createdAt_idx` (`createdAt`),
  INDEX `eindex_audit_logs_actorId_idx` (`actorId`),
  INDEX `eindex_audit_logs_type_createdAt_idx` (`type`, `createdAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `eindex_audit_logs_actorId_fkey`
    FOREIGN KEY (`actorId`) REFERENCES `eindex_users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;

CREATE TABLE `eindex_sessions` (
  `id` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `eindex_sessions_tokenHash_key` (`tokenHash`),
  INDEX `eindex_sessions_userId_expiresAt_idx` (`userId`, `expiresAt`),
  INDEX `eindex_sessions_expiresAt_idx` (`expiresAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `eindex_sessions_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `eindex_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;
