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

  // Handle sort dropdown (inside filter form)
  const sortSelect = document.getElementById('filterSort');
  if (sortSelect) {
    sortSelect.addEventListener('change', function () {
      currentSort = this.value;
      collectFiltersAndFetch();
    });
  }

  // Handle search button and input
  const searchBtn = document.getElementById('searchBtn');
  const searchInput = document.getElementById('vehicleSearch');
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', function () {
      if (searchInput.value.trim()) {
        searchVehicles(searchInput.value.trim());
      } else {
        fetchAndRenderVehicles();
      }
    });
    searchInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (searchInput.value.trim()) {
          searchVehicles(searchInput.value.trim());
        } else {
          fetchAndRenderVehicles();
        }
      }
    });
  }

  // Handle filter sidebar toggle (mobile)
  const filterToggle = document.getElementById('filterToggle');
  const filterSidebar = document.getElementById('filterSidebar');
  const filterClose = document.getElementById('filterClose');
  if (filterToggle && filterSidebar) {
    filterToggle.addEventListener('click', function () {
      filterSidebar.classList.toggle('active');
    });
  }
  if (filterClose && filterSidebar) {
    filterClose.addEventListener('click', function () {
      filterSidebar.classList.remove('active');
    });
  }

  // Handle reset search button
  const resetSearch = document.getElementById('resetSearch');
  if (resetSearch) {
    resetSearch.addEventListener('click', function () {
      if (searchInput) searchInput.value = '';
      const filterForm = document.getElementById('filterForm');
      if (filterForm) filterForm.reset();
      currentFilters = {};
      currentSort = '';
      fetchAndRenderVehicles();
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

    // Map form field names to API parameter names
    const fieldMap = {
      make: 'make',
      bodyType: 'body_type',
      priceMin: 'min_price',
      priceMax: 'max_price',
      yearMin: 'min_year',
      yearMax: 'max_year',
      sort: 'sort'
    };

    for (const [key, value] of formData.entries()) {
      if (value && value.trim() && key !== 'sort') {
        const apiKey = fieldMap[key] || key;
        currentFilters[apiKey] = value.trim();
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

  const emptyState = document.getElementById('vehicleEmpty');

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
  const resultCount = document.getElementById('resultsCount');
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

  const emptyState = document.getElementById('vehicleEmpty');

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
  const resultCount = document.getElementById('resultsCount');
  if (resultCount) {
    resultCount.textContent = `${vehicles.length} result${vehicles.length !== 1 ? 's' : ''} for "${query}"`;
  }
}

// ============================================================
// VEHICLE DETAIL PAGE
// ============================================================

async function initVehicleDetailPage() {
  const vehicleDetail = document.getElementById('vehicleDetail');
  const loadingEl = document.getElementById('vehicleDetailLoading');
  const errorEl = document.getElementById('vehicleError');
  if (!vehicleDetail) return;

  const vehicleId = getQueryParam('id');
  if (!vehicleId) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'block';
    return;
  }

  const vehicle = await apiRequest(`/api/vehicles/${vehicleId}`);
  if (!vehicle) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'block';
    return;
  }

  // Handle nested data structure
  const v = vehicle.vehicle || vehicle;

  // Hide loading, show detail section
  if (loadingEl) loadingEl.style.display = 'none';
  vehicleDetail.style.display = 'block';

  renderVehicleDetail(v);
  initDetailTabs();
  initDetailButtons();
}

function initDetailButtons() {
  const btnInquire = document.getElementById('btnInquire');
  if (btnInquire) {
    btnInquire.addEventListener('click', function () {
      const select = document.getElementById('inquiryType');
      if (select) select.value = 'general';
      openModal('inquiryModal');
    });
  }

  const btnTestDrive = document.getElementById('btnTestDrive');
  if (btnTestDrive) {
    btnTestDrive.addEventListener('click', function () {
      const select = document.getElementById('inquiryType');
      if (select) select.value = 'testdrive';
      openModal('inquiryModal');
    });
  }

  const btnFinancing = document.getElementById('btnFinancing');
  if (btnFinancing) {
    btnFinancing.addEventListener('click', function () {
      const vehicleDetail = document.getElementById('vehicleDetail');
      const vehicleId = vehicleDetail ? vehicleDetail.dataset.vehicleId : '';
      window.location.href = `/financing.html?vehicle=${vehicleId}`;
    });
  }

  const btnRental = document.getElementById('btnRental');
  if (btnRental) {
    btnRental.addEventListener('click', function () {
      openModal('rentalModal');
    });
  }
}

function renderVehicleDetail(vehicle) {
  const images = typeof vehicle.images === 'string'
    ? JSON.parse(vehicle.images || '[]')
    : (vehicle.images || []);

  const features = typeof vehicle.features === 'string'
    ? JSON.parse(vehicle.features || '[]')
    : (vehicle.features || []);

  // Set page title
  document.title = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''} | Prince Automotive Group LLC`;

  // Update breadcrumb
  const breadcrumb = document.getElementById('breadcrumbVehicle');
  if (breadcrumb) {
    breadcrumb.textContent = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  }

  // Main gallery image
  const galleryMainImg = document.getElementById('galleryMain');
  if (galleryMainImg && images.length > 0) {
    galleryMainImg.src = images[0];
    galleryMainImg.alt = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  }

  // Gallery thumbnails
  const thumbContainer = document.getElementById('galleryThumbnails');
  if (thumbContainer && images.length > 0) {
    thumbContainer.innerHTML = images.map((img, i) =>
      `<img src="${img}" alt="View ${i + 1}" class="gallery-thumb ${i === 0 ? 'active' : ''}" onclick="setMainImage('${img}', this)">`
    ).join('');
  }

  // Status badge
  const statusBadge = document.getElementById('vehicleStatusBadge');
  if (statusBadge) {
    statusBadge.textContent = vehicle.status.toUpperCase();
    statusBadge.className = `vehicle-status-badge badge-${vehicle.status}`;
  }

  // Vehicle title and price
  const titleEl = document.getElementById('vehicleTitle');
  if (titleEl) titleEl.textContent = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''}`;

  const priceEl = document.getElementById('vehiclePrice');
  if (priceEl) priceEl.textContent = formatPrice(vehicle.price);

  // Meta items (VIN, Mileage, Exterior, Interior)
  const vinEl = document.getElementById('vehicleVin');
  if (vinEl) vinEl.textContent = vehicle.vin || 'N/A';

  const mileageEl = document.getElementById('vehicleMileage');
  if (mileageEl) mileageEl.textContent = vehicle.mileage ? vehicle.mileage.toLocaleString() + ' mi' : 'N/A';

  const exteriorEl = document.getElementById('vehicleExterior');
  if (exteriorEl) exteriorEl.textContent = vehicle.exterior_color || 'N/A';

  const interiorEl = document.getElementById('vehicleInterior');
  if (interiorEl) interiorEl.textContent = vehicle.interior_color || 'N/A';

  // Description
  const descEl = document.getElementById('vehicleDescription');
  if (descEl) {
    descEl.textContent = vehicle.description || 'Contact us for more details about this exceptional vehicle.';
  }

  // Specs grid (populate using data-spec attributes)
  const specEls = document.querySelectorAll('[data-spec]');
  const specMap = {
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    mileage: vehicle.mileage ? vehicle.mileage.toLocaleString() + ' miles' : 'N/A',
    exteriorColor: vehicle.exterior_color || 'N/A',
    interiorColor: vehicle.interior_color || 'N/A',
    engine: vehicle.engine || 'N/A',
    transmission: vehicle.transmission || 'N/A',
    drivetrain: vehicle.drivetrain || 'N/A',
    fuelType: vehicle.fuel_type || 'N/A',
    bodyType: vehicle.body_type || 'N/A'
  };
  specEls.forEach(el => {
    const key = el.dataset.spec;
    if (specMap[key] !== undefined) el.textContent = specMap[key];
  });

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

  // Pricing tab
  const pricingPurchase = document.getElementById('pricingPurchase');
  if (pricingPurchase) pricingPurchase.textContent = formatPrice(vehicle.price);

  const pricingLease = document.getElementById('pricingLease');
  if (pricingLease) pricingLease.textContent = vehicle.lease_monthly ? formatPrice(vehicle.lease_monthly) + '/mo' : 'Contact Us';

  const pricingDaily = document.getElementById('pricingDaily');
  if (pricingDaily) pricingDaily.textContent = vehicle.rental_daily ? formatPrice(vehicle.rental_daily) + '/day' : 'Contact Us';

  const pricingWeekly = document.getElementById('pricingWeekly');
  if (pricingWeekly) pricingWeekly.textContent = vehicle.rental_weekly ? formatPrice(vehicle.rental_weekly) + '/week' : 'Contact Us';

  const pricingMonthly = document.getElementById('pricingMonthly');
  if (pricingMonthly) pricingMonthly.textContent = vehicle.rental_monthly ? formatPrice(vehicle.rental_monthly) + '/month' : 'Contact Us';

  // Show rental button if rental pricing exists
  const rentalBtn = document.getElementById('btnRental');
  if (rentalBtn && (vehicle.rental_daily || vehicle.rental_weekly || vehicle.rental_monthly)) {
    rentalBtn.style.display = 'block';
  }

  // Store vehicle ID for inquiry/booking forms
  const vehicleDetail = document.getElementById('vehicleDetail');
  if (vehicleDetail) vehicleDetail.dataset.vehicleId = vehicle.id;

  const inquiryVehicleId = document.getElementById('inquiryVehicleId');
  if (inquiryVehicleId) inquiryVehicleId.value = vehicle.id;

  const rentalVehicleId = document.getElementById('rentalVehicleId');
  if (rentalVehicleId) rentalVehicleId.value = vehicle.id;
}

// ============================================================
// DETAIL PAGE TABS (Overview, Features, Pricing)
// ============================================================

function initDetailTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn[data-tab]');
  if (tabBtns.length === 0) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      const targetTab = this.dataset.tab;
      if (!targetTab) return;

      // Remove active from all tabs and tab buttons
      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.tab-content').forEach(panel => {
        panel.classList.remove('active');
        panel.style.display = 'none';
      });

      // Activate the clicked tab — HTML IDs are "tab-overview", "tab-features", "tab-pricing"
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');
      const targetPanel = document.getElementById('tab-' + targetTab);
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
