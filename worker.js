
const TMDB = "https://api.themoviedb.org/3";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function reply(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS
      });
    }

    if (request.method !== "GET") {
      return reply({ error: "Method not allowed" }, 405);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    const routes = {
      "/api/movies/popular": "/movie/popular",
      "/api/movies/top-rated": "/movie/top_rated",
      "/api/tv/popular": "/tv/popular",
      "/api/actors/popular": "/person/popular"
    };

    let endpoint = routes[path];
    let searchQuery = null;

    // Search movies, TV series and people
    if (path === "/api/search") {
      searchQuery = (url.searchParams.get("query") || "").trim();

      if (!searchQuery || searchQuery.length > 100) {
        return reply({
          error: "Enter a valid search query"
        }, 400);
      }

      endpoint = "/search/multi";
    } else {
      // Movie details and credits
      const movieMatch = path.match(
        /^\/api\/movies\/(\d+)(\/credits)?$/
      );

      // TV details and credits
      const tvMatch = path.match(
        /^\/api\/tv\/(\d+)(\/credits)?$/
      );

      // Person details
      const personMatch = path.match(
        /^\/api\/people\/(\d+)$/
      );

      if (movieMatch) {
        endpoint = `/movie/${movieMatch[1]}${movieMatch[2] || ""}`;
      } else if (tvMatch) {
        endpoint = `/tv/${tvMatch[1]}${tvMatch[2] || ""}`;
      } else if (personMatch) {
        endpoint = `/person/${personMatch[1]}`;
      }
    }

    // API home / available routes
    if (!endpoint) {
      return reply({
        name: "MovieHub API",
        status: "running",
        routes: [
          "/api/movies/popular",
          "/api/movies/top-rated",
          "/api/tv/popular",
          "/api/actors/popular",
          "/api/search?query=manjummel",
          "/api/movies/123",
          "/api/movies/123/credits",
          "/api/tv/123",
          "/api/tv/123/credits",
          "/api/people/123"
        ]
      });
    }

    const target = new URL(TMDB + endpoint);

    target.searchParams.set(
      "language",
      url.searchParams.get("language") || "en-US"
    );

    if (searchQuery !== null) {
      target.searchParams.set("query", searchQuery);
      target.searchParams.set("include_adult", "false");
    }

    // Page parameter for list/search endpoints
    if (
      endpoint === "/movie/popular" ||
      endpoint === "/movie/top_rated" ||
      endpoint === "/tv/popular" ||
      endpoint === "/person/popular" ||
      endpoint === "/search/multi"
    ) {
      const requestedPage = Number(
        url.searchParams.get("page")
      ) || 1;

      const page = Math.min(
        500,
        Math.max(1, requestedPage)
      );

      target.searchParams.set("page", String(page));
    }

    try {
      if (!env.TMDB_TOKEN) {
        return reply({
          error: "TMDB_TOKEN secret is missing in Cloudflare Worker settings"
        }, 500);
      }

      const response = await fetch(target.toString(), {
        headers: {
          Authorization: `Bearer ${env.TMDB_TOKEN}`,
          Accept: "application/json"
        }
      });

      const data = await response.json();

      if (!response.ok) {
        return reply({
          error: "TMDB request failed",
          status: response.status,
          details: data.status_message || ""
        }, 502);
      }

      return reply(data);
    } catch (error) {
      return reply({
        error: "TMDB connection failed"
      }, 502);
    }
  }
};
