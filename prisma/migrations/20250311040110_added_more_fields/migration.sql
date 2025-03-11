/*
  Warnings:

  - Added the required column `owner` to the `WebhookData` table without a default value. This is not possible if the table is not empty.
  - Added the required column `repoName` to the `WebhookData` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WebhookData" ADD COLUMN     "owner" TEXT NOT NULL,
ADD COLUMN     "repoName" TEXT NOT NULL;
