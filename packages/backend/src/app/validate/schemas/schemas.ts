import type { Type } from "@arktype/type";
import {
  RegisterInputSchema,
  LoginInputSchema,
  SupportChatInputSchema,
  SupportOpenChatInputSchema,
  SupportKnowledgeBaseCreateSchema,
  SupportKnowledgeBaseUpdateSchema,
} from "shared/schemas";

// interface Schema {
//   validator: Type;
// }

const schemas: Record<string, Type> = {
  register: RegisterInputSchema,
  login: LoginInputSchema,
  supportChat: SupportChatInputSchema,
  supportOpenChat: SupportOpenChatInputSchema,
  supportKnowledgeBaseCreate: SupportKnowledgeBaseCreateSchema,
  supportKnowledgeBaseUpdate: SupportKnowledgeBaseUpdateSchema,
};

export default schemas;
