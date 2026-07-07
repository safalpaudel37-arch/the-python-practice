-- New tracking tables are reached only through Prisma (postgres role = owner,
-- bypasses RLS). Enabling RLS with no policies blocks PostgREST anon/authenticated access.
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."attempts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."question_progress" ENABLE ROW LEVEL SECURITY;
