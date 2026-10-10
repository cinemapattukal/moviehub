const API_BASE = "https://YOUR-WORKER.workers.dev/api";

const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const grid = document.getElementById("grid");
const search = document.getElementById("search");
const category = document.getElementById("category");
const statusBox = document.getElementById("status");

let movies = [];

async function loadMovies() {
  statusBox.textContent = "Loading movies...";

  try {
    const response = await fetch(
      `${API_BASE}/movies/popular`
    );

    if (!response.ok) {
      throw new Error("API request failed");
    }

    const data = await response.json();
    movies = data.results || [];
    renderMovies();
  } catch (error) {
    statusBox.textContent =
      "Movie data load ചെയ്യാൻ കഴിഞ്ഞില്ല. Worker API configure ചെയ്യണം.";
  }
}

function renderMovies() {
  const query = search.value.trim().toLowerCase();
  const type = category.value;

  const results = movies.filter(item => {
    const title = item.title || item.name || "";
    const mediaType = item.media_type || "movie";

    return title.toLowerCase().includes(query) &&
      (type === "all" || mediaType === type);
  });

  grid.replaceChildren();
  statusBox.textContent = `${results.length} titles`;

  results.forEach(item => {
    const card = document.createElement("article");
    card.className = "movie";

    const poster = document.createElement("img");
    poster.className = "poster";
    poster.alt = item.title || item.name || "Poster";

    if (item.poster_path) {
      poster.src = IMAGE_BASE + item.poster_path;
    } else {
      poster.alt = "Poster unavailable";
    }

    const title = document.createElement("h3");
    title.textContent = item.title || item.name || "Untitled";

    const info = document.createElement("p");
    info.textContent =
      `${(item.release_date || item.first_air_date || "").slice(0, 4)} · ★ ${Number(item.vote_average || 0).toFixed(1)}`;

    card.append(poster, title, info);
    grid.append(card);
  });
}

search.addEventListener("input", renderMovies);

category.addEventListener("change", renderMovies);

loadMovies();
