interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
}

/**
 * AniList MCP — wraps AniList GraphQL API (free, no auth)
 *
 * Tools:
 * - search_anime: Search anime by title
 * - get_anime: Get full details for an anime by AniList ID
 * - trending_anime: Get currently trending anime
 */


const GRAPHQL_URL = 'https://graphql.anilist.co';

// ── API types ─────────────────────────────────────────────────────────

type AniListTitle = {
  romaji: string | null;
  english: string | null;
  native: string | null;
};

type AniListMedia = {
  id: number;
  title: AniListTitle;
  description: string | null;
  episodes: number | null;
  duration: number | null;
  status: string | null;
  season: string | null;
  seasonYear: number | null;
  averageScore: number | null;
  meanScore: number | null;
  popularity: number | null;
  favourites: number | null;
  genres: string[] | null;
  format: string | null;
  source: string | null;
  coverImage: { large: string | null; medium: string | null } | null;
  siteUrl: string | null;
  studios: {
    nodes: Array<{ id: number; name: string; isAnimationStudio: boolean }>;
  } | null;
};

type AniListPageResponse = {
  data: {
    Page: {
      media: AniListMedia[];
    };
  };
  errors?: Array<{ message: string }>;
};

type AniListSingleResponse = {
  data: {
    Media: AniListMedia;
  };
  errors?: Array<{ message: string }>;
};

// ── GraphQL fragments ─────────────────────────────────────────────────

const MEDIA_FIELDS = `
  id
  title { romaji english native }
  description(asHtml: false)
  episodes
  duration
  status
  season
  seasonYear
  averageScore
  meanScore
  popularity
  favourites
  genres
  format
  source
  coverImage { large medium }
  siteUrl
  studios(isMain: true) {
    nodes { id name isAnimationStudio }
  }
`;

// ── Tool definitions ──────────────────────────────────────────────────

const tools: McpToolExport['tools'] = [
  {
    name: 'search_anime',
    description:
      'Search anime by title using AniList. Returns title, episode count, status, average score, genres, and a synopsis.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Anime title to search for, e.g. "Attack on Titan" or "Cowboy Bebop"',
        },
        limit: {
          type: 'number',
          description: 'Number of results to return (1–25, default 10)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_anime',
    description:
      'Get full details for an anime by its AniList ID. Returns title, synopsis, episodes, duration, status, score, genres, studios, and season info.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'AniList media ID (e.g. 21 for One Piece, 1 for Cowboy Bebop)',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'trending_anime',
    description:
      'Get currently trending anime on AniList, ranked by trending score. Returns title, status, score, episodes, and genres.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of results to return (1–25, default 10)',
        },
      },
      required: [],
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────

async function gqlPost<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`AniList API error: ${res.status}`);

  const json = (await res.json()) as T & { errors?: Array<{ message: string }> };
  if ((json as { errors?: Array<{ message: string }> }).errors?.length) {
    const msg = (json as { errors: Array<{ message: string }> }).errors[0]!.message;
    throw new Error(`AniList GraphQL error: ${msg}`);
  }
  return json;
}

function formatMedia(m: AniListMedia) {
  return {
    id: m.id,
    title_romaji: m.title.romaji ?? null,
    title_english: m.title.english ?? null,
    title_native: m.title.native ?? null,
    description: m.description ?? null,
    episodes: m.episodes ?? null,
    duration_minutes: m.duration ?? null,
    status: m.status ?? null,
    format: m.format ?? null,
    source: m.source ?? null,
    season: m.season ?? null,
    season_year: m.seasonYear ?? null,
    average_score: m.averageScore ?? null,
    mean_score: m.meanScore ?? null,
    popularity: m.popularity ?? null,
    favourites: m.favourites ?? null,
    genres: m.genres ?? [],
    cover_image: m.coverImage?.large ?? m.coverImage?.medium ?? null,
    site_url: m.siteUrl ?? null,
    studios: (m.studios?.nodes ?? []).map((s) => s.name),
  };
}

// ── Tool implementations ──────────────────────────────────────────────

async function searchAnime(query: string, limit = 10) {
  const gql = `
    query ($search: String, $perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(search: $search, type: ANIME) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  const data = await gqlPost<AniListPageResponse>(gql, {
    search: query,
    perPage: Math.min(Math.max(limit, 1), 25),
  });

  const results = data.data.Page.media.map(formatMedia);
  return { count: results.length, results };
}

async function getAnime(id: number) {
  const gql = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_FIELDS}
      }
    }
  `;

  const data = await gqlPost<AniListSingleResponse>(gql, { id });
  return formatMedia(data.data.Media);
}

async function trendingAnime(limit = 10) {
  const gql = `
    query ($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(type: ANIME, sort: TRENDING_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  const data = await gqlPost<AniListPageResponse>(gql, {
    perPage: Math.min(Math.max(limit, 1), 25),
  });

  const results = data.data.Page.media.map(formatMedia);
  return { count: results.length, results };
}

// ── Dispatcher ────────────────────────────────────────────────────────

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search_anime':
      return searchAnime(args.query as string, args.limit as number | undefined);
    case 'get_anime':
      return getAnime(args.id as number);
    case 'trending_anime':
      return trendingAnime(args.limit as number | undefined);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { tools, callTool, meter: { credits: 2 } } satisfies McpToolExport;
