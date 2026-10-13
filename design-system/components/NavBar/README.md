# NavBar

The floating header card loaded on every page by components/component-loader.js.

**Markup:** `header.header` > `nav.nav__container` > `a.nav__logo` > `img.nav__logo-img` (logo.svg, 52px tall) + `ul.nav__menu` of `a.nav__link`, last item `li.nav__item--cta` > `a.nav__link--cta`.

- Fixed, inset `float-inset` from the viewport, max `container-xl`, `float-surface` with 1px `float-border`, `radius-xl`, `float-shadow` (→ `float-shadow-scrolled` + `border-medium` once scrolled via `.header--scrolled`).
- Height `header-h` (64px; 76px ≥1024px); inner padding `float-pad`.
- Links `text-secondary` 500, hover `text-primary` + 1px underline; 44px touch height.
- One CTA, styled like the primary button (`brand-blue-strong`, 19px bold label).
- Below 1024px the menu collapses behind a 3-line toggle into a second floating card under the bar.
