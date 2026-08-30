const toast = document.querySelector('.toast')
let timer

function showToast(message) {
  window.clearTimeout(timer)
  toast.textContent = message
  toast.classList.add('show')
  timer = window.setTimeout(() => toast.classList.remove('show'), 1600)
}

document.querySelectorAll('[data-toast]').forEach((button) => {
  button.addEventListener('click', () => showToast(button.dataset.toast))
})

document.querySelectorAll('.day').forEach((button) => {
  button.addEventListener('click', () => showToast(`${button.querySelector('b').textContent}：${button.querySelector('small').textContent}`))
})

document.querySelectorAll('.bottom-nav button').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.bottom-nav button').forEach((item) => item.classList.remove('active'))
    button.classList.add('active')
    showToast(`视觉预览：${button.querySelector('small').textContent}`)
  })
})
