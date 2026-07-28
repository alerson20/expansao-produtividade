import { EBOOK_CONFIG } from "./config.js";

const APPS_SCRIPT_URL = String(EBOOK_CONFIG.appsScriptUrl || "").trim();

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
let submissionInProgress = false;
let submissionTimeout = null;

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isConfigured() {
  return /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/.test(
    APPS_SCRIPT_URL,
  );
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

function clearMessage() {
  if (!formMessage) return;
  formMessage.textContent = "";
  formMessage.className = "form-message";
}

function showSuccess() {
  if (!formContent || !successState) return;

  clearTimeout(submissionTimeout);
  submissionInProgress = false;
  setLoading(false);
  clearMessage();

  const storedName = sessionStorage.getItem("ebookLeadFirstName");
  if (firstName) firstName.textContent = storedName || "leitor";

  formContent.hidden = true;
  successState.hidden = false;
  successState.setAttribute("tabindex", "-1");
  successState.focus({ preventScroll: true });
  document
    .querySelector("#formulario")
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
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
  if (!successState || !formContent) return;
  successState.hidden = true;
  successState.removeAttribute("tabindex");
  formContent.hidden = false;
  form?.reset();
  sessionStorage.removeItem("ebookLeadFirstName");
  sessionStorage.removeItem("ebookLeadEmail");
  clearMessage();
  nameInput?.focus();
}

function isTrustedAppsScriptOrigin(origin) {
  try {
    const { hostname, protocol } = new URL(origin);
    if (protocol !== "https:") return false;
    return (
      hostname === "script.google.com" ||
      hostname === "script.googleusercontent.com" ||
      hostname.endsWith(".googleusercontent.com")
    );
  } catch {
    return false;
  }
}

if (form) {
  if (isConfigured()) {
    form.action = APPS_SCRIPT_URL;
  }

  form.addEventListener("submit", (event) => {
    clearMessage();

    if (!isConfigured()) {
      event.preventDefault();
      showError(
        "O formulário ainda não foi conectado. Cole a URL /exec do Google Apps Script no arquivo config.js.",
      );
      return;
    }

    if (!form.checkValidity()) {
      event.preventDefault();
      form.reportValidity();
      return;
    }

    const rawName = nameInput?.value.trim() || "";
    const email = normalizeEmail(emailInput?.value);

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
        showError(
          "O envio não foi confirmado. Verifique se a implantação do Apps Script está como App da Web, executando como você e acessível a qualquer pessoa.",
        );
      }
    }, 30000);
  });
}

window.addEventListener("message", (event) => {
  if (!submissionInProgress || !isTrustedAppsScriptOrigin(event.origin)) return;

  const payload = event.data;
  if (!payload || payload.source !== "ebook-apps-script") return;

  if (payload.status === "ok" || payload.status === "duplicate") {
    showSuccess();
    return;
  }

  showError(
    payload.message ||
      "O Google recebeu o formulário, mas não conseguiu concluir o cadastro.",
  );
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
