"use strict";
const API = "https://restless-block-eb74.cinemapattukal.workers.dev";
const IMG = "https://image.tmdb.org/t/p/";
const params = new URLSearchParams(location.search);
const id = params.get("id");
const type = params.get("type") === "tv" ? "tv" : "movie";
const status = document.getElementById("detail-status");
const root = document.getElementById("detail-content");

const img = (path, size = "w500") => path ? IMG + size + path : "";
const node = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error("HTTP " + r.status);
  const d = await r.json();
  if (d.error) throw new Error(d.error);
  return d;
}
function row(label, value) {
  if (!value) return null;
  const p = node("p", "detail-meta");
  const b = node("strong", "", label + ": ");
  p.append(b, document.createTextNode(String(value)));
  return p;
}
async function init() {
  if (!id || !/^\d+$/.test(id)) {
    status.textContent = "Invalid title ID.";
    return;
  }
  try {
    const base = `/api/${type === "tv" ? "tv" : "movies"}/${encodeURIComponent(id)}`;
    const [data, credits] = await Promise.all([
      getJSON(API + base + "?language=en-US"),
      getJSON(API + base + "/credits?language=en-US").catch(() => ({cast:[], crew:[]}))
    ]);
    document.title = `${data.title || data.name || "Details"} — MovieHub`;
    status.textContent = "";
    root.replaceChildren();

    const hero = node("section", "detail-hero");
    if (data.backdrop_path) hero.style.backgroundImage =
      `linear-gradient(90deg,rgba(9,14,23,.96),rgba(9,14,23,.72),rgba(9,14,23,.4)),url("${img(data.backdrop_path,"w1280")}")`;

    const layout = node("div", "detail-layout");
    if (data.poster_path) {
      const poster = node("img", "detail-poster");
      poster.src = img(data.poster_path);
      poster.alt = (data.title || data.name || "Title") + " poster";
      layout.appendChild(poster);
    }

    const info = node("div", "detail-info");
    info.append(
      node("span", "detail-kicker", type === "tv" ? "TV SERIES" : "MOVIE"),
      node("h1", "detail-title", data.title || data.name || "Untitled")
    );
    const genres = (data.genres || []).map(x => x.name).join(" · ");
    const rating = Number(data.vote_average || 0);
    const runtime = data.runtime ? `${data.runtime} min` :
      (data.episode_run_time && data.episode_run_time[0] ? `${data.episode_run_time[0]} min/episode` : "");
    [row("Release", data.release_date || data.first_air_date),
     row("Rating", rating ? `★ ${rating.toFixed(1)}/10` : ""),
     row("Genres", genres), row("Runtime", runtime),
     row("Status", data.status),
     row("Language", data.original_language ? data.original_language.toUpperCase() : "")]
      .filter(Boolean).forEach(x => info.appendChild(x));
    info.append(node("h2", "detail-subtitle", "Overview"),
      node("p", "detail-overview", data.overview || "No overview available."));
    layout.appendChild(info);
    hero.appendChild(layout);
    root.appendChild(hero);

    const cast = credits.cast || [];
    if (cast.length) {
      root.appendChild(node("h2", "content-heading", "Cast"));
      const list = node("div", "cast-grid");
      cast.slice(0, 20).forEach(person => {
        const card = node("article", "cast-card");
        if (person.profile_path) {
          const photo = node("img", "cast-photo");
          photo.src = img(person.profile_path, "w185");
          photo.alt = person.name || "Cast";
          photo.loading = "lazy";
          card.appendChild(photo);
        } else card.appendChild(node("div", "cast-photo cast-placeholder", "No image"));
        card.append(node("strong", "", person.name || "Unknown"),
          node("span", "", person.character || ""));
        card.addEventListener("click", () => location.href = `person.html?id=${encodeURIComponent(person.id)}`);
        list.appendChild(card);
      });
      root.appendChild(list);
    }

    const crew = (credits.crew || []).filter(x =>
      ["Director", "Writer", "Screenplay", "Creator"].includes(x.job));
    if (crew.length) {
      root.appendChild(node("h2", "content-heading", "Crew"));
      root.appendChild(node("p", "crew-line",
        crew.slice(0, 12).map(x => `${x.name} (${x.job})`).join(" · ")));
    }
  } catch (e) {
    console.error(e);
    status.textContent = "Details could not load: " + e.message;
  }
}
init();
