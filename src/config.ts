import { EmbeddingModel } from "@/src/types";

export const OPENAI_USER_ID = "user-id";
export const OPENAI_EMBEDDING_MODEL: EmbeddingModel = { name: "text-embedding-3-small", dimensions: 1536, pricing: 0.00002, maxRetries: 2 };
export const DOCS_ROOT_PATH = "docs/";
export const IGNORED_FILES = ["pages/404.mdx"];
export const BATCH_SIZE = 100;

