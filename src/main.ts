import * as core from "@actions/core";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { SingleBar, Presets } from "cli-progress";
import { generateMarkdownSources } from "@/src/markdown";
import { type MarkdownSourceType, type Section } from "@/src/types";
import {
  OPENAI_USER_ID,
  OPENAI_EMBEDDING_MODEL,
  DOCS_ROOT_PATH,
  IGNORED_FILES,
  BATCH_SIZE,
} from "@/src/config";

const prisma = new PrismaClient();
const EMBEDDING_MODEL = openai.embedding(OPENAI_EMBEDDING_MODEL.name, {
  dimensions: OPENAI_EMBEDDING_MODEL.dimensions,
  user: OPENAI_USER_ID,
});

export function generateVersionInfo(): {
  refreshVersion: string;
  refreshDate: Date;
} {
  return {
    refreshVersion:
      process.env.GITHUB_SHA && process.env.GITHUB_SHA !== "NO_SHA_FOUND"
        ? process.env.GITHUB_SHA
        : crypto.randomUUID(),
    refreshDate: new Date(),
  };
}

export async function compareChecksum(
  filePath: string,
  hash: string,
): Promise<{ isFileFound: boolean; isFileChanged: boolean | null }> {
  const existingFile = await prisma.file.findUnique({ where: { filePath } });
  if (!existingFile) return { isFileFound: false, isFileChanged: null };
  return { isFileFound: true, isFileChanged: existingFile.fileHash !== hash };
}

export async function embedSections(
  sections: Section[],
): Promise<{ embeddings: number[][]; tokens: number; sections: Section[] }> {
  const sectionsData: Section[] = sections.sort((a, b) =>
    a.slug.localeCompare(b.slug),
  );
  const result = await embedMany({
    values: sectionsData.map((section) => section.content),
    model: EMBEDDING_MODEL.name,
    maxRetries: OPENAI_EMBEDDING_MODEL.maxRetries,
  });
  return {
    embeddings: result.embeddings,
    tokens: result.usage.tokens,
    sections: sectionsData,
  };
}

export async function processFile(
  markdownFile: MarkdownSourceType,
  refreshVersion: string,
  refreshDate: Date,
): Promise<void> {
  const { isFileFound, isFileChanged } = await compareChecksum(
    markdownFile.path,
    markdownFile.checksum,
  );

  if (isFileFound && !isFileChanged) {
    await prisma.file.update({
      where: { filePath: markdownFile.path },
      data: { latestRefresh: refreshDate, latestVersion: refreshVersion },
    });
    return;
  }

  const { embeddings, tokens, sections } = await embedSections(
    markdownFile.sections,
  );

  await prisma.$transaction(async (tx) => {
    if (isFileChanged) {
      await tx.embedding.deleteMany({ where: { filePath: markdownFile.path } });
    }

    await tx.file.upsert({
      where: { filePath: markdownFile.path },
      create: {
        content: markdownFile.content,
        filePath: markdownFile.path,
        fileHash: markdownFile.checksum,
        latestRefresh: refreshDate,
        latestVersion: refreshVersion,
        tokens: tokens,
      },
      update: {
        content: markdownFile.content,
        fileHash: markdownFile.checksum,
        latestRefresh: refreshDate,
        latestVersion: refreshVersion,
        tokens: tokens,
      },
    });

    await tx.embedding.createMany({
      data: embeddings.map((embedding, index) => ({
        filePath: markdownFile.path,
        chunkIndex: index,
        header: sections[index].heading,
        slug: sections[index].slug,
        content: sections[index].content,
        embedding: embedding,
      })),
    });
  });
}

async function cleanupOrphanedData(
  markdownFiles: MarkdownSourceType[],
): Promise<void> {
  const existingFiles = await prisma.file.findMany({
    select: { filePath: true },
  });
  const existingFilePaths = existingFiles.map((file) => file.filePath);
  const missingFiles = existingFilePaths.filter(
    (filePath) =>
      !markdownFiles.some((markdownFile) => markdownFile.path === filePath),
  );

  if (missingFiles.length > 0) {
    await prisma.$transaction([
      prisma.file.deleteMany({ where: { filePath: { in: missingFiles } } }),
      prisma.embedding.deleteMany({
        where: { filePath: { in: missingFiles } },
      }),
    ]);
  }
}

async function processBatch(
  markdownFiles: MarkdownSourceType[],
  refreshVersion: string,
  refreshDate: Date,
  progressBar: SingleBar,
): Promise<void> {
  await Promise.all(
    markdownFiles.map(async (file) => {
      await processFile(file, refreshVersion, refreshDate);
      progressBar.increment();
    }),
  );
}

async function validateInputs(docsRootPath: string): Promise<void> {
  try {
    await fs.access(docsRootPath);
  } catch (error) {
    throw new Error(
      `Invalid docs-root-path: ${docsRootPath}. Directory does not exist or is not accessible.`,
    );
  }
}

export async function run(): Promise<void> {
  const startTime = Date.now();
  let processedFiles = 0;
  let errors = 0;

  try {
    const docsRootPath: string =
      core.getInput("docs-root-path") || DOCS_ROOT_PATH;
    const shouldRefresh: boolean =
      core.getInput("should-refresh") === "true" || false;

    await validateInputs(docsRootPath);

    const { refreshVersion, refreshDate } = generateVersionInfo();
    const markdownFiles: MarkdownSourceType[] = await generateMarkdownSources({
      docsRootPath: docsRootPath,
      ignoredFiles: IGNORED_FILES,
    });

    core.info(`Found ${markdownFiles.length} markdown files to process`);

    const progressBar = new SingleBar(
      {
        format:
          "Processing files |{bar}| {percentage}% | {value}/{total} Files",
        barCompleteChar: "\u2588",
        barIncompleteChar: "\u2591",
        hideCursor: true,
      },
      Presets.shades_classic,
    );

    progressBar.start(markdownFiles.length, 0);

    if (shouldRefresh) {
      core.info("Refreshing all embeddings");
      await prisma.$transaction([
        prisma.file.deleteMany({}),
        prisma.embedding.deleteMany({}),
      ]);
    }

    for (let i = 0; i < markdownFiles.length; i += BATCH_SIZE) {
      const batch = markdownFiles.slice(i, i + BATCH_SIZE);
      await processBatch(batch, refreshVersion, refreshDate, progressBar);
      processedFiles += batch.length;
    }

    progressBar.stop();

    if (!shouldRefresh) {
      core.info("Cleaning up orphaned data");
      await cleanupOrphanedData(markdownFiles);
    }

    const embeddings = await prisma.embedding.count();

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // Convert to seconds

    core.info("Embedding generation completed successfully");
    core.info(`
Summary:
- Files processed: ${processedFiles}
- Errors encountered: ${errors}
- Total duration: ${duration.toFixed(2)} seconds
`);

    // Set output values - Removed as per update request
  } catch (error) {
    errors++;
    core.setFailed(`Error: ${error.message}`);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// This line allows the function to be called when the script is run directly
if (require.main === module) {
  run();
}
