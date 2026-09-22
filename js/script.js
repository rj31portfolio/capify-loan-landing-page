'use strict';

const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
const navLinks = [...navigation.querySelectorAll('a')];
const backToTop = document.querySelector('.back-to-top');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function closeMenu(restoreFocus = false) {
  navigation.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
  if (restoreFocus) menuButton.focus();
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  navigation.classList.toggle('open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});
document.addEventListener('click', event => {
  if (!header.contains(event.target) || event.target.closest('a[href^="#"]')) closeMenu();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation.classList.contains('open')) closeMenu(true);
});
header.addEventListener('focusout', () => {
  setTimeout(() => { if (!header.contains(document.activeElement)) closeMenu(); }, 0);
});
window.matchMedia('(min-width: 801px)').addEventListener('change', () => closeMenu());

const sections = navLinks.map(link => document.querySelector(link.getAttribute('href')));
let scrollPending = false;
function updateScroll() {
  header.classList.toggle('scrolled', window.scrollY > 16);
  backToTop.hidden = window.scrollY < 550;
  let active = sections[0];
  for (const section of sections) {
    if (section.getBoundingClientRect().top <= header.offsetHeight + 130 && (!active || section.offsetTop >= active.offsetTop)) active = section;
  }
  navLinks.forEach(link => {
    const selected = link.hash === `#${active.id}`;
    link.classList.toggle('active', selected);
    if (selected) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  scrollPending = false;
}
window.addEventListener('scroll', () => {
  if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateScroll); }
}, { passive: true });
updateScroll();

if ('IntersectionObserver' in window) {
  if (!reducedMotion.matches) document.body.classList.add('motion-enabled');
  document.querySelectorAll('.loan-grid, .steps, .benefit-grid').forEach(group => {
    [...group.children].forEach((item, index) => item.style.setProperty('--delay', `${(index % 3) * 85}ms`));
  });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal, .steps').forEach(element => observer.observe(element));
}
reducedMotion.addEventListener('change', event => {
  if (event.matches) document.body.classList.remove('motion-enabled');
});

const form = document.querySelector('#loan-form');
const loanSelect = document.querySelector('#loan-type');
const status = document.querySelector('#form-status');
const fields = [...form.querySelectorAll('[required]')];

function validationMessage(field) {
  const value = field.value.trim();
  if (!value) return field.id === 'loan-type' ? 'Please select a loan type.' : 'Please complete this field.';
  if (field.id === 'full-name' && (value.length < 2 || !/\p{L}/u.test(value))) return 'Please enter your full name.';
  if (field.id === 'mobile') {
    const normalized = value.replace(/[\s()-]/g, '').replace(/^(\+91|0091)/, '');
    if (!/^[6-9]\d{9}$/.test(normalized)) return 'Enter a valid 10-digit Indian mobile number.';
  }
  if (field.id === 'email' && (field.validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))) return 'Please enter a valid email address.';
  if (field.id === 'amount' && (!Number.isSafeInteger(Number(value)) || Number(value) <= 0)) return 'Enter a positive whole-rupee amount.';
  return '';
}
function validate(field) {
  const message = validationMessage(field);
  field.setAttribute('aria-invalid', String(Boolean(message)));
  document.getElementById(`${field.id}-error`).textContent = message;
  return !message;
}
fields.forEach(field => {
  field.addEventListener('blur', () => { if (field.value || field.hasAttribute('aria-invalid')) validate(field); });
  field.addEventListener('input', () => {
    if (field.getAttribute('aria-invalid') === 'true') validate(field);
    status.hidden = true;
  });
  field.addEventListener('change', () => { if (field.hasAttribute('aria-invalid')) validate(field); });
});
function selectLoan(type) {
  loanSelect.value = type;
  if (loanSelect.hasAttribute('aria-invalid')) validate(loanSelect);
  status.hidden = true;
}
document.querySelectorAll('[data-loan]').forEach(link => link.addEventListener('click', () => selectLoan(link.dataset.loan)));

