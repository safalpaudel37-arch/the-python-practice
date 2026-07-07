-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."javascript_questions" (
    "id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "alternative_answer" TEXT,
    "explanation" TEXT NOT NULL,
    "expected_output" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "javascript_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."questions" (
    "id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "alternative_answer" TEXT,
    "explanation" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "expected_output" TEXT,
    "language" TEXT NOT NULL DEFAULT 'python',

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sql_questions" (
    "id" TEXT NOT NULL,
    "tier" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "alternative_answer" TEXT,
    "explanation" TEXT NOT NULL,
    "expected_output" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sql_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "questions_language_idx" ON "public"."questions"("language" ASC);
