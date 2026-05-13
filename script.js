const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const siteNav = document.querySelector("[data-site-nav]");
const contactForm = document.querySelector("[data-contact-form]");
const formStatus = document.querySelector("[data-form-status]");

if (window.lucide) {
  window.lucide.createIcons();
}

const syncHeader = () => {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 12);
};

syncHeader();
window.addEventListener("scroll", syncHeader, { passive: true });

if (menuButton && siteNav) {
  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") === "true";
    menuButton.setAttribute("aria-expanded", String(!isOpen));
    siteNav.classList.toggle("is-open", !isOpen);
    document.body.classList.toggle("menu-open", !isOpen);
  });

  siteNav.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    if (!event.target.closest("a")) return;
    menuButton.setAttribute("aria-expanded", "false");
    siteNav.classList.remove("is-open");
    document.body.classList.remove("menu-open");
  });
}

if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const topic = String(formData.get("topic") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (!name || !email || !topic || !message) {
      if (formStatus) formStatus.textContent = "未入力の項目があります。";
      return;
    }

    const subject = `POWERS GYMへの相談：${topic}`;
    const body = [
      `お名前：${name}`,
      `メールアドレス：${email}`,
      `ご用件：${topic}`,
      "",
      "ご相談内容：",
      message,
    ].join("\n");

    const mailto = new URL("mailto:shinmaruko@powers-gym.co.jp");
    mailto.searchParams.set("subject", subject);
    mailto.searchParams.set("body", body);

    if (formStatus) formStatus.textContent = "メール作成画面を開きます。";
    window.location.href = mailto.toString();
  });
}
