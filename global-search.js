(() => {
  "use strict";

  const API = "https://restless-block-eb74.cinemapattukal.workers.dev";
  const IMAGE = "https://image.tmdb.org/t/p/w92";
  const input = document.getElementById("global-search");
  const results = document.getElementById("global-search-results");

  if (!input || !results) return;

  let timer = null;
  let controller = null;
  let activeRequest = 0;

  const titleOf = item => item.title || item.name || "Untitled";
  const typeOf = item => item.media_type ||
    (item.first_air_date ? "tv" :
      (item.profile_path && !item.poster_path ? "person" : "movie"));

  function openItem(item) {
    const type = typeOf(item);
    if (type === "person") {
      location.href = `person.html?id=${encodeURIComponent(item.id)}`;
    } else {
      location.href = `details.html?id=${encodeURIComponent(item.id)}&type=${encodeURIComponent(type)}`;
    }
  }

  function showMessage(message) {
    results.replaceChildren();
    const row = document.createElement("div");
    row.className = "global-search-message";
    row.textContent = message;
    results.appendChild(row);
    results.hidden = false;
  }

  function render(items) {
    results.replaceChildren();
    if (!items.length) {
      showMessage("No results found.");
      return;
    }

    items.slice(0, 8).forEach(item => {
      const type = typeOf(item);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "global-search-item";
      button.setAttribute("role", "option");

      const path = type === "person" ? item.profile_path : item.poster_path;
      const image = document.createElement("img");
      image.className = "global-search-thumb";
      image.alt = "";
      image.loading = "lazy";
      if (path) {
        image.src = IMAGE + path;
        image.onerror = () => {
          image.removeAttribute("src");
          image.classList.add("no-image");
          image.alt = "No image";
        };
      } else {
        image.classList.add("no-image");
        image.alt = "No image";
      }

      const copy = document.createElement("span");
      copy.className = "global-search-copy";
      const title = document.createElement("strong");
      title.textContent = titleOf(item);
      const meta = document.createElement("span");
      if (type === "person") {
        meta.textContent = item.known_for_department || "Person";
      } else {
        const date = item.release_date || item.first_air_date || "";
        meta.textContent = `${type === "tv" ? "TV Series" : "Movie"}${date ? " · " + date.slice(0, 4) : ""}`;
      }
      copy.append(title, meta);
      button.append(image, copy);
      button.addEventListener("click", () => openItem(item));
      results.appendChild(button);
    });
    results.hidden = false;
  }

  async function searchTitles(query) {
    const request = ++activeRequest;
    if (controller) controller.abort();
    controller = new AbortController();
    showMessage("Searching...");

    try {
      const url = new URL(API + "/api/search");
      url.searchParams.set("query", query);
      url.searchParams.set("page", "1");
      url.searchParams.set("language", "en-US");
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      if (request !== activeRequest) return;
      if (data.error) throw new Error(data.error);
      render(data.results || []);
    } catch (error) {
      if (error.name === "AbortError" || request !== activeRequest) return;
      showMessage("Search is temporarily unavailable.");
    }
  }

  input.addEventListener("input", () => {
    clearTimeout(timer);
    const query = input.value.trim();
    if (query.length < 2) {
      activeRequest++;
      if (controller) controller.abort();
      results.hidden = true;
      results.replaceChildren();
      return;
    }
    timer = setTimeout(() => searchTitles(query), 300);
  });

  input.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      results.hidden = true;
      input.blur();
    }
    if (event.key === "Enter") {
      const first = results.querySelector(".global-search-item");
      if (first) first.click();
      else if (input.value.trim().length >= 2) searchTitles(input.value.trim());
    }
  });

  document.addEventListener("click", event => {
    if (!event.target.closest(".global-search-wrap")) results.hidden = true;
  });

  input.addEventListener("focus", () => {
    if (input.value.trim().length >= 2 && results.childElementCount) {
      results.hidden = false;
    }
  });
})();
