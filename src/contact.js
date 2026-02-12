import { CONTACT_EMAIL } from './config.js'

export function initContactForm(form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const name = form.querySelector('#name')?.value?.trim() || ''
    const email = form.querySelector('#email')?.value?.trim() || ''
    const message = form.querySelector('#message')?.value?.trim() || ''
    const subject = encodeURIComponent('Zpráva z webu Kroměříž Elephants')
    const body = encodeURIComponent(
      `Jméno: ${name}\nEmail: ${email}\n\nZpráva:\n${message}`
    )
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
  })
}
