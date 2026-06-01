CREATE TYPE "public"."chat_role" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."llm_prompt_type" AS ENUM('SUPPORT_SYSTEM', 'SUPPORT_FIRST_CHAT', 'SUPPORT_QUERY_TRANSLATION');--> statement-breakpoint
CREATE TYPE "public"."llm_text_feature" AS ENUM('PROMPT_TEST', 'SUPPORT_CHAT', 'SUPPORT_QUERY_TRANSLATION');--> statement-breakpoint
CREATE TYPE "public"."push_notification_status" AS ENUM('SENT', 'FAILED', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."sms_auth_challenge_flow" AS ENUM('register_phone', 'reset_phone', 'link_phone');--> statement-breakpoint
CREATE TYPE "public"."user_app_type" AS ENUM('web', 'pwa');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "email_link_verifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"target_email" varchar(255) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_link_verifications_token_hash_key" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "email_verifications" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_verifications_token_hash_key" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "llm_system_prompts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"type" "llm_prompt_type" NOT NULL,
	"topic" varchar(100),
	"content" text NOT NULL,
	"model" varchar(100),
	"temperature" real,
	"max_tokens" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "llm_system_prompts_type_unique" UNIQUE("type")
);
--> statement-breakpoint
CREATE TABLE "llm_text_usage" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"llm_system_prompt_id" bigint,
	"model" varchar(100) NOT NULL,
	"feature" "llm_text_feature" NOT NULL,
	"final_prompt" text DEFAULT '' NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_user_id" varchar(255) NOT NULL,
	"provider_email" varchar(255),
	"provider_name" varchar(255),
	"provider_avatar" varchar(500),
	"access_token" text,
	"refresh_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_accounts_provider_provider_user_id_key" UNIQUE("provider","provider_user_id")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_key" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "push_notifications_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint,
	"subscription_id" bigint,
	"message_title" varchar(255),
	"message_body" text,
	"message_data" jsonb,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"status" "push_notification_status",
	"error_message" text,
	"response_data" jsonb
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"endpoint" varchar(500) NOT NULL,
	"p256dh_key" text NOT NULL,
	"auth_key" text NOT NULL,
	"user_agent" text,
	"ip_address" varchar(45),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_used_at" timestamp,
	"device_type" varchar(50),
	"browser_name" varchar(100),
	"browser_version" varchar(50),
	"os_name" varchar(100),
	"os_version" varchar(50),
	"notification_types" jsonb,
	"timezone" varchar(50),
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "sms_auth_challenges" (
	"id" varchar(24) PRIMARY KEY NOT NULL,
	"flow" "sms_auth_challenge_flow" NOT NULL,
	"phone" varchar(20) NOT NULL,
	"code_hash" varchar(255) NOT NULL,
	"provider_request_id" varchar(100),
	"metadata" jsonb DEFAULT 'null'::jsonb,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"send_count" integer DEFAULT 1 NOT NULL,
	"resend_available_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"confirmed_at" timestamp,
	"invalidated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_chat_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"role" "chat_role" NOT NULL,
	"content" text NOT NULL,
	"screenshots" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_knowledge_base" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"category" varchar(100),
	"embedding" vector(1536),
	"screenshot_key" varchar(500),
	"screenshot_mime" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_online" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"session_id" varchar(255),
	"socket_uuid" varchar(64) NOT NULL,
	"role" "user_role",
	"ip_address" varchar(45),
	"user_agent" text,
	"type_app" "user_app_type",
	"connected_at" timestamp NOT NULL,
	"disconnected_at" timestamp,
	"connection_duration_ms" bigint,
	"close_code" integer,
	"is_first_connection" boolean DEFAULT false NOT NULL,
	"is_last_connection" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_online_socket_uuid_unique" UNIQUE("socket_uuid")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"email" varchar(255),
	"email_verified_at" timestamp,
	"password" varchar(255),
	"phone" varchar(20),
	"avatar" varchar(500),
	"is_admin" boolean DEFAULT false NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"session_token" varchar(24) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
ALTER TABLE "email_link_verifications" ADD CONSTRAINT "email_link_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_text_usage" ADD CONSTRAINT "llm_text_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_text_usage" ADD CONSTRAINT "llm_text_usage_llm_system_prompt_id_llm_system_prompts_id_fk" FOREIGN KEY ("llm_system_prompt_id") REFERENCES "public"."llm_system_prompts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_notifications_log" ADD CONSTRAINT "push_notifications_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_notifications_log" ADD CONSTRAINT "push_notifications_log_subscription_id_push_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."push_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_chat_history" ADD CONSTRAINT "support_chat_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_online" ADD CONSTRAINT "user_online_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_link_verifications_user_id_idx" ON "email_link_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "email_verifications_user_id_idx" ON "email_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "llm_text_usage_user_id_fkey" ON "llm_text_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "llm_text_usage_prompt_id_idx" ON "llm_text_usage" USING btree ("llm_system_prompt_id");--> statement-breakpoint
CREATE INDEX "llm_text_usage_created_at_idx" ON "llm_text_usage" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "oauth_accounts_user_id_fkey" ON "oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_notifications_log_user_id_fkey" ON "push_notifications_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_notifications_log_subscription_id_fkey" ON "push_notifications_log" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_id_fkey" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sms_auth_challenges_phone_flow_idx" ON "sms_auth_challenges" USING btree ("phone","flow");--> statement-breakpoint
CREATE INDEX "sms_auth_challenges_expires_at_idx" ON "sms_auth_challenges" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "support_chat_history_user_idx" ON "support_chat_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "support_kb_category_idx" ON "support_knowledge_base" USING btree ("category");--> statement-breakpoint
CREATE INDEX "user_online_user_id_idx" ON "user_online" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_online_user_id_connected_at_idx" ON "user_online" USING btree ("user_id","connected_at");--> statement-breakpoint
CREATE INDEX "user_online_connected_at_idx" ON "user_online" USING btree ("connected_at");--> statement-breakpoint
CREATE INDEX "user_online_disconnected_at_idx" ON "user_online" USING btree ("disconnected_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique_non_null_idx" ON "users" USING btree (LOWER("email")) WHERE "users"."email" IS NOT NULL;