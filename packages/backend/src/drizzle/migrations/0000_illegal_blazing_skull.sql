CREATE TYPE "public"."push_notification_status" AS ENUM('SENT', 'FAILED', 'PENDING');--> statement-breakpoint
CREATE TYPE "public"."user_app_type" AS ENUM('web', 'pwa');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'partner');--> statement-breakpoint
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
	"email" varchar(255) NOT NULL,
	"email_verified_at" timestamp,
	"password" varchar(255),
	"phone" varchar(20),
	"avatar" varchar(500),
	"is_admin" boolean DEFAULT false NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"session_token" varchar(24) NOT NULL,
	"referral_code" varchar(16),
	"premium_until" timestamp,
	"beta_access" boolean DEFAULT false NOT NULL,
	"discount_percent" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_session_token_unique" UNIQUE("session_token"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_online" ADD CONSTRAINT "user_online_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_verifications_user_id_idx" ON "email_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "oauth_accounts_user_id_fkey" ON "oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_notifications_log_user_id_fkey" ON "push_notifications_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "push_notifications_log_subscription_id_fkey" ON "push_notifications_log" USING btree ("subscription_id");--> statement-breakpoint
CREATE INDEX "push_subscriptions_user_id_fkey" ON "push_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_online_user_id_idx" ON "user_online" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_online_user_id_connected_at_idx" ON "user_online" USING btree ("user_id","connected_at");--> statement-breakpoint
CREATE INDEX "user_online_connected_at_idx" ON "user_online" USING btree ("connected_at");--> statement-breakpoint
CREATE INDEX "user_online_disconnected_at_idx" ON "user_online" USING btree ("disconnected_at");