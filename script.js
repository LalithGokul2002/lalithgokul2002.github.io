// Browsers restore the previous scroll offset on refresh, which drops visitors
// back into the middle of whatever section they left. Set this before anything
// else runs - once the browser has restored the offset it is too late.
if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

// A hash means a deep link someone was sent (#projects, #contact) - honour it.
// Everything else opens at the hero.
window.addEventListener("load", () => {
  if (!window.location.hash) {
    window.scrollTo(0, 0);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = String(new Date().getFullYear());
  }

  const hamburger = document.getElementById("hamburger");
  const navMenu = document.getElementById("nav-menu");
  const navLinks = document.querySelectorAll(".nav-link");

  const setMenu = (open) => {
    navMenu.classList.toggle("active", open);
    hamburger.classList.toggle("active", open);
    hamburger.setAttribute("aria-expanded", String(open));
  };

  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
      setMenu(!navMenu.classList.contains("active"));
    });

    hamburger.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setMenu(!navMenu.classList.contains("active"));
      }
    });

    // Close the menu after tapping a link, otherwise it covers the section.
    navLinks.forEach((link) => {
      link.addEventListener("click", () => setMenu(false));
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setMenu(false);
    });

    document.addEventListener("click", (e) => {
      if (!navMenu.classList.contains("active")) return;
      if (!navMenu.contains(e.target) && !hamburger.contains(e.target)) {
        setMenu(false);
      }
    });
  }

  // Highlight the nav link for whichever section is currently in view.
  const sections = document.querySelectorAll("section[id]");
  if (sections.length && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) => {
            link.classList.toggle(
              "active",
              link.getAttribute("href") === "#" + entry.target.id
            );
          });
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    sections.forEach((section) => observer.observe(section));
  }
  // "View more" on each project card. The detail block stays in the DOM so it is
  // searchable and readable without JS - only the open/closed class is scripted.
  document.querySelectorAll(".project-toggle").forEach((toggle) => {
    const details = document.getElementById(toggle.getAttribute("aria-controls"));
    if (!details) return;

    toggle.addEventListener("click", () => {
      const open = details.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "View less" : "View more";
    });
  });

  // Reveal elements as they scroll into view, staggered within each group.
  const revealItems = document.querySelectorAll(".reveal");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((el) => el.classList.add("is-visible"));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry, i) => {
          if (!entry.isIntersecting) return;
          entry.target.style.transitionDelay = i * 90 + "ms";
          entry.target.classList.add("is-visible");
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    revealItems.forEach((el) => revealObserver.observe(el));
  }

});

