# Vercel Embeddings Generator

This GitHub Action converts your markdown files into embeddings and stores them in your Vercel Postgres database, allowing you to perform vector similarity search inside your documentation and website.

## Features

- Automatically generates embeddings for markdown files in your specified directory
- Stores embeddings in Vercel Postgres database
- Supports incremental updates (only processes changed files)
- Option to refresh all embeddings

## Setup

1. In your GitHub repository, go to Settings > Secrets and variables > Actions.
2. Add the following repository secrets:
   - `DATABASE_URL`: Your Vercel Postgres database URL
   - `OPENAI_API_KEY`: Your OpenAI API key

## Usage

To use this action in your workflow, add the following step:

```yaml
- name: Generate Embeddings
  uses: your-username/vercel-embeddings-generator@v1
  with:
    database-url: ${{ secrets.DATABASE_URL }}
    openai-api-key: ${{ secrets.OPENAI_API_KEY }}
    docs-root-path: 'docs/'

