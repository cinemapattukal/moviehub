
"use strict";

/* MovieHub frontend: Cloudflare Worker + TMDB */
const API = "https://restless-block-eb74.cinemapattukal.workers.dev";
const IMAGE_BASE = "https://image.tmdb.org/t/p/";
const POSTER_SIZE = "w500";
const BACKDROP_SIZE = "w1280";

const grid = document.getElementById("grid");
const search = document.getElementById("search");
const category = document.getElementById("category");
const statusBox = document.getElementById("status");

let currentPage = 1;
let totalPages = 1;
let requestId = 0;
let activeSection = "all";
let searchTimer = null;

function setStatus(message) {
  if (statusBox) statusBox.textContent = message;
}

function getTitle(item) {
  return item.title || item.name || "Untitled";
}

function getMediaType(item) {
  if (item.media_type) return item.media_type;
  if (item.first_air_date) return "tv";
  if (item.known_for_department || item.profile_path) return "person";
  return "movie";
}

function getYear(item) {
  const date = item.release_date || item.first_air_date || "";
  return date ? date.slice(0, 4) : "Year unavailable";
}

function imageURL(path, size = POSTER_SIZE) {
  return path ? IMAGE_BASE + size + path : "";
}

function makeURL(path, page = currentPage) {
  const url = new URL(API + path);
  url.searchParams.set("page", String(page));
  url.searchParams.set("language", "en-US");
  return url.toString();
}

async function fetchJSON(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) throw new Error("HTTP " + response.status);

  const data = await response.json();
  if (data.error) throw new Error(data.error);

  return data;
}

/* Load movies, TV shows, or search results */
async function loadMovies() {
  if (!grid) return;

  const myRequest = ++requestId;
  const query = search ? search.value.trim() : "";
  const selected = category ? category.value : "all";

  setStatus("Loading titles...");
  grid.replaceChildren();

  try {
    let items = [];
    let pages = 1;

    if (query) {
      const url = new URL(API + "/api/search");
      url.searchParams.set("query", query);
      url.searchParams.set("page", String(currentPage));
      url.searchParams.set("language", "en-US");

      const data = await fetchJSON(url.toString());
      items = data.results || [];
      pages = data.total_pages || 1;

      if (selected === "movie") {
        items = items.filter(x => getMediaType(x) === "movie");
      }

      if (selected === "tv") {
        items = items.filter(x => getMediaType(x) === "tv");
      }

      if (selected === "people") {
        items = items.filter(x => getMediaType(x) === "person");
      }
    } else if (activeSection === "people") {
      const data = await fetchJSON(
        makeURL("/api/actors/popular")
      );

      items = (data.results || []).map(x => ({
        ...x,
        media_type: "person"
      }));

      pages = data.total_pages || 1;
    } else if (selected === "tv" || activeSection === "tv") {
      const data = await fetchJSON(
        makeURL("/api/tv/popular")
      );

      items = (data.results || []).map(x => ({
        ...x,
        media_type: "tv"
      }));

      pages = data.total_pages || 1;
    } else if (selected === "all") {
      const [movieData, tvData] = await Promise.all([
        fetchJSON(makeURL("/api/movies/popular")),
        fetchJSON(makeURL("/api/tv/popular"))
      ]);

      const movies = (movieData.results || []).map(x => ({
        ...x,
        media_type: "movie"
      }));

      const shows = (tvData.results || []).map(x => ({
        ...x,
        media_type: "tv"
      }));

      items = [...movies, ...shows].sort(
        (a, b) => (b.popularity || 0) - (a.popularity || 0)
      );

      pages = Math.max(
        movieData.total_pages || 1,
        tvData.total_pages || 1
      );
    } else {
      const data = await fetchJSON(
        makeURL("/api/movies/popular")
      );

      items = (data.results || []).map(x => ({
        ...x,
        media_type: "movie"
      }));

      pages = data.total_pages || 1;
    }

    if (myRequest !== requestId) return;

    totalPages = Math.min(500, Math.max(1, pages));

    renderMovies(items);

    setStatus(
      items.length
        ? `${items.length} titles · Page ${currentPage} of ${totalPages}`
        : "No titles found. Try another search."
    );

    updatePagination();
  } catch (error) {
    if (myRequest !== requestId) return;

    console.error("MovieHub API error:", error);
    grid.replaceChildren();

    setStatus(
      "Could not load titles: " +
      (error.message || "Network error")
    );

    updatePagination();
  }
}

