/**
 * Prince Automotive Group LLC - Admin Panel JavaScript
 * Handles all admin dashboard functionality
 */

document.addEventListener('DOMContentLoaded', function () {
  initAdminAuth();
});

// ============================================================
// ADMIN AUTH CHECK
// ============================================================

async function initAdminAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) {
      showToast('Please sign in to access the admin panel', 'error');
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 1500);
      return;
    }

    const user = await res.json();
    const userData = user.user || user;

    if (userData.role !== 'admin') {
      showToast('Access denied. Admin privileges required.', 'error');
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
      return;
    }

    window.adminUser = userData;

    // Update admin name display
    const adminName = document.getElementById('adminName');
    if (adminName) {
      adminName.textContent = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Admin';
    }

    // Initialize admin page sections
    initAdminDashboard();
    initAdminVehicles();
    initAdminVehicleForm();
    initAdminBookings();
    initAdminCustomers();
    initAdminInquiries();
    initAdminNav();
  } catch (err) {
    console.error('Admin auth error:', err);
    showToast('Authentication error. Please try again.', 'error');
    setTimeout(() => {
      window.location.href = '/login.html';
    }, 1500);
  }
}

// ============================================================
// ADMIN NAVIGATION (Sidebar/Tab Switching)
// ============================================================

function initAdminNav() {
  const navLinks = document.querySelectorAll('.admin-nav-link, [data-admin-section]');
  navLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();

      const section = this.dataset.adminSection || this.getAttribute('href')?.replace('#', '');
      if (!section) return;

      // Update active nav
      navLinks.forEach(l => l.classList.remove('active'));
      this.classList.add('active');

      // Show target section, hide others
      document.querySelectorAll('.admin-section').forEach(s => {
        s.style.display = 'none';
        s.classList.remove('active');
      });

      const targetSection = document.getElementById(section);
      if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
      }
    });
  });
}

// ============================================================
// ADMIN DASHBOARD STATS
// ============================================================

