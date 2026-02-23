/**
 * Prince Automotive Group LLC - Vehicles JavaScript
 * Handles inventory browsing, vehicle detail, and rental fleet pages
 */

document.addEventListener('DOMContentLoaded', function () {
  initInventoryPage();
  initVehicleDetailPage();
  initRentalFleet();
});

// ============================================================
// INVENTORY PAGE
// ============================================================

let currentFilters = {};
let currentSort = '';

async function initInventoryPage() {
  const vehicleGrid = document.getElementById('vehicleGrid');
  if (!vehicleGrid) return;

  // Load makes for the filter dropdown
  await loadMakes();

  // Check for URL query params to pre-fill filters
  const urlMake = getQueryParam('make');
  const urlBodyType = getQueryParam('body_type');
  const urlStatus = getQueryParam('status');

  if (urlMake) {
    const makeSelect = document.getElementById('filterMake');
    if (makeSelect) makeSelect.value = urlMake;
  }
  if (urlBodyType) {
    const bodySelect = document.getElementById('filterBodyType');
    if (bodySelect) bodySelect.value = urlBodyType;
  }
  if (urlStatus) {
    const statusSelect = document.getElementById('filterStatus');
    if (statusSelect) statusSelect.value = urlStatus;
  }

  // Load vehicles with any initial filters
  collectFiltersAndFetch();

  // Handle filter form submit
  const filterForm = document.getElementById('filterForm');
  if (filterForm) {
    filterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      collectFiltersAndFetch();
    });
  }

  // Handle clear filters button
  const clearBtn = document.getElementById('clearFilters');
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      const filterForm = document.getElementById('filterForm');
      if (filterForm) filterForm.reset();
      currentFilters = {};
      currentSort = '';
      fetchAndRenderVehicles();
    });
  }

  // Handle sort dropdown
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      currentSort = this.value;
      collectFiltersAndFetch();
    });
  }

  // Handle search form
  const searchForm = document.getElementById('searchForm');
  if (searchForm) {
    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const searchInput = document.getElementById('searchInput');
      if (searchInput && searchInput.value.trim()) {
        searchVehicles(searchInput.value.trim());
      }
    });
  }
}

async function loadMakes() {
  const makeSelect = document.getElementById('filterMake');
  if (!makeSelect) return;

  const data = await apiRequest('/api/vehicles/makes');
  if (data && Array.isArray(data)) {
    data.forEach(make => {
      const option = document.createElement('option');
      option.value = make;
      option.textContent = make;
      makeSelect.appendChild(option);
    });
  } else if (data && data.makes) {
    data.makes.forEach(make => {
      const option = document.createElement('option');
      option.value = make;
      option.textContent = make;
      makeSelect.appendChild(option);
    });
  }
}

function collectFiltersAndFetch() {
  const filterForm = document.getElementById('filterForm');
  if (filterForm) {
    const formData = new FormData(filterForm);
    currentFilters = {};

    for (const [key, value] of formData.entries()) {
      if (value && value.trim()) {
        currentFilters[key] = value.trim();
      }
    }
  }

  fetchAndRenderVehicles();
}

async function fetchAndRenderVehicles() {
  const vehicleGrid = document.getElementById('vehicleGrid');
  if (!vehicleGrid) return;

  // Build query string
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(currentFilters)) {
    if (value) params.set(key, value);
  }
  if (currentSort) {
    // Handle sort values like "price_asc", "price_desc", "year_desc", "mileage_asc"
    const sortParts = currentSort.split('_');
    if (sortParts.length === 2) {
      params.set('sort', sortParts[0]);
      params.set('order', sortParts[1]);
    } else {
      params.set('sort', currentSort);
    }
  }

  const queryString = params.toString();
  const url = `/api/vehicles${queryString ? '?' + queryString : ''}`;

  // Show loading state
  vehicleGrid.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Loading vehicles...</p>
    </div>
  `;

  const data = await apiRequest(url);
  const vehicles = Array.isArray(data) ? data : (data && data.vehicles ? data.vehicles : []);

  const emptyState = document.getElementById('emptyState');

  if (vehicles.length === 0) {
    vehicleGrid.innerHTML = '';
    if (emptyState) {
      emptyState.style.display = 'block';
    } else {
      vehicleGrid.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-search"></i>
          <h3>No Vehicles Found</h3>
          <p>Try adjusting your filters or check back later for new arrivals.</p>
        </div>
      `;
    }
  } else {
    if (emptyState) emptyState.style.display = 'none';
    vehicleGrid.innerHTML = vehicles.map(v => createVehicleCard(v)).join('');
  }

  // Update result count
  const resultCount = document.getElementById('resultCount');
  if (resultCount) {
    resultCount.textContent = `${vehicles.length} vehicle${vehicles.length !== 1 ? 's' : ''} found`;
  }
}

