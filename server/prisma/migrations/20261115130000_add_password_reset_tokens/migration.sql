CREATE TABLE `eindex_password_reset_tokens` (
  `id` VARCHAR(191) NOT NULL,
  `tokenHash` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `eindex_password_reset_tokens_tokenHash_key` (`tokenHash`),
  INDEX `eindex_password_reset_tokens_userId_expiresAt_idx` (`userId`, `expiresAt`),
  INDEX `eindex_password_reset_tokens_expiresAt_idx` (`expiresAt`),
  PRIMARY KEY (`id`),
  CONSTRAINT `eindex_password_reset_tokens_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `eindex_users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci ENGINE=InnoDB;
