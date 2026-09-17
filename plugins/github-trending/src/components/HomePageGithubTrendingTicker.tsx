/*
 * Copyright 2026 AAG1999 / contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import React, {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { makeStyles } from '@material-ui/core/styles';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import PauseIcon from '@material-ui/icons/Pause';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import ArrowDropUpIcon from '@material-ui/icons/ArrowDropUp';
import TrendingUpIcon from '@material-ui/icons/TrendingUp';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';
import { ResponseErrorPanel } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import type {
  TrendingRepository,
  TrendingResponse,
  TrendingSince,
} from '@aag1999/plugin-github-trending-common';
import { githubTrendingApiRef } from '../api';

/**
 * GitHub's own language colours (subset of linguist). A colour dot is parsed
 * far faster than a word — recognition over recall — so we lean on the palette
 * developers already know. Unknown languages fall back to a neutral dot.
 */
const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Vue: '#41b883',
  Scala: '#c22d40',
  'Objective-C': '#438eff',
  R: '#198CE7',
  Elixir: '#6e4a7e',
  Clojure: '#db5855',
  Haskell: '#5e5086',
  Lua: '#000080',
  Perl: '#0298c3',
  Julia: '#a270ba',
  Zig: '#ec915c',
  Solidity: '#AA6746',
  'Jupyter Notebook': '#DA5B0B',
  Nix: '#7e7eff',
  MDX: '#fcb32c',
};

const DEFAULT_REFRESH_MINUTES = 15; // matches backend cache TTL order of magnitude
// Industry practice for readable tickers is 30-80 px/s (>100 px/s is
// considered unreadable); reading research puts the optimum for scrolling text
// near ~6 characters/s, which is ~50 px/s at this font size. So default to 50.
// Refs: crowntv-us.com/blog/scrolling-ticker-tape-display,
// Frontiers in Psychology 2017 (10.3389/fpsyg.2017.01390).
const DEFAULT_PIXELS_PER_SECOND = 50;
const MIN_LOOP_SECONDS = 20; // guard against a near-empty, hyper-short loop
const CLOCK_MS = 60 * 1000; // re-render the "updated Xm ago" label
const SPOTLIGHT_INTERVAL_MS = 9000; // discrete dwell so a description is readable
const SPOTLIGHT_DESC_MAX = 120; // characters before trimming the description

/**
 * Presentation is owned by this plugin; policy is not. Everything an adopter
 * might reasonably want different is a prop, so nobody has to fork the widget.
 *
 * @public
 */
