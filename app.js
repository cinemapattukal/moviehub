
const API = "https://restless-block-eb74.cinemapattukal.workers.dev";
const IMAGE = "https://image.tmdb.org/t/p/w500";

const grid = document.getElementById("grid");
const search = document.getElementById("search");
const category = document.getElementById("category");
const statusBox = document.getElementById("status");

let movies = [];
let requestId = 0;
let timer;

async function loadMovies() {
  const id = ++requestId;
  const query = search.value.trim();
  const type = category.value;

  statusBox.textContent = "Loading movies...";
  grid.replaceChildren();

  try {
    let url;

    if (query) {
      url = `${API}/api/search?query=${encodeURIComponent(query)}`;
    } else if (type === "tv") {
      url = `${API}/api/tv/popular`;
    } else {
      url = `${API}/api/movies/popular`;
    }

    const response = await fetch(url);
    const raw = await response.text();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${raw.slice(0, 180)}`);
    }

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error("API returned invalid JSON.");
    }

    if (id !== requestId) return;

    if (!Array.isArray(data.results)) {
      throw new Error("API response-il results array illa.");
    }

    movies = data.results.filter(item =>
      item.media_type !== "person" || query
    );

    renderMovies();

    if (!movies.length) {
      statusBox.textContent = "No movies found.";
    }
  } catch (error) {
    if (id !== requestId) return;

    console.error("MovieHub API error:", error);
    statusBox.textContent = "Error: " + error.message;
  }
}

function renderMovies() {
  const query = search.value.trim().toLowerCase();

  const results = movies.filter(item => {
    const title = item.title || item.name || "";
    const type = item.media_type ||
      (item.first_air_date ? "tv" : "movie");

    return title.toLowerCase().includes(query) &&
      (query || category.value === "all" ||
       type === category.value);
  });

  grid.replaceChildren();
  statusBox.textContent = `${results.length} titles`;

  results.forEach(item => {
    const card = document.createElement("article");
    card.className = "movie";
    card.tabIndex = 0;

    const poster = document.createElement("img");
    poster.className = "poster";
    poster.alt = `${item.title || item.name || "Title"} poster`;
    poster.loading = "lazy";

    if (item.poster_path) {
      poster.src = IMAGE + item.poster_path;

      poster.onerror = () => {
        poster.onerror = null;
        poster.removeAttribute("src");
        poster.alt = "Poster unavailable";
      };
    } else {
      poster.alt = "Poster unavailable";
    }

    const title = document.createElement("h3");
    title.textContent = item.title || item.name || "Untitled";

    const info = document.createElement("p");
    const year = (
      item.release_date || item.first_air_date || ""
    ).slice(0, 4);

    info.textContent =
      `${year || "Year unknown"} · ★ ${Number(
        item.vote_average || 0
      ).toFixed(1)}`;

    card.append(poster, title, info);

    const showDetails = () => {
      alert(
        `${title.textContent}\n` +
        `${year}\n` +
        `Rating: ${Number(item.vote_average || 0).toFixed(1)}\n\n` +
        (item.overview || "No overview available.")
      );
    };

    card.addEventListener("click", showDetails);

    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showDetails();
      }
    });

    grid.append(card);
  });
}

search.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(loadMovies, 350);
});

category.addEventListener("change", loadMovies);

loadMovies();
