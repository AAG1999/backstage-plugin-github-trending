/*
 * Copyright 2026 AAG1999 / contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { Config } from '@backstage/config';
import { LoggerService } from '@backstage/backend-plugin-api';
import { InputError } from '@backstage/errors';
import type {
  TrendingResponse,
  TrendingSince,
} from '@aag1999/plugin-github-trending-common';
import express from 'express';
import Router from 'express-promise-router';
import { MemoryTtlCache } from './cache';
import { parseTrendingHtml } from './parser';

const USER_AGENT =
  'backstage-plugin-github-trending/0.1 (+https://github.com/AAG1999/backstage-plugin-github-trending)';
const ALLOWED_SINCE: TrendingSince[] = ['daily', 'weekly', 'monthly'];

export type RouterOptions = {
  logger: LoggerService;
  config: Config;
  fetchFn?: typeof fetch;
};

function readSince(raw: unknown, fallback: TrendingSince): TrendingSince {
  if (raw === undefined || raw === '') {
    return fallback;
  }
  if (typeof raw === 'string' && ALLOWED_SINCE.includes(raw as TrendingSince)) {
    return raw as TrendingSince;
  }
  throw new InputError(`since must be one of ${ALLOWED_SINCE.join(', ')}`);
}

function buildSourceUrl(opts: {
  baseUrl: string;
  since: TrendingSince;
  language?: string;
  spokenLanguageCode?: string;
}): string {
  const url = new URL(
    opts.language
      ? `/trending/${encodeURIComponent(opts.language)}`
      : '/trending',
    opts.baseUrl,
  );
  if (opts.since !== 'daily') {
    url.searchParams.set('since', opts.since);
  }
  if (opts.spokenLanguageCode) {
    url.searchParams.set('spoken_language_code', opts.spokenLanguageCode);
  }
  return url.toString();
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config } = options;
  const fetchFn = options.fetchFn ?? fetch;
  const cache = new MemoryTtlCache<TrendingResponse>();
  const trendingConfig = config.getOptionalConfig('githubTrending');
  const baseUrl = (
    trendingConfig?.getOptionalString('baseUrl') ?? 'https://github.com'
  ).replace(/\/$/, '');
  const defaultSince = readSince(
    trendingConfig?.getOptionalString('since'),
    'daily',
  );
  const defaultLanguage = trendingConfig?.getOptionalString('language');
  const defaultSpoken =
    trendingConfig?.getOptionalString('spokenLanguageCode');
  const ttlMs =
    (trendingConfig?.getOptionalNumber('cacheTtlMinutes') ?? 45) * 60_000;

  const router = Router();
  router.use(express.json());

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/repositories', async (req, res) => {
    const since = readSince(req.query.since, defaultSince);
    const language =
      typeof req.query.language === 'string' && req.query.language
        ? req.query.language
        : defaultLanguage;
    const spokenLanguageCode =
      typeof req.query.spoken_language_code === 'string' &&
      req.query.spoken_language_code
        ? req.query.spoken_language_code
        : defaultSpoken;
    const cacheKey = JSON.stringify({ since, language, spokenLanguageCode });
    const cached = cache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const sourceUrl = buildSourceUrl({
      baseUrl,
      since,
      language,
      spokenLanguageCode,
    });
    logger.info(`Fetching GitHub Trending ${sourceUrl}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    let html: string;
    try {
      const response = await fetchFn(sourceUrl, {
        headers: {
          Accept: 'text/html',
          'User-Agent': USER_AGENT,
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        logger.warn(
          `GitHub Trending returned HTTP ${response.status} for ${sourceUrl}`,
        );
        res.status(502).json({
          error: `Upstream GitHub Trending returned HTTP ${response.status}`,
        });
        return;
      }
      html = await response.text();
    } catch (error) {
      logger.warn(`GitHub Trending fetch failed: ${error}`);
      res.status(502).json({ error: 'Failed to fetch GitHub Trending' });
      return;
    } finally {
      clearTimeout(timeout);
    }

    const payload: TrendingResponse = {
      fetchedAt: new Date().toISOString(),
      since,
      language,
      spokenLanguageCode,
      sourceUrl,
      repositories: parseTrendingHtml(html, baseUrl),
    };
    cache.set(cacheKey, payload, ttlMs);
    res.json(payload);
  });

  return router;
}