/* Movie cards */
function renderMovies(items) {
  if (!grid) return;

  grid.replaceChildren();

  const fragment = document.createDocumentFragment();

  items.forEach(item => {
    const type = getMediaType(item);
    const titleText = getTitle(item);

    const card = document.createElement("article");
    card.className = "movie";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", "View " + titleText);

    const poster = document.createElement("img");
    poster.className = "poster";
    poster.alt = titleText + " poster";
    poster.loading = "lazy";
    poster.decoding = "async";

    const path =
      type === "person" ? item.profile_path : item.poster_path;

    if (path) {
      poster.src = imageURL(path);

      poster.onerror = function () {
        this.onerror = null;
        this.removeAttribute("src");
        this.alt = "Poster unavailable";
        this.classList.add("poster-missing");
      };
    } else {
      poster.alt = "Poster unavailable";
      poster.classList.add("poster-missing");
    }

    const title = document.createElement("h3");
    title.textContent = titleText;

    const info = document.createElement("p");

    if (type === "person") {
      info.textContent = item.known_for_department || "Person";
    } else {
      const rating = Number(item.vote_average || 0);

      info.textContent =
        `${getYear(item)} · ★ ` +
        (rating ? rating.toFixed(1) : "Not rated");
    }

    const typeLabel = document.createElement("span");
    typeLabel.className = "media-type";

    typeLabel.textContent =
      type === "tv" ? "TV Series" :
      type === "person" ? "Person" : "Movie";

    card.append(poster, title, info, typeLabel);

    const open = () => {
      if (type === "person") {
        showPersonDetails(item);
      } else {
        showTitleDetails(item, type);
      }
    };

    card.addEventListener("click", open);

    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });

    fragment.appendChild(card);
  });

  grid.appendChild(fragment);
}

