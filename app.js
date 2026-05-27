/* === 量子事务所 · AI短剧工作台 === */
const App = {
  currentPage: 'dashboard',
  init() {
    this.bindNav();
    this.bindAITabs();
    Topics.init();
    Scripts.init();
    Characters.init();
    Calendar.init();
    Settings.load();
    this.updateDashboard();
    this.navigate('dashboard');
    document.getElementById('tts-rate').addEventListener('input', e => {
      document.getElementById('tts-rate-val').textContent = e.target.value + 'x';
    });
  },
  navigate(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const el = document.getElementById('page-' + page);
    const nav = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (el) el.classList.add('active');
    if (nav) nav.classList.add('active');
    this.currentPage = page;
    if (page === 'dashboard') this.updateDashboard();
    if (page === 'kanban') Kanban.render();
    if (page === 'calendar') Calendar.render();
  },
  bindNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => this.navigate(item.dataset.page));
    });
  },
  bindAITabs() {
    document.querySelectorAll('.ai-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.ai-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('panel-' + tab.dataset.tab).classList.add('active');
      });
    });
  },
  updateDashboard() {
    const topics = Store.get('topics') || [];
    const scripts = Store.get('scripts') || [];
    const characters = Store.get('characters') || [];
    document.getElementById('stat-topics').textContent = topics.length;
    document.getElementById('stat-scripts').textContent = scripts.length;
    document.getElementById('stat-episodes').textContent = scripts.filter(s => s.status === '已发布').length;
    document.getElementById('stat-characters').textContent = characters.length;
    // Recent activity
    const all = [
      ...topics.map(t => ({...t, _type: '选题', _ts: t.updatedAt || t.createdAt})),
      ...scripts.map(s => ({...s, _type: '剧本', _ts: s.updatedAt || s.createdAt})),
      ...characters.map(c => ({...c, _type: '角色', _ts: c.updatedAt || c.createdAt}))
    ].sort((a, b) => (b._ts || 0) - (a._ts || 0)).slice(0, 8);
    const actEl = document.getElementById('recent-activity');
    if (all.length === 0) {
      actEl.innerHTML = '<p class="empty-hint">暂无动态，开始创建你的第一个选题吧</p>';
    } else {
      actEl.innerHTML = all.map(item => `
        <div class="activity-item">
          <span class="activity-time">${Utils.timeAgo(item._ts)}</span>
          <span>${item._type}：${Utils.esc(item.title || item.name)}</span>
        </div>
      `).join('');
    }
  }
};

/* === Store (localStorage wrapper) === */
const Store = {
  get(key) { try { return JSON.parse(localStorage.getItem('qs_' + key)); } catch { return null; } },
  set(key, val) { localStorage.setItem('qs_' + key, JSON.stringify(val)); },
  remove(key) { localStorage.removeItem('qs_' + key); }
};

/* === Utils === */
const Utils = {
  id: () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
  esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; },
  timeAgo(ts) {
    if (!ts) return '';
    const diff = Date.now() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    return Math.floor(diff / 86400000) + '天前';
  }
};

/* === Modal === */
const Modal = {
  open(title, bodyHtml, footerHtml) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-footer').innerHTML = footerHtml || '';
    document.getElementById('modal-overlay').classList.add('show');
  },
  close() {
    document.getElementById('modal-overlay').classList.remove('show');
  }
};

/* === Toast === */
function toast(msg, type = 'info') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* ============================
   Topics Module
   ============================ */
