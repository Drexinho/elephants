import './style.css'
import { initMobileMenu } from './menu.js'
import { initContactForm } from './contact.js'
import { CONTACT_PHONE, CONTACT_EMAIL, SOCIAL_INSTAGRAM_URL } from './config.js'

function initPageLoader() {
  const loader = document.getElementById('page-loader')
  if (!loader) return
  const minShowMs = 600
  const start = Date.now()

  function hide() {
    loader.classList.add('loader-fade-out')
    setTimeout(() => {
      loader.hidden = true
    }, 300)
  }

  window.addEventListener('load', () => {
    const elapsed = Date.now() - start
    const wait = Math.max(0, minShowMs - elapsed)
    setTimeout(hide, wait)
  })
}

function applyContactConfig() {
  document.querySelectorAll('[data-contact="phone"]').forEach((el) => {
    el.setAttribute('href', `tel:${CONTACT_PHONE}`)
  })
  document.querySelectorAll('[data-contact="email"]').forEach((el) => {
    el.setAttribute('href', `mailto:${CONTACT_EMAIL}`)
    el.textContent = CONTACT_EMAIL
  })
  document.querySelectorAll('[data-contact="instagram"]').forEach((el) => {
    el.setAttribute('href', SOCIAL_INSTAGRAM_URL)
  })
}

document.addEventListener('DOMContentLoaded', () => {
  initPageLoader()
  initMobileMenu()
  applyContactConfig()
  const form = document.getElementById('contact-form')
  if (form) initContactForm(form)
})
