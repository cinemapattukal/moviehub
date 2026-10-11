"use strict";

const API = "https://restless-block-eb74.cinemapattukal.workers.dev";
const IMG = "https://image.tmdb.org/t/p/";

const params = new URLSearchParams(location.search);
const id = params.get("id");

const status = document.getElementById("person-status");
const root = document.getElementById("person-content");
let creditsRoot = root;

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
    throw new Error(
      typeof data.details === "string"
        ? data.details
        : data.error
    );
  }

  return data;
}

async function getFirstWorking(urls, fallback = {}) {
  for (const url of urls) {
    try {
      return await getJSON(url);
    } catch (error) {
      console.warn(
        "MovieHub endpoint unavailable:",
        url,
        error.message
      );
    }
  }

  return fallback;
}

function uniqueCredits(items) {
  const seen = new Set();

  return (items || []).filter(item => {
    if (!item || !item.id) return false;

    const type =
      item.media_type ||
      (item.first_air_date ? "tv" : "movie");

    const key =
      `${type}-${item.id}-${item.job || item.character || ""}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function sortByDate(items) {
  return [...items].sort((a, b) => {
    const dateA = a.release_date || a.first_air_date || "";
    const dateB = b.release_date || b.first_air_date || "";

    return dateB.localeCompare(dateA);
  });
}

async function init() {
  if (!status || !root) {
    console.error(
      "MovieHub: person-status/person-content element missing."
    );
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
      throw new Error("Person details were not returned by the API.");
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

    const allCast = credits
      ? (credits.cast || []).map(item => ({
          ...item,
          media_type:
            item.media_type ||
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

    const allCrew = credits
      ? (credits.crew || []).map(item => ({
          ...item,
          media_type:
            item.media_type ||
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

    // PROFILE PHOTO
    const profile = el("section", "person-hero");

    if (person.profile_path) {
      const photo = el("img", "person-large-photo");

      photo.src = img(person.profile_path, "h632");
      photo.alt = person.name || "Person";
      photo.loading = "lazy";

      photo.onerror = () => {
        photo.onerror = null;
        photo.replaceWith(
          el(
            "div",
            "person-large-photo person-photo-placeholder",
            "No image"
          )
        );
      };

      profile.appendChild(photo);
    } else {
      profile.appendChild(
        el(
          "div",
          "person-large-photo person-photo-placeholder",
          "No image"
        )
      );
    }

    const bio = el("div", "person-bio");

    bio.append(
      el("span", "detail-kicker", "PERSON PROFILE"),
      el(
        "h1",
        "detail-title person-profile-name",
        person.name || "Unknown"
      )
    );

    // PERSONAL INFO
    const personalInfo = el("section", "person-personal-info");

    personalInfo.appendChild(
      el("h2", "person-info-heading", "Personal Info")
    );

    const infoGrid = el("div", "person-info-grid");

    const addInfo = (label, value, extraClass = "") => {
      if (
        value === undefined ||
        value === null ||
        String(value).trim() === ""
      ) {
        return;
      }

      const item = el(
        "div",
        "person-info-item" +
          (extraClass ? " " + extraClass : "")
      );

      item.append(
        el("strong", "person-info-label", label),
        el("span", "person-info-value", value)
      );

      infoGrid.appendChild(item);
    };

    const stageName =
      Array.isArray(person.also_known_as) &&
      person.also_known_as.length
        ? person.also_known_as.slice(0, 2).join(", ")
        : "";

    addInfo("Stage Name", stageName);
    addInfo("Known For", person.known_for_department || "—");

    addInfo(
      "Known Credits",
      String(uniqueCredits([...allCast, ...allCrew]).length)
    );

    addInfo(
      "Gender",
      ({ 1: "Female", 2: "Male", 3: "Non-binary" })[
        person.gender
      ] || "—"
    );

    addInfo("Birthday", person.birthday || "—");

    addInfo(
      "Place of Birth",
      person.place_of_birth || "—",
      "person-info-wide"
    );

    if (person.deathday) {
      addInfo("Deathday", person.deathday, "person-info-wide");
    }

    personalInfo.appendChild(infoGrid);

    // BIOGRAPHY + READ MORE
    const biography = el("section", "person-biography-section");

    const bioHeading = el(
      "h2",
      "detail-subtitle",
      "Biography"
    );

    const bioText = el("div", "person-biography-text");

    const biographySource = (
      person.biography || "No biography available."
    ).trim();

    const fullBiography = biographySource
      .split(/\n\s*\n/)
      .map(paragraph => paragraph.trim())
      .filter(Boolean);

    fullBiography.forEach(paragraph => {
      bioText.appendChild(
        el("p", "detail-overview", paragraph)
      );
    });

    const readMore = el(
      "button",
      "bio-read-more",
      "Read More ›"
    );

    readMore.type = "button";
    readMore.setAttribute("aria-expanded", "false");

    let expanded = false;

    readMore.addEventListener("click", () => {
      expanded = !expanded;

      bioText.classList.toggle(
        "bio-collapsed",
        !expanded
      );

      readMore.textContent = expanded
        ? "Read Less ↑"
        : "Read More ›";

      readMore.setAttribute(
        "aria-expanded",
        String(expanded)
      );
    });

    biography.append(bioHeading, bioText);

    if (biographySource.length > 300) {
      bioText.classList.add("bio-collapsed");
      biography.appendChild(readMore);
    }

    // DESKTOP: LEFT SIDEBAR + RIGHT CONTENT
    const workColumn = el("div", "person-work-column");

    profile.appendChild(bio);
    profile.appendChild(personalInfo);
    profile.appendChild(biography);
    profile.appendChild(workColumn);

    root.appendChild(profile);

    creditsRoot = workColumn;

    // RESPONSIVE STYLES
    if (!document.getElementById("person-mobile-profile-styles")) {
      const mobileStyles = el("style");
      mobileStyles.id = "person-mobile-profile-styles";

      mobileStyles.textContent = `
        .person-personal-info {
          margin-top: 28px;
        }

        .person-info-heading {
          margin: 0 0 16px;
        }

        .person-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px 22px;
        }

        .person-info-item {
          display: flex;
          flex-direction: column;
          gap: 7px;
          min-width: 0;
        }

        .person-info-label {
          font-weight: 700;
        }

        .person-info-value {
          overflow-wrap: anywhere;
        }

        .person-info-wide {
          grid-column: 1 / -1;
        }

        .person-biography-section {
          margin-top: 26px;
          min-width: 0;
        }

        .person-biography-text p {
          margin: 0 0 18px;
          line-height: 1.65;
          white-space: pre-wrap;
        }

        .person-biography-text.bio-collapsed {
          max-height: 220px;
          overflow: hidden;
          position: relative;
        }

        .bio-read-more {
          display: block;
          margin: 6px 0 18px auto;
          padding: 6px 0;
          border: none;
          background: transparent;
          color: #01b4e4;
          font: inherit;
          font-weight: 600;
          cursor: pointer;
        }

        @media (min-width: 768px) {
          .person-hero {
            display: grid !important;
            grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
            grid-template-areas:
              "photo name"
              "info biography"
              "info work";
            align-items: start;
            gap: 0 30px !important;
          }

          .person-large-photo {
            grid-area: photo;
            width: 100% !important;
            max-width: 100%;
            height: auto;
            aspect-ratio: 2 / 3;
            object-fit: cover;
            border-radius: 12px;
          }

          .person-bio {
            grid-area: name;
            min-width: 0;
            display: contents;
          }

          .person-bio > .detail-kicker {
            display: none;
          }

          .person-profile-name {
            grid-area: name;
            margin: 0 0 22px !important;
          }

          .person-personal-info {
            grid-area: info;
            margin-top: 22px;
            min-width: 0;
          }

          .person-info-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 14px;
          }

          .person-info-wide {
            grid-column: auto;
          }

          .person-biography-section {
            grid-area: biography;
            margin-top: 0;
            min-width: 0;
          }

          .person-work-column {
            grid-area: work;
            min-width: 0;
          }
        }

        @media (max-width: 767px) {
          .person-hero {
            display: flex !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 18px !important;
          }

          .person-large-photo {
            display: block;
            width: min(82%, 320px) !important;
            height: auto !important;
            aspect-ratio: 1 / 1;
            object-fit: cover;
            margin: 0 auto !important;
            border-radius: 12px;
          }

          .person-bio {
            width: 100%;
            min-width: 0;
          }

          .person-bio > .detail-kicker {
            display: none;
          }

          .person-profile-name {
            text-align: center;
            font-size: clamp(30px, 8vw, 44px) !important;
            line-height: 1.12;
            margin: 0 0 20px !important;
            overflow-wrap: anywhere;
          }

          .person-personal-info {
            margin-top: 30px;
          }

          .person-info-heading {
            font-size: 28px;
            margin-bottom: 18px;
          }

          .person-info-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 20px 18px;
          }

          .person-info-label {
            font-size: 17px;
          }

          .person-info-value {
            font-size: 16px;
            line-height: 1.45;
          }

          .person-biography-section {
            margin-top: 30px;
          }
        }
      `;

      document.head.appendChild(mobileStyles);
    }

    // KNOWN FOR
    const allKnown = uniqueCredits([
      ...allCast,
      ...allCrew
    ]);

    const knownFor = [...allKnown]
      .sort((a, b) =>
        (b.popularity || 0) - (a.popularity || 0)
      )
      .slice(0, 12);

    addCredits("Known For", knownFor, "known");

    // MOVIES AND TV SERIES
    const movieCast = sortByDate(
      allCast.filter(item => item.media_type === "movie")
    );

    const tvCast = sortByDate(
      allCast.filter(item => item.media_type === "tv")
    );

    addCredits("Movies", movieCast, "cast");
    addCredits("TV Series", tvCast, "cast");

    // CREW WORK
    const crewJobs = [
      "Director",
      "Writer",
      "Screenplay",
      "Story",
      "Creator",
      "Producer",
      "Executive Producer",
      "Original Music Composer",
      "Director of Photography",
      "Editor"
    ];

    function sortCrew(items) {
      return [...items].sort((a, b) => {
        const rank = job => {
          const index = crewJobs.indexOf(job || "");
          return index < 0 ? 999 : index;
        };

        const rankDifference = rank(a.job) - rank(b.job);

        if (rankDifference !== 0) {
          return rankDifference;
        }

        const dateA = a.release_date || a.first_air_date || "";
        const dateB = b.release_date || b.first_air_date || "";

        return dateB.localeCompare(dateA);
      });
    }

    const movieCrew = sortCrew(
      allCrew.filter(
        item =>
          item.media_type === "movie" &&
          (item.job || item.department)
      )
    );

    const tvCrew = sortCrew(
      allCrew.filter(
        item =>
          item.media_type === "tv" &&
          (item.job || item.department)
      )
    );

    addCredits("Movie Crew Work", movieCrew, "crew");
    addCredits("TV Series Crew Work", tvCrew, "crew");

    if (!allCast.length && !allCrew.length) {
      workColumn.appendChild(
        el(
          "p",
          "crew-line",
          "No movie or TV work history was returned by the API."
        )
      );
    }

  } catch (error) {
    console.error("MovieHub person profile error:", error);

    status.textContent =
      "Profile could not load: " + error.message;
  }
}

function addCredits(heading, items, mode) {
  if (!items || !items.length) return;

  creditsRoot.appendChild(
    el("h2", "content-heading", heading)
  );

  const grid = el(
    "div",
    mode === "known"
      ? "credit-grid known-for-slider"
      : "credit-grid"
  );

  const seen = new Set();

  items.forEach(item => {
    const type =
      item.media_type === "tv" ||
      item.first_air_date
        ? "tv"
        : "movie";

    const role =
      mode === "crew"
        ? item.job || item.department || ""
        : mode === "cast"
          ? item.character || ""
          : "";

    const key = `${type}-${item.id}-${role}`;

    if (seen.has(key)) return;
    seen.add(key);

    const card = el("a", "credit-card");

    card.href =
      `details.html?id=${encodeURIComponent(item.id)}&type=${type}`;

    card.setAttribute(
      "aria-label",
      `${item.title || item.name || "Title"}${
        role ? " — " + role : ""
      }`
    );

    if (item.poster_path) {
      const poster = el("img", "credit-poster");

      poster.src = img(item.poster_path, "w342");
      poster.alt = item.title || item.name || "Poster";
      poster.loading = "lazy";

      poster.onerror = () => {
        poster.onerror = null;

        poster.replaceWith(
          el(
            "div",
            "credit-poster credit-placeholder",
            "No poster"
          )
        );
      };

      card.appendChild(poster);
    } else {
      card.appendChild(
        el(
          "div",
          "credit-poster credit-placeholder",
          "No poster"
        )
      );
    }

    const title = item.title || item.name || "Untitled";
    const date = item.release_date || item.first_air_date || "";
    const year = date.slice(0, 4);

    card.append(
      el("strong", "", title),
      el("span", "", year),
      el("span", "credit-role", role)
    );

    grid.appendChild(card);
  });

  creditsRoot.appendChild(grid);
}

init();
