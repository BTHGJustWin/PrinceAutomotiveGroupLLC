/**
 * Prince Automotive Group LLC - Main JavaScript
 * Core functionality loaded on every page
 */

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function formatPrice(price) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(price);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

async function apiRequest(url, options = {}) {
  try {
    const headers = options.headers || {};

    // Set content-type to JSON if body is a plain object (not FormData)
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    options.headers = headers;

    const response = await fetch(url, options);

    // Handle 401 unauthorized - redirect to login
    if (response.status === 401) {
      // Don't redirect if we're already on the login page or checking auth
      const isAuthCheck = url === '/api/auth/me';
      const isLoginPage = window.location.pathname.includes('login');
      if (!isAuthCheck && !isLoginPage) {
        showToast('Please sign in to continue', 'error');
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 1500);
      }
      return null;
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return { success: true };
    }

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error || data.message || 'Something went wrong';
      showToast(errorMsg, 'error');
      return null;
    }

    return data;
  } catch (err) {
    console.error('API Request Error:', err);
    showToast('Network error. Please try again.', 'error');
    return null;
  }
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================

function showToast(message, type = 'success') {
  // Remove existing toasts
  const existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(t => t.remove());

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: 'fas fa-check-circle',
    error: 'fas fa-exclamation-circle',
    info: 'fas fa-info-circle'
  };

  toast.innerHTML = `
    <i class="${icons[type] || icons.info}"></i>
    <span>${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('toast-visible');
  });

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.classList.add('toast-hiding');
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 300);
  }, 4000);
}

// ============================================================
// MODAL FUNCTIONS
// ============================================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Close modal on clicking overlay
document.addEventListener('click', function (e) {
  if (e.target.classList.contains('modal-overlay') || e.target.classList.contains('modal')) {
    const modal = e.target.closest('.modal') || e.target;
    if (modal && modal.id) {
      closeModal(modal.id);
    }
  }
  // Close button inside modal
  if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
    const modal = e.target.closest('.modal');
    if (modal && modal.id) {
      closeModal(modal.id);
    }
  }
});

// Close modal on pressing Escape
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    const activeModal = document.querySelector('.modal.active');
    if (activeModal && activeModal.id) {
      closeModal(activeModal.id);
    }
  }
});

// ============================================================
// VEHICLE CARD GENERATOR
// ============================================================

function createVehicleCard(vehicle) {
  const images = typeof vehicle.images === 'string'
    ? JSON.parse(vehicle.images || '[]')
    : (vehicle.images || []);

  const imageHtml = images.length > 0
    ? `<img src="${images[0]}" alt="${vehicle.year} ${vehicle.make} ${vehicle.model}" loading="lazy">`
    : `<div class="vehicle-image-placeholder"><i class="fas fa-car"></i><span>${vehicle.year} ${vehicle.make} ${vehicle.model}</span></div>`;

  return `
    <div class="vehicle-card glass-card" data-id="${vehicle.id}">
      <div class="vehicle-card-image">
        ${imageHtml}
        ${vehicle.featured ? '<span class="badge badge-featured">FEATURED</span>' : ''}
        <span class="badge badge-status badge-${vehicle.status}">${vehicle.status.toUpperCase()}</span>
      </div>
      <div class="vehicle-card-content">
        <h3 class="vehicle-card-title">${vehicle.year} ${vehicle.make} ${vehicle.model}</h3>
        <p class="vehicle-card-trim">${vehicle.trim || ''}</p>
        <div class="vehicle-card-price gold-text">${formatPrice(vehicle.price)}</div>
        <div class="vehicle-card-specs">
          <span><i class="fas fa-tachometer-alt"></i> ${vehicle.mileage ? vehicle.mileage.toLocaleString() + ' mi' : 'N/A'}</span>
          <span><i class="fas fa-gas-pump"></i> ${vehicle.fuel_type || 'N/A'}</span>
          <span><i class="fas fa-cog"></i> ${vehicle.transmission || 'N/A'}</span>
          <span><i class="fas fa-palette"></i> ${vehicle.exterior_color || 'N/A'}</span>
        </div>
        <a href="/vehicle-detail.html?id=${vehicle.id}" class="btn btn-primary btn-sm">VIEW DETAILS</a>
      </div>
    </div>
  `;
}

// ============================================================
// NAVIGATION
// ============================================================

function initNavigation() {
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.getElementById('navMenu');

  // Mobile menu toggle
  if (navToggle && navMenu) {
    navToggle.addEventListener('click', function () {
      navMenu.classList.toggle('active');
      navToggle.classList.toggle('active');
    });

    // Close menu when clicking a link on mobile
    navMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        navToggle.classList.remove('active');
      });
    });
  }

  // Scroll detection for navbar
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.addEventListener('scroll', function () {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
    // Check on load
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    }
  }

  // Active link highlighting
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
      link.classList.add('active');
    } else if (href === '/' && currentPath === '/') {
      link.classList.add('active');
    }
  });
}

// ============================================================
// AUTH STATUS CHECK
// ============================================================

async function checkAuthStatus() {
  const navAuth = document.getElementById('navAuth');
  if (!navAuth) return;

  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const user = await res.json();
      window.currentUser = user;

      const adminLink = user.role === 'admin'
        ? `<a href="/admin/" class="dropdown-item"><i class="fas fa-shield-alt"></i> Admin Panel</a>`
        : '';

      navAuth.innerHTML = `
        <div class="nav-user-dropdown">
          <button class="nav-user-btn" id="userDropdownBtn">
            <i class="fas fa-user-circle"></i>
            <span>${user.first_name || 'Account'}</span>
            <i class="fas fa-chevron-down"></i>
          </button>
          <div class="dropdown-menu" id="userDropdown">
            <a href="/dashboard.html" class="dropdown-item"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
            ${adminLink}
            <div class="dropdown-divider"></div>
            <a href="#" class="dropdown-item" onclick="logout(); return false;"><i class="fas fa-sign-out-alt"></i> Sign Out</a>
          </div>
        </div>
      `;

      // Toggle dropdown
      const dropdownBtn = document.getElementById('userDropdownBtn');
      const dropdown = document.getElementById('userDropdown');
      if (dropdownBtn && dropdown) {
        dropdownBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          dropdown.classList.toggle('active');
        });
        document.addEventListener('click', function () {
          dropdown.classList.remove('active');
        });
      }
    } else {
      window.currentUser = null;
      navAuth.innerHTML = `<a href="/login.html" class="btn btn-primary btn-sm nav-signin-btn">Sign In</a>`;
    }
  } catch (err) {
    window.currentUser = null;
    if (navAuth) {
      navAuth.innerHTML = `<a href="/login.html" class="btn btn-primary btn-sm nav-signin-btn">Sign In</a>`;
    }
  }
}

// ============================================================
// SCROLL ANIMATIONS
// ============================================================

function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.animate-on-scroll');
  if (animatedElements.length === 0) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  animatedElements.forEach(el => observer.observe(el));
}

// ============================================================
// SMOOTH SCROLL FOR ANCHOR LINKS
// ============================================================

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#' || targetId === '') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });
}

// ============================================================
// BACK TO TOP BUTTON
// ============================================================

function initBackToTop() {
  // Create back to top button if it doesn't exist
  let backToTop = document.getElementById('backToTop');
  if (!backToTop) {
    backToTop = document.createElement('button');
    backToTop.id = 'backToTop';
    backToTop.className = 'back-to-top';
    backToTop.innerHTML = '<i class="fas fa-chevron-up"></i>';
    backToTop.setAttribute('aria-label', 'Back to top');
    document.body.appendChild(backToTop);
  }

  window.addEventListener('scroll', function () {
    if (window.scrollY > 500) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  });

  backToTop.addEventListener('click', function () {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

// ============================================================
// FEATURED VEHICLES ON HOME PAGE
// ============================================================

async function loadFeaturedVehicles() {
  const container = document.getElementById('featuredVehicles');
  if (!container) return;

  container.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Loading featured vehicles...</p>
    </div>
  `;

  const data = await apiRequest('/api/vehicles/featured');
  if (data && Array.isArray(data) && data.length > 0) {
    container.innerHTML = data.map(v => createVehicleCard(v)).join('');
  } else if (data && data.vehicles && data.vehicles.length > 0) {
    container.innerHTML = data.vehicles.map(v => createVehicleCard(v)).join('');
  } else {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-car"></i>
        <p>Featured vehicles coming soon.</p>
      </div>
    `;
  }
}

// ============================================================
// FINANCING CALCULATOR
// ============================================================

function initFinancingCalculator() {
  const calcBtn = document.getElementById('calcBtn');
  if (!calcBtn) return;

  calcBtn.addEventListener('click', function () {
    const price = parseFloat(document.getElementById('calcPrice').value) || 0;
    const down = parseFloat(document.getElementById('calcDown').value) || 0;
    const rate = parseFloat(document.getElementById('calcRate').value) || 0;
    const term = parseInt(document.getElementById('calcTerm').value) || 0;

    if (price <= 0 || term <= 0) {
      showToast('Please enter valid values', 'error');
      return;
    }

    const principal = price - down;
    if (principal <= 0) {
      showToast('Down payment cannot exceed the vehicle price', 'error');
      return;
    }

    const resultDiv = document.getElementById('calcResult');

    if (rate === 0) {
      // 0% interest
      const monthly = principal / term;
      resultDiv.innerHTML = `
        <div class="calc-result-display">
          <span class="calc-label">Estimated Monthly Payment</span>
          <span class="calc-amount gold-text">${formatPrice(monthly)}</span>
          <span class="calc-detail">Loan Amount: ${formatPrice(principal)} | Term: ${term} months | APR: 0%</span>
          <span class="calc-detail">Total Cost: ${formatPrice(principal)}</span>
        </div>
      `;
    } else {
      // Standard amortization formula: M = P[r(1+r)^n]/[(1+r)^n-1]
      const monthlyRate = rate / 100 / 12;
      const n = term;
      const numerator = monthlyRate * Math.pow(1 + monthlyRate, n);
      const denominator = Math.pow(1 + monthlyRate, n) - 1;
      const monthly = principal * (numerator / denominator);
      const totalCost = monthly * n;
      const totalInterest = totalCost - principal;

      resultDiv.innerHTML = `
        <div class="calc-result-display">
          <span class="calc-label">Estimated Monthly Payment</span>
          <span class="calc-amount gold-text">${formatPrice(monthly)}</span>
          <span class="calc-detail">Loan Amount: ${formatPrice(principal)} | Term: ${term} months | APR: ${rate}%</span>
          <span class="calc-detail">Total Interest: ${formatPrice(totalInterest)} | Total Cost: ${formatPrice(totalCost)}</span>
        </div>
      `;
    }
  });
}

// ============================================================
// CONTACT FORM HANDLER
// ============================================================

function initContactForm() {
  const contactForm = document.getElementById('contactForm');
  if (!contactForm) return;

  contactForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = contactForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    const formData = new FormData(contactForm);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      inquiry_type: formData.get('inquiry_type') || 'general',
      message: formData.get('message'),
    };

    // Include vehicle_id if present
    const vehicleId = formData.get('vehicle_id');
    if (vehicleId) {
      data.vehicle_id = vehicleId;
    }

    const res = await apiRequest('/api/admin/inquiries', {
      method: 'POST',
      body: data
    });

    submitBtn.disabled = false;
    submitBtn.textContent = originalText;

    if (res) {
      showToast('Message sent successfully! We\'ll get back to you shortly.', 'success');
      contactForm.reset();
    }
  });
}

// ============================================================
// GALLERY IMAGE SWITCHER (used by vehicle detail page)
// ============================================================

function setMainImage(src, thumbEl) {
  const mainImage = document.getElementById('mainImage');
  if (mainImage) {
    mainImage.src = src;
    mainImage.alt = 'Vehicle Image';
  }
  // Update active thumb
  document.querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
  if (thumbEl) {
    thumbEl.classList.add('active');
  }
}

// ============================================================
// LOGOUT FUNCTION (globally available)
// ============================================================

async function logout() {
  await apiRequest('/api/auth/logout', { method: 'POST' });
  window.currentUser = null;
  showToast('You have been signed out', 'info');
  setTimeout(() => {
    window.location.href = '/';
  }, 1000);
}

// ============================================================
// INITIALIZE ON DOM CONTENT LOADED
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
  // Core initialization
  initNavigation();
  checkAuthStatus();
  initScrollAnimations();
  initSmoothScroll();
  initBackToTop();

  // Page-specific initialization
  loadFeaturedVehicles();
  initFinancingCalculator();
  initContactForm();
});
