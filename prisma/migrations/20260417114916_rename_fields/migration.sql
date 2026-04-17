/*
  Warnings:

  - You are about to drop the column `content` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `posts` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `posts` table. All the data in the column will be lost.
  - Added the required column `answer` to the `posts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `question` to the `posts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `posts` DROP COLUMN `content`,
    DROP COLUMN `date`,
    DROP COLUMN `title`,
    ADD COLUMN `answer` TEXT NOT NULL,
    ADD COLUMN `question` VARCHAR(255) NOT NULL;
