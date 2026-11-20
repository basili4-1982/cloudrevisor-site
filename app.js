(function () {
  "use strict";

  var header = document.querySelector(".header");
  var nav = document.getElementById("nav");
  var burger = document.querySelector(".burger");

  if (burger && nav) {
    var closeNav = function () {
      nav.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-label", "Открыть меню");
    };

    burger.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    });

    nav.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeNav();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeNav();
    });

    document.addEventListener("click", function (event) {
      if (!nav.classList.contains("is-open")) return;
      if (!nav.contains(event.target) && !burger.contains(event.target)) closeNav();
    });
  }

  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 4);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tabs__btn"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".tabs__panel"));

  function activateTab(tab) {
    tabs.forEach(function (item) {
      var active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", active ? "true" : "false");
      item.tabIndex = active ? 0 : -1;
    });

    panels.forEach(function (panel) {
      var active = panel.id === tab.getAttribute("aria-controls");
      panel.classList.toggle("is-active", active);
      if (active) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
    });
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () {
      activateTab(tab);
    });

    tab.addEventListener("keydown", function (event) {
      var next = null;
      if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
      if (event.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
      if (event.key === "Home") next = tabs[0];
      if (event.key === "End") next = tabs[tabs.length - 1];
      if (!next) return;
      event.preventDefault();
      next.focus();
      activateTab(next);
    });
  });

  var revealItems = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  document.querySelectorAll(".grid, .flow, .stats__grid, .security, .faq__list").forEach(function (group) {
    Array.prototype.slice.call(group.children).forEach(function (item, index) {
      if (item.classList.contains("reveal")) {
        item.style.transitionDelay = Math.min(index * 70, 280) + "ms";
      }
    });
  });

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );

    revealItems.forEach(function (item) {
      observer.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
  }

  window.addEventListener("beforeprint", function () {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
  });

  var form = document.getElementById("pilot-form");
  var note = document.getElementById("form-note");
  var contactEmail = "hello@cloudrevisor.ru";

  if (form && note) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var data = new FormData(form);
      var name = String(data.get("name") || "").trim();
      var company = String(data.get("company") || "").trim();
      var role = String(data.get("role") || "").trim();
      var email = String(data.get("email") || "").trim();
      var resources = String(data.get("resources") || "").trim();
      var comment = String(data.get("comment") || "").trim();
      var consent = data.get("consent");

      note.classList.remove("is-error", "is-ok");

      if (!name || !company || !email) {
        note.textContent = "Заполните имя, компанию и рабочую почту.";
        note.classList.add("is-error");
        return;
      }

      var emailField = form.querySelector('input[name="email"]');
      if (emailField && !emailField.checkValidity()) {
        note.textContent = "Проверьте адрес почты.";
        note.classList.add("is-error");
        emailField.focus();
        return;
      }

      if (!consent) {
        note.textContent = "Нужно согласие на обработку персональных данных.";
        note.classList.add("is-error");
        return;
      }

      var subject = "Запрос пилота: " + company;
      var body = [
        "Имя: " + name,
        "Компания: " + company,
        "Роль: " + (role || "—"),
        "Почта: " + email,
        "Ресурсов в облаке: " + (resources || "—"),
        "",
        "Комментарий:",
        comment || "—"
      ].join("\n");

      note.textContent = "Открываем почтовый клиент. Если он не открылся — напишите на " + contactEmail + ".";
      note.classList.add("is-ok");

      window.location.href =
        "mailto:" +
        contactEmail +
        "?subject=" +
        encodeURIComponent(subject) +
        "&body=" +
        encodeURIComponent(body);
    });
  }
})();
