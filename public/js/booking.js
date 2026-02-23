/**
 * Prince Automotive Group LLC - Booking JavaScript
 * Handles bookings, reservations, inquiries, and dashboard functionality
 */

document.addEventListener('DOMContentLoaded', function () {
  initInquiryForm();
  initRentalForm();
  initPurchaseLeaseButtons();
  initTestDriveForm();
  initDashboardBookings();
  initDashboardProfile();
  initDashboardStats();
});

// ============================================================
// CHECK AUTH HELPER
// ============================================================

async function requireAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // Not authenticated
  }
  showToast('Please sign in to continue', 'info');
  setTimeout(() => {
    window.location.href = '/login.html';
  }, 1500);
  return null;
}

// ============================================================
// INQUIRY FORM (Vehicle Detail Modal)
// ============================================================

function initInquiryForm() {
  const inquiryForm = document.getElementById('inquiryForm');
  if (!inquiryForm) return;

  inquiryForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = inquiryForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    const vehicleDetail = document.getElementById('vehicleDetail');
    const vehicleId = vehicleDetail ? vehicleDetail.dataset.vehicleId : null;

    const formData = new FormData(inquiryForm);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      inquiry_type: formData.get('inquiry_type') || 'vehicle-inquiry',
      message: formData.get('message')
    };

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
      showToast('Inquiry submitted successfully! We\'ll get back to you shortly.', 'success');
      inquiryForm.reset();
      // Close the modal if it's in one
      const modal = inquiryForm.closest('.modal');
      if (modal && modal.id) {
        closeModal(modal.id);
      }
    }
  });
}

// ============================================================
// RENTAL RESERVATION FORM
// ============================================================

function initRentalForm() {
  const rentalForm = document.getElementById('rentalForm');
  if (!rentalForm) return;

  rentalForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Check if user is logged in
    const user = await requireAuth();
    if (!user) return;

    const submitBtn = rentalForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

    const vehicleDetail = document.getElementById('vehicleDetail');
    const vehicleId = vehicleDetail ? vehicleDetail.dataset.vehicleId : null;

    if (!vehicleId) {
      showToast('Vehicle information is missing. Please try again.', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    const formData = new FormData(rentalForm);
    const data = {
      vehicle_id: vehicleId,
      booking_type: 'rental',
      start_date: formData.get('start_date'),
      end_date: formData.get('end_date'),
      duration: formData.get('duration'),
      notes: formData.get('notes') || ''
    };

    // Validate dates
    if (!data.start_date) {
      showToast('Please select a start date', 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
      return;
    }

    const res = await apiRequest('/api/bookings', {
      method: 'POST',
      body: data
    });

    submitBtn.disabled = false;
    submitBtn.textContent = originalText;

    if (res) {
      showToast('Reservation submitted! We\'ll confirm within 24 hours.', 'success');
      rentalForm.reset();
      // Close modal if applicable
      const modal = rentalForm.closest('.modal');
      if (modal && modal.id) {
        closeModal(modal.id);
      }
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 2000);
    }
  });
}

// ============================================================
// PURCHASE / LEASE BUTTONS
// ============================================================

function initPurchaseLeaseButtons() {
  const purchaseBtn = document.getElementById('purchaseBtn');
  const leaseBtn = document.getElementById('leaseBtn');

  if (purchaseBtn) {
    purchaseBtn.addEventListener('click', async function () {
      await handleBookingAction('purchase');
    });
  }

  if (leaseBtn) {
    leaseBtn.addEventListener('click', async function () {
      await handleBookingAction('lease');
    });
  }
}

async function handleBookingAction(bookingType) {
  // Check if user is logged in
  const user = await requireAuth();
  if (!user) return;

  const vehicleDetail = document.getElementById('vehicleDetail');
  const vehicleId = vehicleDetail ? vehicleDetail.dataset.vehicleId : null;

  if (!vehicleId) {
    showToast('Vehicle information is missing. Please try again.', 'error');
    return;
  }

  // Check for financing type selection
  const financingSelect = document.getElementById('financingType');
  const financingType = financingSelect ? financingSelect.value : null;

  // Check for notes
  const notesInput = document.getElementById('bookingNotes');
  const notes = notesInput ? notesInput.value : '';

  const data = {
    vehicle_id: vehicleId,
    booking_type: bookingType,
    notes: notes
  };

  if (financingType) {
    data.financing_type = financingType;
  }

  // Show confirmation
  const actionLabel = bookingType === 'purchase' ? 'purchase inquiry' : 'lease inquiry';
  if (!confirm(`Submit a ${actionLabel} for this vehicle?`)) return;

  const res = await apiRequest('/api/bookings', {
    method: 'POST',
    body: data
  });

  if (res) {
    showToast(`Your ${actionLabel} has been submitted! We'll contact you shortly.`, 'success');
    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 2000);
  }
}

// ============================================================
// TEST DRIVE SCHEDULING
// ============================================================