export type HomePageGithubTrendingTickerProps = {
  /** Trending window to request. Defaults to the backend's configured window. */
  since?: TrendingSince;
  /** Restrict to a programming language, e.g. `typescript`. */
  language?: string;
  /** Restrict to a spoken language code, e.g. `en`. */
  spokenLanguageCode?: string;
  /** Cap the number of repositories shown. Defaults to everything returned. */
  maxItems?: number;
  /**
   * Scroll speed in pixels per second. Industry-comfortable range is ~30-80;
   * above ~100 is unreadable. Defaults to 50 (~6 characters/second here).
   */
  pixelsPerSecond?: number;
  /** How often to re-fetch. Set to 0 to disable polling. */
  refreshIntervalMinutes?: number;
  /**
   * Show the static "spotlight" rail beneath the crawl that features one repo
   * at a time with its trimmed description. Defaults to true.
   */
  showSpotlight?: boolean;
};

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.5, 1.5),
    overflow: 'hidden',
    background:
      theme.palette.type === 'dark'
        ? theme.palette.background.paper
        : theme.palette.grey[50],
    borderRadius: theme.shape.borderRadius,
    // A coloured left rail + icon reads as live editorial content, not an ad —
    // the main defence against banner-blindness for a top-of-page strip.
    borderLeft: `3px solid ${theme.palette.primary.main}`,
  },
  // The crawl row: label + pause + moving viewport.
  topRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    minHeight: 44,
  },
  label: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.75),
  },
  labelText: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.1,
  },
  labelTitle: {
    fontWeight: 800,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontSize: 11,
    color: theme.palette.text.primary,
    whiteSpace: 'nowrap',
  },
  // The feed title doubles as the "see the full list" source link. Kept visually
  // near-identical at rest so the strip does not read as a row of links; the
  // affordance arrives on hover (plus a persistent, muted external-link glyph).
  labelLink: {
    fontWeight: 800,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontSize: 11,
    color: theme.palette.text.primary,
    whiteSpace: 'nowrap',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 3,
    textDecoration: 'none',
    borderRadius: 2,
    '&:hover': {
      color: theme.palette.primary.main,
      textDecoration: 'underline',
    },
    '&:hover $labelExternal': {
      opacity: 1,
    },
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: 2,
    },
  },
  labelExternal: {
    fontSize: 11,
    opacity: 0.45,
    transition: 'opacity 120ms ease',
  },
  labelMeta: {
    fontSize: 10,
    color: theme.palette.text.secondary,
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    whiteSpace: 'nowrap',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    backgroundColor: theme.palette.success.main,
    display: 'inline-block',
  },
  trendIcon: {
    color: theme.palette.primary.main,
  },
  viewport: {
    flex: 1,
    overflow: 'hidden',
    maskImage:
      'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)',
    WebkitMaskImage:
      'linear-gradient(to right, transparent, black 16px, black calc(100% - 16px), transparent)',
  },
  // Reduced-motion / no-JS fallback: a single row the user scrolls by hand.
  // Control without motion, and it never wraps into the cards below it.
  staticViewport: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    overflowX: 'auto',
    scrollbarWidth: 'thin',
  },
  track: {
    display: 'flex',
    alignItems: 'stretch',
    width: 'max-content',
    animationName: '$githubTrendingTicker',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
    willChange: 'transform',
  },
  staticTrack: {
    display: 'flex',
    alignItems: 'stretch',
    animation: 'none',
  },
  paused: {
    animationPlayState: 'paused',
  },
  item: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing(0.75),
    padding: theme.spacing(0, 2),
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    color: theme.palette.text.primary,
    borderRadius: theme.shape.borderRadius,
    transition: 'background-color 120ms ease',
    '&:hover': {
      backgroundColor:
        theme.palette.type === 'dark'
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(0,0,0,0.04)',
    },
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: -2,
    },
  },
  rank: {
    color: theme.palette.text.disabled,
    fontVariantNumeric: 'tabular-nums',
    fontSize: 11,
    fontWeight: 700,
    minWidth: 22,
  },
  rankTop: {
    color: theme.palette.warning.main, // top 3 get a warm accent (Von Restorff)
  },
  repo: {
    fontSize: 13,
  },
  owner: {
    color: theme.palette.text.secondary,
    fontWeight: 400,
  },
  name: {
    fontWeight: 700,
  },
  langDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    display: 'inline-block',
    flexShrink: 0,
  },
  lang: {
    fontSize: 11,
    color: theme.palette.text.secondary,
  },
  delta: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 13,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
    color: theme.palette.success.main, // velocity is the hero metric
  },
  deltaIcon: {
    fontSize: 18,
    marginLeft: -4,
    marginRight: -2,
  },
  stars: {
    fontSize: 11,
    color: theme.palette.text.secondary,
    fontVariantNumeric: 'tabular-nums',
  },
  sep: {
    alignSelf: 'center',
    width: 1,
    height: 18,
    backgroundColor: theme.palette.divider,
    flexShrink: 0,
  },
  visuallyHidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  },
  empty: {
    fontSize: 13,
    color: theme.palette.text.secondary,
  },
  // Skeleton: matches the final layout so the strip never looks broken while
  // loading (skeleton screens feel faster than a spinner — Doherty threshold).
  skeletonItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(0, 2),
  },
  skeletonBar: {
    height: 12,
    borderRadius: 6,
    background: theme.palette.action.hover,
    animation: '$githubTrendingShimmer 1.4s ease-in-out infinite',
  },
  // Spotlight rail: a static, slowly-rotating feature row under the crawl.
  // Stillness for depth (readable description) vs the crawl's motion for breadth.
  spotlightRow: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    minHeight: 40,
    borderTop: `1px solid ${theme.palette.divider}`,
    paddingTop: theme.spacing(0.5),
  },
  spotTag: {
    flexShrink: 0,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: theme.palette.text.disabled,
  },
  spotInner: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.75),
    overflow: 'hidden',
  },
  spotFade: {
    animation: '$githubTrendingFade 380ms ease',
  },
  spotName: {
    flexShrink: 0,
    fontSize: 13,
    textDecoration: 'none',
    color: theme.palette.text.primary,
    '&:hover': { textDecoration: 'underline' },
    '&:focus-visible': {
      outline: `2px solid ${theme.palette.primary.main}`,
      outlineOffset: 2,
    },
  },
  spotDesc: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 12,
    color: theme.palette.text.secondary,
  },
  spotDescEmpty: {
    fontStyle: 'italic',
    color: theme.palette.text.disabled,
  },
  spotNav: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 2,
  },
  spotCount: {
    fontSize: 10,
    color: theme.palette.text.disabled,
    fontVariantNumeric: 'tabular-nums',
    minWidth: 30,
    textAlign: 'center',
  },
  '@keyframes githubTrendingTicker': {
    '0%': { transform: 'translateX(0)' },
    '100%': { transform: 'translateX(-50%)' },
  },
  '@keyframes githubTrendingShimmer': {
    '0%, 100%': { opacity: 0.4 },
    '50%': { opacity: 0.9 },
  },
  '@keyframes githubTrendingFade': {
    from: { opacity: 0, transform: 'translateY(2px)' },
    to: { opacity: 1, transform: 'none' },
  },
}));

