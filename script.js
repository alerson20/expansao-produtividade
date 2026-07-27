const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzjDXNjvce7VUQUknaK8O_-a2WBfWm3zf36tgnvfAU-Dr_l4xa5YVz0A0Wkha32TGm9/exec";

const form = document.querySelector("#lead-form");
const nameInput = document.querySelector("#name");
const emailInput = document.querySelector("#email");
const consentInput = document.querySelector("#consent");
const submittedAtInput = document.querySelector("#submitted-at");
const submitButton = document.querySelector("#submit-button");
const formMessage = document.querySelector("#form-message");
const formContent = document.querySelector("#form-content");
const successState = document.querySelector("#success-state");
const firstName = document.querySelector("#first-name");
const restartButton = document.querySelector("#restart-form");
const submitTarget = document.querySelector("#email-submit-target");

let submissionInProgress = false;
let submissionTimeout = null;

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function isConfigured() {
  return APPS_SCRIPT_URL.startsWith("https://script.google.com/macros/s/");
}

function setLoading(loading) {
  if (!submitButton) return;
  submitButton.classList.toggle("loading", loading);
  submitButton.disabled = loading;
  submitButton.setAttribute("aria-busy", String(loading));
  const label = submitButton.querySelector(".button-label");
  if (label) {
    label.textContent = loading
      ? "Enviando e liberando acesso..."
      : "Quero baixar o e-book grátis";
  }
}

function showSuccess() {
  if (!formContent || !successState) return;
  clearTimeout(submissionTimeout);
  submissionInProgress = false;
  setLoading(false);

  const storedName = sessionStorage.getItem("ebookLeadFirstName");
  if (firstName) firstName.textContent = storedName || "leitor";

  formContent.hidden = true;
  successState.hidden = false;
  successState.setAttribute("tabindex", "-1");
  successState.focus({ preventScroll: true });
  document.querySelector("#formulario")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function showError(message) {
  clearTimeout(submissionTimeout);
  submissionInProgress = false;
  setLoading(false);
  if (!formMessage) return;
  formMessage.textContent = message;
  formMessage.className = "form-message error";
}

function displayFormAgain() {
  successState.hidden = true;
  successState.removeAttribute("tabindex");
  formContent.hidden = false;
  form?.reset();
  sessionStorage.removeItem("ebookLeadFirstName");
  sessionStorage.removeItem("ebookLeadEmail");
  nameInput?.focus();
}

if (form) {
  if (isConfigured()) form.action = APPS_SCRIPT_URL;

  form.addEventListener("submit", (event) => {
    if (formMessage) {
      formMessage.textContent = "";
      formMessage.className = "form-message";
    }

    if (!isConfigured()) {
      event.preventDefault();
      showError("O envio de e-mail ainda não foi configurado. Cole a URL do Google Apps Script no início do arquivo script.js.");
      return;
    }

    if (!form.checkValidity()) {
      event.preventDefault();
      form.reportValidity();
      return;
    }

    const rawName = nameInput?.value.trim() || "";
    const email = normalizeEmail(emailInput?.value || "");

    if (rawName.length < 2 || !email || !consentInput?.checked) {
      event.preventDefault();
      showError("Revise os campos obrigatórios antes de continuar.");
      return;
    }

    if (submittedAtInput) submittedAtInput.value = new Date().toISOString();
    sessionStorage.setItem("ebookLeadFirstName", rawName.split(/\s+/)[0]);
    sessionStorage.setItem("ebookLeadEmail", email);
    submissionInProgress = true;
    setLoading(true);

    submissionTimeout = window.setTimeout(() => {
      if (submissionInProgress) {
        showError("O servidor demorou para responder. Tente novamente em alguns instantes.");
      }
    }, 20000);
  });
}

submitTarget?.addEventListener("load", () => {
  if (submissionInProgress) showSuccess();
});

restartButton?.addEventListener("click", displayFormAgain);

const currentYear = document.querySelector("#current-year");
if (currentYear) currentYear.textContent = String(new Date().getFullYear());

document.querySelectorAll("[data-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    const modal = document.querySelector(`#${button.dataset.modal}`);
    if (modal instanceof HTMLDialogElement) modal.showModal();
  });
});

document.querySelectorAll(".legal-modal").forEach((modal) => {
  modal.querySelector(".modal-close")?.addEventListener("click", () => modal.close());
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.close();
  });
});
