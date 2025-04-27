const container = document.getElementById("card-container");
let lastRemovedCat = null;
let allCats = []; // store original shuffled cats
let currentBatch = [];
let batchIndex = 0;
const BATCH_SIZE = 20;
let filteredCats = [];
let matchBannerOpen = false;
let pendingVisitUrl = null;
const catFacts = [
  "Cats sleep 16–18 hours a day 💤",
  "A group of cats is called a 'clowder' 🐾",
  "Cats can jump 5–7 times their height!",
  "Cats have 230 bones — humans have 206",
  "Cats can hear two octaves higher than humans 👂",
  "Cats' purrs can help heal bones ✨",
  "Each cat’s noseprint is unique, like a fingerprint!",
  "Cats walk on their toes, not their paws 🐾",
  "The oldest cat lived to 38 years old 😲",
  "Sir Isaac Newton invented the cat door!",
  "A cat’s heart beats twice as fast as a human’s ❤️",
  "Black cats are lucky in Japan 🍀",
  "The first cat in space was named Félicette 🚀",
  "Adult cats meow mostly to communicate with humans 🗣️",
  "Cats step with both left legs, then both right legs 🐾",
  "The average house cat spends 70% of life sleeping",
  "Cats can sprint at 31 mph (49 km/h) 🚀",
  "Most cats have 24 whiskers",
  "Cats can smell with an extra organ in their mouth 👃",
  "Cats prefer food at room temperature 🍽️",
  "Florence Nightingale owned 60+ cats 🐱",
  "Cats have a 'righting reflex' to land on their feet",
  "Cats use whiskers to judge gaps and spaces 📏",
  "A cat's brain is 90% similar to a human’s 🧠",
  "Purring happens at 26 cycles per second (like a diesel engine!)",
  "The Egyptian word for cat is 'mau' 🐈",
  "Tabby cats are named after Baghdad silk patterns 🧵",
  "Cats have 32 muscles in each ear 🎧",
  "Cats spend 30% of their waking hours grooming ✨",
  "Cats see six times better than humans in the dark 🌌",
  "Cats knead their paws when they’re happy 🥰",
  "Kittens are born with blue eyes 💙",
  "Cats respond better to higher-pitched voices",
  "Calico cats are almost always female 🧡🤍🖤",
  "Cats can rotate their ears independently",
  "Declawing a cat is like amputating your fingertips 😿",
  "A cat’s back is extremely flexible — 53 vertebrae!",
  "Indoor cats can live up to 20 years 🏠",
  "Cats can predict earthquakes! 🌍",
];

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

// Handle visit button click
document.getElementById("visit-cat-btn").addEventListener("click", () => {
  if (pendingVisitUrl) {
    const urlToVisit = pendingVisitUrl;
    pendingVisitUrl = null;
    matchBannerOpen = false;

    const topCard = container.querySelector(".card:last-child");
    if (topCard) {
      topCard.remove(); // now remove after match screen
    }

    const banner = document.getElementById("match-banner");
    banner.classList.remove("show");

    window.open(urlToVisit, "_blank");
  }
});

document.getElementById("close-banner").addEventListener("click", () => {
  matchBannerOpen = false;
  pendingVisitUrl = null;

  const topCard = container.querySelector(".card:last-child");
  if (topCard) {
    topCard.remove(); // now remove after close too
  }

  const banner = document.getElementById("match-banner");
  banner.classList.remove("show");
});

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
    const opacity = 1 - Math.min(Math.abs(deltaX) / 800, 0.4);

    card.style.transform = `translateX(${deltaX}px) rotate(${rotate}deg)`;
    card.querySelector(".card-inner").style.opacity = opacity;

    likeEmoji.style.opacity = deltaX > 50 ? "1" : "0";
    nopeEmoji.style.opacity = deltaX < -50 ? "1" : "0";
  });

  hammer.on("panend", () => {
    card.classList.remove("dragging");

    const inner = card.querySelector(".card-inner");
    const threshold = 120;

    if (!matchBannerOpen && Math.abs(deltaX) > threshold) {
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
          pendingVisitUrl = cat.url;
          matchBannerOpen = true;
          showMatchAndOpen(cat.url);
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 },
          });
        } else {
          card.remove();
        }
      }, 300);
    } else {
      // Reset state if not swiped far enough
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

const visitVerb = document.getElementById("visit-verb");

if (
  window.matchMedia("(hover: hover)").matches &&
  !/Mobi|Android/i.test(navigator.userAgent)
) {
  // Desktop or laptop with a mouse
  visitVerb.textContent = "🖱️ Click";
} else {
  // Touchscreen or mobile device
  visitVerb.textContent = "👉 Tap";
}

function showMatchAndOpen(url) {
  const banner = document.getElementById("match-banner");
  pendingVisitUrl = url;
  matchBannerOpen = true;

  if (banner) {
    banner.classList.add("show");
  }
}

let factInterval = null;

function startCatFactsRotation() {
  const factBox = document.getElementById("cat-fact");

  function updateFact() {
    const fact = catFacts[Math.floor(Math.random() * catFacts.length)];

    // Fade out
    factBox.style.opacity = 0;

    setTimeout(() => {
      factBox.innerHTML = `🐾 ${fact}`;
      factBox.style.opacity = 1;
    }, 800); // match your CSS transition timing
  }

  updateFact(); // show one immediately
  factInterval = setInterval(updateFact, 5000); // change every 5 seconds
}
startCatFactsRotation();