type Classes = ReturnType<typeof useStyles>;

function formatCount(n: number): string {
  return n.toLocaleString();
}

function trimDescription(desc: string | undefined, max = SPOTLIGHT_DESC_MAX): string {
  if (!desc) {
    return '';
  }
  if (desc.length <= max) {
    return desc;
  }
  const slice = desc.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return `${slice.slice(0, lastSpace > 40 ? lastSpace : max).trimEnd()}…`;
}

function windowLabel(since: TrendingSince | undefined): string {
  switch (since) {
    case 'weekly':
      return 'This week';
    case 'monthly':
      return 'This month';
    default:
      return 'Today';
  }
}

function agoLabel(fetchedAt: string | undefined, now: number): string {
  if (!fetchedAt) {
    return 'live';
  }
  const then = new Date(fetchedAt).getTime();
  if (!Number.isFinite(then)) {
    return 'live';
  }
  const mins = Math.max(0, Math.round((now - then) / 60000));
  if (mins < 1) {
    return 'updated just now';
  }
  if (mins < 60) {
    return `updated ${mins}m ago`;
  }
  const hrs = Math.round(mins / 60);
  return `updated ${hrs}h ago`;
}

const TickerItem = ({
  repo,
  classes,
}: {
  repo: TrendingRepository;
  classes: Classes;
}) => {
  const color = repo.language ? LANGUAGE_COLORS[repo.language] : undefined;
  const aria =
    `#${repo.rank} ${repo.owner}/${repo.name}` +
    `${repo.language ? `, ${repo.language}` : ''}` +
    `, up ${formatCount(repo.starsInPeriod)} stars ${repo.periodLabel}` +
    `, ${formatCount(repo.stars)} total stars` +
    `${repo.description ? `. ${repo.description}` : ''}`;
  return (
    <a
      className={classes.item}
      href={repo.url}
      target="_blank"
      rel="noopener noreferrer"
      title={repo.description || `${repo.owner}/${repo.name}`}
      aria-label={aria}
    >
      <span
        className={`${classes.rank} ${repo.rank <= 3 ? classes.rankTop : ''}`}
      >
        #{repo.rank}
      </span>
      <span className={classes.repo}>
        <span className={classes.owner}>{repo.owner}/</span>
        <span className={classes.name}>{repo.name}</span>
      </span>
      {repo.language ? (
        <>
          <span
            className={classes.langDot}
            style={{ backgroundColor: color || '#8b949e' }}
            aria-hidden="true"
          />
          <span className={classes.lang}>{repo.language}</span>
        </>
      ) : null}
      <span className={classes.delta}>
        <ArrowDropUpIcon className={classes.deltaIcon} aria-hidden="true" />
        {formatCount(repo.starsInPeriod)}
      </span>
      <span className={classes.stars}>{formatCount(repo.stars)}★</span>
    </a>
  );
};

