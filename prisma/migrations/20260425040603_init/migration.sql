-- CreateTable
CREATE TABLE "dramas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "chart_type" TEXT NOT NULL,
    "score" REAL NOT NULL,
    "url" TEXT NOT NULL,
    "cover" TEXT,
    "description" TEXT,
    "updated_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "dramas_url_key" ON "dramas"("url");

-- CreateIndex
CREATE INDEX "dramas_platform_idx" ON "dramas"("platform");

-- CreateIndex
CREATE INDEX "dramas_chart_type_idx" ON "dramas"("chart_type");

-- CreateIndex
CREATE INDEX "dramas_score_idx" ON "dramas"("score");
