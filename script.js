const CONFIG = Object.freeze({
  supabaseUrl: "https://stnkonqgjvdtspmrjutq.supabase.co",
  supabasePublishableKey: "sb_publishable_fQ4wv0dwMaudLPAlNJ0YLg_0EYV9EjD",
  table: "leads",
});

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

const errorElements = {
  name: document.querySelector("#name-error"),
  email: document.querySelector("#email-error"),
  consent: document.querySelector("#consent-error"),
};

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
}

function clearErrors() {
  Object.values(errorElements).forEach((element) => { element.textContent = ""; });
  [nameInput, emailInput, consentInput].forEach((element) => element.removeAttribute("aria-invalid"));
  formMessage.textContent = "";
  formMessage.className = "form-message";
}

function setFieldError(field, message) {
  const input = field === "name" ? nameInput : field === "email" ? emailInput : consentInput;
  input.setAttribute("aria-invalid", "true");
  errorElements[field].textContent = message;
}

function validateForm() {
  clearErrors();
  let valid = true;
  const name = nameInput.value.trim();
  const email = normalizeEmail(emailInput.value);

  if (name.length < 2) {
    setFieldError("name", "Informe seu nome com pelo menos 2 caracteres.");
    valid = false;
  }
  if (!isValidEmail(email)) {
    setFieldError("email", "Informe um endereço de e-mail válido.");
    valid = false;
  }
  if (!consentInput.checked) {
    setFieldError("consent", "Você precisa concordar para liberar o material.");
    valid = false;
  }
  return valid;
}

function setLoading(loading) {
  submitButton.classList.toggle("loading", loading);
  submitButton.disabled = loading;
  submitButton.setAttribute("aria-busy", String(loading));
  submitButton.querySelector(".button-label").textContent = loading ? "Liberando seu acesso..." : "Quero baixar o e-book grátis";
}

function showSuccess() {
  const safeName = nameInput.value.trim().split(/\s+/)[0] || "leitor";
  firstName.textContent = safeName;
  formContent.hidden = true;
  successState.hidden = false;
  successState.focus?.();
  document.querySelector("#formulario").scrollIntoView({ behavior: "smooth", block: "center" });
}

async function saveLead(payload) {
  const response = await fetch(`${CONFIG.supabaseUrl}/rest/v1/${CONFIG.table}`, {
    method: "POST",
    headers: {
      apikey: CONFIG.supabasePublishableKey,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (response.ok) return { status: "created" };

  let details = {};
  try { details = await response.json(); } catch { /* resposta sem JSON */ }

  if (response.status === 409 || details.code === "23505") {
    return { status: "duplicate" };
  }

  const backendMessage = details.message || details.error_description || details.hint || "Erro desconhecido";
  throw new Error(`Supabase ${response.status}: ${backendMessage}`);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateForm()) return;

  setLoading(true);
  try {
    const result = await saveLead({
      name: nameInput.value.trim(),
      email: normalizeEmail(emailInput.value),
      consent: true,
    });

    if (result.status === "duplicate") {
      formMessage.textContent = "Este e-mail já estava cadastrado. O download foi liberado novamente.";
      formMessage.className = "form-message info";
      await new Promise((resolve) => setTimeout(resolve, 550));
    }

    showSuccess();
  } catch (error) {
    console.error(error);
    const technicalMessage = error instanceof Error ? error.message : String(error);
    formMessage.textContent = `Não foi possível concluir o cadastro. ${technicalMessage}`;
    formMessage.className = "form-message error";
  } finally {
    setLoading(false);
  }
});

[nameInput, emailInput].forEach((input) => {
  input.addEventListener("input", () => {
    input.removeAttribute("aria-invalid");
    const key = input === nameInput ? "name" : "email";
    errorElements[key].textContent = "";
  });
});
consentInput.addEventListener("change", () => {
  consentInput.removeAttribute("aria-invalid");
  errorElements.consent.textContent = "";
});

restartButton.addEventListener("click", () => {
  form.reset();
  clearErrors();
  successState.hidden = true;
  formContent.hidden = false;
  nameInput.focus();
});

document.querySelector("#current-year").textContent = String(new Date().getFullYear());

document.querySelectorAll("[data-modal]").forEach((button) => {
  button.addEventListener("click", () => document.querySelector(`#${button.dataset.modal}`).showModal());
});

document.querySelectorAll(".legal-modal").forEach((modal) => {
  modal.querySelector(".modal-close").addEventListener("click", () => modal.close());
  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.close();
  });
});