const Spotlight = ({
  repo,
  index,
  total,
  classes,
  animate,
  onPrev,
  onNext,
  onHoverChange,
}: {
  repo: TrendingRepository;
  index: number;
  total: number;
  classes: Classes;
  animate: boolean;
  onPrev: () => void;
  onNext: () => void;
  onHoverChange: (hovered: boolean) => void;
}) => {
  const color = repo.language ? LANGUAGE_COLORS[repo.language] : undefined;
  const desc = trimDescription(repo.description);
  return (
    <div
      className={classes.spotlightRow}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
    >
      <span className={classes.spotTag}>Spotlight</span>
      {/* key remounts the row on change so the fade re-triggers */}
      <div
        key={index}
        className={`${classes.spotInner} ${animate ? classes.spotFade : ''}`}
      >
        <span
          className={`${classes.rank} ${repo.rank <= 3 ? classes.rankTop : ''}`}
        >
          #{repo.rank}
        </span>
        <a
          className={classes.spotName}
          href={repo.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className={classes.owner}>{repo.owner}/</span>
          <span className={classes.name}>{repo.name}</span>
        </a>
        {repo.language ? (
          <>
            <span
              className={classes.langDot}
              style={{ backgroundColor: color || '#8b949e' }}
              aria-hidden="true"
            />
            <span className={classes.lang}>{repo.language}</span>
          </>
        ) : null}
        <span
          className={`${classes.spotDesc} ${desc ? '' : classes.spotDescEmpty}`}
        >
          {desc || 'No description provided.'}
        </span>
        <span className={classes.delta}>
          <ArrowDropUpIcon className={classes.deltaIcon} aria-hidden="true" />
          {formatCount(repo.starsInPeriod)}
        </span>
        <span className={classes.stars}>{formatCount(repo.stars)}★</span>
      </div>
      <div className={classes.spotNav}>
        <IconButton
          size="small"
          aria-label="Previous spotlight repository"
          onClick={onPrev}
        >
          <ChevronLeftIcon fontSize="small" />
        </IconButton>
        <span className={classes.spotCount} aria-hidden="true">
          {index + 1}/{total}
        </span>
        <IconButton
          size="small"
          aria-label="Next spotlight repository"
          onClick={onNext}
        >
          <ChevronRightIcon fontSize="small" />
        </IconButton>
      </div>
    </div>
  );
};

const Skeleton = ({ classes }: { classes: Classes }) => (
  <div className={classes.viewport} aria-hidden="true">
    <div style={{ display: 'flex' }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div className={classes.skeletonItem} key={i}>
          <span className={classes.skeletonBar} style={{ width: 18 }} />
          <span className={classes.skeletonBar} style={{ width: 120 }} />
          <span className={classes.skeletonBar} style={{ width: 40 }} />
        </div>
      ))}
    </div>
  </div>
);

