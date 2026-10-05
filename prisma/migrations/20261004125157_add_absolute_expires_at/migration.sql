/*
  Warnings:

  - Added the required column `absoluteExpiresAt` to the `RefreshSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "RefreshSession" ADD COLUMN     "absoluteExpiresAt" TIMESTAMP(3) NOT NULL;
