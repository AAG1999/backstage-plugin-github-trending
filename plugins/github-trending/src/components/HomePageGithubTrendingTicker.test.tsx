/*
 * Copyright 2026 AAG1999 / contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import '@testing-library/jest-dom';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import type {
  TrendingRepository,
  TrendingResponse,
} from '@aag1999/plugin-github-trending-common';
import { githubTrendingApiRef, GithubTrendingApi } from '../api';
import { HomePageGithubTrendingTicker } from './HomePageGithubTrendingTicker';

const mockRepositories: TrendingRepository[] = [
  {
    rank: 1,
    owner: 'facebook',
    name: 'react',
    url: 'https://github.com/facebook/react',
    description: 'The library for web and native user interfaces.',
    language: 'JavaScript',
    stars: 230000,
    forks: 46000,
    starsInPeriod: 450,
    periodLabel: 'stars today',
  },
  {
    rank: 2,
    owner: 'microsoft',
    name: 'typescript',
    url: 'https://github.com/microsoft/typescript',
    description:
      'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.',
    language: 'TypeScript',
    stars: 102000,
    forks: 12500,
    starsInPeriod: 320,
    periodLabel: 'stars today',
  },
];

const mockResponse: TrendingResponse = {
  fetchedAt: new Date().toISOString(),
  since: 'daily',
  sourceUrl: 'https://github.com/trending',
  repositories: mockRepositories,
};

describe('HomePageGithubTrendingTicker', () => {
  let mockApi: jest.Mocked<GithubTrendingApi>;

  beforeEach(() => {
    mockApi = {
      getRepositories: jest.fn().mockResolvedValue(mockResponse),
    };

    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    global.ResizeObserver =
      global.ResizeObserver ||
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders trending repositories and spotlight from API response', async () => {
    await renderInTestApp(
      <TestApiProvider apis={[[githubTrendingApiRef, mockApi]]}>
        <HomePageGithubTrendingTicker />
      </TestApiProvider>,
    );

    // Verify API was called
    expect(mockApi.getRepositories).toHaveBeenCalledWith({
      since: undefined,
      language: undefined,
      spokenLanguageCode: undefined,
    });

    // Check repository rows rendered in ticker
    await waitFor(() => {
      expect(screen.getAllByText('facebook/').length).toBeGreaterThan(0);
      expect(screen.getAllByText('react').length).toBeGreaterThan(0);
      expect(screen.getAllByText('microsoft/').length).toBeGreaterThan(0);
      expect(screen.getAllByText('typescript').length).toBeGreaterThan(0);
    });

    // Check spotlight description is rendered
    expect(
      screen.getByText('The library for web and native user interfaces.'),
    ).toBeInTheDocument();
  });

  it('toggles pause and resume when the pause button is clicked', async () => {
    await renderInTestApp(
      <TestApiProvider apis={[[githubTrendingApiRef, mockApi]]}>
        <HomePageGithubTrendingTicker />
      </TestApiProvider>,
    );

    const pauseButton = await screen.findByRole('button', {
      name: /Pause ticker/i,
    });
    expect(pauseButton).toBeInTheDocument();

    // Click to pause
    fireEvent.click(pauseButton);

    const resumeButton = await screen.findByRole('button', {
      name: /Resume ticker/i,
    });
    expect(resumeButton).toBeInTheDocument();

    // Click to resume
    fireEvent.click(resumeButton);
    expect(
      await screen.findByRole('button', { name: /Pause ticker/i }),
    ).toBeInTheDocument();
  });

  it('navigates spotlight items with next and previous buttons', async () => {
    await renderInTestApp(
      <TestApiProvider apis={[[githubTrendingApiRef, mockApi]]}>
        <HomePageGithubTrendingTicker />
      </TestApiProvider>,
    );

    // Initial spotlight repo is rank 1 (react)
    await screen.findByText('The library for web and native user interfaces.');
    expect(screen.getByText('1/2')).toBeInTheDocument();

    // Click next
    const nextButton = screen.getByRole('button', {
      name: /Next spotlight repository/i,
    });
    fireEvent.click(nextButton);

    // Second spotlight repo is rank 2 (typescript)
    expect(
      await screen.findByText(
        'TypeScript is a typed superset of JavaScript that compiles to plain JavaScript.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('2/2')).toBeInTheDocument();

    // Click prev to go back
    const prevButton = screen.getByRole('button', {
      name: /Previous spotlight repository/i,
    });
    fireEvent.click(prevButton);

    expect(
      await screen.findByText('The library for web and native user interfaces.'),
    ).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('renders error panel when the api call fails', async () => {
    mockApi.getRepositories.mockRejectedValueOnce(
      new Error('Failed to fetch trending repos'),
    );

    await renderInTestApp(
      <TestApiProvider apis={[[githubTrendingApiRef, mockApi]]}>
        <HomePageGithubTrendingTicker />
      </TestApiProvider>,
    );

    expect(
      await screen.findByRole('heading', {
        name: /Failed to fetch trending repos/i,
      }),
    ).toBeInTheDocument();
  });

  it('handles empty repositories gracefully without spotlight', async () => {
    mockApi.getRepositories.mockResolvedValueOnce({
      ...mockResponse,
      repositories: [],
    });

    await renderInTestApp(
      <TestApiProvider apis={[[githubTrendingApiRef, mockApi]]}>
        <HomePageGithubTrendingTicker />
      </TestApiProvider>,
    );

    // With 0 repositories, spotlight should not render
    await waitFor(() => {
      expect(screen.queryByText('Spotlight')).not.toBeInTheDocument();
    });
  });
});
