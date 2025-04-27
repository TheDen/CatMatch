const container = document.getElementById("card-container");
const visitVerb = document.getElementById("visit-verb");
const visitBtn = document.getElementById("visit-cat-btn");
const closeBtn = document.getElementById("close-banner");
const banner = document.getElementById("match-banner");
const factBox = document.getElementById("cat-fact");
const stateFilter = document.getElementById("state-filter");
const undoButton = document.getElementById("undo-button");

let allCats = [];
let filteredCats = [];
let currentBatch = [];
let lastRemovedCat = null;
let batchIndex = 0;
let matchBannerOpen = false;
let pendingVisitUrl = null;
let factInterval = null;

const BATCH_SIZE = 20;

const catFacts = [
  "Cats sleep 16–18 hours a day 💤",
  "A group of cats is called a 'clowder' 🐾",
  "Cats can jump 5–7 times their height!",
  "Cats have 230 bones — humans have 206",
  "Cats' purrs can help heal bones ✨",
  "Each cat’s noseprint is unique like a fingerprint!",
  "Cats walk on their toes, not their paws 🐾",
  "The first cat in space was named Félicette 🚀",
  "Sir Isaac Newton invented the cat door!",
  "Cats step with both left legs, then both right legs 🐾",
  "Florence Nightingale owned 60+ cats 🐱",
  "Cats can sprint at 31 mph 🚀",
  "Cats knead their paws when they’re happy 🥰",
  "Black cats are lucky in Japan 🍀",
  "A cat's brain is 90% similar to a human’s 🧠",
  "Indoor cats can live up to 20 years 🏠",
  "Cats can predict earthquakes! 🌍",
];

// --- Main Loading ---

fetch("cats.json")
  .then((res) => res.text())
  .then((text) => {
    allCats = shuffle(JSON.parse(text));
    filteredCats = [...allCats];
    container.innerHTML = "";
    createCatBatch(filteredCats);
    showSwipeHint();
  })
  .catch((err) => {
    container.innerHTML = "Failed to load cats 😿";
    console.error(err);
  });

// --- Swipe Hint ---

function showSwipeHint() {
  setTimeout(() => {
    const topCard = container.querySelector(".card:last-child");
    if (topCard) {
      topCard.classList.add("hint");
      setTimeout(() => topCard.classList.remove("hint"), 1500);
    }
  }, 200);
}

// --- Batch and Cards ---

function createCatBatch(catArray, start = 0, size = BATCH_SIZE) {
  const slice = catArray.slice(start, start + size);
  currentBatch = slice;
  batchIndex = start + size;

  const shuffled = shuffle([...slice]);
  const withImages = shuffled.filter((cat) => cat.images?.some(isValidPhoto));
  const withoutImages = shuffled.filter(
    (cat) => !cat.images?.some(isValidPhoto),
  );
  const ordered = [...withImages, ...withoutImages];

  // Ensure last card has an image
  const topIndex = ordered.findIndex((cat) => cat.images?.some(isValidPhoto));
  if (topIndex !== -1 && topIndex !== ordered.length - 1) {
    const [topCat] = ordered.splice(topIndex, 1);
    ordered.push(topCat);
  }

  ordered.forEach((cat, index) =>
    createCard(cat, index === ordered.length - 1),
  );
}

function createCard(cat, showHint = false) {
  const hasImage = cat.images?.length > 0;
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
  addSwipeHandling(card, cat);

  return card;
}

