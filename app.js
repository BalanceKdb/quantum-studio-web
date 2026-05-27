/* ========================================
   量子事务所 Quantum Studio - 主脚本
   ======================================== */

// =====================================================
//  一、量子粒子动画系统
// =====================================================

const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
const PARTICLE_COUNT = 200;
const CONNECTION_DISTANCE = 140;
const MOUSE_RADIUS = 180;
const MOUSE_FORCE = 0.06;

let mouse = { x: -9999, y: -9999 };
let animationId;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);

canvas.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

canvas.addEventListener('mouseleave', () => {
  mouse.x = -9999;
  mouse.y = -9999;
});

// 移动端触摸支持
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  mouse.x = e.touches[0].clientX;
  mouse.y = e.touches[0].clientY;
}, { passive: false });

canvas.addEventListener('touchend', () => {
  mouse.x = -9999;
  mouse.y = -9999;
});

class Particle {
  constructor() {
    this.reset();
    // 初始随机分布
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
  }

  reset() {
    this.x = Math.random() * (canvas.width || window.innerWidth);
    this.y = Math.random() * (canvas.height || window.innerHeight);
    this.vx = (Math.random() - 0.5) * 1.2;
    this.vy = (Math.random() - 0.5) * 1.2;
    this.size = Math.random() * 2.5 + 0.8;
    // 配色：量子蓝 或 量子紫
    this.color = Math.random() < 0.55 ? 'rgba(0, 212, 255,' : 'rgba(124, 58, 237,';
    this.alpha = Math.random() * 0.6 + 0.2;
  }

  update() {
    // 鼠标吸引
    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < MOUSE_RADIUS) {
      const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
      this.vx += (dx / dist) * force * MOUSE_FORCE;
      this.vy += (dy / dist) * force * MOUSE_FORCE;
    }

    // 阻尼
    this.vx *= 0.998;
    this.vy *= 0.998;

    this.x += this.vx;
    this.y += this.vy;

    // 边界回弹
    if (this.x < 0) { this.x = 0; this.vx *= -1; }
    if (this.x > canvas.width) { this.x = canvas.width; this.vx *= -1; }
    if (this.y < 0) { this.y = 0; this.vy *= -1; }
    if (this.y > canvas.height) { this.y = canvas.height; this.vy *= -1; }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color + this.alpha + ')';
    ctx.fill();
  }
}

function initParticles() {
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }
}

function drawConnections() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < CONNECTION_DISTANCE) {
        const opacity = (1 - dist / CONNECTION_DISTANCE) * 0.25;
        // 根据距离混合颜色
        const midX = (particles[i].x + particles[j].x) / 2;
        const gradient = ctx.createLinearGradient(
          particles[i].x, particles[i].y,
          particles[j].x, particles[j].y
        );
        gradient.addColorStop(0, 'rgba(0, 212, 255,' + opacity + ')');
        gradient.addColorStop(1, 'rgba(124, 58, 237,' + opacity + ')');

        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  particles.forEach(p => {
    p.update();
    p.draw();
  });

  drawConnections();
  animationId = requestAnimationFrame(animateParticles);
}

resizeCanvas();
initParticles();
animateParticles();

// =====================================================
//  二、导航栏行为
// =====================================================

const navbar = document.getElementById('navbar');
const navLinks = document.querySelectorAll('.nav-links a');
const sections = document.querySelectorAll('section[id]');

// 滚动时导航栏样式切换
window.addEventListener('scroll', () => {
  if (window.scrollY > 60) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }

  // 更新激活链接
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 120;
    if (window.scrollY >= sectionTop) {
      current = section.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === '#' + current) {
      link.classList.add('active');
    }
  });
});

// 平滑滚动
navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const targetId = link.getAttribute('href').substring(1);
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // 移动端关闭菜单
      document.getElementById('navLinks').classList.remove('open');
      document.getElementById('menuToggle').classList.remove('active');
    }
  });
});

