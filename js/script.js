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

form.addEventListener('submit', event => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  if (button.disabled) return;
  status.hidden = true;
  const validity = fields.map(validate);
  if (validity.includes(false)) { fields[validity.indexOf(false)].focus(); return; }
  button.disabled = true;
  form.setAttribute('aria-busy', 'true');
  button.querySelector('.submit-label').textContent = 'Checking your details…';
  button.querySelector('.spinner').hidden = false;
  button.querySelector('.icon').hidden = true;
  setTimeout(() => {
    form.reset();
    fields.forEach(field => { field.removeAttribute('aria-invalid'); document.getElementById(`${field.id}-error`).textContent = ''; });
    status.textContent = '✓ Demo complete! Your details passed validation. Nothing was sent or saved, and no application or callback has been created.';
    status.hidden = false;
    form.removeAttribute('aria-busy');
    button.disabled = false;
    button.querySelector('.submit-label').textContent = 'Submit Application';
    button.querySelector('.spinner').hidden = true;
    button.querySelector('.icon').hidden = false;
    status.focus({ preventScroll: true });
    status.scrollIntoView({ behavior: reducedMotion.matches ? 'instant' : 'smooth', block: 'nearest' });
  }, 850);
});

const dialog = document.querySelector('#info-dialog');
const dialogApply = document.querySelector('#dialog-apply');
const loanDetails = {
  'Home Loan': 'Take the next step towards a home of your own. Discuss your property plans, desired loan amount and repayment preferences with our team.',
  'Car Loan': 'Plan your next car with financing suited to your needs. Share your vehicle plans and budget to explore the available options.',
  'Business Loan': 'From working capital to your next phase of growth, explore financing for your business. Tell us about your business and funding requirements.',
  'Education Loan': 'Make room for your next learning opportunity. Share your course, institution and expected education costs to discuss funding options.',
  'Personal Loan': 'Explore funding for your personal plans and everyday milestones. Tell us the amount you need and your preferred repayment approach.',
  'Loan Against Property': 'Explore financing secured against eligible property. Share your funding needs and property details to discuss suitable options.'
};
document.querySelectorAll('[data-details]').forEach(button => button.addEventListener('click', () => {
  const type = button.dataset.details;
  document.querySelector('#dialog-label').textContent = 'EXPLORE YOUR OPTIONS';
  document.querySelector('#dialog-title').textContent = type;
  document.querySelector('#dialog-description').textContent = loanDetails[type];
  document.querySelector('#dialog-note').textContent = 'Eligibility, documents, interest rates and repayment terms depend on assessment. This website does not provide a loan offer or guarantee approval.';
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
  document.querySelector('#dialog-label').textContent = 'ABOUT THIS DEMO';
  document.querySelector('#dialog-title').textContent = privacy ? 'Privacy Policy' : 'Terms & Conditions';
  document.querySelector('#dialog-description').textContent = privacy ? 'This demonstration checks form entries locally in your browser. It does not send application details to a server, store them in browser storage, or use analytics. Google Fonts may make requests to Google; the map link opens Google Maps only when selected.' : 'This is a demonstration website. Submitting the form does not create a loan application, request a callback, or establish an agreement. Displayed loan categories are informational; no approval, rate or disbursal is guaranteed. Phone, email and social profiles are placeholders.';
  document.querySelector('#dialog-note').textContent = 'Production policies and verified company contact details must be supplied before this site accepts real applications.';
  dialogApply.hidden = true;
  dialog.showModal();
}));
