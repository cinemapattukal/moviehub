
"use strict";

const API = "https://restless-block-eb74.cinemapattukal.workers.dev";
const IMG = "https://image.tmdb.org/t/p/";

const params = new URLSearchParams(location.search);
const id = params.get("id");
const type = params.get("type") === "tv" ? "tv" : "movie";

const status = document.getElementById("detail-status");
const root = document.getElementById("detail-content");

const CREW_PRIORITY = [
  "Director", "Writer", "Screenplay", "Story", "Creator",
  "Executive Producer", "Producer", "Original Music Composer",
  "Director of Photography", "Editor"
];

function imageURL(path, size = "w500") {
  return path ? IMG + size + path : "";
}

function makeElement(tag, className = "", text = "") {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = text;
  return el;
}

async function getJSON(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" }
  });

  if (!response.ok) throw new Error("HTTP " + response.status);

  const data = await response.json();
  if (data.error) throw new Error(data.details || data.error);

  return data;
}

function detailRow(label, value) {
  if (value === undefined || value === null || value === "") return null;

  const row = makeElement("p", "detail-meta");
  row.append(
    makeElement("strong", "", label + ": "),
    document.createTextNode(String(value))
  );
  return row;
}

/* ---------------- TRAILER POPUP ---------------- */

function findTrailer(videos) {
  const list = Array.isArray(videos?.results) ? videos.results : [];

  return list.find(v =>
    v.site === "YouTube" && v.type === "Trailer" && v.key
  ) || list.find(v =>
    v.site === "YouTube" && v.type === "Teaser" && v.key
  ) || null;
}

function openTrailerPopup(video) {
  if (!video?.key) return;

  const overlay = makeElement("div", "movie-trailer-overlay");

  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "99999",
    background: "rgba(0,0,0,.88)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    boxSizing: "border-box"
  });

  const dialog = makeElement("div", "movie-trailer-dialog");

  Object.assign(dialog.style, {
    width: "100%",
    maxWidth: "960px",
    background: "#111827",
    borderRadius: "14px",
    padding: "12px",
    boxSizing: "border-box"
  });

  const top = makeElement("div");

  Object.assign(top.style, {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "10px",
    color: "#fff"
  });

  top.appendChild(makeElement("strong", "", video.name || "Movie Trailer"));

  const close = makeElement("button", "", "×");
  close.type = "button";
  close.setAttribute("aria-label", "Close trailer");

  Object.assign(close.style, {
    background: "#263244",
    color: "#fff",
    border: "0",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    fontSize: "28px",
    cursor: "pointer"
  });

  top.appendChild(close);

  const videoBox = makeElement("div");

  Object.assign(videoBox.style, {
    position: "relative",
    width: "100%",
    aspectRatio: "16 / 9",
    background: "#000",
    overflow: "hidden",
    borderRadius: "8px"
  });

  const frame = makeElement("iframe");
  frame.src =
    "https://www.youtube-nocookie.com/embed/" +
    encodeURIComponent(video.key) + "?autoplay=1&rel=0";

  frame.title = video.name || "Movie trailer";
  frame.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
  frame.allowFullscreen = true;
  frame.referrerPolicy = "strict-origin-when-cross-origin";

  Object.assign(frame.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    border: "0"
  });

  videoBox.appendChild(frame);
  dialog.append(top, videoBox);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  const oldOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";

  function closePopup() {
    overlay.remove();
    document.body.style.overflow = oldOverflow;
    document.removeEventListener("keydown", onKeyDown);
  }

  function onKeyDown(event) {
    if (event.key === "Escape") closePopup();
  }

  close.addEventListener("click", closePopup);

  overlay.addEventListener("click", event => {
    if (event.target === overlay) closePopup();
  });

  document.addEventListener("keydown", onKeyDown);
}

function makeTrailerButton(video) {
  const button = makeElement("button", "play-trailer-button", "▶ Play Trailer");
  button.type = "button";

  Object.assign(button.style, {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "12px 0 18px",
    padding: "12px 20px",
    border: "0",
    borderRadius: "8px",
    background: "#60a5fa",
    color: "#07111f",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer"
  });

  button.addEventListener("click", () => openTrailerPopup(video));
  return button;
}

/* ---------------- CAST AND CREW ---------------- */

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
  if (!person?.id) return;
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

/* ---------------- SIMILAR MOVIES / TV ---------------- */

