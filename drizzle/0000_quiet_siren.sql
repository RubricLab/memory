-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE IF NOT EXISTS "Relationship" (
	"id" text NOT NULL,
	"body" text NOT NULL,
	"sourceId" text NOT NULL,
	"targetId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"typeId" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Idea" (
	"id" text NOT NULL,
	"body" text NOT NULL,
	"vector" vector(768),
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "Data" (
	"id" text NOT NULL,
	"ideaId" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "RelationshipType" (
	"id" text NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "public"."Idea"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "public"."Idea"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Relationship" ADD CONSTRAINT "Relationship_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "public"."RelationshipType"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Data" ADD CONSTRAINT "Data_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "public"."Idea"("id") ON DELETE restrict ON UPDATE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "Relationship_body_key" ON "Relationship" USING btree ("body");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "Idea_body_key" ON "Idea" USING btree ("body");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "RelationshipType_name_key" ON "RelationshipType" USING btree ("name");
*/