// 移动端菜单切换
const menuToggle = document.getElementById('menuToggle');
menuToggle.addEventListener('click', () => {
  menuToggle.classList.toggle('active');
  document.getElementById('navLinks').classList.toggle('open');
});

// =====================================================
//  三、区段入场动画 (Intersection Observer)
// =====================================================

const revealElements = document.querySelectorAll('.reveal');

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, {
  threshold: 0.12,
  rootMargin: '0px 0px -40px 0px'
});

revealElements.forEach(el => observer.observe(el));

// =====================================================
//  四、AI 工作台系统
// =====================================================

// --- 数据存储键 ---
const STORAGE_KEY = 'quantum_studio_workbench';

// --- 默认数据 ---
function getDefaultData() {
  return {
    topics: [
      { id: 't1', title: '量子恋人', genre: '科幻爱情', createdAt: Date.now() - 86400000 * 3 },
      { id: 't2', title: '叠加态的周末', genre: '喜剧', createdAt: Date.now() - 86400000 * 2 },
      { id: 't3', title: '薛定谔的面试', genre: '职场', createdAt: Date.now() - 86400000 }
    ],
    scripts: [
      { id: 's1', title: '量子恋人·第一幕', topicId: 't1', content: '【场景：量子实验室】\n\n林深站在量子计算机前，屏幕上的数据流如星河般闪烁。她已经连续工作了36小时，只为验证那个疯狂的猜想——意识可以量子化传输。\n\n门开了。\n\n"还在忙？"\n\n她转身，看见苏默靠在门框上，手里拎着两杯咖啡。', createdAt: Date.now() - 86400000 * 2 }
    ],
    roles: [
      { id: 'r1', name: '林深', traits: '量子物理学家，偏执、天才、孤独', createdAt: Date.now() - 86400000 * 3 },
      { id: 'r2', name: '苏默', traits: 'AI工程师，温柔、幽默、坚定', createdAt: Date.now() - 86400000 * 3 }
    ],
    kanban: {
      todo: [
        { id: 'k1', title: '量子恋人 第二幕剧本', desc: '需要完成第二幕的初稿' },
        { id: 'k2', title: '薛定谔的猫 分镜设计', desc: '科普动画分镜稿' }
      ],
      doing: [
        { id: 'k3', title: '量子恋人 角色定妆', desc: '林深 & 苏默 的AI角色生成' }
      ],
      done: [
        { id: 'k4', title: '项目立项书', desc: '量子事务所2026内容规划' }
      ]
    },
    events: {}
  };
}

// --- 本地存储操作 ---
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      // 确保结构完整
      const defaults = getDefaultData();
      for (const key of Object.keys(defaults)) {
        if (!data[key]) data[key] = defaults[key];
      }
      return data;
    }
  } catch (e) { /* ignore */ }
  return getDefaultData();
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    showToast('存储空间不足，请清理数据', 'error');
  }
}

let appData = loadData();

// --- 生成唯一 ID ---
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// --- Toast 通知 ---
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast ' + type + ' show';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2500);
}

// --- 工作台面板切换 ---
const workbenchTabs = document.getElementById('workbenchTabs');
const workbenchPanels = document.querySelectorAll('.workbench-panel');

workbenchTabs.addEventListener('click', (e) => {
  const tab = e.target.closest('.workbench-tab');
  if (!tab) return;

  // 切换激活标签
  document.querySelectorAll('.workbench-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');

  // 切换面板
  const panelId = tab.getAttribute('data-panel');
  workbenchPanels.forEach(p => p.classList.remove('active'));
  document.getElementById(panelId).classList.add('active');

  // 切换面板时刷新对应内容
  if (panelId === 'panel-kanban') renderKanban();
  if (panelId === 'panel-calendar') renderCalendar();
  if (panelId === 'panel-scripts') refreshScriptTopicRef();
});

// =====================================================
//  选题库
// =====================================================

