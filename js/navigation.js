function setupSiteNavigation() {
    const navigation = document.querySelector("[data-site-navigation]");
    if (!navigation) return;

    const mobileQuery = window.matchMedia("(max-width: 760px)");
    const menuId = navigation.id || "site-navigation";
    navigation.id = menuId;

    const toggle = document.createElement("button");
    toggle.className = "mobile-nav-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "فتح قائمة التنقل");
    toggle.setAttribute("aria-controls", menuId);
    toggle.setAttribute("aria-expanded", "false");
    toggle.innerHTML = `
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
        <span class="mobile-nav-toggle-label">القائمة</span>
    `;

    const drawerHeader = document.createElement("div");
    drawerHeader.className = "mobile-nav-header";
    drawerHeader.innerHTML = '<strong>التنقل</strong><button class="mobile-nav-close" type="button" aria-label="إغلاق قائمة التنقل">×</button>';
    navigation.prepend(drawerHeader);

    const backdrop = document.createElement("button");
    backdrop.className = "mobile-nav-backdrop";
    backdrop.type = "button";
    backdrop.tabIndex = -1;
    backdrop.setAttribute("aria-label", "إغلاق قائمة التنقل");
    navigation.parentElement.insertBefore(toggle, navigation);
    document.body.append(backdrop);

    const closeButton = drawerHeader.querySelector(".mobile-nav-close");
    let previousBodyOverflow = "";
    let isScrolled = false;

    function closeMenu(restoreFocus = false) {
        const wasOpen = navigation.classList.contains("is-open");
        navigation.classList.remove("is-open");
        toggle.classList.remove("is-open");
        toggle.tabIndex = mobileQuery.matches && !isScrolled ? -1 : 0;
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "فتح قائمة التنقل");
        navigation.inert = mobileQuery.matches && isScrolled;
        backdrop.classList.remove("is-visible");
        if (wasOpen) document.body.style.overflow = previousBodyOverflow;
        if (restoreFocus && mobileQuery.matches && isScrolled) toggle.focus();
    }

    function openMenu() {
        if (!mobileQuery.matches || !isScrolled) return;
        previousBodyOverflow = document.body.style.overflow;
        navigation.inert = false;
        navigation.classList.add("is-open");
        toggle.classList.add("is-open");
        toggle.tabIndex = -1;
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
        navigation.inert = false;
        navigation.classList.remove("is-scrolled");
        toggle.classList.remove("is-scrolled", "is-open");
        toggle.tabIndex = 0;
        toggle.removeAttribute("aria-hidden");
    }

    function updateScrollButton() {
        isScrolled = mobileQuery.matches && window.scrollY > 120;
        navigation.classList.toggle("is-scrolled", isScrolled);
        toggle.classList.toggle("is-scrolled", mobileQuery.matches && isScrolled);
        toggle.tabIndex = mobileQuery.matches && !isScrolled ? -1 : 0;
        toggle.setAttribute("aria-hidden", mobileQuery.matches && !isScrolled ? "true" : "false");
        if (mobileQuery.matches && !navigation.classList.contains("is-open")) {
            navigation.inert = isScrolled;
        }
    }

    toggle.addEventListener("click", () => {
        if (navigation.classList.contains("is-open")) closeMenu(true);
        else openMenu();
    });
    closeButton.addEventListener("click", () => closeMenu(true));
    backdrop.addEventListener("click", () => closeMenu(true));
    navigation.addEventListener("click", event => {
        if (event.target.closest("a")) closeMenu();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && navigation.classList.contains("is-open")) {
            closeMenu(true);
            return;
        }
        if (event.key === "Tab" && navigation.classList.contains("is-open")) {
            const focusable = [...navigation.querySelectorAll('a[href], button:not([disabled])')];
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!first) return;
            if (!navigation.contains(document.activeElement)) {
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
    window.addEventListener("scroll", () => {
        updateScrollButton();
    }, { passive: true });
    window.addEventListener("resize", syncViewport);

    if (mobileQuery.addEventListener) mobileQuery.addEventListener("change", syncViewport);
    else mobileQuery.addListener(syncViewport);
    syncViewport();
}

setupSiteNavigation();
