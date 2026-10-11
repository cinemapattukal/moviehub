
"use strict";

const API = "https://restless-block-eb74.cinemapattukal.workers.dev";
const IMG = "https://image.tmdb.org/t/p/";

const params = new URLSearchParams(location.search);
const id = params.get("id");
const type = params.get("type") === "tv" ? "tv" : "movie";

const status = document.getElementById("detail-status");
const root = document.getElementById("detail-content");

const CREW_PRIORITY = [
  "Director",
  "Writer",
  "Screenplay",
  "Story",
  "Creator",
  "Executive Producer",
  "Producer",
  "Original Music Composer",
  "Director of Photography",
  "Editor"
];

function imageURL(path, size = "w500") {
  return path ? IMG + size + path : "";
}

function makeElement(tag, className = "", text = "") {
  const el = document.createElement(tag);
  if (className) el.className = className;

  if (text !== undefined && text !== null) {
    el.textContent = text;
  }

  return el;
}

async function getJSON(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error("HTTP " + response.status);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.details || data.error);
  }

  return data;
}

function detailRow(label, value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const row = makeElement("p", "detail-meta");
  row.append(
    makeElement("strong", "", label + ": "),
    document.createTextNode(String(value))
  );

  return row;
}

function addProfileImage(card, path, name, className) {
  if (path) {
    const photo = makeElement("img", className);
    photo.src = imageURL(path, "w185");
    photo.alt = name || "Profile";
    photo.loading = "lazy";

    photo.onerror = () => {
      photo.onerror = null;
      photo.replaceWith(
        makeElement("div", className + " image-placeholder", "Image unavailable")
      );
    };

    card.appendChild(photo);
  } else {
    card.appendChild(
      makeElement("div", className + " image-placeholder", "No image")
    );
  }
}

function openPerson(person) {
  if (!person || !person.id) return;
  location.href = "person.html?id=" + encodeURIComponent(person.id);
}

function makeProfileCard(person, crewMode = false) {
  const card = makeElement(
    "article",
    crewMode ? "crew-card" : "cast-card"
  );

  addProfileImage(
    card,
    person.profile_path,
    person.name,
    crewMode ? "crew-photo" : "cast-photo"
  );

  card.append(
    makeElement("strong", crewMode ? "crew-name" : "", person.name || "Unknown"),
    makeElement(
      "span",
      crewMode ? "crew-job" : "",
      crewMode
        ? (person.job || person.department || "Crew")
        : (person.character || "Cast")
    )
  );

  card.style.cursor = "pointer";
  card.tabIndex = 0;
  card.setAttribute("role", "link");

  card.addEventListener("click", () => openPerson(person));

  card.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPerson(person);
    }
  });

  return card;
}

function addHeading(text) {
  root.appendChild(makeElement("h2", "content-heading", text));
}

function addMessage(text) {
  root.appendChild(makeElement("p", "crew-line", text));
}

function renderTrailer(videos) {
  const list = Array.isArray(videos.results) ? videos.results : [];

  const trailer = list.find(video =>
    video.site === "YouTube" &&
    video.type === "Trailer" &&
    video.key
  ) || list.find(video =>
    video.site === "YouTube" &&
    video.type === "Teaser" &&
    video.key
  );

  addHeading("Trailer");

  if (!trailer) {
    addMessage("No trailer available for this title.");
    return;
  }

  const section = makeElement("section", "detail-trailer");

  const frame = makeElement("iframe", "detail-trailer-frame");
  frame.src =
    "https://www.youtube-nocookie.com/embed/" +
    encodeURIComponent(trailer.key);

  frame.title = trailer.name || "Movie trailer";
  frame.loading = "lazy";
  frame.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  frame.allowFullscreen = true;
  frame.referrerPolicy = "strict-origin-when-cross-origin";

  section.appendChild(frame);
  root.appendChild(section);
}