function renderTopics() {
  const container = document.getElementById('topicsList');
  if (appData.topics.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px 0;">暂无选题，添加你的第一个创意吧 ✨</p>';
    return;
  }

  container.innerHTML = appData.topics.map(t => {
    const date = new Date(t.createdAt);
    const dateStr = date.getFullYear() + '年' + String(date.getMonth()+1).padStart(2,'0') + '月' + String(date.getDate()).padStart(2,'0') + '日 ' + String(date.getHours()).padStart(2,'0') + ':' + String(date.getMinutes()).padStart(2,'0');
    return `
      <div class="wb-card" data-id="${t.id}">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div>
            <h4>${escapeHtml(t.title)}</h4>
            <p><span style="background:rgba(0,212,255,0.1);color:var(--accent-cyan);padding:2px 10px;border-radius:50px;font-size:0.75rem;">${escapeHtml(t.genre)}</span>  ·  ${dateStr}</p>
          </div>
          <button class="wb-btn wb-btn-danger wb-btn-sm" onclick="deleteTopic('${t.id}')">删除</button>
        </div>
      </div>`;
  }).join('');
}

function addTopic() {
  const titleEl = document.getElementById('topicInput');
  const genreEl = document.getElementById('topicGenre');
  const title = titleEl.value.trim();
  const genre = genreEl.value.trim() || '未分类';

  if (!title) { showToast('请输入选题标题', 'error'); return; }

  appData.topics.unshift({
    id: genId(),
    title,
    genre,
    createdAt: Date.now()
  });

  saveData(appData);
  renderTopics();
  refreshScriptTopicRef();
  titleEl.value = '';
  genreEl.value = '';
  showToast('选题已添加', 'success');
}

function deleteTopic(id) {
  appData.topics = appData.topics.filter(t => t.id !== id);
  saveData(appData);
  renderTopics();
  refreshScriptTopicRef();
  showToast('选题已删除', 'info');
}

document.getElementById('btnAddTopic').addEventListener('click', addTopic);
document.getElementById('topicInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTopic();
});

// =====================================================
//  剧本台
// =====================================================

function refreshScriptTopicRef() {
  const select = document.getElementById('scriptTopicRef');
  select.innerHTML = '<option value="">关联选题（可选）</option>' +
    appData.topics.map(t => `<option value="${t.id}">${escapeHtml(t.title)}</option>`).join('');
}

function renderScripts() {
  const container = document.getElementById('scriptsList');
  if (appData.scripts.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px 0;">暂无剧本，开始创作吧</p>';
    return;
  }

  container.innerHTML = appData.scripts.map(s => {
    const topic = appData.topics.find(t => t.id === s.topicId);
    const topicLabel = topic ? '关联选题：' + topic.title : '';
    return `
      <div class="wb-card" data-id="${s.id}">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div>
            <h4>${escapeHtml(s.title)}</h4>
            <p>${topicLabel ? '<span style="color:var(--accent-cyan);font-size:0.8rem;">' + escapeHtml(topicLabel) + '</span>' : ''}</p>
            <p style="white-space:pre-wrap;max-height:80px;overflow:hidden;font-size:0.8rem;color:var(--text-muted);">${escapeHtml(s.content.substring(0, 200))}${s.content.length > 200 ? '...' : ''}</p>
          </div>
          <button class="wb-btn wb-btn-danger wb-btn-sm" onclick="deleteScript('${s.id}')">删除</button>
        </div>
      </div>`;
  }).join('');
}

function addScript() {
  const titleEl = document.getElementById('scriptTitle');
  const contentEl = document.getElementById('scriptContent');
  const topicRef = document.getElementById('scriptTopicRef');

  const title = titleEl.value.trim();
  const content = contentEl.value.trim();

  if (!title) { showToast('请输入剧本标题', 'error'); return; }
  if (!content) { showToast('请输入剧本内容', 'error'); return; }

  appData.scripts.unshift({
    id: genId(),
    title,
    topicId: topicRef.value || null,
    content,
    createdAt: Date.now()
  });

  saveData(appData);
  renderScripts();
  titleEl.value = '';
  contentEl.value = '';
  topicRef.value = '';
  showToast('剧本已保存', 'success');
}

