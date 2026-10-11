
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

function detailRow(label, value) {
  if (!value) return null;

  const row = makeElement("p", "detail-meta");

  row.append(
    makeElement("strong", "", label + ": "),
    document.createTextNode(String(value))
  );

  return row;
}

/* Add Cast or Crew profile image */
function addProfileImage(card, path, name, className) {
  if (path) {
    const photo = makeElement("img", className);

    photo.src = imageURL(path, "w185");
    photo.alt = name || "Profile";
    photo.loading = "lazy";

    photo.onerror = () => {
      photo.onerror = null;

      const placeholder = makeElement(
        "div",
        className + " image-placeholder",
        "Image unavailable"
      );

      photo.replaceWith(placeholder);
    };

    card.appendChild(photo);
  } else {
    card.appendChild(
      makeElement(
        "div",
        className + " image-placeholder",
        "No image"
      )
    );
  }
}

/* Main movie / TV details */
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

  try {
    const base =
      `/api/${type === "tv" ? "tv" : "movies"}/${encodeURIComponent(id)}`;

    const detailsURL =
      API + base + "?language=en-US";

    const creditsURL =
      API + base + "/credits?language=en-US";

    const [data, credits] = await Promise.all([
      getJSON(detailsURL),
      getJSON(creditsURL)
    ]);

    console.log("MovieHub credits:", credits);

    status.textContent = "";
    root.replaceChildren();

    const title = data.title || data.name || "Untitled";

    document.title = title + " — MovieHub";

    /* Hero section */
    const hero = makeElement("section", "detail-hero");

    if (data.backdrop_path) {
      hero.style.backgroundImage =
        `linear-gradient(90deg, rgba(9,14,23,.96), rgba(9,14,23,.72), rgba(9,14,23,.42)), url("${imageURL(data.backdrop_path, "w1280")}")`;
    }

    const layout = makeElement("div", "detail-layout");

    if (data.poster_path) {
      const poster = makeElement("img", "detail-poster");

      poster.src = imageURL(data.poster_path);
      poster.alt = title + " poster";
      poster.loading = "lazy";

      poster.onerror = () => {
        poster.onerror = null;
        poster.alt = "Poster unavailable";
        poster.removeAttribute("src");
      };

      layout.appendChild(poster);
    }

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
      .join(" · ");

    const runtime = data.runtime
      ? data.runtime + " min"
      : data.episode_run_time &&
        data.episode_run_time.length
        ? data.episode_run_time[0] + " min/episode"
        : "";

    [
      detailRow("Release", data.release_date || data.first_air_date),
      detailRow(
        "Rating",
        rating ? "★ " + rating.toFixed(1) + "/10" : ""
      ),
      detailRow("Genres", genres),
      detailRow("Runtime", runtime),
      detailRow("Status", data.status),
      detailRow(
        "Language",
        data.original_language
          ? data.original_language.toUpperCase()
          : ""
      )
    ]
      .filter(Boolean)
      .forEach(row => info.appendChild(row));

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

    /* CAST SECTION */
    const cast = Array.isArray(credits.cast)
      ? credits.cast
      : [];

    root.appendChild(
      makeElement("h2", "content-heading", "Cast")
    );

    if (cast.length) {
      const castGrid = makeElement("div", "cast-grid");

      cast.slice(0, 24).forEach(person => {
        const card = makeElement("article", "cast-card");

        addProfileImage(
          card,
          person.profile_path,
          person.name,
          "cast-photo"
        );

        card.append(
          makeElement("strong", "", person.name || "Unknown"),
          makeElement("span", "", person.character || "")
        );

        card.style.cursor = "pointer";
        card.tabIndex = 0;

        const openProfile = () => {
          location.href =
            "person.html?id=" + encodeURIComponent(person.id);
        };

        card.addEventListener("click", openProfile);

        card.addEventListener("keydown", event => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            openProfile();
          }
        });

        castGrid.appendChild(card);
      });

      root.appendChild(castGrid);
    } else {
      root.appendChild(
        makeElement("p", "crew-line", "Cast information unavailable.")
      );
    }

    /* CREW SECTION WITH IMAGES */
    const crew = Array.isArray(credits.crew)
      ? credits.crew
      : [];

    root.appendChild(
      makeElement("h2", "content-heading", "Crew")
    );

    if (crew.length) {
      const crewGrid = makeElement("div", "crew-grid");

      const sortedCrew = [...crew].sort((a, b) => {
        const aIndex = CREW_PRIORITY.indexOf(a.job);
        const bIndex = CREW_PRIORITY.indexOf(b.job);

        const aRank = aIndex < 0 ? 999 : aIndex;
        const bRank = bIndex < 0 ? 999 : bIndex;

        return aRank - bRank;
      });

      sortedCrew.forEach(person => {
        const card = makeElement("article", "crew-card");

        /* Crew member profile image */
        addProfileImage(
          card,
          person.profile_path,
          person.name,
          "crew-photo"
        );

        card.append(
          makeElement(
            "strong",
            "crew-name",
            person.name || "Unknown"
          ),
          makeElement(
            "span",
            "crew-job",
            person.job || person.department || "Crew"
          )
        );


card.style.cursor = "pointer";
card.setAttribute("role", "link");
card.tabIndex = 0;

function openCrewProfile() {
  if (person.id) {
    location.href =
      "person.html?id=" + encodeURIComponent(person.id);
  }
}

card.addEventListener("click", openCrewProfile);

card.addEventListener("keydown", event => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openCrewProfile();
  }
});

        
        crewGrid.appendChild(card);
      });

      root.appendChild(crewGrid);
    } else {
      root.appendChild(
        makeElement(
          "p",
          "crew-line",
          "TMDB has not provided crew information for this title."
        )
      );
    }

  } catch (error) {
    console.error("MovieHub details error:", error);

    status.textContent =
      "Could not load details: " + error.message;
  }
}

initDetails();