async function searchVehicles(query) {
  const vehicleGrid = document.getElementById('vehicleGrid');
  if (!vehicleGrid) return;

  vehicleGrid.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Searching...</p>
    </div>
  `;

  const data = await apiRequest(`/api/vehicles/search?q=${encodeURIComponent(query)}`);
  const vehicles = Array.isArray(data) ? data : (data && data.vehicles ? data.vehicles : []);

  const emptyState = document.getElementById('emptyState');

  if (vehicles.length === 0) {
    vehicleGrid.innerHTML = '';
    if (emptyState) {
      emptyState.style.display = 'block';
    } else {
      vehicleGrid.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-search"></i>
          <h3>No Results for "${query}"</h3>
          <p>Try different keywords or browse our full inventory.</p>
        </div>
      `;
    }
  } else {
    if (emptyState) emptyState.style.display = 'none';
    vehicleGrid.innerHTML = vehicles.map(v => createVehicleCard(v)).join('');
  }

  // Update result count
  const resultCount = document.getElementById('resultCount');
  if (resultCount) {
    resultCount.textContent = `${vehicles.length} result${vehicles.length !== 1 ? 's' : ''} for "${query}"`;
  }
}

// ============================================================
// VEHICLE DETAIL PAGE
// ============================================================

async function initVehicleDetailPage() {
  const vehicleDetail = document.getElementById('vehicleDetail');
  if (!vehicleDetail) return;

  const vehicleId = getQueryParam('id');
  if (!vehicleId) {
    vehicleDetail.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Vehicle Not Found</h3>
        <p>No vehicle ID was specified.</p>
        <a href="/inventory.html" class="btn btn-primary">Browse Inventory</a>
      </div>
    `;
    return;
  }

  // Show loading
  vehicleDetail.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Loading vehicle details...</p>
    </div>
  `;

  const vehicle = await apiRequest(`/api/vehicles/${vehicleId}`);
  if (!vehicle) {
    vehicleDetail.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Vehicle Not Found</h3>
        <p>This vehicle may no longer be available.</p>
        <a href="/inventory.html" class="btn btn-primary">Browse Inventory</a>
      </div>
    `;
    return;
  }

  // Handle nested data structure
  const v = vehicle.vehicle || vehicle;
  renderVehicleDetail(v);
  initDetailTabs();
}

function renderVehicleDetail(vehicle) {
  const images = typeof vehicle.images === 'string'
    ? JSON.parse(vehicle.images || '[]')
    : (vehicle.images || []);

  const features = typeof vehicle.features === 'string'
    ? JSON.parse(vehicle.features || '[]')
    : (vehicle.features || []);

  // Set page title
  document.title = `${vehicle.year} ${vehicle.make} ${vehicle.model} | Prince Automotive Group LLC`;

  // Update breadcrumb
  const breadcrumb = document.getElementById('vehicleBreadcrumb');
  if (breadcrumb) {
    breadcrumb.textContent = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  }

  // Main image gallery
  const gallery = document.getElementById('vehicleGallery');
  if (gallery) {
    const galleryHtml = images.length > 0
      ? `<div class="gallery-main">
           <img src="${images[0]}" alt="${vehicle.year} ${vehicle.make} ${vehicle.model}" id="mainImage">
         </div>
         <div class="gallery-thumbs">
           ${images.map((img, i) =>
             `<img src="${img}" alt="View ${i + 1}" class="gallery-thumb ${i === 0 ? 'active' : ''}" onclick="setMainImage('${img}', this)">`
           ).join('')}
         </div>`
      : `<div class="gallery-main">
           <div class="vehicle-image-placeholder large">
             <i class="fas fa-car"></i>
             <span>${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''}</span>
           </div>
         </div>`;
    gallery.innerHTML = galleryHtml;
  }

  // Vehicle title, price, status
  const titleEl = document.getElementById('vehicleTitle');
  if (titleEl) titleEl.textContent = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  const trimEl = document.getElementById('vehicleTrim');
  if (trimEl) trimEl.textContent = vehicle.trim || '';

  const priceEl = document.getElementById('vehiclePrice');
  if (priceEl) priceEl.textContent = formatPrice(vehicle.price);

  const statusEl = document.getElementById('vehicleStatus');
  if (statusEl) {
    statusEl.textContent = vehicle.status.toUpperCase();
    statusEl.className = `badge badge-status badge-${vehicle.status}`;
  }

  // Specs grid
  const specsEl = document.getElementById('vehicleSpecs');
  if (specsEl) {
    const specs = [
      { label: 'Year', value: vehicle.year },
      { label: 'Make', value: vehicle.make },
      { label: 'Model', value: vehicle.model },
      { label: 'Mileage', value: vehicle.mileage ? vehicle.mileage.toLocaleString() + ' miles' : 'N/A' },
      { label: 'Exterior', value: vehicle.exterior_color || 'N/A' },
      { label: 'Interior', value: vehicle.interior_color || 'N/A' },
      { label: 'Engine', value: vehicle.engine || 'N/A' },
      { label: 'Transmission', value: vehicle.transmission || 'N/A' },
      { label: 'Drivetrain', value: vehicle.drivetrain || 'N/A' },
      { label: 'Fuel Type', value: vehicle.fuel_type || 'N/A' },
      { label: 'Body Type', value: vehicle.body_type || 'N/A' },
      { label: 'VIN', value: vehicle.vin || 'N/A' }
    ];
    specsEl.innerHTML = specs.map(s =>
      `<div class="spec-item"><span class="spec-label">${s.label}</span><span class="spec-value">${s.value}</span></div>`
    ).join('');
  }

  // Features list
  const featuresEl = document.getElementById('vehicleFeatures');
  if (featuresEl) {
    if (features.length > 0) {
      featuresEl.innerHTML = features.map(f =>
        `<li><i class="fas fa-check gold-text"></i> ${f}</li>`
      ).join('');
    } else {
      featuresEl.innerHTML = '<li>Contact us for a full list of features.</li>';
    }
  }

  // Description
  const descEl = document.getElementById('vehicleDescription');
  if (descEl) {
    descEl.textContent = vehicle.description || 'Contact us for more details about this exceptional vehicle.';
  }

  // Pricing table
  const pricingEl = document.getElementById('pricingTable');
  if (pricingEl) {
    pricingEl.innerHTML = `
      <div class="pricing-card">
        <h4>PURCHASE</h4>
        <div class="pricing-amount gold-text">${formatPrice(vehicle.price)}</div>
        <p>Cash or Financing Available</p>
      </div>
      <div class="pricing-card">
        <h4>LEASE</h4>
        <div class="pricing-amount gold-text">${vehicle.lease_monthly ? formatPrice(vehicle.lease_monthly) + '/mo' : 'Contact Us'}</div>
        <p>Flexible Terms Available</p>
      </div>
      <div class="pricing-card">
        <h4>RENT</h4>
        <div class="pricing-amount gold-text">${vehicle.rental_daily ? formatPrice(vehicle.rental_daily) + '/day' : 'Contact Us'}</div>
        <p>${vehicle.rental_weekly ? formatPrice(vehicle.rental_weekly) + '/week' : ''}${vehicle.rental_weekly && vehicle.rental_monthly ? ' &bull; ' : ''}${vehicle.rental_monthly ? formatPrice(vehicle.rental_monthly) + '/month' : ''}</p>
      </div>
    `;
  }

  // Store vehicle ID for booking forms
  const detailEl = document.getElementById('vehicleDetail');
  if (detailEl) {
    detailEl.dataset.vehicleId = vehicle.id;
  }
}

// ============================================================
// DETAIL PAGE TABS (Overview, Features, Pricing)
// ============================================================

function initDetailTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn, [data-tab]');
  if (tabBtns.length === 0) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      const targetTab = this.dataset.tab;
      if (!targetTab) return;

      // Remove active from all tabs and tab buttons
      tabBtns.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content, .tab-panel').forEach(panel => {
        panel.classList.remove('active');
        panel.style.display = 'none';
      });

      // Activate the clicked tab
      this.classList.add('active');
      const targetPanel = document.getElementById(targetTab);
      if (targetPanel) {
        targetPanel.classList.add('active');
        targetPanel.style.display = 'block';
      }
    });
  });
}

// ============================================================
// RENTAL FLEET PAGE
// ============================================================

async function initRentalFleet() {
  const rentalFleet = document.getElementById('rentalFleet');
  if (!rentalFleet) return;

  rentalFleet.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Loading rental fleet...</p>
    </div>
  `;

  const data = await apiRequest('/api/vehicles?status=available');
  const vehicles = Array.isArray(data) ? data : (data && data.vehicles ? data.vehicles : []);

  if (vehicles.length === 0) {
    rentalFleet.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-car"></i>
        <h3>No Rental Vehicles Available</h3>
        <p>Please check back soon or contact us for availability.</p>
      </div>
    `;
    return;
  }

  rentalFleet.innerHTML = vehicles.map(vehicle => {
    const images = typeof vehicle.images === 'string'
      ? JSON.parse(vehicle.images || '[]')
      : (vehicle.images || []);

    const imageHtml = images.length > 0
      ? `<img src="${images[0]}" alt="${vehicle.year} ${vehicle.make} ${vehicle.model}" loading="lazy">`
      : `<div class="vehicle-image-placeholder"><i class="fas fa-car"></i><span>${vehicle.year} ${vehicle.make} ${vehicle.model}</span></div>`;

    return `
      <div class="vehicle-card glass-card rental-card" data-id="${vehicle.id}">
        <div class="vehicle-card-image">
          ${imageHtml}
          <span class="badge badge-status badge-available">AVAILABLE</span>
        </div>
        <div class="vehicle-card-content">
          <h3 class="vehicle-card-title">${vehicle.year} ${vehicle.make} ${vehicle.model}</h3>
          <p class="vehicle-card-trim">${vehicle.trim || ''}</p>
          <div class="rental-pricing">
            ${vehicle.rental_daily ? `<div class="rental-rate"><span class="rate-amount gold-text">${formatPrice(vehicle.rental_daily)}</span><span class="rate-period">/day</span></div>` : ''}
            ${vehicle.rental_weekly ? `<div class="rental-rate"><span class="rate-amount gold-text">${formatPrice(vehicle.rental_weekly)}</span><span class="rate-period">/week</span></div>` : ''}
            ${vehicle.rental_monthly ? `<div class="rental-rate"><span class="rate-amount gold-text">${formatPrice(vehicle.rental_monthly)}</span><span class="rate-period">/month</span></div>` : ''}
          </div>
          <div class="vehicle-card-specs">
            <span><i class="fas fa-cog"></i> ${vehicle.transmission || 'N/A'}</span>
            <span><i class="fas fa-gas-pump"></i> ${vehicle.fuel_type || 'N/A'}</span>
          </div>
          <a href="/vehicle-detail.html?id=${vehicle.id}" class="btn btn-primary btn-sm">VIEW & RESERVE</a>
        </div>
      </div>
    `;
  }).join('');
}