/**
 * Stock-ticker / news-crawl of GitHub Trending.
 *
 * Design intent (human-factors):
 *  - Velocity ("+stars today") is the hero — that is the "what's hot now" signal.
 *  - A GitHub language colour dot is glanceable where a word is not.
 *  - The one-line description (biggest click driver) lives in the hover tooltip.
 *  - Motion is pausable (WCAG 2.2.2), pauses on hover so you can read, and is
 *    replaced by a manually-scrollable row under prefers-reduced-motion.
 * Remove the widget from the Home layout to hide it entirely.
 */
export const HomePageGithubTrendingTicker = (
  props: HomePageGithubTrendingTickerProps = {},
) => {
  const {
    since,
    language,
    spokenLanguageCode,
    maxItems,
    pixelsPerSecond = DEFAULT_PIXELS_PER_SECOND,
    refreshIntervalMinutes = DEFAULT_REFRESH_MINUTES,
    showSpotlight = true,
  } = props;
  const classes = useStyles();
  const api = useApi(githubTrendingApiRef);
  const [response, setResponse] = useState<TrendingResponse | undefined>();
  const [error, setError] = useState<Error>();
  const [userPaused, setUserPaused] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [spotIndex, setSpotIndex] = useState(0);
  const [spotHover, setSpotHover] = useState(false);
  const paused = userPaused || hoverPaused;
  const spotPaused = userPaused || spotHover;

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      api
        .getRepositories({ since, language, spokenLanguageCode })
        .then(data => {
          if (!cancelled) {
            setResponse(data);
            setError(undefined);
            setNow(Date.now());
          }
        })
        .catch(err => {
          if (!cancelled) {
            setError(err instanceof Error ? err : new Error(String(err)));
          }
        });
    };
    load();
    const refresh =
      refreshIntervalMinutes > 0
        ? setInterval(load, refreshIntervalMinutes * 60 * 1000)
        : undefined;
    const clock = setInterval(() => setNow(Date.now()), CLOCK_MS);
    return () => {
      cancelled = true;
      if (refresh) {
        clearInterval(refresh);
      }
      clearInterval(clock);
    };
  }, [api, since, language, spokenLanguageCode, refreshIntervalMinutes]);

  const repos = useMemo(() => {
    const all = response?.repositories;
    return maxItems && all ? all.slice(0, maxItems) : all;
  }, [response, maxItems]);

  const loop = useMemo(
    () => (repos && repos.length > 0 ? [...repos, ...repos] : []),
    [repos],
  );

  // Speed is defined in px/s (the unit the readability standards use), so it
  // stays constant no matter how wide individual repo rows happen to be. To do
  // that we measure the rendered width of one set and derive the loop duration.
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [setWidthPx, setSetWidthPx] = useState(0);

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) {
      return undefined;
    }
    const measure = () => setSetWidthPx(el.scrollWidth / 2); // track is duplicated
    measure();
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver === 'function') {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    }
    return () => ro?.disconnect();
  }, [loop]);

  const durationSec = Math.max(
    MIN_LOOP_SECONDS,
    setWidthPx > 0
      ? setWidthPx / pixelsPerSecond
      : (repos?.length ?? 0) * 7, // pre-measurement fallback (~50 px/s)
  );

  // Discrete rotation for the spotlight: readable dwell, not scrolling text.
  // Under reduced-motion it never auto-advances — the nav arrows drive it.
  const repoCount = repos?.length ?? 0;
  useEffect(() => {
    if (!showSpotlight || reduceMotion || spotPaused || repoCount <= 1) {
      return undefined;
    }
    const id = setInterval(
      () => setSpotIndex(i => (i + 1) % repoCount),
      SPOTLIGHT_INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [showSpotlight, reduceMotion, spotPaused, repoCount]);

  if (error) {
    return <ResponseErrorPanel error={error} />;
  }

  const header = (
    <>
      <div className={classes.label}>
        <TrendingUpIcon className={classes.trendIcon} fontSize="small" />
        <span className={classes.labelText}>
          {response?.sourceUrl ? (
            <Tooltip title="Open GitHub Trending">
              <a
                className={classes.labelLink}
                href={response.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub Trending, opens the full list on github.com in a new tab"
              >
                GitHub Trending
                <OpenInNewIcon
                  className={classes.labelExternal}
                  aria-hidden="true"
                />
              </a>
            </Tooltip>
          ) : (
            <span className={classes.labelTitle}>GitHub Trending</span>
          )}
          <span className={classes.labelMeta}>
            <span className={classes.liveDot} aria-hidden="true" />
            {windowLabel(response?.since)} · {agoLabel(response?.fetchedAt, now)}
          </span>
        </span>
      </div>
      <Tooltip title={paused ? 'Resume ticker' : 'Pause ticker'}>
        <IconButton
          size="small"
          aria-label={paused ? 'Resume ticker' : 'Pause ticker'}
          onClick={() => setUserPaused(value => !value)}
          disabled={reduceMotion}
        >
          {paused ? (
            <PlayArrowIcon fontSize="small" />
          ) : (
            <PauseIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
    </>
  );

  if (!response) {
    return (
      <div className={classes.root}>
        <div className={classes.topRow}>
          {header}
          <Skeleton classes={classes} />
        </div>
      </div>
    );
  }

  const items = repos ?? [];

  const spotlightRepo = items.length ? items[spotIndex % items.length] : undefined;
  const gotoPrev = () =>
    setSpotIndex(i => (i - 1 + items.length) % items.length);
  const gotoNext = () => setSpotIndex(i => (i + 1) % items.length);

  let crawl;
  if (items.length === 0) {
    crawl = (
      <Typography className={classes.empty}>
        No trending repositories right now.
      </Typography>
    );
  } else if (reduceMotion) {
    crawl = (
      <div className={classes.staticViewport}>
        <div className={classes.staticTrack}>
          {items.map((repo, index) => (
            <Fragment key={`${repo.owner}/${repo.name}`}>
              {index > 0 ? (
                <span className={classes.sep} aria-hidden="true" />
              ) : null}
              <TickerItem repo={repo} classes={classes} />
            </Fragment>
          ))}
        </div>
      </div>
    );
  } else {
    crawl = (
      <div
        className={classes.viewport}
        onMouseEnter={() => setHoverPaused(true)}
        onMouseLeave={() => setHoverPaused(false)}
      >
        <div
          ref={trackRef}
          className={`${classes.track} ${paused ? classes.paused : ''}`}
          style={{ animationDuration: `${durationSec}s` }}
          data-testid="github-trending-track"
        >
          {loop.map((repo, index) => (
            <Fragment key={`${repo.owner}/${repo.name}-${index}`}>
              {index > 0 ? (
                <span className={classes.sep} aria-hidden="true" />
              ) : null}
              <TickerItem repo={repo} classes={classes} />
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={classes.root}>
      <div className={classes.topRow}>
        {header}
        {crawl}
      </div>
      {showSpotlight && spotlightRepo ? (
        <Spotlight
          repo={spotlightRepo}
          index={spotIndex % items.length}
          total={items.length}
          classes={classes}
          animate={!reduceMotion}
          onPrev={gotoPrev}
          onNext={gotoNext}
          onHoverChange={setSpotHover}
        />
      ) : null}
      <ul className={classes.visuallyHidden}>
        {items.map(repo => (
          <li key={`${repo.owner}/${repo.name}`}>
            #{repo.rank} {repo.owner}/{repo.name}
            {repo.language ? ` (${repo.language})` : ''} +
            {formatCount(repo.starsInPeriod)} stars {repo.periodLabel},{' '}
            {formatCount(repo.stars)} total
            {repo.description ? `. ${repo.description}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
};

(HomePageGithubTrendingTicker as any).data = {
  'core.extensionName': 'HomePageGithubTrendingTicker',
};