function initTestDriveForm() {
  const testDriveForm = document.getElementById('testDriveForm');
  if (!testDriveForm) return;

  testDriveForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = testDriveForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scheduling...';

    const vehicleDetail = document.getElementById('vehicleDetail');
    const vehicleId = vehicleDetail ? vehicleDetail.dataset.vehicleId : null;

    const formData = new FormData(testDriveForm);
    const data = {
      name: formData.get('name'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      inquiry_type: 'test-drive',
      message: `Test Drive Request - Preferred Date: ${formData.get('preferred_date') || 'Flexible'}, Preferred Time: ${formData.get('preferred_time') || 'Flexible'}. ${formData.get('message') || ''}`
    };

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
      showToast('Test drive scheduled! We\'ll confirm the details with you.', 'success');
      testDriveForm.reset();
      // Close modal if applicable
      const modal = testDriveForm.closest('.modal');
      if (modal && modal.id) {
        closeModal(modal.id);
      }
    }
  });
}

// ============================================================
// DASHBOARD BOOKINGS
// ============================================================

async function initDashboardBookings() {
  const dashboardBookings = document.getElementById('dashboardBookings');
  if (!dashboardBookings) return;

  await loadBookings();
}

async function loadBookings() {
  const dashboardBookings = document.getElementById('dashboardBookings');
  if (!dashboardBookings) return;

  dashboardBookings.innerHTML = `
    <div class="loading-spinner">
      <i class="fas fa-spinner fa-spin"></i>
      <p>Loading your bookings...</p>
    </div>
  `;

  const data = await apiRequest('/api/bookings/my');
  const bookings = Array.isArray(data) ? data : (data && data.bookings ? data.bookings : []);

  if (bookings.length === 0) {
    dashboardBookings.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-calendar-alt"></i>
        <h3>No Bookings Yet</h3>
        <p>Browse our <a href="/inventory.html">inventory</a> to get started.</p>
      </div>
    `;
    return;
  }

  dashboardBookings.innerHTML = bookings.map(b => renderBooking(b)).join('');
}

function renderBooking(booking) {
  const statusColors = {
    pending: '#d4af37',
    confirmed: '#28a745',
    active: '#007bff',
    completed: '#c0c0c0',
    cancelled: '#dc3545'
  };

  const statusColor = statusColors[booking.status] || '#ffffff';

  return `
    <div class="booking-card glass-card">
      <div class="booking-header">
        <span class="booking-ref">${booking.booking_ref || 'N/A'}</span>
        <span class="booking-status" style="color: ${statusColor}">${booking.status.toUpperCase()}</span>
      </div>
      <div class="booking-body">
        <h4>${booking.vehicle_year || ''} ${booking.vehicle_make || ''} ${booking.vehicle_model || ''}</h4>
        <p class="booking-type">${booking.booking_type.toUpperCase()}</p>
        ${booking.start_date ? `<p><i class="fas fa-calendar"></i> ${formatDate(booking.start_date)}${booking.end_date ? ' - ' + formatDate(booking.end_date) : ''}</p>` : ''}
        ${booking.total_price ? `<p class="gold-text">${formatPrice(booking.total_price)}</p>` : ''}
        ${booking.duration ? `<p><i class="fas fa-clock"></i> ${booking.duration}</p>` : ''}
      </div>
      <div class="booking-footer">
        ${booking.status === 'pending' ? `<button class="btn btn-outline btn-sm" onclick="cancelBooking('${booking.id}')">Cancel</button>` : ''}
      </div>
    </div>
  `;
}

// ============================================================
// CANCEL BOOKING
// ============================================================

async function cancelBooking(bookingId) {
  if (!confirm('Are you sure you want to cancel this booking?')) return;

  const res = await apiRequest(`/api/bookings/${bookingId}/cancel`, {
    method: 'PUT'
  });

  if (res) {
    showToast('Booking cancelled', 'success');
    loadBookings(); // Refresh the list
  }
}

// ============================================================
// DASHBOARD PROFILE
// ============================================================

async function initDashboardProfile() {
  const profileForm = document.getElementById('profileForm');
  if (!profileForm) return;

  // Fetch current user data and populate form
  const user = await apiRequest('/api/auth/me');
  if (!user) return;

  const userData = user.user || user;

  // Populate form fields
  const fields = ['first_name', 'last_name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'drivers_license'];
  fields.forEach(field => {
    const input = profileForm.querySelector(`#${field}, [name="${field}"]`);
    if (input && userData[field]) {
      input.value = userData[field];
    }
  });

  // Handle profile form submit
  profileForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = profileForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    const formData = new FormData(profileForm);
    const data = {};
    for (const [key, value] of formData.entries()) {
      if (value.trim()) {
        data[key] = value.trim();
      }
    }

    const res = await apiRequest('/api/auth/profile', {
      method: 'PUT',
      body: data
    });

    submitBtn.disabled = false;
    submitBtn.textContent = originalText;

    if (res) {
      showToast('Profile updated successfully!', 'success');
    }
  });
}

// ============================================================
// DASHBOARD STATS
// ============================================================

async function initDashboardStats() {
  const statsContainer = document.getElementById('dashboardStats');
  if (!statsContainer) return;

  const data = await apiRequest('/api/bookings/my');
  const bookings = Array.isArray(data) ? data : (data && data.bookings ? data.bookings : []);

  const totalBookings = bookings.length;
  const activeBookings = bookings.filter(b => b.status === 'active' || b.status === 'confirmed').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;

  const totalEl = document.getElementById('statTotal');
  const activeEl = document.getElementById('statActive');
  const pendingEl = document.getElementById('statPending');

  if (totalEl) totalEl.textContent = totalBookings;
  if (activeEl) activeEl.textContent = activeBookings;
  if (pendingEl) pendingEl.textContent = pendingBookings;
}
