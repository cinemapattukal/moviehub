
"use strict";

/* =========================================
   MOVIEHUB - TMDB FRONTEND
   Cloudflare Worker + GitHub Pages
========================================= */

const API = "https://restless-block-eb74.cinemapattukal.workers.dev";
const IMAGE_BASE = "https://image.tmdb.org/t/p/";
const POSTER_SIZE = "w500";

const grid = document.getElementById("grid");
const search = document.getElementById("search");
const category = document.getElementById("category");
const statusBox = document.getElementById("status");

let currentPage = 1;
let totalPages = 1;
let requestId = 0;
let activeSection = "all";
let searchTimer = null;
let currentItems = [];

if (!grid) {
  console.error('MovieHub: HTML element with id="grid" was not found.');
}

function setStatus(message) {
  if (statusBox) {
    statusBox.textContent = message;
  }
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

function getPosterUrl(path) {
  if (!path) return "";
  return IMAGE_BASE + POSTER_SIZE + path;
}

async function fetchJSON(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error("HTTP " + response.status);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

function makeURL(path, page = currentPage) {
  const url = new URL(API + path);
  url.searchParams.set("page", String(page));
  url.searchParams.set("language", "en-US");
  return url.toString();
}

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
      // Search movies, TV shows and people
      const url = new URL(API + "/api/search");
      url.searchParams.set("query", query);
      url.searchParams.set("page", String(currentPage));
      url.searchParams.set("language", "en-US");

      const data = await fetchJSON(url.toString());

      items = data.results || [];
      pages = data.total_pages || 1;

      // Apply the selected category to search results
      if (selected === "movie") {
        items = items.filter(item => getMediaType(item) === "movie");
      } else if (selected === "tv") {
        items = items.filter(item => getMediaType(item) === "tv");
      }
    } else if (activeSection === "people") {
      const data = await fetchJSON(
        makeURL("/api/actors/popular")
      );
      items = (data.results || []).map(person => ({
        ...person,
        media_type: "person"
      }));
      pages = data.total_pages || 1;
    } else if (selected === "tv" || activeSection === "tv") {
      const data = await fetchJSON(makeURL("/api/tv/popular"));
      items = (data.results || []).map(item => ({
        ...item,
        media_type: "tv"
      }));
      pages = data.total_pages || 1;
    } else if (selected === "all") {
      // Combine popular movies and popular TV series
      const [movieData, tvData] = await Promise.all([
        fetchJSON(makeURL("/api/movies/popular")),
        fetchJSON(makeURL("/api/tv/popular"))
      ]);

      const movieItems = (movieData.results || []).map(item => ({
        ...item,
        media_type: "movie"
      }));

      const tvItems = (tvData.results || []).map(item => ({
        ...item,
        media_type: "tv"
      }));

      items = [...movieItems, ...tvItems].sort(
        (a, b) => (b.popularity || 0) - (a.popularity || 0)
      );

      pages = Math.max(
        movieData.total_pages || 1,
        tvData.total_pages || 1
      );
    } else {
      const data = await fetchJSON(makeURL("/api/movies/popular"));
      items = (data.results || []).map(item => ({
        ...item,
        media_type: "movie"
      }));
      pages = data.total_pages || 1;
    }

    // Ignore older requests if the user searched again
    if (myRequest !== requestId) return;

    currentItems = items;
    totalPages = Math.min(500, Math.max(1, pages));

    renderMovies(items);

    if (items.length === 0) {
      setStatus("No titles found. Try another search.");
    } else {
      setStatus(
        `${items.length} titles · Page ${currentPage} of ${totalPages}`
      );
    }

    updatePagination();
  } catch (error) {
    if (myRequest !== requestId) return;

    console.error("MovieHub API error:", error);
    grid.replaceChildren();

    setStatus(
      "Could not load titles: " +
      (error.message || "Network error") +
      ". Please refresh and try again."
    );

    updatePagination();
  }
}

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

    const imagePath =
      type === "person" ? item.profile_path : item.poster_path;

    if (imagePath) {
      poster.src = getPosterUrl(imagePath);
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
      const knownFor = item.known_for_department || "Person";
      info.textContent = knownFor;
    } else {
      const rating = Number(item.vote_average || 0);
      const ratingText = rating > 0 ? rating.toFixed(1) : "Not rated";
      info.textContent = `${getYear(item)} · ★ ${ratingText}`;
    }

    const typeLabel = document.createElement("span");
    typeLabel.className = "media-type";
    typeLabel.textContent =
      type === "tv" ? "TV Series" :
      type === "person" ? "Person" : "Movie";

    card.append(poster, title, info, typeLabel);

    function showDetails() {
      const overview = item.overview || "No overview available.";
      alert(
        `${titleText}\n${getYear(item)}\n\n${overview}`
      );
    }

    card.addEventListener("click", showDetails);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showDetails();
      }
    });

    fragment.appendChild(card);
  });

  grid.appendChild(fragment);
}

function updatePagination() {
  let pagination = document.getElementById("moviehub-pagination");

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

  function addButton(label, disabled, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.disabled = disabled;
    button.style.cssText =
      "padding:10px 16px;border:0;border-radius:8px;" +
      "cursor:pointer;background:#60a5fa;color:#101827;";
    button.addEventListener("click", onClick);
    pagination.appendChild(button);
  }

  addButton("← Previous", currentPage <= 1, () => {
    if (currentPage > 1) {
      currentPage--;
      loadMovies();
      scrollToGrid();
    }
  });

  const pageText = document.createElement("span");
  pageText.textContent = `${currentPage} / ${totalPages}`;
  pageText.style.color = "inherit";
  pagination.appendChild(pageText);

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
    grid.scrollIntoView({ behavior: "smooth", block: "start" });
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

/* Category dropdown */
if (category) {
  category.addEventListener("change", () => {
    currentPage = 1;
    activeSection = "all";
    loadMovies();
  });
}

/* Navigation links, if present in index.html */
document.querySelectorAll("a").forEach(link => {
  const text = (link.textContent || "").trim().toLowerCase();

  if (text === "movies") {
    link.addEventListener("click", event => {
      event.preventDefault();
      activeSection = "movies";
      currentPage = 1;
      if (category) category.value = "movie";
      if (search) search.value = "";
      loadMovies();
      scrollToGrid();
    });
  } else if (text === "tv series" || text === "tv shows") {
    link.addEventListener("click", event => {
      event.preventDefault();
      activeSection = "tv";
      currentPage = 1;
      if (category) category.value = "tv";
      if (search) search.value = "";
      loadMovies();
      scrollToGrid();
    });
  } else if (text === "people") {
    link.addEventListener("click", event => {
      event.preventDefault();
      activeSection = "people";
      currentPage = 1;
      if (search) search.value = "";
      loadMovies();
      scrollToGrid();
    });
  }
});

/* Start the app */
loadMovies();
