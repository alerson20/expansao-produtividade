const form = document.querySelector("#lead-form");
const nameInput = document.querySelector("#name");
const emailInput = document.querySelector("#email");
const consentInput = document.querySelector("#consent");
const submitButton = document.querySelector("#submit-button");
const formMessage = document.querySelector("#form-message");
const formContent = document.querySelector("#form-content");
const successState = document.querySelector("#success-state");
const firstName = document.querySelector("#first-name");
const restartButton = document.querySelector("#restart-form");

function normalizeEmail(value) {
  return value.trim().toLowerCase();
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

  const storedName = sessionStorage.getItem("ebookLeadFirstName");
  if (firstName) {
    firstName.textContent = storedName || "leitor";
  }

  formContent.hidden = true;
  successState.hidden = false;
  successState.setAttribute("tabindex", "-1");
  successState.focus({ preventScroll: true });

  const formSection = document.querySelector("#formulario");
  formSection?.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearSuccessParameter() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("sucesso")) return;

  url.searchParams.delete("sucesso");
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

function displayFormAgain() {
  successState.hidden = true;
  successState.removeAttribute("tabindex");
  formContent.hidden = false;
  form?.reset();
  sessionStorage.removeItem("ebookLeadFirstName");
  nameInput?.focus();
}

if (form) {
  form.addEventListener("submit", (event) => {
    formMessage.textContent = "";
    formMessage.className = "form-message";

    if (!form.checkValidity()) {
      event.preventDefault();
      form.reportValidity();
      return;
    }

    const rawName = nameInput?.value.trim() || "";
    const email = normalizeEmail(emailInput?.value || "");

    if (rawName.length < 2 || !email || !consentInput?.checked) {
      event.preventDefault();
      formMessage.textContent = "Revise os campos obrigatórios antes de continuar.";
      formMessage.className = "form-message error";
      return;
    }

    sessionStorage.setItem("ebookLeadFirstName", rawName.split(/\s+/)[0]);
    sessionStorage.setItem("ebookLeadEmail", email);
    setLoading(true);
    // O envio segue normalmente para o FormSubmit. Não usamos AJAX porque
    // a resposta automática por e-mail depende de um envio POST tradicional.
  });
}

restartButton?.addEventListener("click", displayFormAgain);

const params = new URLSearchParams(window.location.search);
if (params.get("sucesso") === "1") {
  showSuccess();
  clearSuccessParameter();
}

const currentYear = document.querySelector("#current-year");
if (currentYear) {
  currentYear.textContent = String(new Date().getFullYear());
}

document.querySelectorAll("[data-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    const modal = document.querySelector(`#${button.dataset.modal}`);
    if (modal instanceof HTMLDialogElement) {
      modal.showModal();
    }
  });
});

document.querySelectorAll(".legal-modal").forEach((modal) => {
  const closeButton = modal.querySelector(".modal-close");
  closeButton?.addEventListener("click", () => modal.close());

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.close();
    }
  });
});
