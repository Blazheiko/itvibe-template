ALTER TYPE "llm_text_feature" ADD VALUE 'SUPPORT_EMBEDDING';--> statement-breakpoint
ALTER TABLE "llm_text_usage" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "llm_text_usage" ALTER COLUMN "prompt_tokens" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "llm_text_usage" ALTER COLUMN "prompt_tokens" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "llm_text_usage" ALTER COLUMN "completion_tokens" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "llm_text_usage" ALTER COLUMN "completion_tokens" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "llm_text_usage" ALTER COLUMN "total_tokens" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "llm_text_usage" ALTER COLUMN "total_tokens" DROP NOT NULL;