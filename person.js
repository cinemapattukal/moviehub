
"use strict";

const API = "https://restless-block-eb74.cinemapattukal.workers.dev";
const IMG = "https://image.tmdb.org/t/p/";

const params = new URLSearchParams(location.search);
const id = params.get("id");

const status = document.getElementById("person-status");
const root = document.getElementById("person-content");

const img = (path, size = "w500") =>
  path ? IMG + size + path : "";

const el = (tag, cls = "", text = "") => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined && text !== null) {
    node.textContent = text;
  }
  return node;
};

async function getJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("HTTP " + response.status);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.details || data.error);
  }

  return data;
}

async function getFirstWorking(urls, fallback = {}) {
  for (const url of urls) {
    try {
      return await getJSON(url);
    } catch (error) {
      console.warn("API endpoint unavailable:", url, error.message);
    }
  }

  return fallback;
}

async function init() {
  if (!status || !root) {
    console.error("Profile HTML elements are missing.");
    return;
  }

  if (!id || !/^\d+$/.test(id)) {
    status.textContent = "Invalid person ID.";
    return;
  }

  status.textContent = "Loading profile and work history...";

  try {
    const person = await getFirstWorking([
      `${API}/api/people/${id}?language=en-US`,
      `${API}/api/person/${id}?language=en-US`
    ]);

    if (!person || !person.id) {
      throw new Error("Person details not returned by API.");
    }

    const credits = await getFirstWorking([
      `${API}/api/people/${id}/combined_credits?language=en-US`,
      `${API}/api/person/${id}/combined_credits?language=en-US`
    ], null);

    let movieCredits = { cast: [], crew: [] };
    let tvCredits = { cast: [], crew: [] };

    if (!credits) {
      [movieCredits, tvCredits] = await Promise.all([
        getFirstWorking([
          `${API}/api/people/${id}/movie_credits?language=en-US`,
          `${API}/api/person/${id}/movie_credits?language=en-US`
        ]),
        getFirstWorking([
          `${API}/api/people/${id}/tv_credits?language=en-US`,
          `${API}/api/person/${id}/tv_credits?language=en-US`
        ])
      ]);
    }

    const cast = credits
      ? (credits.cast || []).map(item => ({
          ...item,
          media_type: item.media_type ||
            (item.first_air_date ? "tv" : "movie")
        }))
      : [
          ...(movieCredits.cast || []).map(item => ({
            ...item,
            media_type: "movie"
          })),
          ...(tvCredits.cast || []).map(item => ({
            ...item,
            media_type: "tv"
          }))
        ];

    const crew = credits
      ? (credits.crew || []).map(item => ({
          ...item,
          media_type: item.media_type ||
            (item.first_air_date ? "tv" : "movie")
        }))
      : [
          ...(movieCredits.crew || []).map(item => ({
            ...item,
            media_type: "movie"
          })),
          ...(tvCredits.crew || []).map(item => ({
            ...item,
            media_type: "tv"
          }))
        ];

    status.textContent = "";
    root.replaceChildren();

    document.title = `${person.name || "Person"} — MovieHub`;

    // Profile header
    const profile = el("section", "person-hero");

    if (person.profile_path) {
      const photo = el("img", "person-large-photo");
      photo.src = img(person.profile_path, "h632");
      photo.alt = person.name || "Person";
      photo.loading = "lazy";

      photo.onerror = () => {
        photo.onerror = null;
        photo.replaceWith(
          el("div", "person-large-photo person-photo-placeholder", "No image")
        );
      };

      profile.appendChild(photo);
    } else {
      profile.appendChild(
        el("div", "person-large-photo person-photo-placeholder", "No image")
      );
    }

    const bio = el("div", "person-bio");

    bio.append(
      el("span", "detail-kicker", "PERSON PROFILE"),
      el("h1", "detail-title", person.name || "Unknown")
    );

    if (person.known_for_department) {
      bio.appendChild(
        el("p", "detail-meta",
          "Department: " + person.known_for_department)
      );
    }

    if (person.birthday) {
      bio.appendChild(
        el("p", "detail-meta",
          "Born: " + person.birthday +
          (person.place_of_birth ? " · " + person.place_of_birth : ""))
      );
    }

    if (person.deathday) {
      bio.appendChild(
        el("p", "detail-meta", "Died: " + person.deathday)
      );
    }

    bio.append(
      el("h2", "detail-subtitle", "Biography"),
      el("p", "detail-overview",
        person.biography || "No biography available.")
    );

    profile.appendChild(bio);
    root.appendChild(profile);

    // Known For
    const knownFor = [...cast, ...crew]
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 12);

    addCredits("Known For", knownFor, "known");

    // Acting credits
    cast.sort((a, b) => {
      const dateA = a.release_date || a.first_air_date || "";
      const dateB = b.release_date || b.first_air_date || "";
      return dateB.localeCompare(dateA);
    });

    addCredits("Movies & TV Series", cast, "cast");

    // Directing, writing and other crew credits
    const priorityJobs = [
      "Director",
      "Writer",
      "Screenplay",
      "Creator",
      "Story",
      "Producer",
      "Executive Producer",
      "Original Music Composer",
      "Director of Photography",
      "Editor"
    ];

    crew.sort((a, b) => {
      const jobA = priorityJobs.indexOf(a.job);
      const jobB = priorityJobs.indexOf(b.job);

      return (jobA < 0 ? 999 : jobA) -
             (jobB < 0 ? 999 : jobB);
    });

    addCredits("Crew Work", crew, "crew");

    if (!cast.length && !crew.length) {
      root.appendChild(
        el("p", "crew-line",
          "No movie or TV work history was returned by the API.")
      );
    }

  } catch (error) {
    console.error("MovieHub profile error:", error);
    status.textContent =
      "Profile could not load: " + error.message;
  }
}

function addCredits(heading, items, mode) {
  if (!items || !items.length) return;

  root.appendChild(el("h2", "content-heading", heading));

  const grid = el("div", "credit-grid");
  const seen = new Set();

  items.forEach(item => {
    if (!item.id) return;

    const type =
      item.media_type === "tv" || item.first_air_date
        ? "tv"
        : "movie";

    const job = mode === "crew"
      ? item.job || item.department || "Crew"
      : "";

    const key = `${type}-${item.id}-${job}`;

    if (seen.has(key)) return;
    seen.add(key);

    const card = el("a", "credit-card");

    card.href =
      `details.html?id=${encodeURIComponent(item.id)}&type=${type}`;

    const title = item.title || item.name || "Untitled";

    if (item.poster_path) {
      const poster = el("img", "credit-poster");

      poster.src = img(item.poster_path, "w342");
      poster.alt = title;
      poster.loading = "lazy";

      poster.onerror = () => {
        poster.onerror = null;
        poster.replaceWith(
          el("div", "credit-poster credit-placeholder", "No poster")
        );
      };

      card.appendChild(poster);
    } else {
      card.appendChild(
        el("div", "credit-poster credit-placeholder", "No poster")
      );
    }

    const date = item.release_date || item.first_air_date || "";
    const year = date.slice(0, 4);
    const role = mode === "crew"
      ? job
      : item.character || "";

    card.append(
      el("strong", "", title),
      el("span", "", year),
      el("span", "credit-role", role)
    );

    grid.appendChild(card);
  });

  if (grid.children.length) {
    root.appendChild(grid);
  }
}

init();
