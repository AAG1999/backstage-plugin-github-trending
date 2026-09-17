/*
 * Copyright 2026 AAG1999 / contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import {
  createApiRef,
  DiscoveryApi,
  FetchApi,
} from '@backstage/core-plugin-api';
import type {
  TrendingQuery,
  TrendingResponse,
} from '@aag1999/plugin-github-trending-common';

export const githubTrendingApiRef = createApiRef<GithubTrendingApi>({
  id: 'plugin.github-trending.service',
});

export interface GithubTrendingApi {
  getRepositories(query?: TrendingQuery): Promise<TrendingResponse>;
}

export class GithubTrendingClient implements GithubTrendingApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  constructor(options: { discoveryApi: DiscoveryApi; fetchApi: FetchApi }) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
  }

  async getRepositories(query: TrendingQuery = {}): Promise<TrendingResponse> {
    const base = await this.discoveryApi.getBaseUrl('github-trending');
    const params = new URLSearchParams();
    if (query.since) {
      params.set('since', query.since);
    }
    if (query.language) {
      params.set('language', query.language);
    }
    if (query.spokenLanguageCode) {
      params.set('spoken_language_code', query.spokenLanguageCode);
    }
    const qs = params.toString();
    const url = qs ? `${base}/repositories?${qs}` : `${base}/repositories`;
    const res = await this.fetchApi.fetch(url);
    if (!res.ok) {
      throw new Error(`GitHub Trending request failed: ${res.status}`);
    }
    return (await res.json()) as TrendingResponse;
  }
}
