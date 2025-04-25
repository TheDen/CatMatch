const container = document.getElementById("card-container");
let lastRemovedCat = null;
let allCats = []; // store original shuffled cats
let currentBatch = [];
let batchIndex = 0;
const BATCH_SIZE = 20;
let filteredCats = [];

fetch("cats.json")
  .then((res) => res.text())
  .then((text) => {
    const cats = shuffle(JSON.parse(text));
    container.innerHTML = "";

    allCats = shuffle(JSON.parse(text));
    filteredCats = [...allCats]; // full set at first
    createCatBatch(filteredCats);
    // Add swipe hint to top card
    setTimeout(() => {
      const topCard = container.querySelector(".card:last-child");
      if (topCard) {
        topCard.classList.add("hint");

        // Remove the class so it can animate again in the future if needed
        setTimeout(() => {
          topCard.classList.remove("hint");
        }, 1500);
      }
    }, 200);
  })
  .catch((err) => {
    container.innerHTML = "Failed to load cats 😿";
    console.error("Error parsing JSON:", err);
  });

function showMatchAndOpen(url) {
  const banner = document.getElementById("match-banner");
  banner.classList.add("show");

  setTimeout(() => {
    banner.classList.remove("show");
    window.open(url, "_blank");
  }, 800);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function isValidPhoto(url) {
  return (
    typeof url === "string" &&
    (url.includes("cloudinary") || /\.(jpg|jpeg|png|webp)$/i.test(url))
  );
}

function createCatBatch(catArray, start = 0, size = BATCH_SIZE) {
  const slice = catArray.slice(start, start + size);
  currentBatch = slice;
  batchIndex = start + size;

  const withImages = slice.filter(
    (cat) => cat.images && cat.images.some(isValidPhoto),
  );

  const withoutImages = slice.filter(
    (cat) => !cat.images || !cat.images.some(isValidPhoto),
  );

  const shuffled = shuffle([...withImages, ...withoutImages]);

  // Ensure last item (top card) has a valid image
  const topIndex = shuffled.findIndex(
    (cat) => cat.images && cat.images.some(isValidPhoto),
  );

  if (topIndex !== -1 && topIndex !== shuffled.length - 1) {
    const [topCat] = shuffled.splice(topIndex, 1);
    shuffled.push(topCat);
  }

  shuffled.forEach((cat, index) =>
    createCard(cat, index === shuffled.length - 1),
  );
}

function createCard(cat, showHint = false) {
  // Home illustrations by Storyset
  const hasImage = cat.images && cat.images.length > 0;
  const imgSrc = hasImage ? cat.images[0] : "images/404cat.svg";

  const card = document.createElement("div");
  card.className = "card";
  card.innerHTML = `
  <div class="card-inner">
      ${showHint ? `<div class="swipe-hint">👉 Swipe to meet them!</div>` : ""}
          <div class="image-wrapper">
    <img src="${imgSrc}" alt="${cat.name}" draggable="false" />
    </div>

      ${!hasImage ? `<div class="no-image-label">No cat photos available 🙀</div>` : ""}

    <div class="card-content">
      <h2>${cat.name}</h2>
      <p>${cat.byline || "No description"}</p>
      <p><strong>Age:</strong> ${cat.age || "Unknown"}</p>
      <p><strong>Location:</strong> ${cat.location || "Unknown"}</p>
    </div>
  </div>
  <span class="reaction like">😻</span>
  <span class="reaction nope">😿</span>
`;
  container.appendChild(card);

  const likeEmoji = card.querySelector(".like");
  const nopeEmoji = card.querySelector(".nope");

  const hammer = new Hammer(card);
  hammer.get("pan").set({ direction: Hammer.DIRECTION_ALL });

  let deltaX = 0;

  hammer.on("panstart", () => {
    card.classList.add("dragging");
  });

  hammer.on("pan", (ev) => {
    deltaX = ev.deltaX;
    const rotate = deltaX / 20;
    const opacity = 1 - Math.min(Math.abs(deltaX) / 800, 0.4); // max 60% opacity

    card.style.transform = `translateX(${deltaX}px) rotate(${rotate}deg)`;
    card.querySelector(".card-inner").style.opacity = opacity;

    likeEmoji.style.opacity = deltaX > 50 ? "1" : "0";
    nopeEmoji.style.opacity = deltaX < -50 ? "1" : "0";
  });

  hammer.on("panend", () => {
    card.classList.remove("dragging");

    const inner = card.querySelector(".card-inner");
    const threshold = 120;

    if (Math.abs(deltaX) > threshold) {
      const direction = deltaX > 0 ? 1 : -1;
      card.style.transform = `translateX(${direction * 1000}px) rotate(${direction * 45}deg)`;
      inner.style.opacity = "0";
      likeEmoji.style.opacity = "0";
      nopeEmoji.style.opacity = "0";

      setTimeout(() => {
        lastRemovedCat = cat;
        card.remove();

        const remaining = container.querySelectorAll(".card");
        if (remaining.length === 0) {
          const currentState = document.getElementById("state-filter").value;
          applyFilter(currentState);
        } else if (remaining.length <= 5 && batchIndex < allCats.length) {
          // Load more cards
          createCatBatch(filteredCats, batchIndex);
        }

        if (direction === 1 && cat.url) {
          showMatchAndOpen(cat.url);
        }
      }, 300);
    } else {
      // 💡 Reset state if not swiped far enough
      card.style.opacity = "1";
      card.style.transform = "";
      inner.style.opacity = "1";
      inner.style.transition = "opacity 0.2s ease";
      likeEmoji.style.opacity = "0";
      nopeEmoji.style.opacity = "0";
    }

    deltaX = 0;
  });
  return card;
}

document.getElementById("undo-button").addEventListener("click", () => {
  if (lastRemovedCat) {
    const card = createCard(lastRemovedCat); // get the new card element
    card.classList.add("undo-animate"); // add the animation class

    // Clean up the class after animation so future animations work too
    setTimeout(() => {
      card.classList.remove("undo-animate");
    }, 500);

    lastRemovedCat = null;
  }
});

document.getElementById("state-filter").addEventListener("change", (e) => {
  lastRemovedCat = null; // reset undo
  applyFilter(e.target.value);
});

function applyFilter(state) {
  container.innerHTML = "";
  lastRemovedCat = null;
  batchIndex = 0;

  filteredCats = allCats.filter((cat) => {
    if (!state) return true;
    return cat.location && cat.location.includes(state);
  });

  createCatBatch(filteredCats, 0);
}
