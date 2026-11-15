-- CreateTable
CREATE TABLE "Investigation" (
    "investigation_id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "research_area" TEXT NOT NULL,
    "project_type" TEXT NOT NULL,
    "objectives" TEXT NOT NULL,
    "approach" TEXT NOT NULL,
    "hypothesis" TEXT NOT NULL,
    "impacts" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "related" TEXT NOT NULL,
    "investigation_doi" TEXT NOT NULL,
    "scraper_doi_unverified" TEXT NOT NULL,
    "relevance_category" TEXT NOT NULL,
    "relevance_rank" INTEGER NOT NULL,
    "relevance_score" REAL NOT NULL,
    "relevance_reason" TEXT NOT NULL,
    "is_combustion_related" BOOLEAN NOT NULL,
    "extraction_status" TEXT NOT NULL,
    "extraction_error" TEXT NOT NULL,
    "data_source" TEXT NOT NULL,
    "acronym" TEXT,
    "sub_research_area" TEXT,
    "managing_center" TEXT,
    "space_program" TEXT,
    "proposal_title" TEXT,
    "investigation_start_date" TEXT,
    "investigation_end_date" TEXT,
    "study_submission_date" TEXT,
    "study_public_release_date" TEXT,
    "raw_json" TEXT NOT NULL,
    "ingested_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "investigation_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "label_norm" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "doi" TEXT NOT NULL,
    "authors_json" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "pubmed_id" TEXT NOT NULL,
    CONSTRAINT "Publication_investigation_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "Investigation" ("investigation_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "investigation_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    CONSTRAINT "Document_investigation_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "Investigation" ("investigation_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SourceArchive" (
    "investigation_id" TEXT NOT NULL PRIMARY KEY,
    "file" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "study_identifier" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "filename_matches_content" BOOLEAN NOT NULL,
    CONSTRAINT "SourceArchive_investigation_id_fkey" FOREIGN KEY ("investigation_id") REFERENCES "Investigation" ("investigation_id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "dataset_sha256" TEXT NOT NULL,
    "source_path" TEXT NOT NULL,
    "record_count" INTEGER NOT NULL,
    "publication_count" INTEGER NOT NULL,
    "document_count" INTEGER NOT NULL,
    "archive_count" INTEGER NOT NULL,
    "started_at" DATETIME NOT NULL,
    "finished_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Investigation_research_area_idx" ON "Investigation"("research_area");

-- CreateIndex
CREATE INDEX "Investigation_project_type_idx" ON "Investigation"("project_type");

-- CreateIndex
CREATE INDEX "Investigation_relevance_rank_relevance_score_idx" ON "Investigation"("relevance_rank", "relevance_score");

-- CreateIndex
CREATE INDEX "Investigation_extraction_status_idx" ON "Investigation"("extraction_status");

-- CreateIndex
CREATE INDEX "Investigation_data_source_idx" ON "Investigation"("data_source");

-- CreateIndex
CREATE INDEX "Publication_investigation_id_idx" ON "Publication"("investigation_id");

-- CreateIndex
CREATE INDEX "Publication_label_norm_idx" ON "Publication"("label_norm");

-- CreateIndex
CREATE INDEX "Publication_doi_idx" ON "Publication"("doi");

-- CreateIndex
CREATE INDEX "Document_investigation_id_idx" ON "Document"("investigation_id");

-- CreateIndex
CREATE INDEX "IngestionRun_dataset_sha256_idx" ON "IngestionRun"("dataset_sha256");