/* Create details popup */
function ensureModal() {
  let modal = document.getElementById("moviehub-modal");

  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "moviehub-modal";
  modal.className = "mh-modal";
  modal.setAttribute("aria-hidden", "true");

  modal.innerHTML = `
    <div class="mh-dialog" role="dialog"
         aria-modal="true" aria-label="Title details">
      <button class="mh-close" type="button"
              aria-label="Close details">×</button>
      <div class="mh-content"></div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener("click", event => {
    if (event.target === modal) closeModal();
  });

  modal.querySelector(".mh-close")
    .addEventListener("click", closeModal);

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal();
  });

  return modal;
}

function closeModal() {
  const modal = document.getElementById("moviehub-modal");

  if (!modal) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("mh-modal-open");
}

function el(tag, className, text) {
  const node = document.createElement(tag);

  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;

  return node;
}

function detailRow(label, value) {
  if (!value) return null;

  const row = el("p", "mh-meta");

  row.append(
    el("strong", "", label + ": "),
    document.createTextNode(String(value))
  );

  return row;
}

/* Movie and TV details, overview, cast and crew */
async function showTitleDetails(item, type) {
  const modal = ensureModal();
  const content = modal.querySelector(".mh-content");

  content.replaceChildren(
    el("p", "mh-loading", "Loading details...")
  );

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("mh-modal-open");

  try {
    const id = encodeURIComponent(item.id);
    const base = type === "tv" ? "/api/tv/" : "/api/movies/";

    const [details, credits] = await Promise.all([
      fetchJSON(
        API + base + id + "?language=en-US"
      ),
      fetchJSON(
        API + base + id + "/credits?language=en-US"
      ).catch(() => ({ cast: [], crew: [] }))
    ]);

    content.replaceChildren();

    const hero = el("div", "mh-hero");

    if (details.backdrop_path) {
      hero.style.backgroundImage =
        `linear-gradient(90deg, rgba(10,14,22,.97), ` +
        `rgba(10,14,22,.62), rgba(10,14,22,.2)), ` +
        `url("${imageURL(details.backdrop_path, BACKDROP_SIZE)}")`;
    }

    const body = el("div", "mh-detail-body");

    if (details.poster_path) {
      const poster = el("img", "mh-detail-poster");

      poster.src = imageURL(details.poster_path);
      poster.alt = getTitle(details) + " poster";

      body.appendChild(poster);
    }

    const text = el("div", "mh-detail-text");

    text.appendChild(
      el("span", "mh-kicker",
        type === "tv" ? "TV SERIES" : "MOVIE")
    );

    text.appendChild(
      el("h2", "mh-detail-title", getTitle(details))
    );

    const date = details.release_date || details.first_air_date || "";
    const genres = (details.genres || [])
      .map(g => g.name)
      .join(" · ");

    const rating = Number(details.vote_average || 0);

    const runtime = details.runtime
      ? `${details.runtime} min`
      : (
          details.episode_run_time &&
          details.episode_run_time.length
            ? `${details.episode_run_time[0]} min/episode`
            : ""
        );

    [
      detailRow("Release", date || "Unknown"),
      detailRow("Rating", rating ? "★ " + rating.toFixed(1) + "/10" : ""),
      detailRow("Genres", genres),
      detailRow("Runtime", runtime),
      detailRow("Status", details.status),
      detailRow(
        "Language",
        details.original_language
          ? details.original_language.toUpperCase()
          : ""
      )
    ].filter(Boolean).forEach(row => text.appendChild(row));

    text.appendChild(el("h3", "mh-subtitle", "Overview"));

    text.appendChild(
      el(
        "p",
        "mh-overview",
        details.overview || item.overview || "No overview available."
      )
    );

    body.appendChild(text);
    hero.appendChild(body);
    content.appendChild(hero);

    const cast = credits.cast || [];

    if (cast.length) {
      content.appendChild(
        el("h3", "mh-cast-heading", "Cast")
      );

      const castGrid = el("div", "mh-cast-grid");

      cast.slice(0, 12).forEach(person => {
        const card = el("div", "mh-cast-card");
        const img = el("img", "mh-cast-image");

        img.alt = person.name || "Cast member";
        img.loading = "lazy";

        if (person.profile_path) {
          img.src = imageURL(person.profile_path, "w185");
          img.onerror = () => img.removeAttribute("src");
        }

        card.append(
          img,
          el("strong", "", person.name || "Unknown")
        );

        if (person.character) {
          card.appendChild(el("span", "", person.character));
        }

        castGrid.appendChild(card);
      });

      content.appendChild(castGrid);
    }

    const crew = (credits.crew || []).filter(person =>
      ["Director", "Writer", "Screenplay", "Creator"]
        .includes(person.job)
    );

    if (crew.length) {
      content.appendChild(
        el("h3", "mh-cast-heading", "Crew")
      );

      const crewLine = el("p", "mh-crew");

      crewLine.textContent = crew.slice(0, 8)
        .map(person => `${person.name} (${person.job})`)
        .join(" · ");

      content.appendChild(crewLine);
    }
  } catch (error) {
    console.error("Movie details error:", error);

    content.replaceChildren(
      el("h2", "", getTitle(item)),
      el(
        "p",
        "mh-error",
        "Details could not be loaded. Check that the Cloudflare Worker has the latest code."
      )
    );
  }
}

/* Person details */
async function showPersonDetails(person) {
  const modal = ensureModal();
  const content = modal.querySelector(".mh-content");

  content.replaceChildren(
    el("p", "mh-loading", "Loading person details...")
  );

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("mh-modal-open");

  try {
    const data = await fetchJSON(
      API + "/api/people/" +
      encodeURIComponent(person.id) +
      "?language=en-US"
    );

    content.replaceChildren();

    const wrap = el("div", "mh-person-detail");

    if (data.profile_path) {
      const img = el("img", "mh-person-poster");

      img.src = imageURL(data.profile_path);
      img.alt = data.name || "Person";

      wrap.appendChild(img);
    }

    const text = el("div", "");

    text.appendChild(
      el("h2", "", data.name || person.name || "Person")
    );

    if (data.known_for_department) {
      text.appendChild(
        el("p", "mh-meta", data.known_for_department)
      );
    }

    text.appendChild(
      el(
        "p",
        "mh-overview",
        data.biography || "No biography available."
      )
    );

    if (data.birthday) {
      text.appendChild(
        el("p", "mh-meta", "Born: " + data.birthday)
      );
    }

    wrap.appendChild(text);
    content.appendChild(wrap);
  } catch (error) {
    content.replaceChildren(
      el("h2", "", person.name || "Person"),
      el(
        "p",
        "mh-error",
        "Person details could not be loaded. Update the Cloudflare Worker code."
      )
    );
  }
}

/* Pagination */
function updatePagination() {
  let pagination =
    document.getElementById("moviehub-pagination");

  if (!pagination && grid && grid.parentElement) {
    pagination = document.createElement("div");
    pagination.id = "moviehub-pagination";

    pagination.style.cssText =
      "display:flex;justify-content:center;align-items:center;" +
      "gap:12px;padding:24px 8px;flex-wrap:wrap;";

    grid.insertAdjacentElement("afterend", pagination);
  }

  if (!pagination) return;

  pagination.replaceChildren();

  function addButton(label, disabled, callback) {
    const button = document.createElement("button");

    button.type = "button";
    button.textContent = label;
    button.disabled = disabled;
    button.className = "mh-page-button";
    button.addEventListener("click", callback);

    pagination.appendChild(button);
  }

  addButton("← Previous", currentPage <= 1, () => {
    if (currentPage > 1) {
      currentPage--;
      loadMovies();
      scrollToGrid();
    }
  });

  pagination.appendChild(
    el("span", "mh-page-label", `${currentPage} / ${totalPages}`)
  );

  addButton("Next →", currentPage >= totalPages, () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadMovies();
      scrollToGrid();
    }
  });
}

function scrollToGrid() {
  if (grid) {
    grid.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}

/* Search */
if (search) {
  search.addEventListener("input", () => {
    clearTimeout(searchTimer);

    searchTimer = setTimeout(() => {
      currentPage = 1;
      activeSection = "all";
      loadMovies();
    }, 350);
  });
}

/* Category filter */
if (category) {
  category.addEventListener("change", () => {
    currentPage = 1;
    activeSection = "all";
    loadMovies();
  });
}

/* Navigation */
document.querySelectorAll("nav a, .explore").forEach(link => {
  const label = (link.textContent || "").trim().toLowerCase();

  link.addEventListener("click", () => {
    if (label.includes("people")) {
      activeSection = "people";

      if (category) category.value = "all";
    } else if (label.includes("tv series")) {
      activeSection = "tv";

      if (category) category.value = "tv";
    } else if (
      label.includes("movies") ||
      label.includes("explore")
    ) {
      activeSection = "movies";

      if (category) category.value = "movie";
    } else {
      return;
    }

    if (search) search.value = "";

    currentPage = 1;
    setTimeout(loadMovies, 0);
  });
});

/* Start MovieHub */
loadMovies();
