-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" TEXT NOT NULL,
    "seedScore" DOUBLE PRECISION NOT NULL,
    "eloScore" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "review" TEXT,
    "watchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Watchlist" (
    "id" TEXT NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "mediaType" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comparison" (
    "id" TEXT NOT NULL,
    "winnerTmdbId" INTEGER NOT NULL,
    "loserTmdbId" INTEGER NOT NULL,
    "mediaType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comparison_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Rating_mediaType_idx" ON "Rating"("mediaType");

-- CreateIndex
CREATE UNIQUE INDEX "Rating_tmdbId_mediaType_key" ON "Rating"("tmdbId", "mediaType");

-- CreateIndex
CREATE UNIQUE INDEX "Watchlist_tmdbId_mediaType_key" ON "Watchlist"("tmdbId", "mediaType");

-- CreateIndex
CREATE INDEX "Comparison_mediaType_idx" ON "Comparison"("mediaType");
