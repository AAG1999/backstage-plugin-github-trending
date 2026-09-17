/*
 * Copyright 2026 AAG1999 / contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { createApiFactory } from '@backstage/core-plugin-api';
import {
  ApiBlueprint,
  createFrontendPlugin,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/frontend-plugin-api';
import { HomePageWidgetBlueprint } from '@backstage/plugin-home-react/alpha';
import { z } from 'zod/v4';
import { githubTrendingApiRef, GithubTrendingClient } from './api';

const githubTrendingApi = ApiBlueprint.make({
  name: 'client',
  params: defineParams =>
    defineParams(
      createApiFactory({
        api: githubTrendingApiRef,
        deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
        factory: ({ discoveryApi, fetchApi }) =>
          new GithubTrendingClient({ discoveryApi, fetchApi }),
      }),
    ),
});

/**
 * Adopters tune the widget from `app-config.yaml` under
 * `app.extensions.home-page-widget:github-trending/ticker.config` rather than
 * forking the component. Presentation stays here; policy belongs to the app.
 */
const githubTrendingTickerWidget = HomePageWidgetBlueprint.makeWithOverrides({
  name: 'ticker',
  configSchema: {
    since: z.enum(['daily', 'weekly', 'monthly']).optional(),
    language: z.string().optional(),
    spokenLanguageCode: z.string().optional(),
    maxItems: z.number().int().positive().optional(),
    pixelsPerSecond: z.number().positive().optional(),
    refreshIntervalMinutes: z.number().nonnegative().optional(),
    showSpotlight: z.boolean().optional(),
  },
  factory(originalFactory, { config }) {
    return originalFactory({
      name: 'HomePageGithubTrendingTicker',
      description: 'News-channel ticker of GitHub Trending repositories',
      layout: {
        width: { minColumns: 12, defaultColumns: 12 },
        height: { minRows: 2, defaultRows: 2 },
      },
      componentProps: {
        since: config.since,
        language: config.language,
        spokenLanguageCode: config.spokenLanguageCode,
        maxItems: config.maxItems,
        pixelsPerSecond: config.pixelsPerSecond,
        refreshIntervalMinutes: config.refreshIntervalMinutes,
        showSpotlight: config.showSpotlight,
      },
      components: () =>
        import('./components/HomePageGithubTrendingTicker').then(m => ({
          Content: m.HomePageGithubTrendingTicker,
        })),
    });
  },
});

/**
 * New frontend system plugin. Mixed apps should also register the classic
 * plugin so the API factory is discovered.
 * @public
 */
export default createFrontendPlugin({
  pluginId: 'github-trending',
  extensions: [githubTrendingApi, githubTrendingTickerWidget],
});
