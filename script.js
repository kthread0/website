/**
MIT License

Copyright (c) 2025 kthread

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// --- Dynamic Theme ---
function randomizeTheme() {
  // Generate a random hue
  const hue = Math.floor(Math.random() * 360);
  // Keep saturation high and lightness moderate for readability on dark bg
  const color = `hsl(${hue}, 85%, 60%)`;
  document.documentElement.style.setProperty('--c-accent', color);
  
  // Update theme-color meta tag
  document.querySelector('meta[name="theme-color"]').setAttribute('content', color);
}

// --- Text Scramble Effect ---
class TextScramble {
  constructor(el) {
    this.el = el;
    this.chars = '!<>-_\\/[]{}—=+*^?#________';
    this.update = this.update.bind(this);
  }

  setText(newText) {
    const oldText = this.el.innerText;
    const length = Math.max(oldText.length, newText.length);
    const promise = new Promise((resolve) => this.resolve = resolve);
    this.queue = [];
    for (let i = 0; i < length; i++) {
      const from = oldText[i] || '';
      const to = newText[i] || '';
      const start = Math.floor(Math.random() * 40);
      const end = start + Math.floor(Math.random() * 40);
      this.queue.push({ from, to, start, end });
    }
    cancelAnimationFrame(this.frameRequest);
    this.frame = 0;
    this.update();
    return promise;
  }

  update() {
    let output = '';
    let complete = 0;
    for (let i = 0, n = this.queue.length; i < n; i++) {
      let { from, to, start, end, char } = this.queue[i];
      if (this.frame >= end) {
        complete++;
        output += to;
      } else if (this.frame >= start) {
        if (!char || Math.random() < 0.28) {
          char = this.randomChar();
          this.queue[i].char = char;
        }
        output += `<span class="dud">${char}</span>`;
      } else {
        output += from;
      }
    }
    this.el.innerHTML = output;
    if (complete === this.queue.length) {
      this.resolve();
    } else {
      this.frameRequest = requestAnimationFrame(this.update);
      this.frame++;
    }
  }

  randomChar() {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }
}

// --- Custom Cursor ---
class TacticalCursor {
  constructor() {
    this.cursor = document.getElementById('tactical-cursor');
    this.pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    
    this.init();
  }

  init() {
    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    this.animate();
  }

  animate() {
    // Smooth follow
    const dt = 0.2;
    this.pos.x += (this.mouse.x - this.pos.x) * dt;
    this.pos.y += (this.mouse.y - this.pos.y) * dt;

    this.cursor.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0)`;
    
    requestAnimationFrame(() => this.animate());
  }
}

// --- Tactical Popup ---
class TacticalPopup {
  constructor() {
    this.el = document.getElementById('tactical-popup');
    this.content = this.el.querySelector('.popup-content');
    this.triggers = document.querySelectorAll('.term-trigger');
    
    this.data = {
      software: "Full-stack engineering with focus on performance and type safety (Rust, TS).",
      security: "Vulnerability assessment, secure coding practices, and cryptographic implementation (C, Sodium)."
    };

    this.init();
  }

  init() {
    this.triggers.forEach(trigger => {
      trigger.addEventListener('mouseenter', (e) => this.show(e));
      trigger.addEventListener('mouseleave', () => this.hide());
      trigger.addEventListener('mousemove', (e) => this.move(e));
    });
  }

  show(e) {
    const term = e.target.dataset.term;
    if (this.data[term]) {
      this.content.innerText = this.data[term];
      this.el.classList.add('visible');
      this.move(e);
    }
  }

  hide() {
    this.el.classList.remove('visible');
  }

  move(e) {
    // Position relative to viewport
    const x = e.clientX + 20;
    const y = e.clientY + 20;
    
    // Ensure it doesn't go off screen (basic check)
    const rect = this.el.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 20;
    const maxY = window.innerHeight - rect.height - 20;
    
    const finalX = Math.min(x, maxX);
    const finalY = Math.min(y, maxY);

    this.el.style.left = `${finalX}px`;
    this.el.style.top = `${finalY}px`;
    this.el.style.transform = 'none'; // Reset transform to avoid conflict
  }
}

// --- Dynamic Carousel ---
class Carousel {
  constructor(el) {
    this.el = el;
    this.items = [
      "ROBUST SYSTEMS",
      "SECURE INFRASTRUCTURE",
      "SCALABLE APIS",
      "KERNEL DEVELOPMENT",
      "CRYPTOGRAPHIC TOOLS"
    ];
    this.current = 0;
    this.scramble = new TextScramble(this.el);
    
    this.loop();
  }

  loop() {
    this.current = (this.current + 1) % this.items.length;
    this.scramble.setText(this.items[this.current]).then(() => {
      setTimeout(() => this.loop(), 3000);
    });
  }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  // Preloader Configuration
  const PRELOADER_DURATION = 2000; // ms
  const SKULL_FRAME_RATE = 100; // ms

  // Skull ASCII Frames
  const skullFrames = [
`
uu$:$:$:$:$:$uu
uu$$$$$$$$$$$$$$$$$uu
u$$$$$$$$$$$$$$$$$$$$$u
u$$$$$$$$$$$$$$$$$$$$$$$u
u$$$$$$$$$$$$$$$$$$$$$$$$$u
u$$$$$$$$$$$$$$$$$$$$$$$$$u
u$$$$$$*   *$$$*   *$$$$$$u
*$$$$*      u$u      $$$$*
$$$u       u$u       u$$$
$$$u      u$$$u      u$$$
*$$$$uu$$$   $$$uu$$$$*
*$$$$$$$*   *$$$$$$$*
u$$$$$$$u$$$$$$$u
u$*$*$*$*$*$*$u
uuu        $$u$ $ $ $ $u$$       uuu
u$$$$        $$u$u$u$u$u$$       u$$$$
$$$$$uu      *$$$$$$$$$*     uu$$$$$$
u$$$$$$$$$$$      *****      uuuu$$$$$$$$$
$$$$***$$$$$$$$$$uuu   uu$$$$$$$$$***$$$*
 ***      **$$$$$$$$$$$uu **$***
          uuuu **$$$$$$$$$$uuu
 u$$$uuu$$$$$$$$$uu **$$$$$$$$$$$uuu$$$
 $$$$$$$$$$****           **$$$$$$$$$$$*
  *$$$$$$*                      *$$$$$$*
    $$$*                          $$$*
`,
`
uu$:$:$:$:$:$uu
uu$$$$$$$$$$$$$$$$$uu
u$$$$$$$$$$$$$$$$$$$$$u
u$$$$$$$$$$$$$$$$$$$$$$$u
u$$$$$$$$$$$$$$$$$$$$$$$$$u
u$$$$$$$$$$$$$$$$$$$$$$$$$u
u$$$$$$*   *$$$*   *$$$$$$u
*$$$$*      u$u      $$$$*
$$$u       u$u       u$$$
$$$u      u$$$u      u$$$
*$$$$uu$$$   $$$uu$$$$*
*$$$$$$$*   *$$$$$$$*
u$$$$$$$u$$$$$$$u
u$*$*$*$*$*$*$u
           
uuu        $$u$ $ $ $ $u$$       uuu
u$$$$        $$u$u$u$u$u$$       u$$$$
$$$$$uu      *$$$$$$$$$*     uu$$$$$$
u$$$$$$$$$$$      *****      uuuu$$$$$$$$$
$$$$***$$$$$$$$$$uuu   uu$$$$$$$$$***$$$*
 ***      **$$$$$$$$$$$uu **$***
          uuuu **$$$$$$$$$$uuu
 u$$$uuu$$$$$$$$$uu **$$$$$$$$$$$uuu$$$
 $$$$$$$$$$****           **$$$$$$$$$$$*
  *$$$$$$*                      *$$$$$$*
    $$$*                          $$$*
`
  ];

  // Handle Preloader
  const preloader = document.getElementById('preloader');
  const skullEl = document.getElementById('ascii-skull');
  
  if (preloader && skullEl) {
    let frameIndex = 0;
    
    // Animation Loop
    const intervalId = setInterval(() => {
      skullEl.innerText = skullFrames[frameIndex];
      frameIndex = (frameIndex + 1) % skullFrames.length;
    }, SKULL_FRAME_RATE);

    // Fade out
    setTimeout(() => {
      clearInterval(intervalId);
      preloader.classList.add('fade-out');
      
      // Remove from DOM after transition
      setTimeout(() => {
        preloader.remove();
      }, 500);
    }, PRELOADER_DURATION);
  }

  randomizeTheme();
  
  // Initialize Cursor
  if (window.matchMedia('(pointer: fine)').matches) {
    new TacticalCursor();
  }

  // Initialize Text Scramble on specific elements
  const titles = document.querySelectorAll('.section-title, .brand, .nav-item');
  titles.forEach(el => {
    const fx = new TextScramble(el);
    // Scramble on load
    fx.setText(el.innerText);
    
    // Scramble on hover
    el.addEventListener('mouseenter', () => {
      fx.setText(el.innerText);
    });
  });

  // Initialize Popup
  new TacticalPopup();

  // Initialize Carousel
  const carouselEl = document.getElementById('dynamic-carousel');
  if (carouselEl) {
    new Carousel(carouselEl);
  }
});