function showSubmissionResult(icon, title, message) {
  status.textContent = message;
  status.hidden = false;
  if (window.Swal) {
    return window.Swal.fire({ icon, title, text: message, confirmButtonColor: '#0756A8' });
  }
  status.focus({ preventScroll: true });
  status.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'nearest' });
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  if (button.disabled) return;
  status.hidden = true;
  const validity = fields.map(validate);
  if (validity.includes(false)) { fields[validity.indexOf(false)].focus(); return; }
  const payload = new FormData(form);
  payload.set('amount', String(Number(form.elements.amount.value)));
  button.disabled = true;
  form.setAttribute('aria-busy', 'true');
  button.querySelector('.submit-label').textContent = 'Sending application...';
  button.querySelector('.spinner').hidden = false;
  button.querySelector('.icon').hidden = true;
  const controls = [...form.querySelectorAll('input, select, textarea')];
  controls.forEach(control => { control.disabled = true; });
  try {
    const response = await fetch(form.action, {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
      body: payload
    });
    const result = await response.json();
    if (!response.ok || result.success !== true) {
      if (result.errors && typeof result.errors === 'object') {
        Object.entries(result.errors).forEach(([name, message]) => {
          const field = form.elements.namedItem(name);
          const error = field && document.getElementById(field.id + '-error');
          if (error) { field.setAttribute('aria-invalid', 'true'); error.textContent = message; }
        });
      }
      throw new Error(result.message || 'We could not send your application. Please try again later.');
    }
    form.reset();
    controls.forEach(field => field.removeAttribute('aria-invalid'));
    form.querySelectorAll('.field-error').forEach(error => { error.textContent = ''; });
    showSubmissionResult('success', 'Application sent!', result.message);
  } catch (error) {
    const message = error instanceof SyntaxError || error instanceof TypeError
      ? 'Unable to confirm submission. Please check your connection or call us before trying again.'
      : error.message;
    showSubmissionResult('error', 'Application not confirmed', message);
  } finally {
    controls.forEach(control => { control.disabled = false; });
    form.removeAttribute('aria-busy');
    button.disabled = false;
    button.querySelector('.submit-label').textContent = 'Submit Application';
    button.querySelector('.spinner').hidden = true;
    button.querySelector('.icon').hidden = false;
  }
});

const dialog = document.querySelector('#info-dialog');
const dialogApply = document.querySelector('#dialog-apply');
const loanDetails = {
  'Home Loan': 'Take the next step towards a home of your own. Discuss your property plans, desired loan amount and repayment preferences with our team. Starting interest rate: 7.15% p.a.',
  'Business Loan': 'From working capital to your next phase of growth, explore financing for your business. Tell us about your business and funding requirements. Starting interest rate: 12% p.a.',
  'Working Capital': 'Support your day-to-day business operations with funding for inventory, payroll, suppliers and growth needs. Starting interest rate: 8.25% p.a.',
  'CGTMSE': 'Explore eligible collateral-free credit support for micro and small businesses through the CGTMSE framework. Starting interest rate: 10% p.a.',
  'Personal Loan': 'Explore funding for your personal plans and everyday milestones. Tell us the amount you need and your preferred repayment approach. Starting interest rate: 9.99% p.a.',
  'Loan Against Property': 'Explore financing secured against eligible property. Share your funding needs and property details to discuss suitable options. Starting interest rate: 8.15% p.a.'
};
document.querySelectorAll('[data-details]').forEach(button => button.addEventListener('click', () => {
  const type = button.dataset.details;
  document.querySelector('#dialog-label').textContent = 'EXPLORE YOUR OPTIONS';
  document.querySelector('#dialog-title').textContent = type;
  document.querySelector('#dialog-description').textContent = loanDetails[type];
  document.querySelector('#dialog-note').textContent = 'Eligibility, documents, interest rates and repayment terms depend on assessment. This website provide a loan offer or guarantee approval.';
  dialogApply.hidden = false;
  dialogApply.dataset.loan = type;
  dialog.showModal();
}));
dialogApply.addEventListener('click', () => { selectLoan(dialogApply.dataset.loan); dialog.close(); });
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
});
document.querySelectorAll('[data-policy]').forEach(button => button.addEventListener('click', () => {
  const privacy = button.dataset.policy === 'privacy';
  document.querySelector('#dialog-label').textContent = 'APPLICATION INFORMATION';
  document.querySelector('#dialog-title').textContent = privacy ? 'Privacy Policy' : 'Terms & Conditions';
  document.querySelector('#dialog-description').textContent = privacy ? 'When you submit this form, your name, mobile number, email, loan type, amount and optional message are sent to Capify by email through Gmail so our team can respond to your enquiry. Please do not include account passwords or sensitive documents. Google Fonts and SweetAlert may load resources from external providers.' : 'Submitting this form sends a loan enquiry to Capify. It does not guarantee approval, an interest rate or disbursal, and does not establish a loan agreement. Eligibility and terms are subject to assessment.';
  document.querySelector('#dialog-note').textContent = 'For questions about your enquiry or information, contact capifysales@gmail.com.';
  dialogApply.hidden = true;
  dialog.showModal();
}));