// Hero background: a drifting field of pixel-art game sprites. Each one spawns at a
// random scale with a random-direction impulse, the same rule Obstacle.cs uses in
// Sprite Flight. Sprites are bitmaps drawn pixel by pixel, never rotated - rotating
// pixel art destroys the grid that makes it read as pixel art.
(() => {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const hero = canvas.parentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const SPRITES = [
    // Invader
    [
      "..#.....#..",
      "...#...#...",
      "..#######..",
      ".##.###.##.",
      "###########",
      "#.#######.#",
      "#.#.....#.#",
      "...##.##...",
    ],
    // Heart
    [
      ".##..##.",
      "########",
      "########",
      "########",
      ".######.",
      "..####..",
      "...##...",
    ],
    // Coin
    [
      ".#####.",
      "##...##",
      "#.###.#",
      "#.#.#.#",
      "#.###.#",
      "##...##",
      ".#####.",
    ],
    // Ship - the craft you fly in Sprite Flight
    [
      "...#...",
      "...#...",
      "..###..",
      "..###..",
      ".#####.",
      "#.###.#",
      "#.#.#.#",
    ],
    // Arcade joystick - ball top, shaft, base
    [
      "..###..",
      ".#####.",
      "..###..",
      "...#...",
      "...#...",
      "..###..",
      ".#####.",
      "#######",
    ],
    // Gamepad - d-pad left, face buttons right, grips below
    [
      "..#######..",
      ".#########.",
      "##.#...#.##",
      "#.###.#.#.#",
      "##.#...#.##",
      ".#########.",
      "##.......##",
    ],
    // Keyboard
    [
      "###########",
      "#.#.#.#.#.#",
      "#.#.#.#.#.#",
      "#..#####..#",
      "###########",
    ],
    // Mouse - two buttons and a wheel
    [
      ".###.",
      "#.#.#",
      "#.#.#",
      "#####",
      "#...#",
      "#...#",
      ".###.",
    ],
    // D-pad
    [
      ".###.",
      ".#.#.",
      "##.##",
      "#...#",
      "##.##",
      ".#.#.",
      ".###.",
    ],
  ];

  let items = [];
  let width = 0;
  let zoneLeft = 0;
  let height = 0;
  let raf = null;
  // x/y are the eased parallax offset; cx/cy are the cursor in canvas pixels, which
  // is what the physics needs. speed is recomputed per frame, not per pointer event.
  const pointer = {
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    cx: -9999,
    cy: -9999,
    lastCx: null,
    lastCy: null,
    speed: 0,
    dirX: 0,
    dirY: 0,
    inside: false,
  };

  const rand = (min, max) => Math.random() * (max - min) + min;

  function build() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = hero.getBoundingClientRect();
    // Bail if the hero has not been laid out yet - the observer below re-runs us.
    if (rect.width < 1 || rect.height < 1) return;
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Keep the field clear of the hero copy, which occupies the left of the layout.
    // Below 900px the layout is single-column and centred, so use the full width.
    zoneLeft = width > 900 ? width * 0.44 : 0;

    // Denser field than the visual-only version: collisions need sprites to actually
    // meet, and encounter rate scales with density far more than with speed.
    const count = Math.min(32, Math.max(10, Math.round((width * height) / 28000)));
    items = [];

    for (let i = 0; i < count; i++) {
      const sprite = SPRITES[Math.floor(Math.random() * SPRITES.length)];
      const px = rand(3, 7);
      const spriteW = sprite[0].length * px;
      const spriteH = sprite.length * px;
      // Box collider matching the drawn sprite. A circle would be wrong here: the
      // keyboard is 11 cells wide by 5 tall, so a circle sized to its width would
      // bounce it a full sprite-width before anything visibly touched.
      const halfW = spriteW / 2;
      const halfH = spriteH / 2;
      const speed = rand(10, 30) / 100;
      const angle = rand(0, Math.PI * 2);

      const minX = zoneLeft + halfW;
      const maxX = Math.max(minX + 1, width - halfW);
      const maxY = Math.max(halfH + 1, height - halfH);

      // Try a few placements so nothing starts already overlapping, which would
      // otherwise fire a large separation impulse on the first frame.
      let x = rand(minX, maxX);
      let y = rand(halfH, maxY);
      for (let attempt = 0; attempt < 40; attempt++) {
        const clash = items.some(
          (o) =>
            Math.abs(o.x - x) < o.halfW + halfW &&
            Math.abs(o.y - y) < o.halfH + halfH
        );
        if (!clash) break;
        x = rand(minX, maxX);
        y = rand(halfH, maxY);
      }

      items.push({
        sprite,
        px,
        halfW,
        halfH,
        mass: spriteW * spriteH,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        baseSpeed: speed,
        depth: rand(0.3, 1),
        bob: rand(0, Math.PI * 2),
      });
    }
  }

  // Elastic box-vs-box collisions, every pair against every other. The count is
  // capped at 32, so this is under 500 checks a frame.
  function resolveCollisions() {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const a = items[i];
        const b = items[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;

        const overlapX = a.halfW + b.halfW - Math.abs(dx);
        if (overlapX <= 0) continue;
        const overlapY = a.halfH + b.halfH - Math.abs(dy);
        if (overlapY <= 0) continue;

        // Bounce along whichever axis is least penetrated - that is the face they
        // actually met on. Resolving the other way pops them through each other.
        let nx = 0;
        let ny = 0;
        let overlap;
        if (overlapX < overlapY) {
          nx = dx < 0 ? -1 : 1;
          overlap = overlapX;
        } else {
          ny = dy < 0 ? -1 : 1;
          overlap = overlapY;
        }

        const relVel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;

        // Already moving apart - resolving again would suck them back together.
        if (relVel > 0) continue;

        const impulse = (-2 * relVel) / (1 / a.mass + 1 / b.mass);
        a.vx -= (impulse / a.mass) * nx;
        a.vy -= (impulse / a.mass) * ny;
        b.vx += (impulse / b.mass) * nx;
        b.vy += (impulse / b.mass) * ny;

        // Separate them so they cannot sink into each other over repeated frames.
        const push = overlap / 2;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }

    // Floating point error can creep energy in over thousands of collisions.
    // Headroom for cursor shoves; settleSpeeds bleeds them back down afterwards.
    const MAX_SPEED = 3;
    items.forEach((o) => {
      const s = Math.hypot(o.vx, o.vy);
      if (s > MAX_SPEED) {
        o.vx = (o.vx / s) * MAX_SPEED;
        o.vy = (o.vy / s) * MAX_SPEED;
      }
    });
  }


  // The cursor as a physical object. Parallax alone is a render-time offset, so the
  // simulation never felt the mouse - sprites slid under it without reacting. This
  // pushes anything near the cursor, harder the faster the cursor is travelling.
  function applyCursorPush() {
    if (!pointer.inside || pointer.speed < 0.4) return;

    // Cap the speed term so a fast flick across the hero cannot fire sprites away.
    const strength = Math.min(pointer.speed, 45) * 0.02;

    items.forEach((o) => {
      // Measure against where the sprite is DRAWN, not its world position, or the
      // push would land visibly off-centre once parallax has displaced it.
      const drawX = o.x + pointer.x * o.depth * 34;
      const drawY = o.y + pointer.y * o.depth * 34 + Math.sin(o.bob) * 3;

      const dx = drawX - pointer.cx;
      const dy = drawY - pointer.cy;
      const dist = Math.hypot(dx, dy) || 0.001;
      const reach = 120 + Math.max(o.halfW, o.halfH);
      if (dist > reach) return;

      // Squared falloff: a firm shove up close, nothing at the edge of reach.
      const falloff = 1 - dist / reach;
      const push = strength * falloff * falloff;
      // Mostly a shove along the direction of travel, with a smaller radial part so
      // sprites also spread out of the way instead of only being dragged along.
      o.vx += pointer.dirX * push + (dx / dist) * push * 0.45;
      o.vy += pointer.dirY * push + (dy / dist) * push * 0.45;
    });
  }

  // Bleed off cursor energy so a swipe settles back to the ambient drift rather
  // than leaving everything racing. Decays toward baseSpeed, never below it.
  function settleSpeeds() {
    items.forEach((o) => {
      const s = Math.hypot(o.vx, o.vy);
      if (s <= o.baseSpeed || s === 0) return;
      const target = Math.max(o.baseSpeed, s * 0.99);
      o.vx = (o.vx / s) * target;
      o.vy = (o.vy / s) * target;
    });
  }
  function drawSprite(o, offsetX, offsetY) {
    const rows = o.sprite;
    const w = rows[0].length * o.px;
    const h = rows.length * o.px;
    const originX = o.x + offsetX - w / 2;
    const originY = o.y + offsetY - h / 2;

    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        if (rows[r][c] !== "#") continue;
        ctx.fillRect(originX + c * o.px, originY + r * o.px, o.px, o.px);
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    pointer.x += (pointer.tx - pointer.x) * 0.16;
    pointer.y += (pointer.ty - pointer.y) * 0.16;

    // Cursor speed measured per frame, not per pointer event - pointermove fires
    // at wildly varying rates and would give a meaningless velocity.
    if (pointer.lastCx === null) {
      pointer.lastCx = pointer.cx;
      pointer.lastCy = pointer.cy;
    }
    const pdx = pointer.cx - pointer.lastCx;
    const pdy = pointer.cy - pointer.lastCy;
    pointer.speed = Math.hypot(pdx, pdy);
    // Unit vector of cursor travel, so sprites get carried the way you swept.
    pointer.dirX = pointer.speed > 0 ? pdx / pointer.speed : 0;
    pointer.dirY = pointer.speed > 0 ? pdy / pointer.speed : 0;
    pointer.lastCx = pointer.cx;
    pointer.lastCy = pointer.cy;

    if (!reduceMotion) {
      const margin = 60;
      items.forEach((o) => {
        o.x += o.vx;
        o.y += o.vy;
        o.bob += 0.01;
        if (o.x < zoneLeft - margin) o.x = width + margin;
        if (o.x > width + margin) o.x = zoneLeft - margin;
        if (o.y < -margin) o.y = height + margin;
        if (o.y > height + margin) o.y = -margin;
      });
      applyCursorPush();
      // Move everything first, then resolve - resolving mid-move would let the
      // sprites later in the list react to positions the earlier ones no longer hold.
      resolveCollisions();
      settleSpeeds();
    }

    items.forEach((o) => {
      const offsetX = pointer.x * o.depth * 34;
      const offsetY = pointer.y * o.depth * 34 + Math.sin(o.bob) * 3;
      ctx.fillStyle = `rgba(0, 217, 255, ${0.1 + 0.32 * o.depth})`;
      drawSprite(o, offsetX, offsetY);
    });

    raf = requestAnimationFrame(draw);
  }

  function start() {
    if (raf === null) raf = requestAnimationFrame(draw);
  }

  function stop() {
    if (raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }

  // Repaint once from a known-good state, cancelling any chain already running.
  function repaint() {
    stop();
    draw();
    if (reduceMotion) stop();
  }

  // Layout may not be settled yet. ResizeObserver below normally catches that, but
  // its callbacks ride the frame loop, so back it up with timers that do not.
  function ensureSized() {
    if (width > 0) return;
    build();
    if (width > 0) repaint();
  }

  build();
  draw();
  if (reduceMotion) stop();

  [100, 400, 1200].forEach((ms) => setTimeout(ensureSized, ms));
  window.addEventListener("load", ensureSized);

  // ResizeObserver rather than window.resize: it also fires when the hero is first
  // laid out, which window.resize never does.
  let resizeTimer;
  const rebuild = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      build();
      if (width > 0) repaint();
    }, 120);
  };

  if ("ResizeObserver" in window) {
    new ResizeObserver(rebuild).observe(hero);
  } else {
    window.addEventListener("resize", rebuild);
  }

  window.addEventListener("pointermove", (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;

    const rect = hero.getBoundingClientRect();
    pointer.cx = e.clientX - rect.left;
    pointer.cy = e.clientY - rect.top;
    pointer.inside =
      pointer.cx >= 0 && pointer.cx <= rect.width && pointer.cy >= 0 && pointer.cy <= rect.height;
  });

  // Leaving the window must clear the cursor, or the last known position keeps
  // shoving sprites forever.
  window.addEventListener("pointerout", () => {
    pointer.inside = false;
  });

  // Don't burn frames on a hidden tab or once the hero is scrolled past.
  document.addEventListener("visibilitychange", () => {
    document.hidden || reduceMotion ? stop() : start();
  });

  if ("IntersectionObserver" in window && !reduceMotion) {
    new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0 }
    ).observe(hero);
  }
})();