function deleteScript(id) {
  appData.scripts = appData.scripts.filter(s => s.id !== id);
  saveData(appData);
  renderScripts();
  showToast('剧本已删除', 'info');
}

document.getElementById('btnAddScript').addEventListener('click', addScript);

// =====================================================
//  角色库
// =====================================================

function renderRoles() {
  const container = document.getElementById('rolesList');
  if (appData.roles.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px 0;">暂无角色，创建你的第一个角色吧</p>';
    return;
  }

  container.innerHTML = appData.roles.map(r => `
    <div class="wb-card" data-id="${r.id}">
      <div style="display:flex;justify-content:space-between;align-items:start;">
        <div>
          <h4>🎭 ${escapeHtml(r.name)}</h4>
          <p>${escapeHtml(r.traits)}</p>
        </div>
        <button class="wb-btn wb-btn-danger wb-btn-sm" onclick="deleteRole('${r.id}')">删除</button>
      </div>
    </div>
  `).join('');
}

function addRole() {
  const nameEl = document.getElementById('roleName');
  const traitsEl = document.getElementById('roleTraits');
  const name = nameEl.value.trim();
  const traits = traitsEl.value.trim();

  if (!name) { showToast('请输入角色名称', 'error'); return; }

  appData.roles.unshift({
    id: genId(),
    name,
    traits: traits || '待补充',
    createdAt: Date.now()
  });

  saveData(appData);
  renderRoles();
  nameEl.value = '';
  traitsEl.value = '';
  showToast('角色已添加', 'success');
}

function deleteRole(id) {
  appData.roles = appData.roles.filter(r => r.id !== id);
  saveData(appData);
  renderRoles();
  showToast('角色已删除', 'info');
}

document.getElementById('btnAddRole').addEventListener('click', addRole);
document.getElementById('roleName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addRole();
});

// =====================================================
//  AI 生成面板
// =====================================================

document.querySelectorAll('.ai-gen-card').forEach(card => {
  card.addEventListener('click', () => {
    const genType = card.getAttribute('data-gen');
    const genResult = document.getElementById('genResult');
    const messages = {
      image: '🖼 AI 图片生成已就绪 —— 输入提示词描述你想要的画面风格与内容，AI 将为你生成概念图。',
      video: '🎥 AI 视频生成已就绪 —— 上传参考图或输入场景描述，AI 将生成短视频片段。',
      voice: '🎙 AI 配音已就绪 —— 输入文本并选择语种与风格，AI 将合成高质量配音。',
      script: '📜 AI 剧本续写已就绪 —— 粘贴已有剧本片段，AI 将智能扩展剧情发展。'
    };

    let html = `<div class="wb-card"><p>${messages[genType]}</p>`;
    html += `<div style="margin-top:12px;"><textarea class="wb-textarea" id="genPrompt" placeholder="输入你的提示词或内容..." style="min-height:80px;"></textarea></div>`;
    html += `<button class="wb-btn wb-btn-primary" style="margin-top:8px;" onclick="simulateGenerate('${genType}')">生成</button>`;
    html += `<div id="genOutput" style="margin-top:12px;"></div></div>`;
    genResult.innerHTML = html;
  });
});

function simulateGenerate(genType) {
  const prompt = document.getElementById('genPrompt')?.value.trim();
  if (!prompt) { showToast('请输入提示词或内容', 'error'); return; }

  const output = document.getElementById('genOutput');
  output.innerHTML = `
    <div style="background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:8px;padding:16px;margin-top:8px;">
      <p style="color:var(--accent-cyan);font-family:var(--font-mono);font-size:0.8rem;">[${genType.toUpperCase()} 生成结果]</p>
      <p style="margin-top:8px;color:var(--text-secondary);font-style:italic;">
        基于提示词 "${escapeHtml(prompt)}" 的 AI 生成内容将在此展示。在实际部署中，此处将连接后端 API 返回真实的生成结果。
      </p>
      <p style="font-size:0.75rem;color:var(--text-muted);margin-top:8px;">提示词长度：${prompt.length} 字符</p>
    </div>
  `;
  showToast('生成请求已提交（演示模式）', 'info');
}

