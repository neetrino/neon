-- CreateTable
CREATE TABLE "vercel_projects" (
    "vercel_project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "framework" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vercel_projects_pkey" PRIMARY KEY ("vercel_project_id")
);

-- CreateTable
CREATE TABLE "vercel_usage_snapshots" (
    "id" TEXT NOT NULL,
    "vercel_project_id" TEXT NOT NULL,
    "snapshot_date" DATE NOT NULL,
    "bandwidth_gb" DECIMAL(18,6),
    "bandwidth_usd" DECIMAL(18,6),
    "function_gb_hours" DECIMAL(18,6),
    "function_usd" DECIMAL(18,6),
    "edge_function_cpu_ms" DECIMAL(18,2),
    "edge_function_usd" DECIMAL(18,6),
    "build_minutes" DECIMAL(18,4),
    "build_usd" DECIMAL(18,6),
    "image_opt_count" INTEGER,
    "image_opt_usd" DECIMAL(18,6),
    "other_usd" DECIMAL(18,6),
    "total_usd" DECIMAL(18,6),

    CONSTRAINT "vercel_usage_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vercel_sync_runs" (
    "id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "rows_upserted" INTEGER,
    "target_date" DATE NOT NULL,

    CONSTRAINT "vercel_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vercel_usage_snapshots_snapshot_date_idx" ON "vercel_usage_snapshots"("snapshot_date");

-- CreateIndex
CREATE UNIQUE INDEX "vercel_usage_snapshots_vercel_project_id_snapshot_date_key" ON "vercel_usage_snapshots"("vercel_project_id", "snapshot_date");

-- CreateIndex
CREATE INDEX "vercel_sync_runs_started_at_idx" ON "vercel_sync_runs"("started_at");

-- AddForeignKey
ALTER TABLE "vercel_usage_snapshots" ADD CONSTRAINT "vercel_usage_snapshots_vercel_project_id_fkey" FOREIGN KEY ("vercel_project_id") REFERENCES "vercel_projects"("vercel_project_id") ON DELETE CASCADE ON UPDATE CASCADE;