function makeSimilarCard(item, mediaType) {
  const card = makeElement("a", "similar-card");
  const poster = makeElement("img", "similar-poster");

  card.href =
    "details.html?id=" + encodeURIComponent(item.id) +
    "&type=" + encodeURIComponent(mediaType);

  card.setAttribute("aria-label", item.title || item.name || "View details");

  if (item.poster_path) {
    poster.src = imageURL(item.poster_path, "w342");
    poster.alt = item.title || item.name || "Movie poster";
    poster.loading = "lazy";
  } else {
    poster.remove();
    card.appendChild(
      makeElement("div", "similar-poster similar-no-poster", "No poster")
    );
  }

  if (item.poster_path) card.appendChild(poster);

  const body = makeElement("div", "similar-card-info");

  body.appendChild(
    makeElement("strong", "similar-title", item.title || item.name || "Untitled")
  );

  const date = item.release_date || item.first_air_date || "";
  const year = date ? date.slice(0, 4) : "Year unknown";
  const rating = Number(item.vote_average || 0);

  body.appendChild(makeElement("span", "similar-year", year));

  if (rating > 0) {
    body.appendChild(
      makeElement("span", "similar-rating", "★ " + rating.toFixed(1) + "/10")
    );
  }

  card.appendChild(body);
  return card;
}

async function renderSimilar(mediaType, currentId) {
  addHeading(mediaType === "tv" ? "Similar TV Series" : "Similar Movies");

  const section = makeElement("section", "similar-section");
  section.setAttribute("aria-label", "Similar titles");

  const row = makeElement("div", "similar-grid");
  section.appendChild(row);
  root.appendChild(section);

  try {
    const endpoint =
      API + "/api/" + (mediaType === "tv" ? "tv" : "movies") +
      "/" + encodeURIComponent(currentId) + "/similar?language=en-US";

    const result = await getJSON(endpoint);
    const items = Array.isArray(result.results) ? result.results : [];

    const filtered = items
      .filter(item => String(item.id) !== String(currentId))
      .filter(item => item.poster_path)
      .slice(0, 12);

    if (!filtered.length) {
      section.remove();
      return;
    }

    filtered.forEach(item => {
      row.appendChild(makeSimilarCard(item, mediaType));
    });
  } catch (error) {
    console.warn("Similar titles unavailable:", error);
    section.remove();
  }
}

/* ---------------- DETAILS PAGE ---------------- */

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
    "/api/" + (type === "tv" ? "tv" : "movies") +
    "/" + encodeURIComponent(id);

  try {
    const [data, credits, videos] = await Promise.all([
      getJSON(API + base + "?language=en-US"),

      getJSON(API + base + "/credits?language=en-US")
        .catch(error => {
          console.warn("Credits unavailable:", error);
          return { cast: [], crew: [] };
        }),

      getJSON(API + base + "/videos?language=en-US")
        .catch(error => {
          console.warn("Trailer information unavailable:", error);
          return { results: [] };
        })
    ]);

    status.textContent = "";
    root.replaceChildren();

    const title = data.title || data.name || "Untitled";
    document.title = title + " — MovieHub";

    /* Details hero: existing layout preserved */

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
      makeElement("span", "detail-kicker", type === "tv" ? "TV SERIES" : "MOVIE"),
      makeElement("h1", "detail-title", title)
    );

    const rating = Number(data.vote_average || 0);
    const genres = (data.genres || [])
      .map(genre => genre.name)
      .filter(Boolean)
      .join(" · ");

    const runtime = data.runtime
      ? data.runtime + " min"
      : data.episode_run_time?.length
        ? data.episode_run_time[0] + " min/episode"
        : "";

    [
      detailRow("Release", data.release_date || data.first_air_date),
      detailRow("Rating", rating > 0 ? "★ " + rating.toFixed(1) + "/10" : "Not rated"),
      detailRow("Genres", genres),
      detailRow("Runtime", runtime),
      detailRow("Status", data.status),
      detailRow("Language", data.original_language
        ? data.original_language.toUpperCase()
        : "")
    ].filter(Boolean).forEach(row => info.appendChild(row));

    const trailer = findTrailer(videos);
    if (trailer) info.appendChild(makeTrailerButton(trailer));

    info.append(
      makeElement("h2", "detail-subtitle", "Overview"),
      makeElement("p", "detail-overview", data.overview || "No overview available.")
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
        const ai = CREW_PRIORITY.indexOf(a.job);
        const bi = CREW_PRIORITY.indexOf(b.job);
        return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
      });

      sortedCrew.forEach(person => {
        crewGrid.appendChild(makeProfileCard(person, true));
      });

      root.appendChild(crewGrid);
    } else {
      addMessage("Crew information unavailable.");
    }

    /* Similar titles: below Crew */

    await renderSimilar(type, id);

  } catch (error) {
    console.error("MovieHub details error:", error);
    status.textContent = "Could not load details. Please refresh and try again.";
  }
}

initDetails();
