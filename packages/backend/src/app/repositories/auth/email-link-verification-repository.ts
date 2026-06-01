import { db } from "#database/db.js";
import { emailLinkVerifications } from "#database/schema.js";
import { and, eq, isNull, type InferInsertModel, type InferSelectModel } from "drizzle-orm";

export type EmailLinkVerificationRow = InferSelectModel<typeof emailLinkVerifications>;
export type EmailLinkVerificationInsert = InferInsertModel<typeof emailLinkVerifications>;

export interface IEmailLinkVerificationRepository {
  create(data: EmailLinkVerificationInsert): Promise<EmailLinkVerificationRow>;
  findByTokenHash(tokenHash: string): Promise<EmailLinkVerificationRow | undefined>;
  invalidatePendingByUserId(userId: bigint): Promise<number>;
  markUsed(id: bigint, usedAt?: Date): Promise<EmailLinkVerificationRow | undefined>;
}

export const emailLinkVerificationRepository: IEmailLinkVerificationRepository = {
  async create(data) {
    const [created] = await db.insert(emailLinkVerifications).values(data).returning();
    if (created === undefined) {
      throw new Error("Failed to create email link verification");
    }

    return created;
  },

  async findByTokenHash(tokenHash) {
    return await db
      .select()
      .from(emailLinkVerifications)
      .where(eq(emailLinkVerifications.tokenHash, tokenHash))
      .limit(1)
      .then((rows) => rows.at(0));
  },

  async invalidatePendingByUserId(userId) {
    const result = await db
      .update(emailLinkVerifications)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(emailLinkVerifications.userId, userId),
          isNull(emailLinkVerifications.usedAt),
        ),
      )
      .returning({ id: emailLinkVerifications.id });

    return result.length;
  },

  async markUsed(id, usedAt = new Date()) {
    return await db
      .update(emailLinkVerifications)
      .set({ usedAt })
      .where(eq(emailLinkVerifications.id, id))
      .returning()
      .then((rows) => rows.at(0));
  },
};
