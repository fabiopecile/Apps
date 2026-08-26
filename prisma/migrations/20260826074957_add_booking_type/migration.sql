-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('TRAINING', 'SPIEL');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "type" "BookingType" NOT NULL DEFAULT 'TRAINING';