function addSwipeHandling(card, cat) {
  const hammer = new Hammer(card);
  hammer.get("pan").set({ direction: Hammer.DIRECTION_ALL });

  let deltaX = 0;

  hammer.on("panstart", () => card.classList.add("dragging"));

  hammer.on("pan", (ev) => {
    deltaX = ev.deltaX;
    const rotate = deltaX / 20;
    const opacity = 1 - Math.min(Math.abs(deltaX) / 800, 0.4);

    card.style.transform = `translateX(${deltaX}px) rotate(${rotate}deg)`;
    card.querySelector(".card-inner").style.opacity = opacity;

    card.querySelector(".like").style.opacity = deltaX > 50 ? "1" : "0";
    card.querySelector(".nope").style.opacity = deltaX < -50 ? "1" : "0";
  });

  hammer.on("panend", () => {
    card.classList.remove("dragging");

    const inner = card.querySelector(".card-inner");
    const threshold = 120;

    if (!matchBannerOpen && Math.abs(deltaX) > threshold) {
      const direction = deltaX > 0 ? 1 : -1;
      card.style.transform = `translateX(${direction * 1000}px) rotate(${direction * 45}deg)`;
      inner.style.opacity = "0";

      setTimeout(() => {
        if (direction === 1 && cat.url) {
          pendingVisitUrl = cat.url;
          matchBannerOpen = true;
          showMatchAndOpen();
          confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
          card.remove();
        } else {
          card.remove();
        }
        loadMoreCardsIfNeeded();
      }, 300);
    } else {
      resetCard(card);
    }

    deltaX = 0;
  });
}

// --- Helper Functions ---

function loadMoreCardsIfNeeded() {
  const remaining = container.querySelectorAll(".card");
  if (remaining.length <= 5 && batchIndex < filteredCats.length) {
    createCatBatch(filteredCats, batchIndex);
  }
  if (remaining.length === 0) {
    applyFilter(stateFilter.value);
  }
}

function resetCard(card) {
  const inner = card.querySelector(".card-inner");
  card.style.opacity = "1";
  card.style.transform = "";
  inner.style.opacity = "1";
  inner.style.transition = "opacity 0.2s ease";
  card.querySelector(".like").style.opacity = "0";
  card.querySelector(".nope").style.opacity = "0";
}

function showMatchAndOpen() {
  if (banner) banner.classList.add("show");
}

// --- Events ---

visitBtn.addEventListener("click", () => {
  if (pendingVisitUrl) {
    window.open(pendingVisitUrl, "_blank");
    pendingVisitUrl = null;
    banner.classList.remove("show");
    matchBannerOpen = false;
    removeTopCard();
  }
});

closeBtn.addEventListener("click", () => {
  pendingVisitUrl = null;
  banner.classList.remove("show");
  matchBannerOpen = false;
  removeTopCard();
});

function removeTopCard() {
  const topCard = container.querySelector(".card:last-child");
  if (topCard) {
    topCard.remove();
    loadMoreCardsIfNeeded();
  }
}

stateFilter.addEventListener("change", (e) => {
  lastRemovedCat = null;
  applyFilter(e.target.value);
});

undoButton.addEventListener("click", () => {
  if (lastRemovedCat) {
    const card = createCard(lastRemovedCat);
    card.classList.add("undo-animate");
    setTimeout(() => card.classList.remove("undo-animate"), 500);
    lastRemovedCat = null;
  }
});

// --- Filter and Utilities ---

function applyFilter(state) {
  container.innerHTML = "";
  lastRemovedCat = null;
  batchIndex = 0;
  filteredCats = allCats.filter(
    (cat) => !state || (cat.location && cat.location.includes(state)),
  );
  createCatBatch(filteredCats, 0);
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

// --- Dynamic Text ---

if (
  window.matchMedia("(hover: hover)").matches &&
  !/Mobi|Android/i.test(navigator.userAgent)
) {
  visitVerb.textContent = "🖱️ Click";
} else {
  visitVerb.textContent = "👉 Tap";
}

// --- Cat Facts Rotation ---

function startCatFactsRotation() {
  function updateFact() {
    const fact = catFacts[Math.floor(Math.random() * catFacts.length)];
    factBox.style.opacity = 0;
    setTimeout(() => {
      factBox.innerHTML = `🐾 ${fact}`;
      factBox.style.opacity = 1;
    }, 800);
  }

  updateFact();
  factInterval = setInterval(updateFact, 5000);
}
startCatFactsRotation();
