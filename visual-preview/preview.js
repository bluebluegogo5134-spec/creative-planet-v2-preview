const toast = document.querySelector('.toast')
const notes = {
  home: ['首页 · 照料', '小王子给玫瑰浇水，把创作定义成长期照料；首屏直接看见本周节律、当前项目与七天安排。'],
  projects: ['项目 · 星球系统', '每个项目是一颗状态不同的星球；列表优先，新建保持轻量，编辑、归档和删除折叠收纳。'],
  connect: ['建立连接 · 靠近', '小王子沿星光靠近下一颗星球。创作以专注计时进入，健身以零门槛的一键打卡进入。'],
  plan: ['计划 · 星轨', '七天像七颗星组成轨道，只选日型与上午、下午、晚上；周中守住一小时，周末守住十二小时。'],
  review: ['复盘 · 回望', '坐在玫瑰旁回望星光，不给自己评分，只看见路径、额外的靠近，以及下周唯一要守住的事。'],
}
let toastTimer

function showToast(message) {
  window.clearTimeout(toastTimer)
  toast.textContent = message
  toast.classList.add('show')
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1600)
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach((screen) => screen.classList.toggle('active', screen.dataset.screen === name))
  document.querySelectorAll('.bottom-nav [data-go]').forEach((button) => button.classList.toggle('active', button.dataset.go === name))
  document.querySelector(`[data-screen="${name}"]`).scrollTop = 0
  document.querySelector('#notes-title').textContent = notes[name][0]
  document.querySelector('#notes-copy').textContent = notes[name][1]
}

document.querySelectorAll('[data-go]').forEach((button) => button.addEventListener('click', () => showScreen(button.dataset.go)))
document.querySelectorAll('[data-toast]').forEach((button) => button.addEventListener('click', () => showToast(button.dataset.toast)))
document.querySelectorAll('[data-expand]').forEach((button) => button.addEventListener('click', () => {
  const panel = document.querySelector(`#${button.dataset.expand}`)
  panel.hidden = !panel.hidden
}))
document.querySelectorAll('[data-menu]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.fold-menu').forEach((menu) => { if (menu.id !== button.dataset.menu) menu.hidden = true })
  const menu = document.querySelector(`#${button.dataset.menu}`)
  menu.hidden = !menu.hidden
}))
document.querySelectorAll('[data-mode]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-mode]').forEach((item) => item.classList.toggle('active', item === button))
  document.querySelectorAll('[data-panel]').forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === button.dataset.mode))
}))
document.querySelectorAll('.day').forEach((button) => button.addEventListener('click', () => showToast(`${button.querySelector('b').textContent}：${button.querySelector('small').textContent}`)))
