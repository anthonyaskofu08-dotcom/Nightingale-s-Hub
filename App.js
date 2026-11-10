
const subjects = [
  {
    group: "Basic Medical Sciences",
    items: [
      "Anatomy & Physiology",
      "Biochemistry",
      "Microbiology & Parasitology",
      "Immunology",
      "Nutrition & Dietetics",
      "Genetics and Human Biology"
    ]
  },
  {
    group: "Core Nursing Sciences",
    items: [
      "Fundamentals of Nursing",
      "Health Assessment",
      "Medical-Surgical Nursing",
      "Pharmacology",
      "Nursing Procedures and Clinical Skills"
    ]
  },
  {
    group: "Specialised Nursing",
    items: [
      "Midwifery and Obstetric Nursing",
      "Reproductive Health",
      "Paediatric Nursing",
      "Neonatal Nursing",
      "Mental Health and Psychiatric Nursing",
      "Community and Public Health Nursing",
      "Emergency and Critical Care Nursing"
    ]
  },
  {
    group: "Professional Nursing",
    items: [
      "Nursing Ethics, Law and Professionalism",
      "Leadership and Management",
      "Nursing Education",
      "Research and Evidence-Based Practice"
    ]
  },
  {
    group: "Supporting Disciplines",
    items: [
      "Psychology, Sociology and Anthropology",
      "Communication, Digital Literacy and Health Informatics"
    ]
  }
];

function showPage(page) {
  document.querySelectorAll(".page").forEach(p => {
    p.classList.remove("active");
  });

  document.getElementById(page).classList.add("active");

  document.querySelectorAll(".nav").forEach(b => {
    b.classList.remove("active");
    b.removeAttribute("aria-current");
  });

  const selected = document.querySelector(
    `.nav[data-page="${page}"]`
  );

  if (selected) {
    selected.classList.add("active");
    selected.setAttribute("aria-current", "page");
  }

  const titles = {
    dashboard: "Overview",
    catalogue: "Nursing Catalogue",
    topic: "Topic Learning",
    materials: "My Study Materials",
    practice: "Practice Centre",
    shorts: "Nightingale Shorts",
    publications: "Publications"
  };

  document.getElementById("pageTitle").textContent =
    titles[page] || "Learning Centre";

  closeMenu(false);
  document.getElementById("pageTitle").focus();
}

document.querySelectorAll(".nav").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});

const sidebar = document.getElementById("sidebar");
const main = document.querySelector("main");
const menuButton = document.getElementById("menuButton");
const closeMenuButton = document.getElementById("closeMenuButton");
const sidebarBackdrop = document.getElementById("sidebarBackdrop");

function openMenu() {
  sidebar.classList.add("open");
  sidebar.inert = false;
  sidebar.setAttribute("aria-hidden", "false");
  main.inert = true;
  sidebarBackdrop.classList.add("active");
  menuButton.setAttribute("aria-expanded", "true");
  document.body.classList.add("menu-open");
  closeMenuButton.focus();
}

function closeMenu(restoreFocus = false) {
  sidebar.classList.remove("open");
  sidebarBackdrop.classList.remove("active");
  menuButton.setAttribute("aria-expanded", "false");
  document.body.classList.remove("menu-open");

  const isMobile = window.matchMedia("(max-width: 750px)").matches;
  sidebar.inert = isMobile;
  sidebar.setAttribute("aria-hidden", String(isMobile));
  main.inert = false;

  if (restoreFocus && isMobile) {
    menuButton.focus();
  }
}

menuButton.addEventListener("click", () => {
  if (menuButton.getAttribute("aria-expanded") === "true") {
    closeMenu(true);
  } else {
    openMenu();
  }
});

closeMenuButton.addEventListener("click", () => closeMenu(true));
sidebarBackdrop.addEventListener("click", () => closeMenu(true));

document.addEventListener("keydown", event => {
  const menuIsOpen = menuButton.getAttribute("aria-expanded") === "true";

  if (event.key === "Escape" && menuIsOpen) {
    closeMenu(true);
    return;
  }

  if (event.key === "Tab" && menuIsOpen) {
    const focusable = sidebar.querySelectorAll("button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex='-1'])");
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});

window.addEventListener("resize", () => {
  if (!window.matchMedia("(max-width: 750px)").matches) {
    closeMenu(false);
  }
});

function renderSubjects(list = subjects) {
  const container = document.getElementById("subjectList");
  container.innerHTML = "";

  list.forEach(group => {
    const section = document.createElement("div");
    section.className = "panel";

    const heading = document.createElement("h2");
    heading.textContent = group.group;
    section.appendChild(heading);

    group.items.forEach(subject => {
      const button = document.createElement("button");
      button.className = "subject";
      button.style.display = "block";
      button.style.width = "100%";
      button.style.marginBottom = "8px";
      button.textContent = subject + " →";
      button.addEventListener("click", () => openSubject(subject));
      section.appendChild(button);
    });

    container.appendChild(section);
  });
}

function filterSubjects() {
  const search = document.getElementById("search")
    .value.toLowerCase();

  const filtered = subjects.map(group => ({
    group: group.group,
    items: group.items.filter(subject =>
      subject.toLowerCase().includes(search)
    )
  })).filter(group => group.items.length > 0);

  renderSubjects(filtered);
}

function openSubject(subject) {
  document.getElementById("topicName").textContent = subject;
  document.getElementById("topicContent").innerHTML =
    "<p>Select a learning level to explore this subject.</p>";
  setLevel("diploma");
  showPage("topic");
}

function openTopic(topic) {
  document.getElementById("topicName").textContent = topic;
  setLevel("diploma");
  showPage("topic");
}

function setLevel(level, button) {
  document.getElementById("levelTitle").textContent =
    level === "diploma"
      ? "Diploma Learning Level"
      : "Bachelor of Science in Nursing (BScN)";

  const content = level === "diploma"
    ? `
      <h3>Learning focus</h3>
      <ul>
        <li>Definition and classification</li>
        <li>Causes and risk factors</li>
        <li>Signs and symptoms</li>
        <li>Investigations and management</li>
        <li>Nursing assessment and care</li>
        <li>Patient education and complications</li>
      </ul>
    `
    : `
      <h3>Advanced learning focus</h3>
      <ul>
        <li>Advanced pathophysiology</li>
        <li>Clinical interpretation</li>
        <li>Critical clinical reasoning</li>
        <li>Evidence-based management</li>
        <li>Comprehensive nursing decisions</li>
        <li>Evaluation of patient outcomes</li>
      </ul>
    `;

  document.getElementById("topicContent").innerHTML = content;

  document.querySelectorAll(".level").forEach(b => {
    b.classList.remove("active");
    b.setAttribute("aria-pressed", "false");
  });

  if (button) {
    button.classList.add("active");
    button.setAttribute("aria-pressed", "true");
  } else {
    const defaultButton = document.querySelectorAll(".level")[0];
    defaultButton.classList.add("active");
    defaultButton.setAttribute("aria-pressed", "true");
  }
}

function demo(name) {
  alert(name + " will be connected during the next development stage.");
}

document.getElementById("fileInput").addEventListener("change", e => {
  const file = e.target.files[0];

  if (file) {
    document.getElementById("fileMessage").textContent =
      file.name + " selected. Actual secure uploading is not connected yet.";
  }
});

renderSubjects();
setLevel("diploma");
closeMenu(false);
