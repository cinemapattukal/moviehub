
const API = "https://restless-block-eb74.cinemapattukal.workers.dev/api";
const IMAGE = "https://image.tmdb.org/t/p/w500";

const grid = document.getElementById("grid");
const search = document.getElementById("search");
const category = document.getElementById("category");
const statusBox = document.getElementById("status");

let movies = [];
let requestId = 0;

async function loadMovies() {
  const id = ++requestId;
  statusBox.textContent = "Loading movies...";
  grid.replaceChildren();

  try {
    const type = category.value;
    const query = search.value.trim();

    let url;

    if (query) {
      url = `${API}/api/search?query=${encodeURIComponent(query)}`;
    } else if (type === "tv") {
      url = `${API}/api/tv/popular`;
    } else {
      url = `${API}/api/movies/popular`;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error("API error");

    const data = await response.json();
    if (id !== requestId) return;

    movies = (data.results || []).filter(item =>
      item.media_type !== "person" || query
    );

    renderMovies();
  } catch {
    statusBox.textContent =
      "Movies load ആയില്ല. Internet/API പരിശോധിക്കുക.";
  }
}

function renderMovies() {
  const query = search.value.trim().toLowerCase();

  const results = movies.filter(item => {
    const title = item.title || item.name || "";
    const type = item.media_type ||
      (item.first_air_date ? "tv" : "movie");

    return title.toLowerCase().includes(query) &&
      (query || category.value === "all" || type === category.value);
  });

  grid.replaceChildren();
  statusBox.textContent = `${results.length} titles`;

  for (const item of results) {
    const card = document.createElement("article");
    card.className = "movie";

    const poster = document.createElement("img");
    poster.className = "poster";
    poster.alt = `${item.title || item.name || "Movie"} poster`;
    poster.loading = "lazy";

    if (item.poster_path) {
      poster.src = IMAGE + item.poster_path;
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
      `${year} · ★ ${Number(item.vote_average || 0).toFixed(1)}`;

    card.append(poster, title, info);

    card.addEventListener("click", () => {
      alert(
        `${title.textContent}\n\n` +
        (item.overview || "No overview available.")
      );
    });

    grid.append(card);
  }
}

let timer;
search.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(loadMovies, 350);
});

category.addEventListener("change", loadMovies);

loadMovies();
