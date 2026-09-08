/**
 * Collapsed persistent top nav (desktop) — nav-scrolled pill + chat slot sibling.
 * Matches index.html behavior: chat moves to .header-nav-row when scrolled.
 */
(function () {
  function initPersistentNav() {
    var headerNav = document.querySelector('header nav');
    var headerChatSlot = document.querySelector('.header-chat-slot');
    var headerNavRow = document.querySelector('.header-nav-row');
    var getInTouchItem = document.querySelector('header nav .desk-menu .get-in-touch-btn')
      ? document.querySelector('header nav .desk-menu .get-in-touch-btn').closest('li')
      : null;
    var persistentNavMinWidth = window.matchMedia('(min-width: 769px)');
    var persistentNavOffset = 140;

    if (!headerNav) return;

    function isPersistentNavActive() {
      return document.body.classList.contains('nav-persistent');
    }

    function syncChatSlotPlacement() {
      if (!headerChatSlot || !headerNavRow) return;
      var persist = document.body.classList.contains('nav-persistent');
      if (persist) {
        if (headerChatSlot.parentElement !== headerNavRow) {
          headerNavRow.appendChild(headerChatSlot);
        }
      } else if (getInTouchItem && headerChatSlot.nextElementSibling !== getInTouchItem) {
        getInTouchItem.parentNode.insertBefore(headerChatSlot, getInTouchItem);
      }
    }

    function setPersistentNavExpanded(expanded) {
      document.body.classList.toggle('nav-expanded', expanded);
      headerNav.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      headerNav.setAttribute('aria-label', expanded ? 'Close site navigation' : 'Open site navigation');
      if (!expanded && headerNav.contains(document.activeElement)) {
        document.activeElement.blur();
        setTimeout(function () {
          if (headerNav.contains(document.activeElement)) document.activeElement.blur();
        }, 0);
      }
      syncChatSlotPlacement();
    }

    function updatePersistentNav() {
      var shouldPersist = persistentNavMinWidth.matches && window.scrollY > persistentNavOffset;
      document.body.classList.toggle('nav-persistent', shouldPersist);
      headerNav.classList.toggle('nav-scrolled', shouldPersist);
      headerNav.setAttribute(
        'aria-label',
        shouldPersist && document.body.classList.contains('nav-expanded')
          ? 'Close site navigation'
          : shouldPersist
            ? 'Open site navigation'
            : 'Site navigation'
      );
      headerNav.setAttribute(
        'aria-expanded',
        shouldPersist && document.body.classList.contains('nav-expanded') ? 'true' : 'false'
      );
      if (shouldPersist) {
        headerNav.setAttribute('tabindex', '0');
      } else {
        headerNav.removeAttribute('tabindex');
      }
      if (!shouldPersist) setPersistentNavExpanded(false);
      syncChatSlotPlacement();
    }

    headerNav.setAttribute('aria-expanded', 'false');

    headerNav.addEventListener('click', function (e) {
      if (!isPersistentNavActive()) return;
      var isExpanded = document.body.classList.contains('nav-expanded');
      var clickedLinkOrButton = e.target.closest('a, button');
      var navRect = headerNav.getBoundingClientRect();
      var clickedCloseArea = isExpanded && e.clientX >= navRect.right - 52;

      if (!isExpanded) {
        e.preventDefault();
        e.stopPropagation();
        setPersistentNavExpanded(true);
      } else if (clickedCloseArea || !clickedLinkOrButton) {
        e.preventDefault();
        e.stopPropagation();
        setPersistentNavExpanded(false);
      }
    });

    headerNav.addEventListener('keydown', function (e) {
      if (!isPersistentNavActive()) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setPersistentNavExpanded(!document.body.classList.contains('nav-expanded'));
      }
    });

    document.addEventListener('click', function (e) {
      if (
        isPersistentNavActive() &&
        !headerNav.contains(e.target) &&
        !(headerChatSlot && headerChatSlot.contains(e.target))
      ) {
        setPersistentNavExpanded(false);
      }
    });

    window.addEventListener('keyup', function (e) {
      if (e.keyCode === 27) setPersistentNavExpanded(false);
    });

    updatePersistentNav();
    window.addEventListener('scroll', updatePersistentNav, { passive: true });
    persistentNavMinWidth.addEventListener('change', updatePersistentNav);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPersistentNav);
  } else {
    initPersistentNav();
  }
})();