// =====================================================
//  看板拖拽
// =====================================================

function renderKanban() {
  ['todo', 'doing', 'done'].forEach(status => {
    const container = document.getElementById('kanban-' + status);
    const items = appData.kanban[status] || [];
    container.innerHTML = items.map(item => `
      <div class="kanban-item" draggable="true" data-id="${item.id}" data-status="${status}">
        <strong>${escapeHtml(item.title)}</strong>
        <div class="item-meta">${escapeHtml(item.desc || '')}</div>
      </div>
    `).join('');

    if (items.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.8rem;text-align:center;padding:20px 0;">拖放任务到此</p>';
    }
  });

  // 绑定拖拽事件
  document.querySelectorAll('.kanban-item').forEach(item => {
    item.addEventListener('dragstart', handleDragStart);
    item.addEventListener('dragend', handleDragEnd);
  });

  document.querySelectorAll('.kanban-col').forEach(col => {
    col.addEventListener('dragover', handleDragOver);
    col.addEventListener('drop', handleDrop);
  });
}

let draggedItem = null;

function handleDragStart(e) {
  draggedItem = this;
  this.style.opacity = '0.5';
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  this.style.opacity = '1';
  draggedItem = null;
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
  e.preventDefault();
  if (!draggedItem) return;

  const fromStatus = draggedItem.getAttribute('data-status');
  const itemId = draggedItem.getAttribute('data-id');

  // 找到目标列
  const col = e.target.closest('.kanban-col');
  if (!col) return;
  const toStatus = col.getAttribute('data-status');

  if (fromStatus === toStatus) return;

  // 移动数据
  const itemIndex = appData.kanban[fromStatus].findIndex(i => i.id === itemId);
  if (itemIndex === -1) return;
  const [item] = appData.kanban[fromStatus].splice(itemIndex, 1);
  appData.kanban[toStatus].push(item);

  saveData(appData);
  renderKanban();
  showToast('任务已移动', 'success');
}

// 添加看板任务（快速入口）
function addKanbanItem(status) {
  const title = prompt('输入任务标题：');
  if (!title || !title.trim()) return;
  appData.kanban[status].push({
    id: genId(),
    title: title.trim(),
    desc: ''
  });
  saveData(appData);
  renderKanban();
}

// 双击看板任务编辑
document.getElementById('kanbanBoard').addEventListener('dblclick', (e) => {
  const item = e.target.closest('.kanban-item');
  if (!item) return;
  const id = item.getAttribute('data-id');
  const status = item.getAttribute('data-status');
  const task = appData.kanban[status].find(t => t.id === id);
  if (!task) return;

  const newTitle = prompt('编辑任务标题：', task.title);
  if (newTitle !== null && newTitle.trim()) {
    task.title = newTitle.trim();
    saveData(appData);
    renderKanban();
  }
});

// =====================================================
//  发布日历
// =====================================================

let calendarYear, calendarMonth;

function renderCalendar(year, month) {
  calendarYear = year;
  calendarMonth = month;

  const label = document.getElementById('calendarMonthLabel');
  label.textContent = year + '年 ' + String(month + 1).padStart(2, '0') + '月';

  const grid = document.getElementById('calendarGrid');
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0=周日

  const headers = ['日', '一', '二', '三', '四', '五', '六'];
  let html = headers.map(h => `<div class="calendar-header">${h}</div>`).join('');

  // 填充空白
  for (let i = 0; i < firstDay; i++) {
    html += '<div class="calendar-day" style="opacity:0.25;"></div>';
  }

  const today = new Date();
  const todayKey = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');

  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = year + '-' + String(month+1).padStart(2,'0') + '-' + String(d).padStart(2,'0');
    const hasEvent = appData.events[dateKey] && appData.events[dateKey].length > 0;
    const isToday = dateKey === todayKey;
    html += `<div class="calendar-day${hasEvent ? ' has-event' : ''}${isToday ? ' today' : ''}" data-date="${dateKey}">${d}</div>`;
  }

  grid.innerHTML = html;

  // 点击日期添加事件
  grid.querySelectorAll('.calendar-day[data-date]').forEach(day => {
    day.addEventListener('click', () => {
      const dateKey = day.getAttribute('data-date');
      const evt = prompt('为 ' + dateKey + ' 添加事件：');
      if (evt !== null && evt.trim()) {
        if (!appData.events[dateKey]) appData.events[dateKey] = [];
        appData.events[dateKey].push(evt.trim());
        saveData(appData);
        renderCalendar(year, month);
        showToast('事件已添加', 'success');
      }
    });
  });
}

