
const demoMovies = [
  {
    id: 1, title: "Manjummel Boys", type: "movie",
    year: 2024, rating: 8.0,
    overview: "A group of friends embark on a trip that turns into a fight for survival.",
    poster: "https://image.tmdb.org/t/p/w500/4b6e5u9t5v7k8m2x3q1p0n6a.jpg"
  },
  {
    id: 2, title: "Premalu", type: "movie",
    year: 2024, rating: 7.7,
    overview: "A Malayalam romantic comedy about love and friendship.",
    poster: "https://image.tmdb.org/t/p/w500/demo-premalu.jpg"
  },
  {
    id: 3, title: "Stranger Things", type: "tv",
    year: 2016, rating: 8.6,
    overview: "A group of friends encounter mysterious events in their town.",
    poster: "https://image.tmdb.org/t/p/w500/demo-stranger.jpg"
  },
  {
    id: 4, title: "The Batman", type: "movie",
    year: 2022, rating: 7.7,
    overview: "Batman investigates corruption and a series of crimes in Gotham.",
    poster: "https://image.tmdb.org/t/p/w500/demo-batman.jpg"
  }
];

const grid = document.getElementById("grid");
const search = document.getElementById("search");
const category = document.getElementById("category");
const statusBox = document.getElementById("status");

function renderMovies() {
  const query = search.value.trim().toLowerCase();
  const type = category.value;

  const results = demoMovies.filter(item =>
    item.title.toLowerCase().includes(query) &&
    (type === "all" || item.type === type)
  );

  statusBox.textContent = `${results.length} titles`;

  grid.replaceChildren();

  if (!results.length) {
    statusBox.textContent = "No titles found.";
    return;
  }

  results.forEach(item => {
    const card = document.createElement("article");
    card.className = "movie";
    card.tabIndex = 0;

    const poster = document.createElement("img");
    poster.className = "poster";
    poster.src = item.poster;
    poster.alt = `${item.title} poster`;
    poster.loading = "lazy";
    poster.onerror = () => {
      poster.onerror = null;
      poster.removeAttribute("src");
      poster.alt = "Poster unavailable";
    };

    const title = document.createElement("h3");
    title.textContent = item.title;

    const info = document.createElement("p");
    info.textContent =
      `${item.year} · ${item.type === "tv" ? "TV Series" : "Movie"} · ★ ${item.rating}`;

    card.append(poster, title, info);

    const showDetails = () => {
      alert(
        `${item.title} (${item.year})\n\n` +
        `Rating: ${item.rating}\n\n${item.overview}`
      );
    };

    card.addEventListener("click", showDetails);
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        showDetails();
      }
    });

    grid.append(card);
  });
}

search.addEventListener("input", renderMovies);
category.addEventListener("change", renderMovies);
renderMovies();