const Topics = {
  init() { if (!Store.get('topics')) Store.set('topics', []); },
  getAll() { return Store.get('topics') || []; },
  save(list) { Store.set('topics', list); },
  render() {
    const list = this.getAll();
    const statusF = document.getElementById('topic-filter-status').value;
    const fieldF = document.getElementById('topic-filter-field').value;
    const search = document.getElementById('topic-search').value.toLowerCase();
    const filtered = list.filter(t =>
      (statusF === 'all' || t.status === statusF) &&
      (fieldF === 'all' || t.field === fieldF) &&
      (!search || t.title.toLowerCase().includes(search) || (t.desc || '').toLowerCase().includes(search))
    );
    const el = document.getElementById('topics-list');
    if (filtered.length === 0) {
      el.innerHTML = '<p class="empty-hint">没有找到选题，点击上方按钮新建</p>';
      return;
    }
    el.innerHTML = filtered.map(t => `
      <div class="card" onclick="Topics.showEdit('${t.id}')">
        <div class="card-actions">
          <button class="btn-sm" onclick="event.stopPropagation();Topics.remove('${t.id}')">🗑</button>
        </div>
        <div class="card-title">${Utils.esc(t.title)}</div>
        <div class="card-desc">${Utils.esc(t.desc)}</div>
        <div class="card-meta">
          <span class="tag tag-field">${Utils.esc(t.field)}</span>
          <span class="tag tag-status">${Utils.esc(t.status)}</span>
          ${t.score ? `<span class="tag tag-score">戏剧性 ${t.score}/10</span>` : ''}
        </div>
      </div>
    `).join('');
  },
  showAdd() {
    Modal.open('新建选题', `
      <div class="form-group"><label>概念名称</label><input type="text" id="t-title" placeholder="例如：量子纠缠"></div>
      <div class="form-group"><label>一句话解释</label><textarea id="t-desc" rows="2" placeholder="用一句话解释这个概念"></textarea></div>
      <div class="form-group"><label>所属领域</label>
        <select id="t-field"><option>量子力学基础</option><option>量子信息</option><option>量子场论</option><option>量子光学</option><option>量子计算</option><option>其他</option></select>
      </div>
      <div class="form-group"><label>戏剧潜力 (1-10)</label><input type="number" id="t-score" min="1" max="10" value="7"></div>
      <div class="form-group"><label>剧情灵感</label><textarea id="t-idea" rows="3" placeholder="初步的剧情想法..."></textarea></div>
      <div class="form-group"><label>状态</label>
        <select id="t-status"><option>待用</option><option>储备</option><option>已用</option></select>
      </div>
    `, `<button class="btn-secondary" onclick="Modal.close()">取消</button><button class="btn-primary" onclick="Topics.add()">创建</button>`
    );
  },
  add() {
    const item = {
      id: Utils.id(),
      title: document.getElementById('t-title').value.trim(),
      desc: document.getElementById('t-desc').value.trim(),
      field: document.getElementById('t-field').value,
      score: parseInt(document.getElementById('t-score').value) || 7,
      idea: document.getElementById('t-idea').value.trim(),
      status: document.getElementById('t-status').value,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    if (!item.title) { toast('请填写概念名称', 'error'); return; }
    const list = this.getAll();
    list.unshift(item);
    this.save(list);
    Modal.close();
    this.render();
    toast('选题已创建', 'success');
  },
  showEdit(id) {
    const item = this.getAll().find(t => t.id === id);
    if (!item) return;
    Modal.open('编辑选题', `
      <div class="form-group"><label>概念名称</label><input type="text" id="t-title" value="${Utils.esc(item.title)}"></div>
      <div class="form-group"><label>一句话解释</label><textarea id="t-desc" rows="2">${Utils.esc(item.desc)}</textarea></div>
      <div class="form-group"><label>所属领域</label>
        <select id="t-field">${['量子力学基础','量子信息','量子场论','量子光学','量子计算','其他'].map(f => `<option${f===item.field?' selected':''}>${f}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>戏剧潜力 (1-10)</label><input type="number" id="t-score" min="1" max="10" value="${item.score||7}"></div>
      <div class="form-group"><label>剧情灵感</label><textarea id="t-idea" rows="3">${Utils.esc(item.idea)}</textarea></div>
      <div class="form-group"><label>状态</label>
        <select id="t-status">${['待用','储备','已用'].map(s => `<option${s===item.status?' selected':''}>${s}</option>`).join('')}</select>
      </div>
    `, `<button class="btn-secondary" onclick="Modal.close()">取消</button><button class="btn-primary" onclick="Topics.saveEdit('${id}')">保存</button>`
    );
  },
  saveEdit(id) {
    const list = this.getAll();
    const idx = list.findIndex(t => t.id === id);
    if (idx === -1) return;
    list[idx] = {
      ...list[idx],
      title: document.getElementById('t-title').value.trim(),
      desc: document.getElementById('t-desc').value.trim(),
      field: document.getElementById('t-field').value,
      score: parseInt(document.getElementById('t-score').value) || 7,
      idea: document.getElementById('t-idea').value.trim(),
      status: document.getElementById('t-status').value,
      updatedAt: Date.now()
    };
    this.save(list);
    Modal.close();
    this.render();
    toast('已保存', 'success');
  },
  remove(id) {
    if (!confirm('确定删除？')) return;
    this.save(this.getAll().filter(t => t.id !== id));
    this.render();
    toast('已删除');
  }
};

/* ============================
   Scripts Module
   ============================ */
const Scripts = {
  init() { if (!Store.get('scripts')) Store.set('scripts', []); },
  getAll() { return Store.get('scripts') || []; },
  save(list) { Store.set('scripts', list); },
  render() {
    const list = this.getAll();
    const statusF = document.getElementById('script-filter-status').value;
    const filtered = statusF === 'all' ? list : list.filter(s => s.status === statusF);
    const el = document.getElementById('scripts-list');
    if (filtered.length === 0) {
      el.innerHTML = '<p class="empty-hint">没有剧本，点击上方按钮新建</p>';
      return;
    }
    el.innerHTML = filtered.map(s => `
      <div class="card" onclick="Scripts.showEdit('${s.id}')">
        <div class="card-actions">
          <button class="btn-sm" onclick="event.stopPropagation();Scripts.remove('${s.id}')">🗑</button>
        </div>
        <div class="card-title">${Utils.esc(s.title)}</div>
        <div class="card-desc">${Utils.esc((s.concept || '') + ' · ' + (s.script || '').slice(0, 60))}</div>
        <div class="card-meta">
          <span class="tag tag-field">${Utils.esc(s.concept || '未指定')}</span>
          <span class="tag tag-status">${Utils.esc(s.status)}</span>
          <span class="tag tag-drama">EP${s.epNum || '?'}</span>
        </div>
      </div>
    `).join('');
  },
  showAdd() {
    const topics = Topics.getAll();
    Modal.open('新建剧本', `
      <div class="form-group"><label>剧集标题</label><input type="text" id="s-title" placeholder="例如：薛定谔的快递"></div>
      <div class="form-group"><label>集数</label><input type="number" id="s-epnum" min="1" value="1"></div>
      <div class="form-group"><label>关联量子概念</label>
        <select id="s-concept"><option value="">-- 选择或手动输入 --</option>${topics.map(t => `<option>${Utils.esc(t.title)}</option>`).join('')}</select>
        <input type="text" id="s-concept-custom" placeholder="或手动输入概念" style="margin-top:6px">
      </div>
      <div class="form-group"><label>剧本内容</label><textarea id="s-script" rows="8" placeholder="分镜格式：\n[场景1] 画面描述\n台词...\n[场景2] ..."></textarea></div>
      <div class="form-group"><label>时长（秒）</label><input type="number" id="s-duration" value="90"></div>
      <div class="form-group"><label>状态</label>
        <select id="s-status"><option>构思中</option><option>初稿</option><option>定稿</option><option>已制作</option><option>已发布</option></select>
      </div>
      <div class="form-group"><label>发布时间</label><input type="date" id="s-pubdate"></div>
    `, `<button class="btn-secondary" onclick="Modal.close()">取消</button><button class="btn-primary" onclick="Scripts.add()">创建</button>`
    );
  },
  add() {
    const item = {
      id: Utils.id(),
      title: document.getElementById('s-title').value.trim(),
      epNum: parseInt(document.getElementById('s-epnum').value) || 1,
      concept: document.getElementById('s-concept-custom').value.trim() || document.getElementById('s-concept').value,
      script: document.getElementById('s-script').value,
      duration: parseInt(document.getElementById('s-duration').value) || 90,
      status: document.getElementById('s-status').value,
      pubDate: document.getElementById('s-pubdate').value,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    if (!item.title) { toast('请填写剧集标题', 'error'); return; }
    const list = this.getAll();
    list.unshift(item);
    this.save(list);
    Modal.close();
    this.render();
    toast('剧本已创建', 'success');
  },
  showEdit(id) {
    const item = this.getAll().find(s => s.id === id);
    if (!item) return;
    const topics = Topics.getAll();
    Modal.open('编辑剧本', `
      <div class="form-group"><label>剧集标题</label><input type="text" id="s-title" value="${Utils.esc(item.title)}"></div>
      <div class="form-group"><label>集数</label><input type="number" id="s-epnum" min="1" value="${item.epNum||1}"></div>
      <div class="form-group"><label>关联量子概念</label>
        <select id="s-concept"><option value="">-- 选择 --</option>${topics.map(t => `<option${t.title===item.concept?' selected':''}>${Utils.esc(t.title)}</option>`).join('')}</select>
        <input type="text" id="s-concept-custom" placeholder="或手动输入" value="${Utils.esc(item.concept||'')}" style="margin-top:6px">
      </div>
      <div class="form-group"><label>剧本内容</label><textarea id="s-script" rows="10">${Utils.esc(item.script)}</textarea></div>
      <div class="form-group"><label>时长（秒）</label><input type="number" id="s-duration" value="${item.duration||90}"></div>
      <div class="form-group"><label>状态</label>
        <select id="s-status">${['构思中','初稿','定稿','已制作','已发布'].map(st => `<option${st===item.status?' selected':''}>${st}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>发布时间</label><input type="date" id="s-pubdate" value="${item.pubDate||''}"></div>
    `, `<button class="btn-secondary" onclick="Modal.close()">取消</button><button class="btn-secondary" onclick="Scripts.duplicate('${id}')">复制</button><button class="btn-primary" onclick="Scripts.saveEdit('${id}')">保存</button>`
    );
  },
  saveEdit(id) {
    const list = this.getAll();
    const idx = list.findIndex(s => s.id === id);
    if (idx === -1) return;
    list[idx] = {
      ...list[idx],
      title: document.getElementById('s-title').value.trim(),
      epNum: parseInt(document.getElementById('s-epnum').value) || 1,
      concept: document.getElementById('s-concept-custom').value.trim() || document.getElementById('s-concept').value,
      script: document.getElementById('s-script').value,
      duration: parseInt(document.getElementById('s-duration').value) || 90,
      status: document.getElementById('s-status').value,
      pubDate: document.getElementById('s-pubdate').value,
      updatedAt: Date.now()
    };
    this.save(list);
    Modal.close();
    this.render();
    toast('已保存', 'success');
  },
  duplicate(id) {
    const item = this.getAll().find(s => s.id === id);
    if (!item) return;
    const copy = {...item, id: Utils.id(), title: item.title + ' (副本)', createdAt: Date.now(), updatedAt: Date.now()};
    const list = this.getAll();
    list.unshift(copy);
    this.save(list);
    Modal.close();
    this.render();
    toast('已复制', 'success');
  },
  remove(id) {
    if (!confirm('确定删除？')) return;
    this.save(this.getAll().filter(s => s.id !== id));
    this.render();
    toast('已删除');
  }
};

/* ============================
   Characters Module
   ============================ */
const Characters = {
  init() {
    if (!Store.get('characters')) {
      Store.set('characters', [
        { id: 'char-suozhang', name: '所长', role: '资深量子物理学家', personality: '沉稳、睿智、偶尔毒舌', voice: 'zh-CN-YunxiNeural', desc: '量子事务所所长，负责解释原理。总是叼着一根没点燃的烟。', isMain: true, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'char-xinren', name: '新人', role: '量子事务所实习生', personality: '好奇、冲动、爱问问题', voice: 'zh-CN-XiaoxiaoNeural', desc: '刚入职的实习生，负责问观众想问的问题。对量子世界充满好奇。', isMain: true, createdAt: Date.now(), updatedAt: Date.now() },
        { id: 'char-ai', name: 'AI助手', role: '量子扫描与可视化', personality: '冷静、精确、偶尔冷幽默', voice: 'zh-CN-YunjianNeural', desc: '事务所的AI系统，负责把量子过程可视化。它的"眼睛"就是观众的眼睛。', isMain: true, createdAt: Date.now(), updatedAt: Date.now() }
      ]);
    }
  },
  getAll() { return Store.get('characters') || []; },
  save(list) { Store.set('characters', list); },
  render() {
    const list = this.getAll();
    const el = document.getElementById('characters-list');
    if (list.length === 0) {
      el.innerHTML = '<p class="empty-hint">暂无角色</p>';
      return;
    }
    el.innerHTML = list.map(c => `
      <div class="card" onclick="Characters.showEdit('${c.id}')">
        <div class="card-actions">
          ${!c.isMain ? `<button class="btn-sm" onclick="event.stopPropagation();Characters.remove('${c.id}')">🗑</button>` : ''}
        </div>
        <div class="card-title">${Utils.esc(c.name)}</div>
        <div class="card-desc">${Utils.esc(c.desc)}</div>
        <div class="card-meta">
          <span class="tag tag-field">${Utils.esc(c.role)}</span>
          <span class="tag tag-status">${Utils.esc(c.personality)}</span>
          ${c.isMain ? '<span class="tag tag-drama">固定角色</span>' : ''}
        </div>
      </div>
    `).join('');
  },
  showAdd() {
    Modal.open('新建角色', `
      <div class="form-group"><label>角色名</label><input type="text" id="c-name" placeholder="例如：反派博士"></div>
      <div class="form-group"><label>身份</label><input type="text" id="c-role" placeholder="例如：暗能量操控者"></div>
      <div class="form-group"><label>性格标签</label><input type="text" id="c-personality" placeholder="例如：冷酷、聪明"></div>
      <div class="form-group"><label>角色描述</label><textarea id="c-desc" rows="3" placeholder="外貌、背景故事等"></textarea></div>
      <div class="form-group"><label>TTS语音</label>
        <select id="c-voice">
          <option value="zh-CN-YunxiNeural">云希 - 沉稳男声</option>
          <option value="zh-CN-XiaoxiaoNeural">晓晓 - 清澈女声</option>
          <option value="zh-CN-YunjianNeural">云健 - 科技感男声</option>
          <option value="zh-CN-XiaoyiNeural">晓艺 - 温柔女声</option>
          <option value="zh-CN-YunyangNeural">云扬 - 专业男声</option>
        </select>
      </div>
    `, `<button class="btn-secondary" onclick="Modal.close()">取消</button><button class="btn-primary" onclick="Characters.add()">创建</button>`
    );
  },
  add() {
    const item = {
      id: Utils.id(),
      name: document.getElementById('c-name').value.trim(),
      role: document.getElementById('c-role').value.trim(),
      personality: document.getElementById('c-personality').value.trim(),
      desc: document.getElementById('c-desc').value.trim(),
      voice: document.getElementById('c-voice').value,
      isMain: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    if (!item.name) { toast('请填写角色名', 'error'); return; }
    const list = this.getAll();
    list.push(item);
    this.save(list);
    Modal.close();
    this.render();
    toast('角色已创建', 'success');
  },
  showEdit(id) {
    const item = this.getAll().find(c => c.id === id);
    if (!item) return;
    Modal.open('编辑角色', `
      <div class="form-group"><label>角色名</label><input type="text" id="c-name" value="${Utils.esc(item.name)}"></div>
      <div class="form-group"><label>身份</label><input type="text" id="c-role" value="${Utils.esc(item.role)}"></div>
      <div class="form-group"><label>性格标签</label><input type="text" id="c-personality" value="${Utils.esc(item.personality)}"></div>
      <div class="form-group"><label>角色描述</label><textarea id="c-desc" rows="3">${Utils.esc(item.desc)}</textarea></div>
      <div class="form-group"><label>TTS语音</label>
        <select id="c-voice">
          ${['zh-CN-YunxiNeural|云希 - 沉稳男声','zh-CN-XiaoxiaoNeural|晓晓 - 清澈女声','zh-CN-YunjianNeural|云健 - 科技感男声','zh-CN-XiaoyiNeural|晓艺 - 温柔女声','zh-CN-YunyangNeural|云扬 - 专业男声'].map(v => {
            const [val, label] = v.split('|');
            return `<option value="${val}"${val===item.voice?' selected':''}>${label}</option>`;
          }).join('')}
        </select>
      </div>
    `, `<button class="btn-secondary" onclick="Modal.close()">取消</button><button class="btn-primary" onclick="Characters.saveEdit('${id}')">保存</button>`
    );
  },
  saveEdit(id) {
    const list = this.getAll();
    const idx = list.findIndex(c => c.id === id);
    if (idx === -1) return;
    list[idx] = {
      ...list[idx],
      name: document.getElementById('c-name').value.trim(),
      role: document.getElementById('c-role').value.trim(),
      personality: document.getElementById('c-personality').value.trim(),
      desc: document.getElementById('c-desc').value.trim(),
      voice: document.getElementById('c-voice').value,
      updatedAt: Date.now()
    };
    this.save(list);
    Modal.close();
    this.render();
    toast('已保存', 'success');
  },
  remove(id) {
    if (!confirm('确定删除？')) return;
    this.save(this.getAll().filter(c => c.id !== id));
    this.render();
    toast('已删除');
  }
};

/* ============================
   Kanban Module
   ============================ */
const Kanban = {
  statuses: ['剧本', '生图', '生视频', '配音', '剪辑', '已发布'],
  render() {
    const scripts = Scripts.getAll();
    this.statuses.forEach(status => {
      const col = document.getElementById('kanban-' + status);
      const cards = scripts.filter(s => {
        const ks = this.mapStatus(s.status);
        return ks === status;
      });
      col.innerHTML = cards.map(s => `
        <div class="kanban-card" draggable="true" data-id="${s.id}">
          <div class="kc-title">EP${s.epNum||'?'} · ${Utils.esc(s.title)}</div>
          <div class="kc-concept">${Utils.esc(s.concept||'')}</div>
          <div class="kc-actions">
            ${this.statuses.indexOf(status) > 0 ? `<button class="btn-sm" onclick="Kanban.move('${s.id}',-1)">◀</button>` : ''}
            ${this.statuses.indexOf(status) < this.statuses.length - 1 ? `<button class="btn-sm" onclick="Kanban.move('${s.id}',1)">▶</button>` : ''}
          </div>
        </div>
      `).join('');
      col.closest('.kanban-column').querySelector('.count').textContent = cards.length;
    });
  },
  mapStatus(scriptStatus) {
    const map = { '构思中': '剧本', '初稿': '剧本', '定稿': '剧本', '已制作': '剪辑', '已发布': '已发布' };
    return map[scriptStatus] || '剧本';
  },
  move(id, dir) {
    const scripts = Scripts.getAll();
    const idx = scripts.findIndex(s => s.id === id);
    if (idx === -1) return;
    const statusMap = {
      '构思中': 0, '初稿': 0, '定稿': 0,
      '生图': 1, '生视频': 2, '配音': 3, '剪辑': 4, '已发布': 5
    };
    let current = statusMap[scripts[idx].status] ?? 0;
    current = Math.max(0, Math.min(this.statuses.length - 1, current + dir));
    const reverseMap = ['构思中', '生图', '生视频', '配音', '剪辑', '已发布'];
    scripts[idx].status = reverseMap[current];
    scripts[idx].updatedAt = Date.now();
    Scripts.save(scripts);
    this.render();
  }
};

/* ============================
   Calendar Module
   ============================ */
const Calendar = {
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  render() {
    const title = document.getElementById('calendar-title');
    title.textContent = `${this.year}年${this.month + 1}月`;
    const grid = document.getElementById('calendar-grid');
    const days = ['一', '二', '三', '四', '五', '六', '日'];
    let html = days.map(d => `<div class="cal-header">${d}</div>`).join('');
    const first = new Date(this.year, this.month, 1);
    const last = new Date(this.year, this.month + 1, 0);
    let startDay = first.getDay() - 1; if (startDay < 0) startDay = 6;
    const scripts = Scripts.getAll();
    const today = new Date();
    // Previous month fill
    const prevLast = new Date(this.year, this.month, 0);
    for (let i = startDay - 1; i >= 0; i--) {
      html += `<div class="cal-day other-month"><div class="cal-day-num">${prevLast.getDate() - i}</div></div>`;
    }
    // Current month
    for (let d = 1; d <= last.getDate(); d++) {
      const dateStr = `${this.year}-${String(this.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = today.getFullYear() === this.year && today.getMonth() === this.month && today.getDate() === d;
      const events = scripts.filter(s => s.pubDate === dateStr);
      html += `<div class="cal-day${isToday ? ' today' : ''}">
        <div class="cal-day-num">${d}</div>
        ${events.map(e => `<div class="cal-event">EP${e.epNum||'?'} ${Utils.esc(e.title)}</div>`).join('')}
      </div>`;
    }
    // Next month fill
    const remaining = 7 - ((startDay + last.getDate()) % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        html += `<div class="cal-day other-month"><div class="cal-day-num">${i}</div></div>`;
      }
    }
    grid.innerHTML = html;
  },
  prevMonth() { this.month--; if (this.month < 0) { this.month = 11; this.year--; } this.render(); },
  nextMonth() { this.month++; if (this.month > 11) { this.month = 0; this.year++; } this.render(); }
};


const AIGen = {
  backendAvailable: null,
  _apiBase: '',

  async checkBackend() {
    try {
      const resp = await fetch(this._apiBase + '/api/config', { signal: AbortSignal.timeout(2000) });
      this.backendAvailable = resp.ok;
    } catch {
      this.backendAvailable = false;
    }
    return this.backendAvailable;
  },

  async apiCall(path, body) {
    if (this.backendAvailable !== false) {
      try {
        const resp = await fetch(this._apiBase + path, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (resp.ok) return await resp.json();
      } catch {}
    }
    return null;
  },

  async generateImage() {
    const prompt = document.getElementById('img-prompt').value.trim();
    if (!prompt) { toast('请输入画面描述', 'error'); return; }
    const engine = document.getElementById('img-engine').value;
    const size = document.getElementById('img-size').value;
    const stylePrefix = document.getElementById('img-style-prefix').value;
    const fullPrompt = stylePrefix + ' ' + prompt;
    const resultEl = document.getElementById('img-result');
    resultEl.innerHTML = '<div class="gen-loading"><div class="spinner"></div><span>正在生成图片...</span></div>';
    try {
      const data = await this.apiCall('/api/ai/image', { prompt: fullPrompt, engine, size });
      if (data && data.url) {
        resultEl.innerHTML = '<img src="' + data.url + '" alt="AI生成图片" style="max-width:100%;border-radius:8px">';
        toast('图片生成完成！', 'success');
        return;
      }
      if (engine === 'flux') {
        const resp = await fetch('https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: fullPrompt })
        });
        if (!resp.ok) throw new Error('Flux API 错误: ' + resp.status);
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        resultEl.innerHTML = '<img src="' + url + '" alt="AI生成图片" style="max-width:100%;border-radius:8px">';
        toast('图片生成完成！（Flux直连）', 'success');
        return;
      }
      throw new Error('后端未启动，请先启动 server 目录下的 Node.js 服务');
    } catch (err) {
      resultEl.innerHTML = '<div class="gen-placeholder" style="color:var(--danger)">生成失败：' + Utils.esc(err.message) + '</div>';
      toast('生成失败：' + err.message, 'error');
    }
  },

  async generateVideo() {
    const prompt = document.getElementById('video-prompt').value.trim();
    if (!prompt) { toast('请输入视频描述', 'error'); return; }
    const refImage = document.getElementById('video-ref-image').value.trim();
    const duration = parseInt(document.getElementById('video-duration').value) || 10;
    const resultEl = document.getElementById('video-result');
    resultEl.innerHTML = '<div class="gen-loading"><div class="spinner"></div><span>视频生成中，通常需要2-5分钟...</span></div>';
    try {
      const data = await this.apiCall('/api/ai/video', { prompt, refImage, duration });
      if (!data) throw new Error('后端未启动，请先启动 server 目录下的 Node.js 服务');
      if (data.error) throw new Error(data.error);
      const taskId = data.taskId;
      toast('视频任务已提交，正在生成...', 'info');
      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 5000));
        const pollResp = await fetch(this._apiBase + '/api/tasks/' + taskId);
        const task = await pollResp.json();
        if (task.status === 'done') {
          resultEl.innerHTML = '<video src="' + task.result.url + '" controls style="max-width:100%;border-radius:8px"></video>';
          toast('视频生成完成！', 'success');
          return;
        }
        if (task.status === 'failed') throw new Error(task.error || '生成失败');
      }
      throw new Error('生成超时');
    } catch (err) {
      resultEl.innerHTML = '<div class="gen-placeholder" style="color:var(--danger)">生成失败：' + Utils.esc(err.message) + '</div>';
      toast('生成失败：' + err.message, 'error');
    }
  },

  async generateTTS() {
    const text = document.getElementById('tts-text').value.trim();
    if (!text) { toast('请输入台词文本', 'error'); return; }
    const voice = document.getElementById('tts-voice').value;
    const rate = document.getElementById('tts-rate').value;
    const resultEl = document.getElementById('tts-result');
    resultEl.innerHTML = '<div class="gen-loading"><div class="spinner"></div><span>正在生成配音...</span></div>';
    try {
      const data = await this.apiCall('/api/ai/tts', { text, voice, rate });
      if (data && data.url) {
        resultEl.innerHTML = '<div style="text-align:center;width:100%"><audio src="' + data.url + '" controls style="width:100%;margin-bottom:12px"></audio><p style="color:var(--text2);font-size:12px">文件: ' + data.filename + '</p></div>';
        toast('配音生成完成！', 'success');
        return;
      }
    } catch {}
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      utterance.rate = parseFloat(rate);
      resultEl.innerHTML = '<div style="text-align:center"><div style="font-size:48px;margin-bottom:16px">🔊</div><p style="color:var(--text2);margin-bottom:16px">使用浏览器内置语音</p><button class="btn-secondary" onclick="speechSynthesis.cancel()">停止</button> <button class="btn-secondary" onclick="speechSynthesis.cancel();speechSynthesis.speak(new SpeechSynthesisUtterance('' + text.replace(/'/g, "\'") + ''))">重新播放</button></div>';
      speechSynthesis.speak(utterance);
      toast('浏览器配音已开始播放', 'success');
    } else {
      resultEl.innerHTML = '<div class="gen-placeholder" style="color:var(--danger)">TTS 不可用，请启动后端服务</div>';
    }
  },

  async generateScript() {
    const concept = document.getElementById('script-ai-concept').value.trim();
    if (!concept) { toast('请输入量子概念', 'error'); return; }
    const style = document.getElementById('script-ai-style').value;
    const duration = document.getElementById('script-ai-duration').value;
    const extra = document.getElementById('script-ai-extra').value.trim();
    const resultEl = document.getElementById('script-ai-result');
    resultEl.innerHTML = '<div class="gen-loading"><div class="spinner"></div><span>AI正在创作剧本...</span></div>';
    try {
      const data = await this.apiCall('/api/ai/script', { concept, style, duration, extra });
      if (!data) throw new Error('后端未启动，请先启动 server 目录下的 Node.js 服务');
      if (data.error) throw new Error(data.error);
      resultEl.innerHTML = '<pre style="white-space:pre-wrap">' + Utils.esc(data.script) + '</pre>';
      const saveBtn = document.createElement('div');
      saveBtn.style.cssText = 'margin-top:16px;text-align:center';
      saveBtn.innerHTML = '<button class="btn-primary" onclick="AIGen.saveScriptToDraft('' + Utils.esc(concept) + '', this)">💾 保存为剧本草稿</button>';
      resultEl.appendChild(saveBtn);
      resultEl.querySelector('.btn-primary')._scriptContent = data.script;
      toast('剧本生成完成！', 'success');
    } catch (err) {
      resultEl.innerHTML = '<div class="gen-placeholder" style="color:var(--danger)">生成失败：' + Utils.esc(err.message) + '</div>';
      toast('生成失败：' + err.message, 'error');
    }
  },

  saveScriptToDraft(concept, btn) {
    const script = btn._scriptContent || btn.closest('.gen-result').querySelector('pre')?.textContent;
    if (!script) return;
    const item = {
      id: Utils.id(),
      title: concept + ' - AI生成',
      epNum: (Scripts.getAll().length || 0) + 1,
      concept: concept,
      script: script,
      duration: 90,
      status: '初稿',
      pubDate: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const list = Scripts.getAll();
    list.unshift(item);
    Scripts.save(list);
    toast('已保存为剧本草稿', 'success');
  }
};


/* ============================
   Settings Module
   ============================ */
const Settings = {
  async load() {
    // Load from localStorage
    const s = Store.get('settings') || {};
    document.getElementById('set-llm-provider').value = s.llmProvider || 'openai';
    document.getElementById('set-llm-key').value = s.llmKey || '';
    document.getElementById('set-llm-base').value = s.llmBase || '';
    document.getElementById('set-llm-model').value = s.llmModel || '';
    document.getElementById('set-kling-key').value = s.klingKey || '';
    document.getElementById('set-tongyi-key').value = s.tongyiKey || '';
    document.getElementById('set-openai-key').value = s.openaiKey || '';
    document.getElementById('set-kling-video-key').value = s.klingVideoKey || '';

    // Also sync from backend
    try {
      const resp = await fetch('/api/config');
      if (resp.ok) {
        const cfg = await resp.json();
        // Show backend status
        if (cfg._hasLLMKey) document.getElementById('set-llm-key').placeholder = '已配置 (后端)';
        if (cfg._hasKlingKey) document.getElementById('set-kling-key').placeholder = '已配置 (后端)';
        if (cfg._hasTongyiKey) document.getElementById('set-tongyi-key').placeholder = '已配置 (后端)';
        if (cfg._hasOpenaiKey) document.getElementById('set-openai-key').placeholder = '已配置 (后端)';
        if (cfg._hasKlingVideoKey) document.getElementById('set-kling-video-key').placeholder = '已配置 (后端)';
      }
    } catch {}
  },
  async save() {
    const s = {
      llmProvider: document.getElementById('set-llm-provider').value,
      llmKey: document.getElementById('set-llm-key').value,
      llmBase: document.getElementById('set-llm-base').value,
      llmModel: document.getElementById('set-llm-model').value,
      klingKey: document.getElementById('set-kling-key').value,
      tongyiKey: document.getElementById('set-tongyi-key').value,
      openaiKey: document.getElementById('set-openai-key').value,
      klingVideoKey: document.getElementById('set-kling-video-key').value
    };
    // Save to localStorage
    Store.set('settings', s);
    // Save to backend (only non-empty values)
    try {
      const backendCfg = {};
      for (const [k, v] of Object.entries(s)) {
        if (v && !v.includes('••')) backendCfg[k] = v;
      }
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendCfg)
      });
    } catch {}
    toast('设置已保存', 'success');
  },
  export() {
    const data = {
      topics: Store.get('topics') || [],
      scripts: Store.get('scripts') || [],
      characters: Store.get('characters') || [],
      settings: Store.get('settings') || {},
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `quantum-studio-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('数据已导出', 'success');
  },
  import(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.topics) Store.set('topics', data.topics);
        if (data.scripts) Store.set('scripts', data.scripts);
        if (data.characters) Store.set('characters', data.characters);
        if (data.settings) Store.set('settings', data.settings);
        toast('数据已导入，刷新页面生效', 'success');
        setTimeout(() => location.reload(), 1000);
      } catch { toast('文件格式错误', 'error'); }
    };
    reader.readAsText(file);
  },
  clearAll() {
    if (!confirm('确定清空所有数据？此操作不可恢复！')) return;
    if (!confirm('真的确定吗？')) return;
    ['topics', 'scripts', 'characters', 'settings'].forEach(k => Store.remove(k));
    toast('数据已清空，刷新中...');
    setTimeout(() => location.reload(), 500);
  },
  async loadAssets() {
    const el = document.getElementById('assets-list');
    el.innerHTML = '<p class="empty-hint">加载中...</p>';
    try {
      const resp = await fetch('/api/assets');
      const files = await resp.json();
      if (files.length === 0) {
        el.innerHTML = '<p class="empty-hint">暂无素材，使用AI生成功能后会出现在这里</p>';
        return;
      }
      el.innerHTML = files.map(f => {
        const isImg = /\.(png|jpg|jpeg|gif|webp)$/i.test(f.name);
        const isVid = /\.(mp4|webm|mov)$/i.test(f.name);
        const isAud = /\.(mp3|wav|ogg|m4a)$/i.test(f.name);
        const size = f.size > 1048576 ? (f.size / 1048576).toFixed(1) + 'MB' : (f.size / 1024).toFixed(0) + 'KB';
        let preview = '';
        if (isImg) preview = `<img src="${f.url}" style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:8px">`;
        else if (isVid) preview = `<div style="height:120px;background:var(--bg4);border-radius:6px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;font-size:32px">🎬</div>`;
        else if (isAud) preview = `<div style="height:120px;background:var(--bg4);border-radius:6px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;font-size:32px">🔊</div>`;
        else preview = `<div style="height:120px;background:var(--bg4);border-radius:6px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;font-size:32px">📄</div>`;
        return `
          <div class="card" style="padding:12px">
            ${preview}
            <div class="card-title" style="font-size:12px;word-break:break-all">${Utils.esc(f.name)}</div>
            <div class="card-meta">
              <span class="tag tag-field">${size}</span>
            </div>
            <div style="margin-top:8px">
              <a href="${f.url}" target="_blank" class="btn-sm" style="text-decoration:none;display:inline-block">查看</a>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      el.innerHTML = `<p class="empty-hint" style="color:var(--danger)">加载失败：${err.message}</p>`;
    }
  }
};

/* === Init === */
document.addEventListener('DOMContentLoaded', () => App.init());
