// Landing Page JavaScript

// Mobile Navigation Toggle
const mobileToggle = document.getElementById('mobileToggle');
const navLinks = document.querySelector('.nav-links');

if (mobileToggle) {
  mobileToggle.addEventListener('click', () => {
    navLinks.classList.toggle('mobile-open');
  });
}

// Smooth Scroll for Anchor Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      const navHeight = document.querySelector('.landing-nav').offsetHeight;
      const targetPosition = target.offsetTop - navHeight - 20;
      window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
      });
    }
  });
});

// Navbar Scroll Effect
let lastScroll = 0;
const nav = document.querySelector('.landing-nav');

window.addEventListener('scroll', () => {
  const currentScroll = window.pageYOffset;
  
  if (currentScroll > 100) {
    nav.style.background = 'rgba(10, 10, 11, 0.95)';
    if (document.documentElement.getAttribute('data-theme') === 'light') {
      nav.style.background = 'rgba(248, 250, 252, 0.95)';
    }
  } else {
    nav.style.background = 'rgba(10, 10, 11, 0.8)';
    if (document.documentElement.getAttribute('data-theme') === 'light') {
      nav.style.background = 'rgba(248, 250, 252, 0.8)';
    }
  }
  
  lastScroll = currentScroll;
});

// Intersection Observer for Animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, observerOptions);

// Animate elements on scroll
document.querySelectorAll('.feature-card, .analytics-card, .step-item, .key-feature-item').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
  observer.observe(el);
});

// Theme Toggle (if needed)
function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

// Load saved theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme) {
  document.documentElement.setAttribute('data-theme', savedTheme);
}

// Chart Animation
const chartBars = document.querySelectorAll('.chart-bar');
chartBars.forEach((bar, index) => {
  bar.style.animationDelay = `${index * 0.1}s`;
});

// Add parallax effect to hero visual
window.addEventListener('scroll', () => {
  const scrolled = window.pageYOffset;
  const heroVisual = document.querySelector('.hero-visual');
  if (heroVisual && scrolled < window.innerHeight) {
    heroVisual.style.transform = `translateY(${scrolled * 0.3}px)`;
  }
});








