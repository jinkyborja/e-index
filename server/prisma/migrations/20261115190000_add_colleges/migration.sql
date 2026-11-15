CREATE TABLE `eindex_colleges` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(8) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE INDEX `eindex_colleges_code_key` (`code`),
  UNIQUE INDEX `eindex_colleges_name_key` (`name`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  ENGINE=InnoDB;

CREATE TEMPORARY TABLE `_eindex_college_seed` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(8) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `_eindex_college_seed_code_key` (`code`),
  UNIQUE INDEX `_eindex_college_seed_name_key` (`name`)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  ENGINE=InnoDB;

INSERT INTO `_eindex_college_seed` (`id`, `code`, `name`) VALUES
  ('0de5d3fe-b52b-47e4-a4e9-9b63ce430c1b', 'CAS', 'College of Arts and Sciences (CAS)'),
  ('e4609b7b-ca62-4b6d-8cf6-731a80879f8b', 'CBMA', 'College of Business Management and Accountancy (CBMA)'),
  ('8563024e-76b0-4520-9260-27515c8e123e', 'CCS', 'College of Computer Studies (CCS)'),
  ('835a989f-ce33-4bb7-acf1-272d71cdeb57', 'CCJE', 'College of Criminal Justice Education (CCJE)'),
  ('03e19945-dc27-45aa-95ca-45ba437b80d3', 'COED', 'College of Education (COED)'),
  ('dd238f60-0a02-4226-a394-3b6b4c7f82ce', 'COE', 'College of Engineering (COE)'),
  ('551749fd-7621-4fea-9c75-b51e86cb7cda', 'CHM', 'College of Hospitality Management (CHM)'),
  ('1d5de3ad-0a61-4af0-9ee0-cc11a65a4ae1', 'CON', 'College of Nursing (CON)'),
  ('3d6fa6f1-34aa-4a79-8717-491a2fb37b45', 'COT', 'College of Technology (COT)');

CREATE TEMPORARY TABLE `_eindex_college_conflict_guard` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(8) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `_eindex_college_guard_code_key` (`code`),
  UNIQUE INDEX `_eindex_college_guard_name_key` (`name`)
) DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci
  ENGINE=InnoDB;

INSERT INTO `_eindex_college_conflict_guard` (`id`, `code`, `name`)
SELECT `id`, `code`, `name`
FROM `_eindex_college_seed`;

-- A conflicting existing ID, code, or name violates a guard-table unique key
-- and stops this migration before any college row is inserted or overwritten.
INSERT INTO `_eindex_college_conflict_guard` (`id`, `code`, `name`)
SELECT DISTINCT existingCollege.`id`, existingCollege.`code`, existingCollege.`name`
FROM `eindex_colleges` AS existingCollege
JOIN `_eindex_college_seed` AS seed
  ON existingCollege.`id` = seed.`id`
  OR existingCollege.`code` = seed.`code`
  OR existingCollege.`name` = seed.`name`
WHERE BINARY existingCollege.`id` <> BINARY seed.`id`
   OR BINARY existingCollege.`code` <> BINARY seed.`code`
   OR BINARY existingCollege.`name` <> BINARY seed.`name`;

-- Exact existing seed rows are left unchanged; new rows remain inactive.
INSERT INTO `eindex_colleges` (`id`, `code`, `name`, `isActive`)
SELECT seed.`id`, seed.`code`, seed.`name`, FALSE
FROM `_eindex_college_seed` AS seed
WHERE NOT EXISTS (
  SELECT 1
  FROM `eindex_colleges` AS existingCollege
  WHERE existingCollege.`id` = seed.`id`
    AND existingCollege.`code` = seed.`code`
    AND existingCollege.`name` = seed.`name`
);

DROP TEMPORARY TABLE `_eindex_college_conflict_guard`;
DROP TEMPORARY TABLE `_eindex_college_seed`;

ALTER TABLE `eindex_users`
  ADD COLUMN `collegeId` VARCHAR(191) NULL AFTER `department`,
  ADD COLUMN `organizationUnit` VARCHAR(191) NULL AFTER `collegeId`,
  ADD INDEX `eindex_users_collegeId_idx` (`collegeId`),
  ADD CONSTRAINT `eindex_users_collegeId_fkey`
    FOREIGN KEY (`collegeId`)
    REFERENCES `eindex_colleges` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- MySQL DDL implicitly commits; this transaction covers the data mappings.
START TRANSACTION;

-- Preserve department exactly; the inactive CCS relation is valid for this user.
UPDATE `eindex_users` AS u
JOIN `eindex_colleges` AS c ON c.`code` = 'CCS'
SET u.`collegeId` = c.`id`
WHERE u.`role` = 'TEACHER'
  AND BINARY u.`department` = BINARY 'Computer Studies'
  AND u.`collegeId` IS NULL;

UPDATE `eindex_users`
SET `organizationUnit` = `department`
WHERE `role` = 'ADMIN'
  AND BINARY `department` = BINARY 'Administration'
  AND `organizationUnit` IS NULL;

COMMIT;
