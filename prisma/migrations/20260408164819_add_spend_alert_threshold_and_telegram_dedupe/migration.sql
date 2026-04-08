-- AlterTable
ALTER TABLE "neon_projects" ADD COLUMN     "spend_alert_threshold_usd" DECIMAL(12,4);

-- CreateTable
CREATE TABLE "spend_alert_sent" (
    "id" TEXT NOT NULL,
    "neon_project_id" TEXT NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "spend_usd" DECIMAL(12,4) NOT NULL,
    "threshold_usd" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "spend_alert_sent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "spend_alert_sent_snapshot_date_idx" ON "spend_alert_sent"("snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "spend_alert_sent_neon_project_id_snapshot_date_key" ON "spend_alert_sent"("neon_project_id", "snapshot_date");

-- AddForeignKey
ALTER TABLE "spend_alert_sent" ADD CONSTRAINT "spend_alert_sent_neon_project_id_fkey" FOREIGN KEY ("neon_project_id") REFERENCES "neon_projects"("neon_project_id") ON DELETE CASCADE ON UPDATE CASCADE;
