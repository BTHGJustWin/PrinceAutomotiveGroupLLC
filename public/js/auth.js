/**
 * Prince Automotive Group LLC - Auth JavaScript
 * Handles login, registration, and authentication flows
 */

document.addEventListener('DOMContentLoaded', function () {
  initLoginForm();
  initRegisterForm();
  initPasswordToggles();
});

// ============================================================
// LOGIN FORM
// ============================================================

function initLoginForm() {
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = loginForm.querySelector('#loginEmail, [name="email"]');
    const password = loginForm.querySelector('#loginPassword, [name="password"]');
    const submitBtn = loginForm.querySelector('button[type="submit"]');

    if (!email || !password) return;

    const emailVal = email.value.trim();
    const passwordVal = password.value;

    // Basic validation
    if (!emailVal || !passwordVal) {
      showToast('Please enter your email and password', 'error');
      return;
    }

    // Show loading state
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing In...';

    const res = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email: emailVal, password: passwordVal }
    });

    if (res) {
      showToast('Welcome back!', 'success');
      // Determine redirect based on user role
      const user = res.user || res;
      if (user.role === 'admin') {
        setTimeout(() => {
          window.location.href = '/admin/';
        }, 1000);
      } else {
        setTimeout(() => {
          window.location.href = '/dashboard.html';
        }, 1000);
      }
    } else {
      // Re-enable button on failure
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

// ============================================================
// REGISTER FORM
// ============================================================

function initRegisterForm() {
  const registerForm = document.getElementById('registerForm');
  if (!registerForm) return;

  registerForm.addEventListener('submit', async function (e) {
    e.preventDefault();

    const submitBtn = registerForm.querySelector('button[type="submit"]');

    // Collect all field values
    const fields = {
      first_name: getFieldValue(registerForm, 'first_name'),
      last_name: getFieldValue(registerForm, 'last_name'),
      email: getFieldValue(registerForm, 'email'),
      phone: getFieldValue(registerForm, 'phone'),
      password: getFieldValue(registerForm, 'password'),
      address: getFieldValue(registerForm, 'address'),
      city: getFieldValue(registerForm, 'city'),
      state: getFieldValue(registerForm, 'state'),
      zip: getFieldValue(registerForm, 'zip'),
      drivers_license: getFieldValue(registerForm, 'drivers_license')
    };

    const confirmPassword = getFieldValue(registerForm, 'confirm_password');
    const termsCheckbox = registerForm.querySelector('#terms, [name="terms"]');

    // Validate required fields
    if (!fields.first_name || !fields.last_name || !fields.email || !fields.password) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(fields.email)) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    // Validate password length
    if (fields.password.length < 8) {
      showToast('Password must be at least 8 characters long', 'error');
      return;
    }

    // Validate password match
    if (fields.password !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    // Validate terms acceptance
    if (termsCheckbox && !termsCheckbox.checked) {
      showToast('Please accept the terms and conditions', 'error');
      return;
    }

    // Show loading state
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

    const res = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: fields
    });

    if (res) {
      showToast('Account created successfully!', 'success');
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 1500);
    } else {
      // Re-enable button on failure
      submitBtn.disabled = false;
      submitBtn.textContent = originalText;
    }
  });
}

// ============================================================
// HELPER: Get field value by name
// ============================================================

function getFieldValue(form, name) {
  const field = form.querySelector(`#${name}, [name="${name}"]`);
  return field ? field.value.trim() : '';
}

// ============================================================
// PASSWORD VISIBILITY TOGGLE
// ============================================================

function initPasswordToggles() {
  const toggleButtons = document.querySelectorAll('.password-toggle');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      const input = this.closest('.input-group, .password-wrapper, .form-group')
        ?.querySelector('input[type="password"], input[type="text"]');

      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        const icon = this.querySelector('i');
        if (icon) {
          icon.classList.remove('fa-eye');
          icon.classList.add('fa-eye-slash');
        }
      } else {
        input.type = 'password';
        const icon = this.querySelector('i');
        if (icon) {
          icon.classList.remove('fa-eye-slash');
          icon.classList.add('fa-eye');
        }
      }
    });
  });
}

// ============================================================
// LOGOUT FUNCTION
// (Also defined in main.js, but included here for pages that
//  may only load auth.js)
// ============================================================

async function logout() {
  await apiRequest('/api/auth/logout', { method: 'POST' });
  window.currentUser = null;
  showToast('You have been signed out', 'info');
  setTimeout(() => {
    window.location.href = '/';
  }, 1000);
}
