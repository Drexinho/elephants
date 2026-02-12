export function initMobileMenu() {
  const btn = document.getElementById('menu-btn')
  const menu = document.getElementById('mobile-menu')
  if (!btn || !menu) return

  btn.addEventListener('click', () => {
    const hidden = menu.classList.toggle('hidden')
    btn.setAttribute('aria-expanded', !hidden)
  })

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menu.classList.add('hidden')
      btn.setAttribute('aria-expanded', 'false')
    })
  })
}