document.getElementById('btnPrevMonth').addEventListener('click', () => {
  if (calendarMonth === 0) {
    renderCalendar(calendarYear - 1, 11);
  } else {
    renderCalendar(calendarYear, calendarMonth - 1);
  }
});

document.getElementById('btnNextMonth').addEventListener('click', () => {
  if (calendarMonth === 11) {
    renderCalendar(calendarYear + 1, 0);
  } else {
    renderCalendar(calendarYear, calendarMonth + 1);
  }
});

// =====================================================
//  设置 — 导入导出
// =====================================================

document.getElementById('btnExportData').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'quantum-studio-data-' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(url);
  showToast('数据已导出', 'success');
});

document.getElementById('btnImportData').addEventListener('click', () => {
  document.getElementById('importFileInput').click();
});

document.getElementById('importFileInput').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      // 基本验证
      if (!data.topics || !data.scripts || !data.roles || !data.kanban) {
        throw new Error('数据格式不完整');
      }
      appData = data;
      saveData(appData);
      refreshAllPanels();
      showToast('数据已导入', 'success');
    } catch (err) {
      showToast('导入失败：文件格式不正确', 'error');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.getElementById('btnClearData').addEventListener('click', () => {
  if (confirm('确定清除所有工作台数据吗？此操作不可恢复。')) {
    appData = getDefaultData();
    saveData(appData);
    refreshAllPanels();
    showToast('数据已清除并重置为默认', 'info');
  }
});

// =====================================================
//  全局刷新
// =====================================================

function refreshAllPanels() {
  renderTopics();
  renderScripts();
  renderRoles();
  renderKanban();
  refreshScriptTopicRef();
  const now = new Date();
  renderCalendar(now.getFullYear(), now.getMonth());
}

// =====================================================
//  联系表单
// =====================================================

document.getElementById('contactForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('contactName').value.trim();
  const email = document.getElementById('contactEmail').value.trim();
  const message = document.getElementById('contactMessage').value.trim();

  // 前端验证
  if (!name) { showToast('请输入姓名', 'error'); return; }
  if (!email) { showToast('请输入邮箱', 'error'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('请输入有效的邮箱地址', 'error'); return;
  }
  if (!message) { showToast('请输入留言内容', 'error'); return; }

  const feedback = document.getElementById('contactFeedback');
  feedback.innerHTML = '<span style="color:var(--accent-green);">消息已发送！我们会尽快回复你。（演示模式）</span>';
  showToast('消息发送成功！', 'success');
  document.getElementById('contactForm').reset();

  setTimeout(() => {
    feedback.innerHTML = '';
  }, 5000);
});

// =====================================================
//  工具函数
// =====================================================

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// =====================================================
//  初始化
// =====================================================

function init() {
  renderTopics();
  renderScripts();
  renderRoles();
  renderKanban();
  refreshScriptTopicRef();

  const now = new Date();
  renderCalendar(now.getFullYear(), now.getMonth());
}

init();
console.log('%c⚛ 量子事务所 Quantum Studio %c已就绪',
  'color:#00d4ff;font-size:1.2rem;font-weight:700;',
  'color:#a0a0b8;');
console.log('%c量子灵感 × AI 创作 %c| %c以量子之眼洞察创意，用 AI 之手塑造未来影像',
  'color:#7c3aed;', 'color:#a0a0b8;', 'color:#6a6a80;font-style:italic;');