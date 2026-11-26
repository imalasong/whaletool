(() => {
  const $ = id => document.getElementById(id);
  let socket = null, timer = null, paused = false;
  const records = [];
  function render() {
    $('logs').replaceChildren();
    for (const r of records) {
      const item = document.createElement('div'); item.className = 'entry ' + r.type;
      const meta = document.createElement('div'); meta.className = 'meta'; meta.textContent = r.time + ' · ' + r.label;
      const body = document.createElement('pre'); let value = r.value;
      if ($('json').checked) { try { value = JSON.stringify(JSON.parse(value), null, 2); } catch {} }
      body.textContent = value; item.append(meta, body); $('logs').append(item);
    }
    $('logs').scrollTop = $('logs').scrollHeight;
  }
  function log(label, value, type = '') {
    records.push({time: new Date().toLocaleTimeString(), label, value: String(value), type});
    if (records.length > 500) records.shift(); render();
  }
  function state(label) {
    $('status').textContent = label;
    const active = socket !== null, open = socket?.readyState === WebSocket.OPEN;
    $('connect').disabled = active; $('url').disabled = active;
    $('disconnect').disabled = !active; $('send').disabled = !open;
  }
  function stopTimer() { clearInterval(timer); timer = null; }
  function send() {
    if (socket?.readyState !== WebSocket.OPEN) return;
    try { socket.send($('message').value); log('发送', $('message').value, 'sent'); }
    catch (error) { log('发送失败', error.message, 'error'); stopTimer(); }
  }
  function schedule() {
    stopTimer(); if (!$('auto').checked) return;
    const seconds = Number($('interval').value);
    if (!Number.isFinite(seconds) || seconds < 0.1 || seconds > 86400) { log('设置错误', '发送间隔应为 0.1～86400 秒', 'error'); return; }
    if (socket?.readyState === WebSocket.OPEN) timer = setInterval(send, seconds * 1000);
  }
  $('connect').onclick = () => {
    const address = $('url').value.trim();
    try {
      const parsed = new URL(address);
      if (!['ws:', 'wss:'].includes(parsed.protocol)) throw new Error('请输入有效的 ws:// 或 wss:// 地址');
      const current = new WebSocket(address); socket = current; state('连接中…');
      current.onopen = () => { if (socket !== current) return; state('已连接'); log('连接成功', address); schedule(); };
      current.onmessage = async event => {
        if (paused) return;
        const value = event.data instanceof Blob ? '[二进制消息] ' + await event.data.text() : event.data;
        log('接收', value, 'received');
      };
      current.onerror = () => log('连接错误', '请检查服务地址、网络、证书及服务器的 Origin 配置。', 'error');
      current.onclose = event => {
        if (socket !== current) return; stopTimer(); socket = null; state('已断开');
        log('连接关闭', `代码 ${event.code}${event.reason ? ' · ' + event.reason : ''}`);
      };
    } catch (error) { socket = null; state('尚未连接'); log('连接失败', error.message, 'error'); }
  };
  $('disconnect').onclick = () => { stopTimer(); if (socket) { state('正在断开…'); socket.close(1000, '用户断开'); } };
  $('send').onclick = send; $('auto').onchange = schedule; $('interval').onchange = schedule;
  $('clearInput').onclick = () => { $('message').value = ''; };
  $('clear').onclick = () => { records.length = 0; render(); };
  $('pause').onclick = () => { paused = !paused; $('pause').textContent = paused ? '恢复显示' : '暂停显示'; };
  $('json').onchange = render;
  window.addEventListener('pagehide', () => { stopTimer(); socket?.close(); });
  log('系统', '初始化完成');
})();
