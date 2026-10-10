"use strict";
const API = "https://restless-block-eb74.cinemapattukal.workers.dev";
const IMG = "https://image.tmdb.org/t/p/";
const id = new URLSearchParams(location.search).get("id");
const status = document.getElementById("person-status");
const root = document.getElementById("person-content");
const img = (path, size = "w500") => path ? IMG + size + path : "";
const el = (tag, cls, text) => {
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
async function init() {
  if (!id || !/^\d+$/.test(id)) {
    status.textContent = "Invalid actor ID.";
    return;
  }
  try {
    const person = await getJSON(API + "/api/people/" + encodeURIComponent(id) + "?language=en-US");
    const [movies, shows] = await Promise.all([
      getJSON(API + "/api/people/" + id + "/movie_credits?language=en-US").catch(() => ({cast:[]})),
      getJSON(API + "/api/people/" + id + "/tv_credits?language=en-US").catch(() => ({cast:[]}))
    ]);
    status.textContent = "";
    document.title = `${person.name || "Actor"} — MovieHub`;
    root.replaceChildren();

    const profile = el("section", "person-hero");
    if (person.profile_path) {
      const photo = el("img", "person-large-photo");
      photo.src = img(person.profile_path, "h632");
      photo.alt = person.name || "Actor";
      profile.appendChild(photo);
    }
    const bio = el("div", "person-bio");
    bio.append(el("span", "detail-kicker", "ACTOR PROFILE"),
      el("h1", "detail-title", person.name || "Unknown"));
    if (person.known_for_department) bio.appendChild(el("p", "detail-meta", "Department: " + person.known_for_department));
    if (person.birthday) bio.appendChild(el("p", "detail-meta", "Born: " + person.birthday + (person.place_of_birth ? " · " + person.place_of_birth : "")));
    if (person.deathday) bio.appendChild(el("p", "detail-meta", "Died: " + person.deathday));
    bio.appendChild(el("h2", "detail-subtitle", "Biography"));
    bio.appendChild(el("p", "detail-overview", person.biography || "No biography available."));
    profile.appendChild(bio);
    root.appendChild(profile);

    addCredits("Known For — Movies", movies.cast || [], "movie");
    addCredits("TV Series", shows.cast || [], "tv");
  } catch (e) {
    console.error(e);
    status.textContent = "Actor profile could not load: " + e.message;
  }
}
function addCredits(heading, items, type) {
  if (!items.length) return;
  root.appendChild(el("h2", "content-heading", heading));
  const grid = el("div", "credit-grid");
  const sorted = [...items].sort((a,b) => (b.popularity || 0) - (a.popularity || 0));
  sorted.slice(0, 20).forEach(item => {
    const card = el("a", "credit-card");
    card.href = `details.html?id=${encodeURIComponent(item.id)}&type=${type}`;
    if (item.poster_path) {
      const poster = el("img", "credit-poster");
      poster.src = img(item.poster_path);
      poster.alt = item.title || item.name || "Poster";
      poster.loading = "lazy";
      card.appendChild(poster);
    } else card.appendChild(el("div", "credit-poster credit-placeholder", "No poster"));
    card.append(el("strong", "", item.title || item.name || "Untitled"),
      el("span", "", item.character || item.job || ""));
    grid.appendChild(card);
  });
  root.appendChild(grid);
}
init();
