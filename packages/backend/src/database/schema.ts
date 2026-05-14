import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    boolean,
    timestamp,
    text,
    pgEnum,
    integer,
    index,
    unique,
    jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const userRoleEnum = pgEnum('user_role', ['user', 'admin', 'partner']);
export const pushNotificationStatusEnum = pgEnum('push_notification_status', ['SENT', 'FAILED', 'PENDING']);
export const userAppTypeEnum = pgEnum('user_app_type', ['web', 'pwa']);

export const users = pgTable('users', {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerifiedAt: timestamp('email_verified_at'),
    password: varchar('password', { length: 255 }),
    phone: varchar('phone', { length: 20 }).unique(),
    avatar: varchar('avatar', { length: 500 }),
    isAdmin: boolean('is_admin').notNull().default(false),
    role: userRoleEnum('role').notNull().default('user'),
    sessionToken: varchar('session_token', { length: 24 }).notNull().unique().$defaultFn(() => nanoid()),
    referralCode: varchar('referral_code', { length: 16 }).unique(),
    premiumUntil: timestamp('premium_until'),
    betaAccess: boolean('beta_access').notNull().default(false),
    discountPercent: integer('discount_percent').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
});

export const userOnline = pgTable('user_online', {
    id: bigserial('id', { mode: 'bigint' }).primaryKey(),
    userId: bigint('user_id', { mode: 'bigint' })
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    sessionId: varchar('session_id', { length: 255 }),
    socketUuid: varchar('socket_uuid', { length: 64 }).notNull().unique(),
    role: userRoleEnum('role'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    typeApp: userAppTypeEnum('type_app'),
    connectedAt: timestamp('connected_at').notNull(),
    disconnectedAt: timestamp('disconnected_at'),
    connectionDurationMs: bigint('connection_duration_ms', { mode: 'number' }),
    closeCode: integer('close_code'),
    isFirstConnection: boolean('is_first_connection').notNull().default(false),
    isLastConnection: boolean('is_last_connection'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
        .notNull()
        .defaultNow()
        .$onUpdate(() => new Date()),
}, (table) => [
    index('user_online_user_id_idx').on(table.userId),
    index('user_online_user_id_connected_at_idx').on(table.userId, table.connectedAt),
    index('user_online_connected_at_idx').on(table.connectedAt),
    index('user_online_disconnected_at_idx').on(table.disconnectedAt),
]);

export const pushSubscriptions = pgTable(
    'push_subscriptions',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' }).notNull(),
        endpoint: varchar('endpoint', { length: 500 }).notNull().unique(),
        p256dhKey: text('p256dh_key').notNull(),
        authKey: text('auth_key').notNull(),
        userAgent: text('user_agent'),
        ipAddress: varchar('ip_address', { length: 45 }),
        isActive: boolean('is_active').notNull().default(true),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at')
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
        lastUsedAt: timestamp('last_used_at'),
        deviceType: varchar('device_type', { length: 50 }),
        browserName: varchar('browser_name', { length: 100 }),
        browserVersion: varchar('browser_version', { length: 50 }),
        osName: varchar('os_name', { length: 100 }),
        osVersion: varchar('os_version', { length: 50 }),
        notificationTypes: jsonb('notification_types'),
        timezone: varchar('timezone', { length: 50 }),
    },
    (table) => [
        index('push_subscriptions_user_id_fkey').on(table.userId),
    ],
);

export const pushNotificationLogs = pgTable(
    'push_notifications_log',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' }),
        subscriptionId: bigint('subscription_id', { mode: 'bigint' }),
        messageTitle: varchar('message_title', { length: 255 }),
        messageBody: text('message_body'),
        messageData: jsonb('message_data'),
        sentAt: timestamp('sent_at').notNull().defaultNow(),
        status: pushNotificationStatusEnum('status'),
        errorMessage: text('error_message'),
        responseData: jsonb('response_data'),
    },
    (table) => [
        index('push_notifications_log_user_id_fkey').on(table.userId),
        index('push_notifications_log_subscription_id_fkey').on(table.subscriptionId),
    ],
);

export const emailVerifications = pgTable(
    'email_verifications',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' })
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        tokenHash: varchar('token_hash', { length: 64 }).notNull(),
        expiresAt: timestamp('expires_at').notNull(),
        usedAt: timestamp('used_at'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        unique('email_verifications_token_hash_key').on(table.tokenHash),
        index('email_verifications_user_id_idx').on(table.userId),
    ],
);

export const passwordResetTokens = pgTable(
    'password_reset_tokens',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' })
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        tokenHash: varchar('token_hash', { length: 64 }).notNull(),
        expiresAt: timestamp('expires_at').notNull(),
        usedAt: timestamp('used_at'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
    },
    (table) => [
        unique('password_reset_tokens_token_hash_key').on(table.tokenHash),
        index('password_reset_tokens_user_id_idx').on(table.userId),
    ],
);

export const oauthAccounts = pgTable(
    'oauth_accounts',
    {
        id: bigserial('id', { mode: 'bigint' }).primaryKey(),
        userId: bigint('user_id', { mode: 'bigint' })
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        provider: varchar('provider', { length: 50 }).notNull(),
        providerUserId: varchar('provider_user_id', { length: 255 }).notNull(),
        providerEmail: varchar('provider_email', { length: 255 }),
        providerName: varchar('provider_name', { length: 255 }),
        providerAvatar: varchar('provider_avatar', { length: 500 }),
        accessToken: text('access_token'),
        refreshToken: text('refresh_token'),
        createdAt: timestamp('created_at').notNull().defaultNow(),
        updatedAt: timestamp('updated_at')
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
    },
    (table) => [
        unique('oauth_accounts_provider_provider_user_id_key').on(
            table.provider,
            table.providerUserId,
        ),
        index('oauth_accounts_user_id_fkey').on(table.userId),
    ],
);

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
    user: one(users, {
        fields: [oauthAccounts.userId],
        references: [users.id],
    }),
}));

export const emailVerificationsRelations = relations(emailVerifications, ({ one }) => ({
    user: one(users, {
        fields: [emailVerifications.userId],
        references: [users.id],
    }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
    user: one(users, {
        fields: [passwordResetTokens.userId],
        references: [users.id],
    }),
}));

export const usersRelations = relations(users, ({ many }) => ({
    oauthAccounts: many(oauthAccounts),
    emailVerifications: many(emailVerifications),
    passwordResetTokens: many(passwordResetTokens),
    onlineSessions: many(userOnline),
    pushSubscriptions: many(pushSubscriptions),
    pushNotificationLogs: many(pushNotificationLogs),
}));

export const userOnlineRelations = relations(userOnline, ({ one }) => ({
    user: one(users, {
        fields: [userOnline.userId],
        references: [users.id],
    }),
}));

export const pushSubscriptionsRelations = relations(
    pushSubscriptions,
    ({ one, many }) => ({
        user: one(users, {
            fields: [pushSubscriptions.userId],
            references: [users.id],
        }),
        notificationLogs: many(pushNotificationLogs),
    }),
);

export const pushNotificationLogsRelations = relations(
    pushNotificationLogs,
    ({ one }) => ({
        user: one(users, {
            fields: [pushNotificationLogs.userId],
            references: [users.id],
        }),
        subscription: one(pushSubscriptions, {
            fields: [pushNotificationLogs.subscriptionId],
            references: [pushSubscriptions.id],
        }),
    }),
);
