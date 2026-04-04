-- CreateTable
CREATE TABLE "neon_projects" (
    "neon_project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "neon_projects_pkey" PRIMARY KEY ("neon_project_id")
);

-- CreateTable
CREATE TABLE "usage_snapshots" (
    "id" TEXT NOT NULL,
    "neon_project_id" TEXT NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "compute_unit_seconds" BIGINT,
    "root_branch_bytes_month" BIGINT,
    "child_branch_bytes_month" BIGINT,
    "instant_restore_bytes_month" BIGINT,
    "public_network_transfer_bytes" BIGINT,
    "private_network_transfer_bytes" BIGINT,
    "extra_branches_month" BIGINT,

    CONSTRAINT "usage_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_runs" (
    "id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "rows_upserted" INTEGER,
    "target_date" DATE NOT NULL,

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usage_snapshots_neon_project_id_snapshot_date_key" ON "usage_snapshots"("neon_project_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "usage_snapshots_snapshot_date_idx" ON "usage_snapshots"("snapshot_date");

-- CreateIndex
CREATE INDEX "sync_runs_started_at_idx" ON "sync_runs"("started_at");

-- AddForeignKey
ALTER TABLE "usage_snapshots" ADD CONSTRAINT "usage_snapshots_neon_project_id_fkey" FOREIGN KEY ("neon_project_id") REFERENCES "neon_projects"("neon_project_id") ON DELETE CASCADE ON UPDATE CASCADE;
