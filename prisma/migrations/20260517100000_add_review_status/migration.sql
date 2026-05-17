-- AlterEnum
-- Insert REVIEW between IN_PROGRESS and BLOCKED so ORDER BY status places
-- in-review tasks after in-progress and before blocked / done.
ALTER TYPE "TaskStatus" ADD VALUE 'REVIEW' BEFORE 'BLOCKED';