async function initDetails() {
  if (!status || !root) {
    console.error("MovieHub: details HTML elements missing.");
    return;
  }

  if (!id || !/^\d+$/.test(id)) {
    status.textContent = "Invalid movie or TV series ID.";
    return;
  }

  status.textContent = "Loading details...";

  const base =
    "/api/" + (type === "tv" ? "tv" : "movies") + "/" +
    encodeURIComponent(id);

  try {
    const [data, credits] = await Promise.all([
      getJSON(API + base + "?language=en-US"),
      getJSON(API + base + "/credits?language=en-US")
        .catch(error => {
          console.warn("Credits unavailable:", error);
          return { cast: [], crew: [] };
        })
    ]);

    status.textContent = "";
    root.replaceChildren();

    const title = data.title || data.name || "Untitled";
    document.title = title + " — MovieHub";

    /* Poster and title section */
    const hero = makeElement("section", "detail-hero");

    if (data.backdrop_path) {
      hero.style.backgroundImage =
        'linear-gradient(90deg, rgba(9,14,23,.96), rgba(9,14,23,.72), rgba(9,14,23,.42)), url("' +
        imageURL(data.backdrop_path, "w1280") + '")';
    }

    const layout = makeElement("div", "detail-layout");

    const poster = makeElement("img", "detail-poster");
    poster.alt = title + " poster";
    poster.loading = "lazy";

    if (data.poster_path) {
      poster.src = imageURL(data.poster_path, "w500");
      poster.onerror = () => {
        poster.onerror = null;
        poster.removeAttribute("src");
        poster.alt = "Poster unavailable";
      };
    } else {
      poster.alt = "No poster available";
    }

    layout.appendChild(poster);

    const info = makeElement("div", "detail-info");

    info.append(
      makeElement(
        "span",
        "detail-kicker",
        type === "tv" ? "TV SERIES" : "MOVIE"
      ),
      makeElement("h1", "detail-title", title)
    );

    const rating = Number(data.vote_average || 0);
    const genres = (data.genres || [])
      .map(genre => genre.name)
      .filter(Boolean)
      .join(" · ");

    const runtime = data.runtime
      ? data.runtime + " min"
      : data.episode_run_time && data.episode_run_time.length
        ? data.episode_run_time[0] + " min/episode"
        : "";

    [
      detailRow("Release", data.release_date || data.first_air_date),
      detailRow("Rating", rating > 0 ? "★ " + rating.toFixed(1) + "/10" : "Not rated"),
      detailRow("Genres", genres),
      detailRow("Runtime", runtime),
      detailRow("Status", data.status),
      detailRow(
        "Language",
        data.original_language
          ? data.original_language.toUpperCase()
          : ""
      )
    ].filter(Boolean).forEach(row => info.appendChild(row));

    info.append(
      makeElement("h2", "detail-subtitle", "Overview"),
      makeElement(
        "p",
        "detail-overview",
        data.overview || "No overview available."
      )
    );

    layout.appendChild(info);
    hero.appendChild(layout);
    root.appendChild(hero);

    /* Cast */
    const cast = Array.isArray(credits.cast) ? credits.cast : [];

    addHeading("Cast");

    if (cast.length) {
      const castGrid = makeElement("div", "cast-grid");

      cast.slice(0, 24).forEach(person => {
        castGrid.appendChild(makeProfileCard(person, false));
      });

      root.appendChild(castGrid);
    } else {
      addMessage("Cast information unavailable.");
    }

    /* Crew */
    const crew = Array.isArray(credits.crew) ? credits.crew : [];

    addHeading("Crew");

    if (crew.length) {
      const crewGrid = makeElement("div", "crew-grid");

      const sortedCrew = [...crew].sort((a, b) => {
        const aIndex = CREW_PRIORITY.indexOf(a.job);
        const bIndex = CREW_PRIORITY.indexOf(b.job);

        return (aIndex < 0 ? 999 : aIndex) -
               (bIndex < 0 ? 999 : bIndex);
      });

      sortedCrew.forEach(person => {
        crewGrid.appendChild(makeProfileCard(person, true));
      });

      root.appendChild(crewGrid);
    } else {
      addMessage("Crew information unavailable.");
    }

    /* Trailer: requires Worker /videos route */
    try {
      const videos = await getJSON(API + base + "/videos?language=en-US");
      renderTrailer(videos);
    } catch (error) {
      console.warn("Trailer information unavailable:", error);
      addHeading("Trailer");
      addMessage("Trailer information could not be loaded.");
    }

  } catch (error) {
    console.error("MovieHub details error:", error);
    status.textContent =
      "Could not load details. Please refresh and try again.";
  }
}

initDetails();