async function initAdminDashboard() {
  // Load stats
  const statVehicles = document.getElementById('statVehicles');
  if (!statVehicles) return; // Not on dashboard page

  try {
    const data = await apiRequest('/api/admin/stats');
    if (data) {
      const stats = data.stats || data;
      if (document.getElementById('statVehicles')) document.getElementById('statVehicles').textContent = stats.totalVehicles ?? 0;
      if (document.getElementById('statBookings')) document.getElementById('statBookings').textContent = stats.activeBookings ?? 0;
      if (document.getElementById('statCustomers')) document.getElementById('statCustomers').textContent = stats.registeredCustomers ?? 0;
      if (document.getElementById('statValue')) document.getElementById('statValue').textContent = formatPrice(stats.revenuePotential ?? 0);
    }
  } catch (err) {
    console.error('Error loading stats:', err);
  }

  // Load recent bookings for dashboard
  try {
    const bookingData = await apiRequest('/api/admin/bookings');
    const bookings = Array.isArray(bookingData) ? bookingData : (bookingData && bookingData.bookings ? bookingData.bookings : []);
    const recentBody = document.getElementById('recentBookingsBody');
    if (recentBody) {
      if (bookings.length === 0) {
        recentBody.innerHTML = '<tr><td colspan="6" class="text-center">No bookings yet.</td></tr>';
      } else {
        recentBody.innerHTML = bookings.slice(0, 5).map(b => `
          <tr>
            <td>${b.booking_ref || 'N/A'}</td>
            <td>${b.first_name || ''} ${b.last_name || ''}</td>
            <td>${b.vehicle_year || ''} ${b.vehicle_make || ''} ${b.vehicle_model || ''}</td>
            <td>${(b.booking_type || '').toUpperCase()}</td>
            <td><span class="badge badge-status badge-${b.status}">${(b.status || '').toUpperCase()}</span></td>
            <td>${b.created_at ? formatDate(b.created_at) : 'N/A'}</td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Error loading recent bookings:', err);
  }

  // Load recent inquiries for dashboard
  try {
    const inquiryData = await apiRequest('/api/admin/inquiries');
    const inquiries = Array.isArray(inquiryData) ? inquiryData : (inquiryData && inquiryData.inquiries ? inquiryData.inquiries : []);
    const recentInqBody = document.getElementById('recentInquiriesBody');
    if (recentInqBody) {
      if (inquiries.length === 0) {
        recentInqBody.innerHTML = '<tr><td colspan="5" class="text-center">No inquiries yet.</td></tr>';
      } else {
        recentInqBody.innerHTML = inquiries.slice(0, 5).map(i => `
          <tr>
            <td>${i.name || 'N/A'}</td>
            <td>${i.email || 'N/A'}</td>
            <td>${(i.inquiry_type || 'general').toUpperCase()}</td>
            <td><span class="badge badge-status badge-${i.status || 'new'}">${(i.status || 'new').toUpperCase()}</span></td>
            <td>${i.created_at ? formatDate(i.created_at) : 'N/A'}</td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Error loading recent inquiries:', err);
  }
}

// ============================================================
// ADMIN VEHICLE MANAGEMENT
// ============================================================

async function initAdminVehicles() {
  const adminVehicles = document.getElementById('adminVehicles');
  if (!adminVehicles) return;

  await loadAdminVehicles();
}

async function loadAdminVehicles() {
  const tableBody = document.getElementById('vehiclesTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr><td colspan="8" class="text-center">
      <i class="fas fa-spinner fa-spin"></i> Loading vehicles...
    </td></tr>
  `;

  const data = await apiRequest('/api/admin/vehicles');
  const vehicles = Array.isArray(data) ? data : (data && data.vehicles ? data.vehicles : []);

  if (vehicles.length === 0) {
    tableBody.innerHTML = `
      <tr><td colspan="8" class="text-center">
        No vehicles found. Add your first vehicle above.
      </td></tr>
    `;
    return;
  }

  tableBody.innerHTML = vehicles.map(vehicle => {
    const images = typeof vehicle.images === 'string'
      ? JSON.parse(vehicle.images || '[]')
      : (vehicle.images || []);

    const thumbHtml = images.length > 0
      ? `<img src="${images[0]}" alt="${vehicle.make}" class="table-thumb">`
      : `<span class="table-thumb-placeholder"><i class="fas fa-car"></i></span>`;

    return `
      <tr data-vehicle-id="${vehicle.id}">
        <td>${thumbHtml}</td>
        <td>${vehicle.year}</td>
        <td>${vehicle.make}</td>
        <td>${vehicle.model}</td>
        <td>${vehicle.trim || '-'}</td>
        <td class="gold-text">${formatPrice(vehicle.price)}</td>
        <td><span class="badge badge-status badge-${vehicle.status}">${vehicle.status.toUpperCase()}</span></td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-outline" onclick="editVehicle('${vehicle.id}')" title="Edit">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteVehicle('${vehicle.id}')" title="Delete">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ============================================================
// FILTER VEHICLES
// ============================================================

function filterVehicles() {
  const status = document.getElementById('filterStatus')?.value || '';
  const search = document.getElementById('filterSearch')?.value?.toLowerCase() || '';

  const rows = document.querySelectorAll('#vehiclesTableBody tr[data-vehicle-id]');
  rows.forEach(row => {
    const statusBadge = row.querySelector('.badge-status')?.textContent?.toLowerCase() || '';
    const rowText = row.textContent.toLowerCase();

    const matchesStatus = !status || statusBadge.includes(status);
    const matchesSearch = !search || rowText.includes(search);

    row.style.display = (matchesStatus && matchesSearch) ? '' : 'none';
  });
}

// ============================================================
// EDIT VEHICLE - Redirect to form
// ============================================================

async function editVehicle(vehicleId) {
  // Redirect to add-vehicle page with edit ID
  window.location.href = `/admin/add-vehicle.html?edit=${vehicleId}`;
  return;
}

// Load vehicle data into the add-vehicle form for editing
async function loadVehicleForEdit(vehicleId) {
  const data = await apiRequest(`/api/vehicles/${vehicleId}`);
  if (!data) return;

  const vehicle = data.vehicle || data;
  const form = document.getElementById('vehicleForm');
  if (!form) return;

  // Set edit mode
  form.dataset.vehicleId = vehicleId;
  const vehicleIdInput = document.getElementById('vehicleId');
  if (vehicleIdInput) vehicleIdInput.value = vehicleId;

  // Update page title
  const formTitle = document.getElementById('formTitle');
  if (formTitle) formTitle.textContent = `Edit: ${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> UPDATE VEHICLE';

  // Populate all form fields
  const fieldMap = {
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim,
    vin: vehicle.vin,
    mileage: vehicle.mileage,
    exteriorColor: vehicle.exterior_color,
    interiorColor: vehicle.interior_color,
    bodyType: vehicle.body_type,
    fuelType: vehicle.fuel_type,
    transmission: vehicle.transmission,
    engine: vehicle.engine,
    drivetrain: vehicle.drivetrain,
    price: vehicle.price,
    leaseMonthly: vehicle.lease_monthly,
    rentalDaily: vehicle.rental_daily,
    rentalWeekly: vehicle.rental_weekly,
    rentalMonthly: vehicle.rental_monthly,
    description: vehicle.description,
    status: vehicle.status
  };

  Object.entries(fieldMap).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el && value !== undefined && value !== null) {
      el.value = value;
    }
  });

  // Handle featured checkbox
  const featuredCheckbox = document.getElementById('featured');
  if (featuredCheckbox) featuredCheckbox.checked = !!vehicle.featured;

  // Handle features (array to newline-separated text)
  const featuresInput = document.getElementById('features');
  if (featuresInput) {
    const features = typeof vehicle.features === 'string'
      ? JSON.parse(vehicle.features || '[]')
      : (vehicle.features || []);
    featuresInput.value = features.join('\n');
  }

  // Show existing images
  const imagePreview = document.getElementById('imagePreview');
  if (imagePreview) {
    const images = typeof vehicle.images === 'string'
      ? JSON.parse(vehicle.images || '[]')
      : (vehicle.images || []);
    imagePreview.innerHTML = images.map(img =>
      `<div class="preview-image existing-image">
        <img src="${img}">
        <span class="preview-label">Current</span>
      </div>`
    ).join('');
  }
}

// ============================================================
// DELETE VEHICLE
// ============================================================

async function deleteVehicle(vehicleId) {
  if (!confirm('Are you sure you want to delete this vehicle? This action cannot be undone.')) return;

  const res = await apiRequest(`/api/admin/vehicles/${vehicleId}`, {
    method: 'DELETE'
  });

  if (res) {
    showToast('Vehicle deleted successfully', 'success');
    loadAdminVehicles();
  }
}

// ============================================================
// ADD/EDIT VEHICLE FORM
// ============================================================

function initAdminVehicleForm() {
  const vehicleForm = document.getElementById('vehicleForm');
  if (!vehicleForm) return;

  // Check if we're in edit mode (URL has ?edit=ID)
  const editId = new URLSearchParams(window.location.search).get('edit');
  if (editId) {
    loadVehicleForEdit(editId);
  }

  // Form submission
  vehicleForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = vehicleForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const formData = new FormData(vehicleForm);

    // Handle features: convert newline-separated text to JSON array
    const featuresInput = vehicleForm.querySelector('#features, [name="features"]');
    if (featuresInput) {
      const featuresArray = featuresInput.value
        .split('\n')
        .map(f => f.trim())
        .filter(f => f.length > 0);
      formData.set('features', JSON.stringify(featuresArray));
    }

    // Handle featured checkbox
    const featuredCheckbox = vehicleForm.querySelector('#featured, [name="featured"]');
    if (featuredCheckbox) {
      formData.set('featured', featuredCheckbox.checked ? '1' : '0');
    }

    // Handle image files
    const imageInput = vehicleForm.querySelector('#vehicleImages, [name="images"]');
    if (imageInput && imageInput.files.length > 0) {
      // Remove the default single entry and add individual files
      formData.delete('images');
      Array.from(imageInput.files).forEach(file => {
        formData.append('images[]', file);
      });
    }

    const vehicleId = vehicleForm.dataset.vehicleId;
    let res;

    if (vehicleId) {
      // Editing existing vehicle
      res = await apiRequest(`/api/admin/vehicles/${vehicleId}`, {
        method: 'PUT',
        body: formData
      });
    } else {
      // Adding new vehicle
      res = await apiRequest('/api/admin/vehicles', {
        method: 'POST',
        body: formData
      });
    }

    submitBtn.disabled = false;
    submitBtn.textContent = originalText;

    if (res) {
      showToast(vehicleId ? 'Vehicle updated successfully!' : 'Vehicle added successfully!', 'success');
      vehicleForm.reset();
      delete vehicleForm.dataset.vehicleId;
      const formSection = document.getElementById('vehicleFormSection');
      if (formSection) formSection.style.display = 'none';
      const imagePreview = document.getElementById('imagePreview');
      if (imagePreview) imagePreview.innerHTML = '';
      loadAdminVehicles();
    }
  });
}

// ============================================================
// IMAGE UPLOAD PREVIEW
// ============================================================

function handleImageUpload(input) {
  const preview = document.getElementById('imagePreview');
  if (!preview) return;

  // Clear only new previews, keep existing images
  preview.querySelectorAll('.preview-image:not(.existing-image)').forEach(el => el.remove());

  Array.from(input.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const div = document.createElement('div');
      div.className = 'preview-image';
      div.innerHTML = `
        <img src="${e.target.result}">
        <button type="button" class="preview-remove" onclick="this.parentElement.remove()">&times;</button>
      `;
      preview.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

// ============================================================
// ADMIN BOOKING MANAGEMENT
// ============================================================

async function initAdminBookings() {
  const adminBookings = document.getElementById('adminBookings');
  if (!adminBookings) return;

  await loadAdminBookings();
}

async function loadAdminBookings() {
  const tableBody = document.getElementById('bookingsTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr><td colspan="8" class="text-center">
      <i class="fas fa-spinner fa-spin"></i> Loading bookings...
    </td></tr>
  `;

  const data = await apiRequest('/api/admin/bookings');
  const bookings = Array.isArray(data) ? data : (data && data.bookings ? data.bookings : []);

  if (bookings.length === 0) {
    tableBody.innerHTML = `
      <tr><td colspan="8" class="text-center">No bookings found.</td></tr>
    `;
    return;
  }

  tableBody.innerHTML = bookings.map(booking => {
    const statusOptions = ['pending', 'confirmed', 'active', 'completed', 'cancelled'];
    const statusSelect = statusOptions.map(s =>
      `<option value="${s}" ${booking.status === s ? 'selected' : ''}>${s.toUpperCase()}</option>`
    ).join('');

    return `
      <tr data-booking-id="${booking.id}">
        <td>${booking.booking_ref || 'N/A'}</td>
        <td>${booking.customer_name || `${booking.first_name || ''} ${booking.last_name || ''}`.trim() || 'N/A'}</td>
        <td>${booking.vehicle_year || ''} ${booking.vehicle_make || ''} ${booking.vehicle_model || ''}</td>
        <td>${booking.booking_type.toUpperCase()}</td>
        <td>${booking.start_date ? formatDate(booking.start_date) : 'N/A'}</td>
        <td>${booking.total_price ? formatPrice(booking.total_price) : 'N/A'}</td>
        <td>
          <select class="form-select form-select-sm booking-status-select"
                  onchange="updateBookingStatus('${booking.id}', this.value)"
                  data-original="${booking.status}">
            ${statusSelect}
          </select>
        </td>
        <td>${booking.created_at ? formatDate(booking.created_at) : 'N/A'}</td>
      </tr>
    `;
  }).join('');
}

async function updateBookingStatus(bookingId, newStatus) {
  const res = await apiRequest(`/api/admin/bookings/${bookingId}`, {
    method: 'PUT',
    body: { status: newStatus }
  });

  if (res) {
    showToast(`Booking status updated to ${newStatus.toUpperCase()}`, 'success');
  } else {
    // Revert dropdown on failure
    loadAdminBookings();
  }
}

// ============================================================
// ADMIN CUSTOMER MANAGEMENT
// ============================================================

async function initAdminCustomers() {
  const adminCustomers = document.getElementById('adminCustomers');
  if (!adminCustomers) return;

  await loadAdminCustomers();
}

async function loadAdminCustomers() {
  const tableBody = document.getElementById('customersTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr><td colspan="6" class="text-center">
      <i class="fas fa-spinner fa-spin"></i> Loading customers...
    </td></tr>
  `;

  const data = await apiRequest('/api/admin/customers');
  const customers = Array.isArray(data) ? data : (data && data.customers ? data.customers : []);

  if (customers.length === 0) {
    tableBody.innerHTML = `
      <tr><td colspan="6" class="text-center">No customers found.</td></tr>
    `;
    return;
  }

  tableBody.innerHTML = customers.map(customer => `
    <tr>
      <td>${customer.first_name || ''} ${customer.last_name || ''}</td>
      <td>${customer.email || 'N/A'}</td>
      <td>${customer.phone || 'N/A'}</td>
      <td>${customer.city ? `${customer.city}, ${customer.state || ''}` : 'N/A'}</td>
      <td>${customer.created_at ? formatDate(customer.created_at) : 'N/A'}</td>
      <td>${customer.booking_count !== undefined ? customer.booking_count : 'N/A'}</td>
    </tr>
  `).join('');
}

// ============================================================
// ADMIN INQUIRY MANAGEMENT
// ============================================================

async function initAdminInquiries() {
  const adminInquiries = document.getElementById('adminInquiries');
  if (!adminInquiries) return;

  await loadAdminInquiries();
}

async function loadAdminInquiries() {
  const tableBody = document.getElementById('inquiriesTableBody');
  if (!tableBody) return;

  tableBody.innerHTML = `
    <tr><td colspan="7" class="text-center">
      <i class="fas fa-spinner fa-spin"></i> Loading inquiries...
    </td></tr>
  `;

  const data = await apiRequest('/api/admin/inquiries');
  const inquiries = Array.isArray(data) ? data : (data && data.inquiries ? data.inquiries : []);

  if (inquiries.length === 0) {
    tableBody.innerHTML = `
      <tr><td colspan="7" class="text-center">No inquiries found.</td></tr>
    `;
    return;
  }

  tableBody.innerHTML = inquiries.map(inquiry => {
    const isRead = inquiry.read || inquiry.status === 'read' || inquiry.status === 'responded';
    const rowClass = isRead ? '' : 'unread-row';

    return `
      <tr class="${rowClass}" data-inquiry-id="${inquiry.id}">
        <td>${inquiry.name || 'N/A'}</td>
        <td>${inquiry.email || 'N/A'}</td>
        <td>${inquiry.phone || 'N/A'}</td>
        <td><span class="badge">${inquiry.inquiry_type || 'general'}</span></td>
        <td class="inquiry-message">${truncateText(inquiry.message, 80)}</td>
        <td>${inquiry.created_at ? formatDate(inquiry.created_at) : 'N/A'}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-sm btn-outline" onclick="viewInquiry('${inquiry.id}')" title="View Details">
              <i class="fas fa-eye"></i>
            </button>
            ${!isRead ? `<button class="btn btn-sm btn-outline" onclick="markInquiryRead('${inquiry.id}')" title="Mark as Read">
              <i class="fas fa-check"></i>
            </button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function truncateText(text, maxLength) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function viewInquiry(inquiryId) {
  // Find the inquiry row and show full details in a modal or alert
  const row = document.querySelector(`tr[data-inquiry-id="${inquiryId}"]`);
  if (!row) return;

  const cells = row.querySelectorAll('td');
  const name = cells[0]?.textContent || 'N/A';
  const email = cells[1]?.textContent || 'N/A';
  const phone = cells[2]?.textContent || 'N/A';
  const type = cells[3]?.textContent || 'N/A';

  // Try to open a modal if one exists
  const modal = document.getElementById('inquiryModal');
  if (modal) {
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
      modalBody.innerHTML = `
        <div class="inquiry-detail">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Type:</strong> ${type}</p>
          <p><strong>Message:</strong></p>
          <div class="inquiry-message-full">${cells[4]?.textContent || 'No message'}</div>
        </div>
      `;
    }
    openModal('inquiryModal');
  } else {
    // Fallback: expand the row
    const messageCell = cells[4];
    if (messageCell) {
      messageCell.classList.toggle('expanded');
    }
  }

  // Mark as read
  markInquiryRead(inquiryId);
}

async function markInquiryRead(inquiryId) {
  try {
    await apiRequest(`/api/admin/inquiries/${inquiryId}`, {
      method: 'PUT',
      body: { status: 'in-progress' }
    });
  } catch (err) {
    // Silently handle
  }

  // Update UI
  const row = document.querySelector(`tr[data-inquiry-id="${inquiryId}"]`);
  if (row) {
    row.classList.remove('unread-row');
  }
}

// ============================================================
// ADMIN LOGOUT
// ============================================================

async function adminLogout() {
  await apiRequest('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
}
