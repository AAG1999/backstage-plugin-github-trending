import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { githubTrendingPlugin } from '../src/plugin';
import { HomePageGithubTrendingTicker } from '../src/components/HomePageGithubTrendingTicker';
import { githubTrendingApiRef } from '../src/api';
import type { TrendingResponse } from '@aag1999/plugin-github-trending-common';

const sample: TrendingResponse = {
  fetchedAt: new Date().toISOString(),
  since: 'daily',
  sourceUrl: 'https://github.com/trending',
  repositories: [
    {
      rank: 1,
      owner: 'alibaba',
      name: 'open-code-review',
      url: 'https://github.com/alibaba/open-code-review',
      language: 'Go',
      stars: 34422,
      forks: 2446,
      starsInPeriod: 3290,
      periodLabel: 'today',
    },
    {
      rank: 2,
      owner: 'cloudflare',
      name: 'security-audit-skill',
      url: 'https://github.com/cloudflare/security-audit-skill',
      language: 'JavaScript',
      stars: 10284,
      forks: 543,
      starsInPeriod: 3606,
      periodLabel: 'today',
    },
  ],
};

createDevApp()
  .registerPlugin(githubTrendingPlugin)
  .registerApi({
    api: githubTrendingApiRef,
    deps: {},
    factory: () => ({
      getRepositories: async () => sample,
    }),
  })
  .addPage({
    element: React.createElement(HomePageGithubTrendingTicker),
    title: 'GitHub Trending',
    path: '/github-trending',
  })
  .render();
