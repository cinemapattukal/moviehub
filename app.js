"use strict";

const API = "https://restless-block-eb74.cinemapattukal.workers.dev";
const IMAGE = "https://image.tmdb.org/t/p/";
const grid = document.getElementById("grid");
const search = document.getElementById("search");
const category = document.getElementById("category");
const statusBox = document.getElementById("status");

let page = 1;
let totalPages = 1;
let requestId = 0;
let section = "all";
let timer;

const titleOf = x => x.title || x.name || "Untitled";
const typeOf = x => x.media_type || (x.first_air_date ? "tv" : (x.profile_path && !x.poster_path ? "person" : "movie"));
const yearOf = x => (x.release_date || x.first_air_date || "").slice(0, 4) || "Year unavailable";
const imageOf = (path, size = "w500") => path ? IMAGE + size + path : "";

function setStatus(text) {
  if (statusBox) statusBox.textContent = text;
}
function urlFor(path) {
  const url = new URL(API + path);
  url.searchParams.set("page", String(page));
  url.searchParams.set("language", "en-US");
  return url.toString();
}
async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function loadTitles() {
  if (!grid) return;
  const rid = ++requestId;
  const q = search ? search.value.trim() : "";
  const selected = category ? category.value : "all";
  grid.replaceChildren();
  setStatus("Loading titles...");

  try {
    let items = [], pages = 1;
    if (section === "people" && !q) {
      const data = await getJSON(urlFor("/api/actors/popular"));
      items = (data.results || []).map(x => ({ ...x, media_type: "person" }));
      pages = data.total_pages || 1;
    } else if (q) {
      const u = new URL(API + "/api/search");
      u.searchParams.set("query", q);
      u.searchParams.set("page", String(page));
      u.searchParams.set("language", "en-US");
      const data = await getJSON(u);
      items = data.results || [];
      pages = data.total_pages || 1;
      if (selected === "movie") items = items.filter(x => typeOf(x) === "movie");
      if (selected === "tv") items = items.filter(x => typeOf(x) === "tv");
      if (selected === "people") items = items.filter(x => typeOf(x) === "person");
    } else if (section === "tv" || selected === "tv") {
      const data = await getJSON(urlFor("/api/tv/popular"));
      items = (data.results || []).map(x => ({ ...x, media_type: "tv" }));
      pages = data.total_pages || 1;
    } else if (selected === "all") {
      const [md, td] = await Promise.all([
        getJSON(urlFor("/api/movies/popular")),
        getJSON(urlFor("/api/tv/popular"))
      ]);
      items = [
        ...(md.results || []).map(x => ({ ...x, media_type: "movie" })),
        ...(td.results || []).map(x => ({ ...x, media_type: "tv" }))
      ].sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      pages = Math.max(md.total_pages || 1, td.total_pages || 1);
    } else {
      const data = await getJSON(urlFor("/api/movies/popular"));
      items = (data.results || []).map(x => ({ ...x, media_type: "movie" }));
      pages = data.total_pages || 1;
    }

    if (rid !== requestId) return;
    totalPages = Math.max(1, Math.min(500, pages));
    render(items);
    setStatus(items.length ? `${items.length} titles · Page ${page} of ${totalPages}` : "No titles found.");
    pagination();
  } catch (e) {
    if (rid !== requestId) return;
    console.error(e);
    setStatus("Could not load titles: " + e.message);
    pagination();
  }
}

function render(items) {
  grid.replaceChildren();
  const frag = document.createDocumentFragment();

  items.forEach(item => {
    const type = typeOf(item);
    const card = document.createElement("article");
    card.className = "movie";
    card.tabIndex = 0;
    card.setAttribute("role", "link");

    const img = document.createElement("img");
    img.className = "poster";
    img.loading = "lazy";
    img.alt = titleOf(item) + " poster";
    const p = type === "person" ? item.profile_path : item.poster_path;
    if (p) {
      img.src = imageOf(p);
      img.onerror = () => { img.onerror = null; img.removeAttribute("src"); img.alt = "Image unavailable"; };
    }

    const h = document.createElement("h3");
    h.textContent = titleOf(item);
    const meta = document.createElement("p");
    meta.textContent = type === "person"
      ? (item.known_for_department || "Person")
      : `${yearOf(item)} · ★ ${Number(item.vote_average || 0).toFixed(1)}`;

    const label = document.createElement("span");
    label.className = "media-type";
    label.textContent = type === "person" ? "Person" : type === "tv" ? "TV Series" : "Movie";
    card.append(img, h, meta, label);

    const open = () => {
      if (type === "person") {
        location.href = `person.html?id=${encodeURIComponent(item.id)}`;
      } else {
        location.href = `details.html?id=${encodeURIComponent(item.id)}&type=${encodeURIComponent(type)}`;
      }
    };
    card.addEventListener("click", open);
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
    });
    frag.appendChild(card);
  });
  grid.appendChild(frag);
}

function pagination() {
  let box = document.getElementById("moviehub-pagination");
  if (!box) {
    box = document.createElement("div");
    box.id = "moviehub-pagination";
    box.className = "mh-pagination";
    grid.insertAdjacentElement("afterend", box);
  }
  box.replaceChildren();

  const add = (label, disabled, fn) => {
    const b = document.createElement("button");
    b.className = "mh-page-button";
    b.textContent = label;
    b.disabled = disabled;
    b.addEventListener("click", fn);
    box.appendChild(b);
  };
  add("← Previous", page <= 1, () => { page--; loadTitles(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  const text = document.createElement("span");
  text.className = "mh-page-label";
  text.textContent = `${page} / ${totalPages}`;
  box.appendChild(text);
  add("Next →", page >= totalPages, () => { page++; loadTitles(); window.scrollTo({ top: 0, behavior: "smooth" }); });
}

if (search) search.addEventListener("input", () => {
  clearTimeout(timer);
  timer = setTimeout(() => { page = 1; section = "all"; loadTitles(); }, 350);
});
if (category) category.addEventListener("change", () => { page = 1; section = "all"; loadTitles(); });

document.querySelectorAll("nav a, .explore").forEach(a => {
  const text = (a.textContent || "").trim().toLowerCase();
  a.addEventListener("click", () => {
    if (text === "people") section = "people";
    else if (text === "tv series") { section = "tv"; if (category) category.value = "tv"; }
    else if (text === "movies" || text.includes("explore")) { section = "movies"; if (category) category.value = "movie"; }
    else return;
    if (search) search.value = "";
    page = 1;
    setTimeout(loadTitles, 0);
  });
});

loadTitles();
