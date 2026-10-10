
"use strict";

const API = "https://restless-block-eb74.cinemapattukal.workers.dev";
const IMG = "https://image.tmdb.org/t/p/";

const params = new URLSearchParams(location.search);
const id = params.get("id");
const type = params.get("type") === "tv" ? "tv" : "movie";

const status = document.getElementById("detail-status");
const root = document.getElementById("detail-content");

function imageURL(path, size = "w500") {
  return path ? IMG + size + path : "";
}

function makeElement(tag, className = "", text = "") {
  const element = document.createElement(tag);

  if (className) element.className = className;
  if (text !== undefined && text !== null) {
    element.textContent = text;
  }

  return element;
}

async function getJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("HTTP " + response.status);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

function detailRow(label, value) {
  if (!value) return null;

  const row = makeElement("p", "detail-meta");
  const strong = makeElement("strong", "", label + ": ");

  row.append(strong, document.createTextNode(String(value)));

  return row;
}

/* Load movie or TV details */
async function initDetails() {
  if (!id || !/^\d+$/.test(id)) {
    status.textContent = "Invalid movie or TV series ID.";
    return;
  }

  try {
    const base = `/api/${type === "tv" ? "tv" : "movies"}/${encodeURIComponent(id)}`;

    const detailsURL = API + base + "?language=en-US";
    const creditsURL = API + base + "/credits?language=en-US";

    const [data, credits] = await Promise.all([
      getJSON(detailsURL),
      getJSON(creditsURL)
    ]);

    console.log("MovieHub credits:", credits);
    console.log("MovieHub crew:", credits.crew);

    status.textContent = "";
    root.replaceChildren();

    const title = data.title || data.name || "Untitled";
    document.title = title + " — MovieHub";

    /* Hero section */
    const hero = makeElement("section", "detail-hero");

    if (data.backdrop_path) {
      hero.style.backgroundImage =
        `linear-gradient(90deg, rgba(9,14,23,.96), rgba(9,14,23,.70), rgba(9,14,23,.35)), url("${imageURL(data.backdrop_path, "w1280")}")`;
    }

    const layout = makeElement("div", "detail-layout");

    if (data.poster_path) {
      const poster = makeElement("img", "detail-poster");
      poster.src = imageURL(data.poster_path);
      poster.alt = title + " poster";
      poster.loading = "lazy";
      layout.appendChild(poster);
    }

    const info = makeElement("div", "detail-info");

    info.append(
      makeElement("span", "detail-kicker", type === "tv" ? "TV SERIES" : "MOVIE"),
      makeElement("h1", "detail-title", title)
    );

    const rating = Number(data.vote_average || 0);
    const genres = (data.genres || []).map(g => g.name).join(" · ");

    const runtime = data.runtime
      ? data.runtime + " minutes"
      : data.episode_run_time && data.episode_run_time.length
        ? data.episode_run_time[0] + " minutes per episode"
        : "";

    [
      detailRow("Release", data.release_date || data.first_air_date),
      detailRow("Rating", rating ? "★ " + rating.toFixed(1) + "/10" : ""),
      detailRow("Genres", genres),
      detailRow("Runtime", runtime),
      detailRow("Status", data.status),
      detailRow("Language", data.original_language
        ? data.original_language.toUpperCase()
        : "")
    ].filter(Boolean).forEach(row => info.appendChild(row));

    info.append(
      makeElement("h2", "detail-subtitle", "Overview"),
      makeElement("p", "detail-overview", data.overview || "No overview available.")
    );

    layout.appendChild(info);
    hero.appendChild(layout);
    root.appendChild(hero);

    /* Cast section */
    const cast = Array.isArray(credits.cast) ? credits.cast : [];

    root.appendChild(makeElement("h2", "content-heading", "Cast"));

    if (cast.length) {
      const castGrid = makeElement("div", "cast-grid");

      cast.slice(0, 24).forEach(person => {
        const card = makeElement("article", "cast-card");

        if (person.profile_path) {
          const photo = makeElement("img", "cast-photo");
          photo.src = imageURL(person.profile_path, "w185");
          photo.alt = person.name || "Cast member";
          photo.loading = "lazy";
          card.appendChild(photo);
        } else {
          card.appendChild(
            makeElement("div", "cast-photo cast-placeholder", "No image")
          );
        }

        card.append(
          makeElement("strong", "", person.name || "Unknown"),
          makeElement("span", "", person.character || "")
        );

        card.style.cursor = "pointer";
        card.addEventListener("click", () => {
          location.href = "person.html?id=" + encodeURIComponent(person.id);
        });

        castGrid.appendChild(card);
      });

      root.appendChild(castGrid);
    } else {
      root.appendChild(
        makeElement("p", "crew-line", "Cast information is not available.")
      );
    }

    /* Crew section: include every crew member returned by TMDB */
    const crew = Array.isArray(credits.crew) ? credits.crew : [];

    root.appendChild(makeElement("h2", "content-heading", "Crew"));

    if (crew.length) {
      const crewGrid = makeElement("div", "crew-grid");

      /* Prioritize key jobs, then show remaining crew */
      const priority = [
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

      const sortedCrew = [...crew].sort((a, b) => {
        const aIndex = priority.indexOf(a.job);
        const bIndex = priority.indexOf(b.job);

        const aRank = aIndex === -1 ? 999 : aIndex;
        const bRank = bIndex === -1 ? 999 : bIndex;

        return aRank - bRank;
      });

      sortedCrew.forEach(person => {
        const card = makeElement("article", "crew-card");

        card.append(
          makeElement("strong", "", person.name || "Unknown"),
          makeElement(
            "span",
            "",
            person.job || person.department || "Crew"
          )
        );

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
      "Could not load details: " + error.message +
      ". Please check the Cloudflare Worker.";
  }
}

initDetails();
