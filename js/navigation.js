function setupSiteNavigation() {
    const navigation = document.querySelector("[data-site-navigation]");
    if (!navigation) return;

    const mobileQuery = window.matchMedia("(max-width: 760px)");
    const drawerId = "mobile-site-navigation";

    const toggle = document.createElement("button");
    toggle.className = "mobile-nav-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "فتح قائمة التنقل");
    toggle.setAttribute("aria-controls", drawerId);
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
        <span class="mobile-nav-toggle-label">القائمة</span>
    `;

    const drawer = document.createElement("aside");
    drawer.id = drawerId;
    drawer.className = "mobile-nav-drawer";
    drawer.setAttribute("aria-label", navigation.getAttribute("aria-label") || "التنقل");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("role", "dialog");
    drawer.inert = true;

    const drawerHeader = document.createElement("div");
    drawerHeader.className = "mobile-nav-header";
    drawerHeader.innerHTML = '<strong>التنقل</strong><button class="mobile-nav-close" type="button" aria-label="إغلاق قائمة التنقل">×</button>';
    drawer.append(drawerHeader);

    navigation.querySelectorAll("a").forEach(link => {
        const drawerLink = link.cloneNode(true);
        drawerLink.removeAttribute("id");
        drawerLink.classList.remove("quick-nav-link");
        drawer.append(drawerLink);
    });

    const backdrop = document.createElement("button");
    backdrop.className = "mobile-nav-backdrop";
    backdrop.type = "button";
    backdrop.tabIndex = -1;
    backdrop.setAttribute("aria-label", "إغلاق قائمة التنقل");

    navigation.parentElement.insertBefore(toggle, navigation);
    document.body.append(drawer, backdrop);

    const closeButton = drawerHeader.querySelector(".mobile-nav-close");
    let previousBodyOverflow = "";
    let isScrolled = false;

    function closeMenu(restoreFocus = false) {
        const wasOpen = drawer.classList.contains("is-open");
        drawer.classList.remove("is-open");
        toggle.classList.remove("is-open");
        drawer.inert = true;
        backdrop.classList.remove("is-visible");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "فتح قائمة التنقل");
        if (wasOpen) document.body.style.overflow = previousBodyOverflow;
        if (restoreFocus && mobileQuery.matches && isScrolled) toggle.focus();
    }

    function openMenu() {
        if (!mobileQuery.matches || !isScrolled) return;
        previousBodyOverflow = document.body.style.overflow;
        drawer.inert = false;
        drawer.classList.add("is-open");
        toggle.classList.add("is-open");
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", "إغلاق قائمة التنقل");
        backdrop.classList.add("is-visible");
        document.body.style.overflow = "hidden";
        closeButton.focus();
    }

    function syncViewport() {
        if (mobileQuery.matches) {
            updateScrollButton();
            return;
        }
        closeMenu();
        toggle.classList.remove("is-scrolled", "is-open");
        toggle.tabIndex = 0;
        toggle.removeAttribute("aria-hidden");
    }

    function updateScrollButton() {
        isScrolled = mobileQuery.matches && window.scrollY > 120;
        toggle.classList.toggle("is-scrolled", isScrolled);
        toggle.tabIndex = mobileQuery.matches && !isScrolled ? -1 : 0;
        toggle.setAttribute("aria-hidden", mobileQuery.matches && !isScrolled ? "true" : "false");
    }

    toggle.addEventListener("click", () => {
        if (drawer.classList.contains("is-open")) closeMenu(true);
        else openMenu();
    });
    closeButton.addEventListener("click", () => closeMenu(true));
    backdrop.addEventListener("click", () => closeMenu(true));
    drawer.addEventListener("click", event => {
        if (event.target.closest("a")) closeMenu();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && drawer.classList.contains("is-open")) {
            closeMenu(true);
            return;
        }
        if (event.key === "Tab" && drawer.classList.contains("is-open")) {
            const focusable = [...drawer.querySelectorAll('a[href], button:not([disabled])')];
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!first) return;
            if (!drawer.contains(document.activeElement)) {
                event.preventDefault();
                first.focus();
            } else if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });
    window.addEventListener("scroll", updateScrollButton, { passive: true });
    window.addEventListener("resize", syncViewport);

    if (mobileQuery.addEventListener) mobileQuery.addEventListener("change", syncViewport);
    else mobileQuery.addListener(syncViewport);
    syncViewport();
}

setupSiteNavigation();
