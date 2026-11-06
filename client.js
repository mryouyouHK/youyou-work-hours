window.__ModuleLoader__.load({
  id: 'youyou-work-hours',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    /* One whole-document observer shared by every local plugin, instead of one
       per component. A streaming reply mutates the page many times a second and
       each private observer woke up for every batch; here a single observer
       dispatches once to all subscribers. Subscriptions are keyed, so a hot
       reload replaces its own entry instead of stacking a stale scanner. */
    const SHARED_DOM_WATCH_KEY = '__dshSharedDomWatch__';
    const SHARED_DOM_WATCH_ATTRS = ['data-highlighted', 'aria-checked', 'class', 'style', 'hidden', 'aria-expanded', 'aria-hidden'];
    function sharedDomWatch() {
      const installed = globalThis[SHARED_DOM_WATCH_KEY];
      if (installed !== undefined) return installed;
      const subscribers = new Map();
      let watching = false;
      const wantsAttribute = (entry, record) => {
        if (entry.attributes === null) return false;
        if (entry.attributes === true) return true;
        return entry.attributes.includes(record.attributeName);
      };
      const observer = new MutationObserver(records => {
        const hasStructure = records.some(record => record.type === 'childList');
        for (const entry of [...subscribers.values()]) {
          if (!entry.active) continue;
          if (!hasStructure && !records.some(record => wantsAttribute(entry, record))) continue;
          try { entry.run(); } catch { /* one bad subscriber must not break the rest */ }
        }
      });
      const start = () => {
        if (watching) return;
        watching = true;
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: SHARED_DOM_WATCH_ATTRS });
      };
      const stop = () => {
        if (!watching) return;
        watching = false;
        observer.disconnect();
      };
      const watch = {
        subscribe(key, run, attributes) {
          /* Always a fresh entry, never a reused one: a component unmounted by a
             hot reload runs its cleanup late, and reusing the object would let
             that stale cleanup delete the subscription the new mount installed. */
          const entry = {
            active: true,
            run,
            attributes: attributes === true ? true : Array.isArray(attributes) ? attributes : null,
          };
          subscribers.set(key, entry);
          start();
          return () => {
            if (subscribers.get(key) !== entry) return;
            subscribers.delete(key);
            if (subscribers.size === 0) stop();
          };
        },
      };
      globalThis[SHARED_DOM_WATCH_KEY] = watch;
      return watch;
    }
    const PANEL_ID = 'work-hours';
    const STORE_KEY = 'work-hours:data:v1';
    const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
    /* Every clock the plugin compares against lives here, so the whole schedule
       (planned start/end, late line, overtime line, off-work reminder) is one
       user-editable block and none of them are hard-coded. */
    const DEFAULT_SETTINGS = {
      planIn: '09:00',
      planOut: '18:00',
      lateAfter: '10:00',
      overtimeAfter: '19:30',
      remindAfter: '20:00',
      flashInterval: 5,
      flashMessage: '已超过预计下班时间，请及时打卡。',
      remindEnabled: true,
      remindMessage: '当前已免费搬 {time}，',
    };
    const CSS = `
      .wh-root{height:100%;overflow:auto;box-sizing:border-box;padding:24px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base);font:13px/1.5 -apple-system,BlinkMacSystemFont,sans-serif}
            .wh-main{max-width:1000px;margin:0 auto}.wh-head{position:relative;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:22px}.wh-week-range{position:absolute;left:50%;top:0;transform:translateX(-50%);padding:4px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:4px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap}.wh-inline-time{width:92px;max-width:100%;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);border-radius:4px;background:var(--dsw-alias-bg-base);color:inherit;padding:3px;font:inherit}.wh-quick{position:fixed;z-index:2147481500;width:min(430px,calc(100vw - 24px));max-height:min(620px,calc(100vh - 24px));overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;padding:18px;border:1px solid var(--dsw-alias-border-l1);border-radius:var(--dsw-radius-lg);background:var(--dsw-specific-menu);backdrop-filter:var(--dsw-menu-backdrop-filter);box-shadow:var(--dsw-elevation-prominent);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px;display:flex;flex-direction:column;gap:12px}.wh-quick[hidden]{display:none!important}.wh-quick-head{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-primary);font-weight:500;flex:none}.wh-quick-meta{display:grid;grid-template-columns:auto minmax(0,1fr) auto minmax(0,1fr);gap:9px 14px;align-items:center;color:var(--dsw-alias-label-tertiary);font-variant-numeric:tabular-nums}.wh-quick-meta>span:nth-child(4n+2),.wh-quick-meta>span:nth-child(4n+4){color:var(--dsw-alias-label-primary)}.wh-quick-actions{display:flex;gap:8px;margin-top:2px}.wh-quick-actions .wh-btn{flex:1;padding:6px 9px;font-size:12px}.wh-quick-anchor{position:relative}.wh-title{font-size:20px;font-weight:650;margin:0}.wh-date{color:var(--dsw-alias-label-secondary);margin-top:3px}
      .wh-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.wh-panel{border:1px solid var(--dsw-alias-border-l1);border-radius:6px;padding:16px;background:var(--dsw-alias-bg-layer-1)}.wh-panel.wide{grid-column:1/-1}.wh-label{font-size:12px;color:var(--dsw-alias-label-secondary)}.wh-value{margin-top:6px;font-size:24px;line-height:1.2;font-weight:650;font-variant-numeric:tabular-nums}.wh-sub{margin-top:5px;color:var(--dsw-alias-label-secondary);font-size:12px}.wh-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.wh-btn{border:1px solid var(--dsw-alias-border-l2);border-radius:5px;background:var(--dsw-alias-bg-layer-2);color:inherit;padding:7px 12px;font:inherit;cursor:pointer}.wh-btn.primary{border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}.wh-btn:disabled{opacity:.5;cursor:default}.wh-input{border:1px solid var(--dsw-alias-border-l2);border-radius:5px;background:var(--dsw-alias-bg-base);color:inherit;padding:7px 9px;font:inherit}.wh-setting{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:8px 0}.wh-table{width:100%;border-collapse:collapse;margin-top:10px;font-size:12px}.wh-table td,.wh-table th{padding:8px 5px;border-bottom:1px solid var(--dsw-alias-border-l1);text-align:left}.wh-table th{font-weight:500;color:var(--dsw-alias-label-secondary)}.wh-right{text-align:right!important;font-variant-numeric:tabular-nums}.wh-good{color:var(--dsw-alias-state-success-primary)}.wh-late{color:var(--dsw-alias-state-error-primary)}.wh-muted{color:var(--dsw-alias-label-secondary)}
      .wh-month-wrap{grid-column:1/-1;min-width:0}.wh-months{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.wh-month{min-width:0}.wh-month-title{position:sticky;top:0;z-index:3;display:flex;justify-content:space-between;align-items:flex-start;gap:8px;background:var(--dsw-alias-bg-layer-1);padding:8px 0}.wh-month-table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}.wh-month-table td,.wh-month-table th{padding:7px 4px;border-bottom:1px solid var(--dsw-alias-border-l1);text-align:left;white-space:nowrap}.wh-month-table th{position:sticky;top:0;z-index:2;background:var(--dsw-alias-bg-layer-1);font-weight:500;color:var(--dsw-alias-label-secondary)}.wh-month-table tr.wh-weekend{color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-2)}.wh-month-scroll{max-height:390px;overflow:auto}.wh-tab-after1930{animation:wh-tab-breathe 1.5s ease-in-out infinite;background-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 16%,transparent)}.wh-tab-after1930 [class*="panelTitle"]{color:var(--dsw-alias-state-error-primary)!important}.wh-tab-flash{animation:wh-tab-burst 1.15s steps(1,end) infinite;border-radius:6px;background-color:transparent}.wh-tab-flash [class*="panelTitle"]{animation:wh-tab-title-burst 1.15s steps(1,end) infinite}@keyframes wh-tab-breathe{0%,100%{background-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 10%,transparent)}50%{background-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 36%,transparent)}}@keyframes wh-tab-burst{0%,10%,22%,32%,44%,54%{background-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 20%,transparent);box-shadow:0 0 0 1px color-mix(in srgb,var(--dsw-alias-state-error-primary) 45%,transparent)}11%,21%,33%,43%,55%,100%{background-color:transparent;box-shadow:none}}@keyframes wh-tab-title-burst{0%,10%,22%,32%,44%,54%{color:var(--dsw-alias-state-error-primary)}11%,21%,33%,43%,55%,100%{color:inherit}}.wh-reminder{position:sticky;top:0;z-index:1200;display:flex;align-items:center;gap:10px;margin:6px 8px;padding:7px 10px;border:1px solid var(--dsw-alias-state-error-primary);border-radius:5px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px;box-shadow:0 2px 8px rgba(0,0,0,.12)}.wh-reminder-text{flex:1;min-width:0;font-variant-numeric:tabular-nums}.wh-reminder-button{flex:none;border:0;border-radius:4px;padding:4px 8px;background:var(--dsw-alias-state-error-primary);color:#fff;font:inherit;cursor:pointer}
      @media(max-width:700px){.wh-root{padding:16px}.wh-head{flex-wrap:wrap}.wh-week-range{position:static;order:3;transform:none;flex:1 0 100%;text-align:center}.wh-grid,.wh-months{grid-template-columns:1fr}.wh-panel.wide{grid-column:auto}.wh-value{font-size:22px}.wh-month-scroll{max-height:420px}}@media(prefers-reduced-motion:reduce){.wh-tab-after1930,.wh-tab-flash,.wh-tab-after1930 [class*="panelTitle"],.wh-tab-flash [class*="panelTitle"]{animation:none!important}}
      .wh-dock-reminder{position:static;width:100%;box-sizing:border-box;margin:0 0 8px;border-radius:8px}
      .wh-tabs{display:flex;gap:6px;flex-wrap:wrap}.wh-tab{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:inherit;border-radius:999px;padding:5px 13px;font:inherit;font-size:12px;line-height:16px;cursor:pointer}.wh-tab:hover{border-color:var(--dsw-alias-brand-primary)}.wh-tab.active{border-color:transparent;background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
      .wh-record-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}.wh-nav{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px}.wh-nav-title{font-size:15px;font-weight:650;min-width:104px;text-align:center;font-variant-numeric:tabular-nums}
      .wh-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:8px;margin-top:12px}.wh-kpi-item{background:var(--dsw-alias-bg-layer-2);border-radius:6px;padding:8px 10px}.wh-kpi-label{font-size:11px;color:var(--dsw-alias-label-secondary);line-height:15px}.wh-kpi-value{font-size:16px;font-weight:650;font-variant-numeric:tabular-nums}
      .wh-cal-week{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;margin:12px 0 6px;color:var(--dsw-alias-label-secondary);font-size:11px;text-align:center}.wh-cal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
      .wh-cal-cell{min-height:58px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-base);color:inherit;font:inherit;padding:5px 6px;display:flex;flex-direction:column;gap:1px;align-items:flex-start;cursor:pointer;text-align:left;font-variant-numeric:tabular-nums;transition:background .12s ease,border-color .12s ease}.wh-cal-cell:hover{border-color:var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2)}.wh-cal-cell.blank{border-color:transparent;background:transparent;cursor:default;pointer-events:none}.wh-cal-cell.weekend{background:color-mix(in srgb,var(--dsw-alias-label-tertiary) 9%,var(--dsw-alias-bg-base))}.wh-cal-cell.holiday{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 10%,var(--dsw-alias-bg-base))}.wh-cal-cell.makeup{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 9%,var(--dsw-alias-bg-base))}.wh-cal-date{display:flex;align-items:center;gap:4px}.wh-cal-tag{padding:0 4px;border-radius:4px;font-size:9px;line-height:13px;font-weight:600;letter-spacing:.02em;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 18%,transparent);color:var(--dsw-alias-state-warn-primary)}.wh-cal-tag.make{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 16%,transparent);color:var(--dsw-alias-brand-primary)}.wh-cal-cell.late{border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary) 55%,transparent)}.wh-cal-cell.ok{border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary) 45%,transparent)}.wh-cal-cell.running{border-color:color-mix(in srgb,var(--dsw-alias-brand-primary) 55%,transparent)}.wh-cal-cell.selected{border-color:var(--dsw-alias-brand-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary)}.wh-cal-cell.today{background:color-mix(in srgb,var(--dsw-alias-brand-primary) 8%,var(--dsw-alias-bg-base))}
      .wh-cal-num{font-size:11px;color:var(--dsw-alias-label-secondary);line-height:15px}.wh-cal-cell.today .wh-cal-num{color:var(--dsw-alias-brand-primary);font-weight:700}.wh-cal-hours{font-size:12px;font-weight:600;line-height:16px}.wh-cal-meta{font-size:10px;line-height:14px;color:var(--dsw-alias-label-tertiary)}.wh-cal-cell.late .wh-cal-meta{color:var(--dsw-alias-state-error-primary)}.wh-cal-cell.ok .wh-cal-meta{color:var(--dsw-alias-state-success-primary)}.wh-cal-cell.running .wh-cal-meta{color:var(--dsw-alias-brand-primary)}.wh-cal-cell.ok .wh-cal-meta,.wh-cal-cell.late .wh-cal-meta,.wh-cal-cell.running .wh-cal-meta{display:flex;align-items:center;gap:3px}.wh-cal-cell.ok .wh-cal-meta::before,.wh-cal-cell.late .wh-cal-meta::before,.wh-cal-cell.running .wh-cal-meta::before{content:'';display:block;width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}
      .wh-year-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(158px,1fr));gap:10px;margin-top:12px}.wh-year-card{border:1px solid var(--dsw-alias-border-l1);border-radius:6px;background:var(--dsw-alias-bg-base);color:inherit;font:inherit;padding:10px 12px;cursor:pointer;text-align:left}.wh-year-card:hover{border-color:var(--dsw-alias-brand-primary)}.wh-year-card.active{border-color:var(--dsw-alias-brand-primary);box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary)}.wh-year-title{font-size:12px;color:var(--dsw-alias-label-secondary)}.wh-year-avg{font-size:19px;font-weight:650;line-height:24px;margin-top:2px;font-variant-numeric:tabular-nums}.wh-year-unit{margin-left:1px;font-size:11px;font-weight:400;color:var(--dsw-alias-label-secondary)}.wh-year-meta{font-size:11px;line-height:15px;color:var(--dsw-alias-label-secondary);margin-top:1px}.wh-year-late{margin-top:5px;font-size:10px;line-height:14px;color:var(--dsw-alias-state-error-primary);word-break:break-all}
      .wh-detail{display:block;margin-top:12px;padding:12px;border:1px dashed var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-layer-2)}.wh-detail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(128px,1fr));gap:10px;margin-top:2px}.wh-detail-item{display:flex;flex-direction:column;gap:4px;min-width:0}.wh-detail-value{font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}.wh-detail-actions{display:flex;gap:6px;align-items:flex-end}
      .wh-message{width:min(320px,100%);box-sizing:border-box}
      .wh-card-head{display:flex;align-items:center;gap:8px}
      .wh-card-head .wh-label{margin-bottom:0}
      .wh-card-icon{flex:none;width:26px;height:26px;border-radius:8px;display:grid;place-items:center;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 12%,transparent);color:var(--dsw-alias-brand-primary)}
      .wh-card-icon.warn{background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 14%,transparent);color:var(--dsw-alias-state-warn-primary)}
      .wh-card-icon.success{background:color-mix(in srgb,var(--dsw-alias-state-success-primary) 14%,transparent);color:var(--dsw-alias-state-success-primary)}
      .wh-card-icon.idle{background:color-mix(in srgb,var(--dsw-alias-label-tertiary) 16%,transparent);color:var(--dsw-alias-label-secondary)}
      .wh-detail-head{display:flex;align-items:center;gap:10px;margin-bottom:2px}
      .wh-detail-title{font-size:13px;font-weight:600}
      .wh-detail-head .wh-detail-actions{margin-left:auto;display:flex;gap:6px}
      .wh-detail-hint{font-size:11px;line-height:16px;color:var(--dsw-alias-label-tertiary);margin:2px 0 8px}
      .wh-detail-time{font-size:14px;font-weight:600;font-variant-numeric:tabular-nums}
      .wh-check-wrap{display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;color:var(--dsw-alias-label-secondary)}
      .wh-checkbox{width:15px;height:15px;accent-color:var(--dsw-alias-brand-primary);cursor:pointer;margin:0}
      .wh-section-toggle{display:flex;align-items:center;gap:8px;width:100%;padding:0;border:0;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
      .wh-section-toggle .wh-label{margin-bottom:0}
      .wh-section-toggle:hover .wh-caret{color:var(--dsw-alias-brand-primary)}
      .wh-caret{margin-left:auto;font-size:11.5px;color:var(--dsw-alias-label-tertiary);white-space:nowrap}
      .wh-dirty-tag{padding:1px 6px;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-state-warn-primary) 16%,transparent);color:var(--dsw-alias-state-warn-primary);font-size:10px;line-height:14px}
      .wh-settings-body{margin-top:10px;display:block}
      .wh-toast{position:fixed;left:50%;bottom:28px;transform:translate(-50%,10px);z-index:2147482000;max-width:min(420px,calc(100vw - 32px));padding:9px 16px;border-radius:10px;font-size:12.5px;line-height:18px;font-weight:500;color:#fff;background:rgba(23,26,33,.95);box-shadow:0 10px 30px rgba(0,0,0,.22);opacity:0;pointer-events:none;transition:opacity .18s ease,transform .18s ease}
      .wh-toast.wh-toast-show{opacity:1;transform:translate(-50%,0)}
      .wh-toast[data-kind="error"]{background:var(--dsw-alias-state-error-primary)}
      @media(max-width:700px){.wh-cal-cell{min-height:50px;padding:4px}.wh-cal-hours{font-size:11px}.wh-cal-meta{display:none}.wh-year-grid{grid-template-columns:repeat(auto-fill,minmax(132px,1fr))}}
    `;
    const pad = n => String(n).padStart(2, '0');
    const dateKey = date => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
    const clock = date => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    const fmtDuration = ms => { const mins = Math.max(0, Math.floor(ms / 60000)); return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`; };
    const fmtMinuteSecond = ms => { const secs = Math.max(0, Math.floor(ms / 1000)); return `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`; };
    const DEBUG_KEY = 'work-hours:debug:v1';
    function readDebug() { try { const value = JSON.parse(localStorage.getItem(DEBUG_KEY) || 'null'); return value && typeof value.mode === 'string' ? value : { mode: null, at: null }; } catch { return { mode: null, at: null }; } }
    function setDebug(mode) { try { const now = Date.now(); const at = mode === 'countdown' ? now + 83000 : mode === 'overtime' ? now - 300 : mode === 'reminder' ? now - 125000 : now; const value = mode ? { mode, at } : { mode: null, at: null }; localStorage.setItem(DEBUG_KEY, JSON.stringify(value)); window.dispatchEvent(new Event('work-hours-updated')); } catch (error) { console.warn('[work-hours] could not update debug case', error); } }
    /* A toast is a one-off DOM node rather than React state: it must survive the
       panel re-rendering (and the settings section collapsing) while it fades. */
    let toastTimer = 0;
    function showToast(text, kind) {
      try {
        let node = document.querySelector('.wh-toast');
        if (!node) {
          node = document.createElement('div');
          node.className = 'wh-toast';
          node.setAttribute('role', 'status');
          node.setAttribute('aria-live', 'polite');
          document.body.appendChild(node);
        }
        node.textContent = text;
        node.dataset.kind = kind || 'ok';
        node.classList.add('wh-toast-show');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => { node.classList.remove('wh-toast-show'); }, 2400);
      } catch (error) { console.warn('[work-hours] toast failed', error); }
    }
    const dateTime = (day, hhmm) => { if (!hhmm) return null; const [hh, mm] = hhmm.split(':').map(Number); const d = new Date(`${day}T00:00:00`); d.setHours(hh, mm, 0, 0); return d.getTime(); };
    const timestampFor = (day, value) => { const time = dateTime(day, value); return time === null ? null : new Date(time).toISOString(); };
    const hasWorkHours = record => Boolean(record.in && record.out && new Date(record.out).getTime() > new Date(record.in).getTime());
    const isValidTime = value => typeof value === 'string' && TIME_RE.test(value);
    const normTime = (value, fallback) => isValidTime(value) ? value : fallback;
    /* Settings are spread flat next to `days` all over the UI, so normalising
       happens in exactly one place and every read returns a complete, valid set. */
    function normSettings(source) {
      const raw = source && typeof source === 'object' ? source : {};
      const interval = Number(raw.flashInterval);
      const message = typeof raw.flashMessage === 'string' ? raw.flashMessage.trim() : '';
      return {
        planIn: normTime(raw.planIn, DEFAULT_SETTINGS.planIn),
        planOut: normTime(raw.planOut, DEFAULT_SETTINGS.planOut),
        lateAfter: normTime(raw.lateAfter, DEFAULT_SETTINGS.lateAfter),
        overtimeAfter: normTime(raw.overtimeAfter, DEFAULT_SETTINGS.overtimeAfter),
        remindAfter: normTime(raw.remindAfter, DEFAULT_SETTINGS.remindAfter),
        flashInterval: Number.isFinite(interval) ? Math.min(60, Math.max(1, Math.round(interval))) : DEFAULT_SETTINGS.flashInterval,
        flashMessage: message ? message.slice(0, 120) : DEFAULT_SETTINGS.flashMessage,
        remindEnabled: raw.remindEnabled !== false && raw.remindEnabled !== 'false',
        remindMessage: (typeof raw.remindMessage === 'string' ? raw.remindMessage.trim().slice(0, 120) : '') || DEFAULT_SETTINGS.remindMessage,
      };
    }
    const minutesOf = value => { const [hh, mm] = String(value || '').split(':').map(Number); return (Number.isFinite(hh) ? hh : 0) * 60 + (Number.isFinite(mm) ? mm : 0); };
    /* A per-day plan beats the global planned off-work time, so an unusual day
       can still be recorded without touching the schedule for everyone else. */
    const planOutFor = (record, settings) => record && isValidTime(record.plan) ? record.plan : settings.planOut;
    /* 法定节假日与调休上班日（国务院办公厅 2025/2026 年节假日安排）。
       节假日按非工作日统计，调休上班日按工作日统计。 */
    const HOLIDAYS = {
      '2025-01-01': '元旦',
      '2025-01-28': '春节', '2025-01-29': '春节', '2025-01-30': '春节', '2025-01-31': '春节',
      '2025-02-01': '春节', '2025-02-02': '春节', '2025-02-03': '春节', '2025-02-04': '春节',
      '2025-04-04': '清明', '2025-04-05': '清明', '2025-04-06': '清明',
      '2025-05-01': '劳动节', '2025-05-02': '劳动节', '2025-05-03': '劳动节', '2025-05-04': '劳动节', '2025-05-05': '劳动节',
      '2025-05-31': '端午', '2025-06-01': '端午', '2025-06-02': '端午',
      '2025-10-01': '国庆', '2025-10-02': '国庆', '2025-10-03': '国庆', '2025-10-04': '国庆',
      '2025-10-05': '国庆', '2025-10-06': '国庆', '2025-10-07': '国庆', '2025-10-08': '国庆',
      '2026-01-01': '元旦', '2026-01-02': '元旦', '2026-01-03': '元旦',
      '2026-02-15': '春节', '2026-02-16': '春节', '2026-02-17': '春节', '2026-02-18': '春节',
      '2026-02-19': '春节', '2026-02-20': '春节', '2026-02-21': '春节', '2026-02-22': '春节', '2026-02-23': '春节',
      '2026-04-04': '清明', '2026-04-05': '清明', '2026-04-06': '清明',
      '2026-05-01': '劳动节', '2026-05-02': '劳动节', '2026-05-03': '劳动节', '2026-05-04': '劳动节', '2026-05-05': '劳动节',
      '2026-06-19': '端午', '2026-06-20': '端午', '2026-06-21': '端午',
      '2026-09-25': '中秋', '2026-09-26': '中秋', '2026-09-27': '中秋',
      '2026-10-01': '国庆', '2026-10-02': '国庆', '2026-10-03': '国庆', '2026-10-04': '国庆',
      '2026-10-05': '国庆', '2026-10-06': '国庆', '2026-10-07': '国庆',
    };
    const MAKEUP_WORKDAYS = {
      '2025-01-26': true, '2025-02-08': true, '2025-04-27': true, '2025-09-28': true, '2025-10-11': true,
      '2026-01-04': true, '2026-02-14': true, '2026-02-28': true, '2026-05-09': true, '2026-09-20': true, '2026-10-10': true,
    };
    /* 迟到 is a workday concept: weekend and holiday clock-ins are recorded and
       still count as hours, but they never enter the late count or its rate.
       调休上班日（周末补班）算工作日。 */
    const holidayOf = key => HOLIDAYS[key] || '';
    const isWorkdayKey = key => MAKEUP_WORKDAYS[key] ? true : (!HOLIDAYS[key] && new Date(`${key}T00:00:00`).getDay() % 6 !== 0);
    const isWorkday = date => isWorkdayKey(dateKey(date));
    /* One day's numbers, shared by the calendar, the list, the year cards and the
       averages. `running` only ever applies to today: a past day with no
       clock-out stays at 0 instead of counting forever. */
    const dayStats = (key, record, settings, nowMs) => {
      const inMs = record.in ? new Date(record.in).getTime() : null;
      const outMs = record.out ? new Date(record.out).getTime() : null;
      const complete = Boolean(inMs !== null && outMs !== null && outMs > inMs);
      const running = inMs !== null && outMs === null && key === dateKey(new Date(nowMs));
      const workMs = complete ? outMs - inMs : running ? Math.max(0, nowMs - inMs) : 0;
      const late = complete && isWorkdayKey(key) && inMs > dateTime(key, settings.lateAfter);
      return { key, inMs, outMs, complete, running, workMs, late };
    };
    function monthStats(data, year, monthIndex, nowMs) {
      const count = new Date(year, monthIndex + 1, 0).getDate();
      const rows = [];
      const settings = normSettings(data);
      let totalMs = 0, completedMs = 0, attendance = 0, complete = 0, workdayComplete = 0, late = 0, running = 0;
      for (let day = 1; day <= count; day += 1) {
        const date = new Date(year, monthIndex, day);
        const key = dateKey(date);
        const record = data.days[key] || {};
        const stats = dayStats(key, record, settings, nowMs);
        if (stats.inMs !== null) attendance += 1;
        if (stats.complete) { complete += 1; completedMs += stats.workMs; if (isWorkday(date)) workdayComplete += 1; }
        if (stats.running) running += 1;
        if (stats.late) late += 1;
        totalMs += stats.workMs;
        rows.push({ ...stats, date, record });
      }
      /* 平均工时 only averages finished days: a day that is still running would
         otherwise drag the average down all morning and jump at clock-out. The
         month total still includes today's live hours. */
      return { year, monthIndex, rows, totalMs, completedMs, attendance, complete, workdayComplete, late, running,
        avgMs: complete ? completedMs / complete : 0,
        lateRate: workdayComplete ? late / workdayComplete : 0 };
    }
    /* Current week (Monday..Sunday) — the floating panel shows both the month and
       the week lateness rate, so they must use the same definition. */
    function weekStats(data, nowMs) {
      const today = new Date(nowMs);
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      const rows = [];
      const settings = normSettings(data);
      let totalMs = 0, completedMs = 0, attendance = 0, complete = 0, workdayComplete = 0, late = 0, running = 0;
      for (let index = 0; index < 7; index += 1) {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
        const key = dateKey(date);
        const record = data.days[key] || {};
        const stats = dayStats(key, record, settings, nowMs);
        if (stats.inMs !== null) attendance += 1;
        if (stats.complete) { complete += 1; completedMs += stats.workMs; if (isWorkday(date)) workdayComplete += 1; }
        if (stats.running) running += 1;
        if (stats.late) late += 1;
        totalMs += stats.workMs;
        rows.push({ ...stats, date, record });
      }
      return { start, rows, totalMs, completedMs, attendance, complete, workdayComplete, late, running,
        avgMs: complete ? completedMs / complete : 0,
        lateRate: workdayComplete ? late / workdayComplete : 0 };
    }
    const lateRateText = stats => stats.workdayComplete ? `${Math.round(stats.lateRate * 100)}%` : '—';
    function yearStats(data, year, nowMs) {
      const months = Array.from({ length: 12 }, (_, index) => monthStats(data, year, index, nowMs));
      const totalMs = months.reduce((sum, month) => sum + month.totalMs, 0);
      const completedMs = months.reduce((sum, month) => sum + month.completedMs, 0);
      const attendance = months.reduce((sum, month) => sum + month.attendance, 0);
      const complete = months.reduce((sum, month) => sum + month.complete, 0);
      const workdayComplete = months.reduce((sum, month) => sum + month.workdayComplete, 0);
      const late = months.reduce((sum, month) => sum + month.late, 0);
      return { year, months, totalMs, completedMs, attendance, complete, workdayComplete, late,
        avgMs: complete ? completedMs / complete : 0,
        lateRate: workdayComplete ? late / workdayComplete : 0 };
    }
    /* localStorage reads are synchronous IO, and the sidebar text refreshes every
       second. Cache the RAW parsed JSON and return a fresh shaped object per call,
       so a caller that mutates the result (the clock-in punch does) can never
       poison the cache — every read behaves exactly like the uncached version. */
    let cachedRaw;
    function invalidateStore() { cachedRaw = undefined; }
    function load() {
      if (cachedRaw === undefined) {
        let raw;
        try { raw = JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch { raw = {}; }
        cachedRaw = raw && typeof raw === 'object' ? raw : {};
      }
      const data = cachedRaw;
      const days = {};
      if (data.days && typeof data.days === 'object') {
        for (const key of Object.keys(data.days)) {
          const day = data.days[key];
          days[key] = day && typeof day === 'object' ? { ...day } : day;
        }
      }
      /* Legacy versions kept lateAfter/flashInterval at the top level; spreading
         the normalised settings flat keeps that data readable and writable with
         no migration step, and new keys simply fall back to their defaults. */
      return { days, ...normSettings(data) };
    }
    /* Another window writing the same key fires 'storage' here; drop the cache
       so the next read picks the new data up, exactly as an uncached read would. */
    try { window.addEventListener('storage', invalidateStore); } catch { /* no window (tests) */ }
    function save(data) {
      try {
        const payload = { days: data.days && typeof data.days === 'object' ? data.days : {}, ...normSettings(data) };
        localStorage.setItem(STORE_KEY, JSON.stringify(payload));
        invalidateStore();
        window.dispatchEvent(new Event('work-hours-updated'));
      } catch (error) { console.warn('[work-hours] could not save', error); }
    }
    /* Everything lives in this browser's localStorage. Export/import is the only
       way the data leaves it, and only because the user asked for a file. */
    function exportData(data) {
      try {
        const payload = { app: 'work-hours', exportedAt: new Date().toISOString(), days: data.days || {}, ...normSettings(data) };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `work-hours-${dateKey(new Date())}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        return true;
      } catch (error) { console.warn('[work-hours] export failed', error); return false; }
    }
    function importData(text) {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || !parsed.days || typeof parsed.days !== 'object') throw new Error('文件里没有 days 字段');
      const days = {};
      for (const key of Object.keys(parsed.days)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
        const day = parsed.days[key];
        if (!day || typeof day !== 'object') continue;
        const next = {};
        if (typeof day.in === 'string') next.in = day.in;
        if (typeof day.out === 'string') next.out = day.out;
        if (isValidTime(day.plan)) next.plan = day.plan;
        days[key] = next;
      }
      save({ days, ...normSettings(parsed) });
      return Object.keys(days).length;
    }
    function startSidebarDetails() {
      let notifiedBurst = null;
      const sync = () => {
        const row = document.querySelector('button[aria-label="计时"]');
        if (!row) return;
        let detail = row.querySelector('[data-work-hours-sidebar]');
        if (!detail) {
          detail = document.createElement('span');
          detail.dataset.workHoursSidebar = 'true';
          detail.style.cssText = 'display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:15px;font-variant-numeric:tabular-nums';
          const title = row.querySelector('[class*="panelTitle"]');
          if (title) title.after(detail); else row.append(detail);
        }
        const now = new Date();
        const nowMs = now.getTime();
        const today = dateKey(now);
        const stored = load();
        const record = stored.days[today] || {};
        const debug = readDebug();
        const forceRed = debug.mode === 'late1930';
        let checkInMs = record.in ? new Date(record.in).getTime() : null;
        let expected = dateTime(today, planOutFor(record, stored));
        let debugWorking = false;
        if (debug.mode === 'countdown' || debug.mode === 'overtime') { expected = debug.at; checkInMs = expected - 9 * 60 * 60 * 1000; debugWorking = true; }
        if (forceRed) { if (checkInMs === null) checkInMs = dateTime(today, stored.planIn); expected = dateTime(today, stored.overtimeAfter); debugWorking = true; }
        const active = debugWorking || Boolean(checkInMs !== null && !record.out);
        const checkIn = checkInMs === null ? '--:--' : clock(new Date(checkInMs));
        const planned = expected === null ? '--:--' : clock(new Date(expected));
        const delta = expected === null ? null : expected - nowMs;
        let text;
        if (active && delta !== null) text = `上班 ${checkIn} · 计划 ${planned} · ${delta >= 0 ? '剩余' : '超时'} ${fmtMinuteSecond(Math.abs(delta))}`;
        else if (record.out) { const outMs = new Date(record.out).getTime(); text = `上班 ${checkIn} · 下班 ${clock(new Date(outMs))} · 工时 ${fmtDuration(Math.max(0, outMs - (checkInMs === null ? outMs : checkInMs)))}`; }
        else text = `未打卡 · 计划 ${stored.planIn}-${stored.planOut}`;
        if (detail.textContent !== text) detail.textContent = text;
        const minute = now.getHours() * 60 + now.getMinutes();
        const afterOvertime = forceRed || (active && minute >= minutesOf(stored.overtimeAfter));
        const overdue = active && delta !== null ? -delta : -1;
        const flashInterval = Math.max(1, Number(stored.flashInterval) || 5) * 60000;
        const burstPhase = overdue >= 0 ? overdue % flashInterval : -1;
        const flash = !forceRed && burstPhase >= 0 && burstPhase < 1200;
        const burstIndex = overdue >= 0 ? Math.floor(overdue / flashInterval) : null;
        const burstKey = debug.mode === 'overtime' ? `debug:${burstIndex}` : debug.mode ? null : active && !record.out && overdue >= 0 ? `${today}:${burstIndex}` : null;
        if (burstKey === null) notifiedBurst = null;
        else if (burstKey !== notifiedBurst) { notifiedBurst = burstKey; notifyOvertime(stored.flashMessage); }
        row.classList.toggle('wh-tab-after1930', afterOvertime);
        if (row.classList.contains('wh-tab-flash') !== flash) row.classList.toggle('wh-tab-flash', flash);
        row.style.color = afterOvertime ? 'var(--dsw-alias-state-error-primary)' : '';
      };
      let frame = 0;
      const schedule = () => { if (frame) return; frame = requestAnimationFrame(() => { frame = 0; sync(); }); };
      const stopDomWatch = sharedDomWatch().subscribe('work-hours:sidebar-details', schedule);
      const timer = window.setInterval(() => { if (document.visibilityState === 'hidden') return; sync(); }, 1000);
      window.addEventListener('work-hours-updated', schedule);
      schedule();
      return () => { stopDomWatch(); window.clearInterval(timer); window.removeEventListener('work-hours-updated', schedule); if (frame) cancelAnimationFrame(frame); };
    }
    function startQuickPanel() {
      let row = null;
      let panel = null;
      let closeTimer = null;
      let syncTimer = null;
      const close = () => { if (closeTimer) clearTimeout(closeTimer); closeTimer = null; if (panel) panel.hidden = true; };
      const scheduleClose = () => { if (closeTimer) clearTimeout(closeTimer); closeTimer = window.setTimeout(close, 180); };
      const punch = field => {
        const now = new Date();
        const today = dateKey(now);
        const data = load();
        const record = data.days[today] || {};
        data.days[today] = { ...record, [field]: now.toISOString() };
        if (field === 'in') data.days[today].out = null;
        save(data);
        close();
      };
      const update = () => {
        if (!row || !panel) return;
        const now = new Date();
        const data = load();
        const record = data.days[dateKey(now)] || {};
        const rect = row.getBoundingClientRect();
        const panelWidth = Math.min(430, window.innerWidth - 24);
        let left = rect.right + 8;
        if (left + panelWidth > window.innerWidth - 12) left = Math.max(12, rect.left - panelWidth - 8);
        left = Math.min(Math.max(12, left), Math.max(12, window.innerWidth - panelWidth - 12));
        const maxHeight = Math.max(180, Math.min(620, window.innerHeight - 24));
        panel.style.left = `${left}px`;
        panel.style.width = `${panelWidth}px`;
        panel.style.maxHeight = `${maxHeight}px`;
        panel.style.top = '12px';
        panel.style.overflowY = 'auto';
        const panelHeight = Math.min(panel.offsetHeight || 150, maxHeight);
        panel.style.top = `${Math.max(12, Math.min(rect.bottom - panelHeight, window.innerHeight - panelHeight - 12))}px`;
        const inText = record.in ? clock(new Date(record.in)) : '未打卡';
        const planOutText = planOutFor(record, data);
        const outText = record.out ? clock(new Date(record.out)) : '未打卡';
        const inMs = record.in ? new Date(record.in).getTime() : null;
        const outMs = record.out ? new Date(record.out).getTime() : null;
        const workedMs = inMs === null ? null : Math.max(0, (outMs === null ? now.getTime() : outMs) - inMs);
        panel.querySelector('[data-wh-quick-planin-value]').textContent = data.planIn;
        panel.querySelector('[data-wh-quick-plan-value]').textContent = record.plan ? `${record.plan}（今日）` : planOutText;
        panel.querySelector('[data-wh-quick-in-value]').textContent = inText;
        panel.querySelector('[data-wh-quick-out-value]').textContent = outText;
        panel.querySelector('[data-wh-quick-work-value]').textContent = workedMs === null ? '—' : fmtDuration(workedMs);
        const month = monthStats(data, now.getFullYear(), now.getMonth(), now.getTime());
        const week = weekStats(data, now.getTime());
        panel.querySelector('[data-wh-quick-monthavg-value]').textContent = month.complete ? fmtDuration(month.avgMs) : '—';
        panel.querySelector('[data-wh-quick-monthrate-value]').textContent = lateRateText(month);
        panel.querySelector('[data-wh-quick-weekrate-value]').textContent = lateRateText(week);
        const inButton = panel.querySelector('[data-wh-quick-in]');
        const outButton = panel.querySelector('[data-wh-quick-out]');
        inButton.disabled = Boolean(record.in && !record.out);
        inButton.textContent = inButton.disabled ? '已上班打卡' : '上班打卡';
        outButton.disabled = !record.in || Boolean(record.out);
        outButton.textContent = record.out ? '已下班打卡' : '下班打卡';
      };
      const ensurePanel = () => {
        if (panel) return;
        panel = document.createElement('div');
        panel.className = 'wh-quick';
        panel.hidden = true;
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', '快捷打卡');
        panel.innerHTML = '<div class="wh-quick-head">快捷打卡</div><div class="wh-quick-meta">'
          + '<span>计划上班</span><span data-wh-quick-planin-value>—</span><span>上班</span><span data-wh-quick-in-value>未打卡</span>'
          + '<span>计划下班</span><span data-wh-quick-plan-value>—</span><span>下班</span><span data-wh-quick-out-value>未打卡</span>'
          + '<span>今日工时</span><span data-wh-quick-work-value>—</span><span>月均工时</span><span data-wh-quick-monthavg-value>—</span>'
          + '<span>本月迟到率</span><span data-wh-quick-monthrate-value>—</span><span>本周迟到率</span><span data-wh-quick-weekrate-value>—</span>'
          + '</div><div class="wh-quick-actions"><button class="wh-btn primary" type="button" data-wh-quick-in></button><button class="wh-btn" type="button" data-wh-quick-out></button></div>';
        panel.addEventListener('pointerenter', () => { if (closeTimer) clearTimeout(closeTimer); closeTimer = null; });
        panel.addEventListener('pointerleave', scheduleClose);
        panel.querySelector('[data-wh-quick-in]').addEventListener('click', event => { event.stopPropagation(); punch('in'); });
        panel.querySelector('[data-wh-quick-out]').addEventListener('click', event => { event.stopPropagation(); punch('out'); });
        document.body.appendChild(panel);
      };
      const bindRow = next => {
        if (row === next) return;
        if (row) { row.removeEventListener('pointerenter', open); row.removeEventListener('pointerleave', scheduleClose); }
        row = next;
        if (row) { row.classList.add('wh-quick-anchor'); row.addEventListener('pointerenter', open); row.addEventListener('pointerleave', scheduleClose); }
      };
      function open() { ensurePanel(); panel.hidden = false; update(); }
      const findRow = () => document.querySelector('button[aria-label="计时"]');
      const onOutside = event => { if (panel && !panel.hidden && !panel.contains(event.target)) close(); };
      const onKey = event => { if (event.key === 'Escape') close(); };
      const onResize = () => { if (panel && !panel.hidden) update(); };
      document.addEventListener('pointerdown', onOutside, true);
      document.addEventListener('keydown', onKey, true);
      window.addEventListener('resize', onResize);
      window.addEventListener('work-hours-updated', onResize);
      const stopDomWatch = sharedDomWatch().subscribe('work-hours:quick-panel', () => bindRow(findRow()));
      bindRow(findRow());
      /* Structure changes already come through the observer above; this tick only
         keeps the open panel's numbers live, so it skips the whole-document lookup
         while the panel is closed. */
      syncTimer = window.setInterval(() => {
        if (panel && !panel.hidden) { bindRow(findRow()); update(); }
      }, 1000);
      return () => { stopDomWatch(); clearInterval(syncTimer); if (closeTimer) clearTimeout(closeTimer); document.removeEventListener('pointerdown', onOutside, true); document.removeEventListener('keydown', onKey, true); window.removeEventListener('resize', onResize); window.removeEventListener('work-hours-updated', onResize); if (row) { row.removeEventListener('pointerenter', open); row.removeEventListener('pointerleave', scheduleClose); row.classList.remove('wh-quick-anchor'); } panel?.remove(); };
    }
    function notifyOvertime(message) {
      const body = typeof message === 'string' && message.trim() ? message.trim() : DEFAULT_SETTINGS.flashMessage;
      try {
        window.dispatchEvent(new CustomEvent('session-notifier:notify', { detail: { kind: 'action', title: '超时提醒', body } }));
        return true;
      } catch (error) { console.warn('[work-hours] notification center dispatch failed', error); return false; }
    }
    function recordClockOut() {
      const now = new Date();
      const today = dateKey(now);
      const data = load();
      const record = data.days[today] || {};
      if (!record.in || record.out) return false;
      data.days[today] = { ...record, out: now.toISOString() };
      save(data);
      return true;
    }
    /* The 20:00 clock-out reminder is one bar, and it lives inside the
       conversation itself: the composer dock seat is exactly as wide as the
       conversation column, so the bar inherits that width and follows every
       resize for free — no measuring, no floating over the rest of the app. */
    function ReminderBar() {
      const [now, setNow] = React.useState(() => new Date());
      React.useEffect(() => {
        const refresh = () => setNow(new Date());
        const timer = window.setInterval(refresh, 1000);
        window.addEventListener('work-hours-updated', refresh);
        window.addEventListener('storage', refresh);
        return () => { window.clearInterval(timer); window.removeEventListener('work-hours-updated', refresh); window.removeEventListener('storage', refresh); };
      }, []);
      const debug = readDebug();
      const simulated = debug.mode === 'reminder';
      const data = load();
      const record = data.days[dateKey(now)] || {};
      const alertStart = dateTime(dateKey(now), data.remindAfter);
      /* Cheap checks first: no clock-in, already clocked out, or before the
         configured off-work reminder time and the bar never exists at all. */
      if (!simulated && !data.remindEnabled) return null;
      if (!simulated && (!record.in || record.out || alertStart === null || now.getTime() < alertStart)) return null;
      const from = simulated ? debug.at : alertStart;
      const onClick = () => { if (simulated) setDebug(null); else recordClockOut(); setNow(new Date()); };
      const elapsed = fmtMinuteSecond(Math.max(0, now.getTime() - from));
      const template = typeof data.remindMessage === 'string' && data.remindMessage.trim() ? data.remindMessage : DEFAULT_SETTINGS.remindMessage;
      /* `{time}` is the elapsed-time slot; a template without it still keeps the
         duration visible instead of silently dropping the live part. */
      const text = template.includes('{time}') ? template.replace(/\{time\}/g, elapsed) : `${template} ${elapsed}`;
      return h('div', { className: 'wh-reminder wh-dock-reminder', role: 'status' },
        h('span', { className: 'wh-reminder-text' }, text),
        h('button', { type: 'button', className: 'wh-reminder-button', onClick }, '点击立即打卡'));
    }
    function Icon(props) { const size = props.size || 20; return h('svg',{width:size,height:size,viewBox:'0 0 24 24',fill:'none',stroke:props.active?'var(--dsw-alias-brand-primary)':'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true,style:{display:'block'}},h('circle',{cx:12,cy:12,r:9}),h('path',{d:'M12 7v5l3 2'})); }
    function EditableTimeCell({ value, onSave }) {
      const [editing, setEditing] = React.useState(false);
      const [draft, setDraft] = React.useState('');
      const inputRef = React.useRef(null);
      const cancelRef = React.useRef(false);
      const valueForInput = value ? (/^\d{2}:\d{2}$/.test(value) ? value : clock(new Date(value))) : '';
      React.useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
      if (editing) return h('input', {
        ref: inputRef, type: 'time', className: 'wh-inline-time', value: draft,
        onChange: event => setDraft(event.target.value),
        onBlur: () => { if (cancelRef.current) { cancelRef.current = false; return; } onSave(draft); setEditing(false); },
        onKeyDown: event => { if (event.key === 'Enter') event.currentTarget.blur(); if (event.key === 'Escape') { cancelRef.current = true; setEditing(false); setDraft(valueForInput); event.currentTarget.blur(); } },
      });
      return h('span', { className: 'wh-time-cell', title: '双击修改时间', onDoubleClick: () => { setDraft(valueForInput); setEditing(true); } }, valueForInput || '—');
    }
    const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
    const monthLabel = (year, monthIndex) => `${year} 年 ${monthIndex + 1} 月`;
    function CardIcon({ kind }) {
      const tone = kind === 'timer' ? 'warn' : kind === 'month' ? 'success' : kind === 'year' ? 'idle' : '';
      const shapes = {
        clock: [h('circle', { key: 'c', cx: 12, cy: 12, r: 9 }), h('path', { key: 'p', d: 'M12 7.5V12l3.2 2' })],
        timer: [h('path', { key: 'p', d: 'M7 3h10M7 21h10M8 3c0 4.2 8 4.2 8 9s-8 4.8-8 9M16 3c0 4.2-8 4.2-8 9s8 4.8 8 9' })],
        month: [h('rect', { key: 'r', x: 3.5, y: 5, width: 17, height: 15.5, rx: 2.5 }), h('path', { key: 'p', d: 'M3.5 9.5h17M8 3v3.4M16 3v3.4' })],
        year: [h('path', { key: 'p', d: 'M4.5 20V9.5M10 20V4.5M15.5 20v-6.5M21 20H3' })],
      };
      return h('span', { className: `wh-card-icon ${tone}`.trim(), 'aria-hidden': 'true' },
        h('svg', { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' },
          shapes[kind] || shapes.clock));
    }
    function Kpi({ label, value, title }) {
      return h('div', { className: 'wh-kpi-item', title },
        h('div', { className: 'wh-kpi-label' }, label),
        h('div', { className: 'wh-kpi-value' }, value));
    }
    function TimeSetting({ id, label, hint, value, onChange }) {
      return h('div', { className: 'wh-setting' },
        h('label', { htmlFor: id }, label, hint ? h('span', { className: 'wh-sub', style: { display: 'block', marginTop: 0 } }, hint) : null),
        h('input', { id, className: 'wh-input', type: 'time', value, onChange: event => onChange(event.target.value) }));
    }
    function TextSetting({ id, label, hint, value, maxLength, onChange }) {
      return h('div', { className: 'wh-setting', style: { alignItems: 'flex-start' } },
        h('label', { htmlFor: id }, label, hint ? h('span', { className: 'wh-sub', style: { display: 'block', marginTop: 0 } }, hint) : null),
        h('input', {
          id, className: 'wh-input wh-message', type: 'text', maxLength: maxLength || 120, value,
          onChange: event => onChange(event.target.value),
        }));
    }

    /* The settings form keeps a local draft: nothing is written to storage until
       the user presses 保存设置 (a mistyped hour should never flip 迟到 live). */
    const settingsDraft = data => ({
      planIn: data.planIn, planOut: data.planOut, lateAfter: data.lateAfter,
      overtimeAfter: data.overtimeAfter, remindAfter: data.remindAfter,
      flashInterval: String(data.flashInterval), flashMessage: data.flashMessage,
      remindEnabled: Boolean(data.remindEnabled), remindMessage: data.remindMessage,
    });
    const draftKey = draft => JSON.stringify([draft.planIn, draft.planOut, draft.lateAfter, draft.overtimeAfter,
      draft.remindAfter, String(Number(draft.flashInterval)), String(draft.flashMessage),
      draft.remindEnabled ? '1' : '0', String(draft.remindMessage)]);
    const SETTING_TIME_FIELDS = [
      ['planIn', 'wh-plan-in', '计划上班时间', null],
      ['planOut', 'wh-plan-out', '计划下班时间', '未单独设置的日子，按这个时间算预计下班与超时。'],
      ['lateAfter', 'wh-late', '迟到判定时间', '晚于该时间上班记为迟到（仅工作日统计）。'],
      ['overtimeAfter', 'wh-overtime', '超时提示时间', '过了该时间，侧栏计时条目变红呼吸。'],
      ['remindAfter', 'wh-remind', '下班提示时间', '过了该时间，会话顶部出现打卡提醒条。'],
    ];
    function validateDraft(draft) {
      for (const [key, , label] of SETTING_TIME_FIELDS) {
        if (!isValidTime(draft[key])) return `${label}格式应为 HH:MM`;
      }
      const interval = Number(draft.flashInterval);
      if (!Number.isFinite(interval) || interval < 1 || interval > 60) return '超时爆闪间隔需在 1–60 分钟之间';
      if (String(draft.flashMessage).length > 120) return '爆闪文案最多 120 字';
      if (String(draft.remindMessage).length > 120) return '下班提醒文案最多 120 字';
      return '';
    }
    function SettingsPanel({ data, commit, fileRef, notice, onExport, onImport }) {
      const [open, setOpen] = React.useState(false);
      const [draft, setDraft] = React.useState(() => settingsDraft(data));
      const [hint, setHint] = React.useState('');
      const [error, setError] = React.useState('');
      const dirty = draftKey(settingsDraft(data)) !== draftKey(draft);
      const set = (key, value) => setDraft(current => ({ ...current, [key]: value }));
      const toggle = () => {
        const next = !open;
        setOpen(next);
        if (next) { setDraft(settingsDraft(data)); setError(''); setHint(''); }
      };
      const save = () => {
        const problem = validateDraft(draft);
        if (problem) { setError(problem); setHint(''); showToast(problem, 'error'); return; }
        const interval = Math.min(60, Math.max(1, Math.round(Number(draft.flashInterval))));
        const message = String(draft.flashMessage).trim() || DEFAULT_SETTINGS.flashMessage;
        const remindMessage = String(draft.remindMessage).trim() || DEFAULT_SETTINGS.remindMessage;
        commit(old => ({ ...old, planIn: draft.planIn, planOut: draft.planOut, lateAfter: draft.lateAfter,
          overtimeAfter: draft.overtimeAfter, remindAfter: draft.remindAfter,
          flashInterval: interval, flashMessage: message,
          remindEnabled: Boolean(draft.remindEnabled), remindMessage }));
        setDraft(current => ({ ...current, flashInterval: String(interval), flashMessage: message, remindMessage }));
        setError('');
        setHint('');
        showToast('设置已保存');
      };
      const reset = () => {
        setDraft(settingsDraft(DEFAULT_SETTINGS));
        setError('');
        setHint('已填回默认值，点“保存设置”后生效');
      };
      return h('section', { className: 'wh-panel wide' },
        h('button', {
          className: 'wh-section-toggle', type: 'button', onClick: toggle,
          'aria-expanded': open ? 'true' : 'false', 'aria-controls': 'wh-settings-body', title: open ? '收起设置' : '展开设置',
        },
          h('span', { className: 'wh-label' }, '设置'),
          dirty ? h('span', { className: 'wh-dirty-tag' }, '未保存') : null,
          h('span', { className: 'wh-caret' }, open ? '收起 ▴' : '展开 ▾')),
        open ? h('div', { className: 'wh-settings-body', id: 'wh-settings-body' },
          h('div', { className: 'wh-sub' }, '所有时间都能改，改完点“保存设置”生效。设置与打卡记录只存在本机，不会上传；需要备份时导出 JSON。'),
          ...SETTING_TIME_FIELDS.map(([key, id, label, hintText]) =>
            h(TimeSetting, { key, id, label, hint: hintText, value: draft[key], onChange: value => set(key, value) })),
          h('div', { className: 'wh-setting' },
            h('label', { htmlFor: 'wh-remind-enabled' }, '下班提醒条',
              h('span', { className: 'wh-sub', style: { display: 'block', marginTop: 0 } }, '关闭后，超过下班提示时间也不再在会话顶部弹提醒。')),
            h('label', { className: 'wh-check-wrap' },
              h('input', {
                id: 'wh-remind-enabled', className: 'wh-checkbox', type: 'checkbox',
                checked: Boolean(draft.remindEnabled), onChange: event => set('remindEnabled', event.target.checked),
              }),
              h('span', { className: 'wh-check-text' }, draft.remindEnabled ? '已开启' : '已关闭'))),
          h(TextSetting, {
            id: 'wh-remind-message', label: '下班提醒条文案',
            hint: '用 {time} 表示已过时长（如 02:05）；不写 {time} 时会把时长接在文案后面。最多 120 字。',
            value: draft.remindMessage, maxLength: 120, onChange: value => set('remindMessage', value),
          }),
          h('div', { className: 'wh-setting' },
            h('label', { htmlFor: 'wh-flash-interval' }, '超时爆闪间隔（分钟）',
              h('span', { className: 'wh-sub', style: { display: 'block', marginTop: 0 } }, '超时后按该间隔爆闪一次，范围 1–60 分钟。')),
            h('input', {
              id: 'wh-flash-interval', className: 'wh-input', type: 'number', min: 1, max: 60, step: 1,
              value: draft.flashInterval, onChange: event => set('flashInterval', event.target.value),
            })),
          h(TextSetting, {
            id: 'wh-flash-message', label: '超时爆闪提示文案',
            hint: '爆闪时通知中心显示的文字，最多 120 字。',
            value: draft.flashMessage, maxLength: 120, onChange: value => set('flashMessage', value),
          }),
          h('div', { className: 'wh-actions' },
            h('button', { className: 'wh-btn primary', type: 'button', onClick: save }, '保存设置'),
            h('button', { className: 'wh-btn', type: 'button', onClick: reset }, '恢复默认时间'),
            h('button', { className: 'wh-btn', type: 'button', onClick: onExport }, '导出配置'),
            h('button', { className: 'wh-btn', type: 'button', onClick: () => fileRef.current && fileRef.current.click() }, '导入配置'),
            h('input', { ref: fileRef, type: 'file', accept: 'application/json,.json', style: { display: 'none' }, onChange: onImport })),
          error ? h('div', { className: 'wh-sub wh-late', style: { marginTop: 8 } }, error) : null,
          hint ? h('div', { className: 'wh-sub', style: { marginTop: 8 } }, hint) : null,
          notice ? h('div', { className: 'wh-sub', style: { marginTop: 4 } }, notice) : null
        ) : null);
    }
    const dayTimesDraft = record => ({
      in: record.in ? clock(new Date(record.in)) : '',
      plan: isValidTime(record.plan) ? record.plan : '',
      out: record.out ? clock(new Date(record.out)) : '',
    });
    /* The detail strip under the calendar. Read-only by default so a stray click
       cannot rewrite a record; 编辑 (or a double click on any time) opens the three
       inputs and 保存 commits them in one write. */
    function DayDetail({ dayKey, data, now, onSaveDay, onClose }) {
      const record = data.days[dayKey] || {};
      const stats = dayStats(dayKey, record, data, now.getTime());
      const date = new Date(`${dayKey}T00:00:00`);
      const holiday = holidayOf(dayKey);
      const label = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(date);
      const status = stats.complete ? (stats.late ? '迟到' : '准时') : stats.running ? '进行中' : stats.inMs !== null ? '工时未填' : '未打卡';
      const [editing, setEditing] = React.useState(false);
      const [draft, setDraft] = React.useState(() => dayTimesDraft(record));
      const [focusField, setFocusField] = React.useState('');
      const startEdit = field => { setDraft(dayTimesDraft(record)); setFocusField(field || ''); setEditing(true); };
      const cancel = () => { setEditing(false); setFocusField(''); };
      const save = () => {
        onSaveDay(dayKey, { in: draft.in || '', plan: draft.plan || '', out: draft.out || '' });
        setEditing(false);
        setFocusField('');
        showToast('保存成功');
      };
      const shown = {
        in: record.in ? clock(new Date(record.in)) : '—',
        plan: record.plan && isValidTime(record.plan) ? record.plan : planOutFor(record, data),
        out: record.out ? clock(new Date(record.out)) : '—',
      };
      const timeItem = (key, title) => h('div', { className: 'wh-detail-item' },
        h('span', { className: 'wh-label' }, title),
        editing ? h('input', {
          className: 'wh-input', type: 'time', value: draft[key], autoFocus: focusField === key,
          onChange: event => setDraft(current => ({ ...current, [key]: event.target.value })),
        }) : h('span', { className: 'wh-detail-time', title: '双击编辑', onDoubleClick: () => startEdit(key) }, shown[key]));
      return h('div', { className: 'wh-detail' },
        h('div', { className: 'wh-detail-head' },
          h('span', { className: 'wh-detail-title' }, label),
          holiday ? h('span', { className: 'wh-cal-tag' }, holiday) : null,
          h('div', { className: 'wh-detail-actions' },
            editing
              ? h('button', { className: 'wh-btn primary', type: 'button', onClick: save }, '保存')
              : h('button', { className: 'wh-btn', type: 'button', onClick: () => startEdit('') }, '编辑'),
            editing ? h('button', { className: 'wh-btn', type: 'button', onClick: cancel }, '取消') : null,
            h('button', { className: 'wh-btn', type: 'button', onClick: onClose }, '收起'))),
        h('div', { className: 'wh-detail-hint' }, editing
          ? '修改后点“保存”写入记录；计划下班留空表示沿用全局计划。'
          : '双击任意时间也可以直接编辑。'),
        h('div', { className: 'wh-detail-grid' },
          timeItem('in', '上班'),
          timeItem('plan', record.plan && isValidTime(record.plan) ? '计划下班（本日）' : '计划下班（全局）'),
          timeItem('out', '下班'),
          h('div', { className: 'wh-detail-item' },
            h('span', { className: 'wh-label' }, '工时 / 状态'),
            h('span', { className: 'wh-detail-value' }, stats.workMs ? fmtDuration(stats.workMs) : '—'),
            h('span', { className: stats.late ? 'wh-sub wh-late' : 'wh-sub', style: { marginTop: 0 } }, status))));
    }
    function MonthCalendar({ year, monthIndex, data, now, selectedKey, onSelectDay }) {
      const stats = monthStats(data, year, monthIndex, now.getTime());
      const lead = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
      const cells = [];
      /* Leading blanks so the 1st lands under its real weekday column. */
      for (let index = 0; index < lead; index += 1) cells.push(h('div', { key: `blank-${index}`, className: 'wh-cal-cell blank' }));
      stats.rows.forEach(row => {
        const weekday = row.date.getDay();
        const isWeekendDay = weekday === 0 || weekday === 6;
        const holiday = holidayOf(row.key);
        const makeup = Boolean(MAKEUP_WORKDAYS[row.key]) && isWeekendDay;
        const classes = ['wh-cal-cell'];
        if (isWeekendDay && !makeup && !holiday) classes.push('weekend');
        if (holiday) classes.push('holiday');
        if (makeup) classes.push('makeup');
        if (row.complete) classes.push(row.late ? 'late' : 'ok');
        if (row.running) classes.push('running');
        if (row.key === dateKey(now)) classes.push('today');
        if (row.key === selectedKey) classes.push('selected');
        const status = row.complete ? row.late ? '迟到' : '准时' : row.running ? '进行中' : row.inMs !== null ? '未完成' : '';
        cells.push(h('button', {
          key: row.key, type: 'button', className: classes.join(' '), onClick: () => onSelectDay(row.key),
          title: `${row.key}${holiday ? ` · ${holiday}` : ''}${row.workMs ? ` · ${fmtDuration(row.workMs)}` : ''}${status ? ` · ${status}` : ''}`,
        },
          h('span', { className: 'wh-cal-date' },
            h('span', { className: 'wh-cal-num' }, `${row.date.getDate()}`),
            holiday ? h('span', { className: 'wh-cal-tag' }, holiday) : makeup ? h('span', { className: 'wh-cal-tag make' }, '班') : null),
          h('span', { className: 'wh-cal-hours' }, row.workMs ? fmtDuration(row.workMs) : '—'),
          h('span', { className: 'wh-cal-meta' }, status)));
      });
      return h('div', null,
        h('div', { className: 'wh-kpi' },
          h(Kpi, { label: '总工时', value: fmtDuration(stats.totalMs) }),
          h(Kpi, { label: '平均工时', value: stats.complete ? `${fmtDuration(stats.avgMs)}/天` : '—', title: '按已完成工时天数计算' }),
          h(Kpi, { label: '迟到天数', value: `${stats.late} 天（${lateRateText(stats)}）` }),
          h(Kpi, { label: '出勤天数', value: `${stats.attendance} 天` })),
        h('div', { className: 'wh-cal-week' }, ...WEEKDAY_LABELS.map(label => h('span', { key: label }, label))),
        h('div', { className: 'wh-cal-grid' }, ...cells));
    }
    function MonthList({ year, monthIndex, data, now, onEditTime }) {
      const stats = monthStats(data, year, monthIndex, now.getTime());
      return h('div', null,
        h('div', { className: 'wh-kpi' },
          h(Kpi, { label: '总工时', value: fmtDuration(stats.totalMs) }),
          h(Kpi, { label: '平均工时', value: stats.complete ? `${fmtDuration(stats.avgMs)}/天` : '—', title: '按已完成工时天数计算' }),
          h(Kpi, { label: '迟到天数', value: `${stats.late} 天（${lateRateText(stats)}）` }),
          h(Kpi, { label: '出勤天数', value: `${stats.attendance} 天` })),
        h('div', { className: 'wh-month-scroll', style: { maxHeight: 460 } }, h('table', { className: 'wh-month-table' },
          h('thead', null, h('tr', null, h('th', null, '日期'), h('th', null, '上班'), h('th', null, '计划下班'), h('th', null, '下班'), h('th', null, '工时'), h('th', null, '状态'))),
          h('tbody', null, ...stats.rows.map(row => {
            const status = row.complete ? row.late ? '迟到' : '准时' : row.running ? '进行中' : row.inMs !== null ? '工时未填' : '—';
            return h('tr', { key: row.key, className: row.date.getDay() === 0 || row.date.getDay() === 6 ? 'wh-weekend' : '', 'data-wh-date': row.key },
              h('td', null, `${pad(row.date.getMonth() + 1)}/${pad(row.date.getDate())}`),
              h('td', null, h(EditableTimeCell, { value: row.record.in || '', onSave: value => onEditTime(row.key, 'in', value) })),
              h('td', null, h(EditableTimeCell, { value: planOutFor(row.record, data), onSave: value => onEditTime(row.key, 'plan', value) })),
              h('td', null, h(EditableTimeCell, { value: row.record.out || '', onSave: value => onEditTime(row.key, 'out', value) })),
              h('td', null, row.workMs ? fmtDuration(row.workMs) : '—'),
              h('td', { className: row.late ? 'wh-late' : row.complete ? 'wh-good' : 'wh-muted' }, status));
          }))
        )));
    }
    function YearView({ year, data, now, activeMonth, onPickMonth }) {
      const stats = yearStats(data, year, now.getTime());
      return h('div', null,
        h('div', { className: 'wh-kpi' },
          h(Kpi, { label: '全年总工时', value: fmtDuration(stats.totalMs) }),
          h(Kpi, { label: '年平均工时', value: stats.complete ? `${fmtDuration(stats.avgMs)}/天` : '—', title: '按已完成工时天数计算' }),
          h(Kpi, { label: '迟到总天数', value: `${stats.late} 天（${lateRateText(stats)}）` }),
          h(Kpi, { label: '出勤天数', value: `${stats.attendance} 天` })),
        h('div', { className: 'wh-year-grid' }, stats.months.map(month => {
          const lateDays = month.rows.filter(row => row.late).map(row => `${pad(row.date.getMonth() + 1)}/${pad(row.date.getDate())}`);
          return h('button', { key: month.monthIndex, type: 'button', className: month.monthIndex === activeMonth ? 'wh-year-card active' : 'wh-year-card', onClick: () => onPickMonth(month.monthIndex), title: '点击查看该月打卡详情' },
            h('div', { className: 'wh-year-title' }, `${month.monthIndex + 1} 月`),
            h('div', { className: 'wh-year-avg' }, month.attendance ? fmtDuration(month.avgMs) : '—', month.attendance ? h('span', { className: 'wh-year-unit' }, '/天') : null),
            h('div', { className: 'wh-year-meta' }, `总工时 ${fmtDuration(month.totalMs)}`),
            h('div', { className: 'wh-year-meta' }, `完成 ${month.complete} 天 · 出勤 ${month.attendance} 天 · 迟到 ${month.late} 天（${lateRateText(month)}）`),
            lateDays.length ? h('div', { className: 'wh-year-late' }, `迟到：${lateDays.join('、')}`) : null);
        })));
    }
    function Dashboard() {
      const [data, setData] = React.useState(load);
      const [debug, setDebugState] = React.useState(readDebug);
      const [now, setNow] = React.useState(() => new Date());
      const [view, setView] = React.useState('month');
      const [cursor, setCursor] = React.useState(() => { const today = new Date(); return { year: today.getFullYear(), month: today.getMonth() }; });
      const [selectedKey, setSelectedKey] = React.useState(null);
      const [notice, setNotice] = React.useState('');
      const fileRef = React.useRef(null);
      React.useEffect(() => {
        const refresh = () => { setData(load()); setDebugState(readDebug()); setNow(new Date()); };
        const timer = window.setInterval(() => setNow(new Date()), 1000);
        window.addEventListener('work-hours-updated', refresh);
        window.addEventListener('storage', refresh);
        return () => { window.clearInterval(timer); window.removeEventListener('work-hours-updated', refresh); window.removeEventListener('storage', refresh); };
      }, []);
      const today = dateKey(now);
      const record = data.days[today] || {};
      const checkInMs = record.in ? new Date(record.in).getTime() : null;
      const checkOutMs = record.out ? new Date(record.out).getTime() : null;
      const elapsed = checkInMs === null ? 0 : Math.max(0, (checkOutMs === null ? now.getTime() : checkOutMs) - checkInMs);
      const plannedOut = dateTime(today, planOutFor(record, data));
      const departure = debug.mode === 'countdown' || debug.mode === 'overtime' ? debug.at : plannedOut;
      const working = Boolean(checkInMs !== null && checkOutMs === null) || debug.mode === 'countdown' || debug.mode === 'overtime';
      const remaining = departure === null ? null : departure - now.getTime();
      const month = monthStats(data, cursor.year, cursor.month, now.getTime());
      const year = yearStats(data, cursor.year, now.getTime());
      const commit = updater => setData(old => { const next = updater(old); save(next); return next; });
      const checkInNow = () => commit(old => ({ ...old, days: { ...old.days, [today]: { ...old.days[today], in: new Date().toISOString(), out: null } } }));
      const checkOutNow = () => commit(old => ({ ...old, days: { ...old.days, [today]: { ...old.days[today], out: new Date().toISOString() } } }));
      const editDayTime = (day, field, value) => commit(old => {
        const dayRecord = { ...old.days[day], [field]: field === 'plan' ? value : timestampFor(day, value) };
        if (field === 'plan' && !value) delete dayRecord.plan;
        return { ...old, days: { ...old.days, [day]: dayRecord } };
      });
      /* One write for the three times of a day, so the detail panel never saves a
         half-applied record (and never leaves an empty per-day plan behind). */
      const saveDayTimes = (day, times) => commit(old => {
        const record = { ...old.days[day] };
        record.in = times.in ? timestampFor(day, times.in) : null;
        record.out = times.out ? timestampFor(day, times.out) : null;
        if (times.plan) record.plan = times.plan; else delete record.plan;
        return { ...old, days: { ...old.days, [day]: record } };
      });
      const shiftMonth = delta => { setSelectedKey(null); setCursor(current => { const next = new Date(current.year, current.month + delta, 1); return { year: next.getFullYear(), month: next.getMonth() }; }); };
      const shiftYear = delta => { setSelectedKey(null); setCursor(current => ({ ...current, year: current.year + delta })); };
      const backToToday = () => { setSelectedKey(null); if (view === 'year') setCursor(current => ({ ...current, year: now.getFullYear() })); else setCursor({ year: now.getFullYear(), month: now.getMonth() }); };
      const onImport = async event => {
        const file = event.target.files && event.target.files[0];
        event.target.value = '';
        if (!file) return;
        try {
          const text = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error || new Error('读取失败'));
            reader.readAsText(file);
          });
          const count = importData(text);
          setData(load());
          setNotice(`已导入 ${count} 天记录`);
          showToast(`已导入 ${count} 天记录`);
        } catch (error) { const message = `导入失败：${error && error.message ? error.message : '文件格式不正确'}`; setNotice(message); showToast(message, 'error'); }
      };
      const onExportConfig = () => { exportData(load()); setNotice('已导出配置文件'); showToast('已导出配置文件'); };
      const todayLabel = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(now);
      const debugCases = [
        ['countdown', '倒计时预览', '模拟 01:23 的下班倒计时'],
        ['overtime', '超时爆闪', `超过计划下班后每 ${data.flashInterval} 分钟爆闪一次`],
        ['late1930', '超时红色提示', `模拟 ${data.overtimeAfter} 后的红色侧栏`],
        ['reminder', '下班提醒条', `模拟 ${data.remindAfter} 的会话顶部提醒`],
      ];
      const viewTabs = [['month', '日历'], ['year', '年视图'], ['list', '列表']];
      const isYear = view === 'year';
      const prev = () => isYear ? shiftYear(-1) : shiftMonth(-1);
      const next = () => isYear ? shiftYear(1) : shiftMonth(1);
      return h('div', { className: 'wh-root' }, h('main', { className: 'wh-main' },
        h('header', { className: 'wh-head' },
          h('div', null, h('h1', { className: 'wh-title' }, '工时计时'), h('div', { className: 'wh-date' }, todayLabel)),
          h('div', { className: 'wh-week-range' }, `计划 ${data.planIn} - ${data.planOut} · 迟到线 ${data.lateAfter}`),
          h('div', { className: 'wh-value', style: { fontSize: 18 } }, clock(now))),
        h('div', { className: 'wh-grid' },
          h('section', { className: 'wh-panel' },
            h('div', { className: 'wh-card-head' }, h(CardIcon, { kind: 'clock' }), h('div', { className: 'wh-label' }, '今日累计工时')),
            h('div', { className: 'wh-value' }, fmtDuration(elapsed)),
            h('div', { className: 'wh-sub' }, checkInMs === null ? `尚未打卡 · 计划 ${data.planIn} - ${data.planOut}` : `上班 ${clock(new Date(checkInMs))}${checkOutMs === null ? ' · 计时中' : ` · 下班 ${clock(new Date(checkOutMs))}`}`),
            h('div', { className: 'wh-actions' },
              h('button', { className: 'wh-btn primary', type: 'button', onClick: checkInNow, disabled: Boolean(checkInMs) }, checkInMs === null ? '上班打卡' : '已上班打卡'),
              h('button', { className: 'wh-btn', type: 'button', onClick: checkOutNow, disabled: checkInMs === null || Boolean(checkOutMs) }, checkOutMs === null ? '下班打卡' : '已下班打卡'))),
          h('section', { className: 'wh-panel' },
            h('div', { className: 'wh-card-head' }, h(CardIcon, { kind: 'timer' }), h('div', { className: 'wh-label' }, '预计下班倒计时')),
            h('div', { className: 'wh-value' }, departure === null ? '未设置' : clock(new Date(departure))),
            h('div', { className: `wh-sub ${remaining !== null && remaining < 0 ? 'wh-late' : ''}` }, working && remaining !== null ? `${remaining >= 0 ? '剩余' : '超时'} ${fmtMinuteSecond(Math.abs(remaining))}` : checkOutMs !== null ? '已下班打卡' : record.plan ? `本日手动计划 ${record.plan}` : `计划下班 ${data.planOut}`)),
          h('section', { className: 'wh-panel' },
            h('div', { className: 'wh-card-head' }, h(CardIcon, { kind: 'month' }), h('div', { className: 'wh-label' }, '月平均工时')),
            h('div', { className: 'wh-value' }, month.attendance ? fmtDuration(month.avgMs) : '—'),
            h('div', { className: 'wh-sub' }, `${monthLabel(cursor.year, cursor.month)} · 总 ${fmtDuration(month.totalMs)} · 完成 ${month.complete} 天 · 迟到 ${month.late} 天（${lateRateText(month)}）`)),
          h('section', { className: 'wh-panel' },
            h('div', { className: 'wh-card-head' }, h(CardIcon, { kind: 'year' }), h('div', { className: 'wh-label' }, '年平均工时')),
            h('div', { className: 'wh-value' }, year.attendance ? fmtDuration(year.avgMs) : '—'),
            h('div', { className: 'wh-sub' }, `${cursor.year} 年 · 总 ${fmtDuration(year.totalMs)} · 完成 ${year.complete} 天 · 迟到 ${year.late} 天（${lateRateText(year)}）`)),

          h('section', { className: 'wh-panel wide' },
            h('div', { className: 'wh-record-head' },
              h('div', null, h('div', { className: 'wh-label' }, '工时记录'), h('div', { className: 'wh-sub' }, '日历看每日工时；年视图看每月平均与迟到日期，点某月进入该月；列表可逐条改时间。')),
              h('div', { className: 'wh-tabs' }, ...viewTabs.map(([key, label]) => h('button', { key, type: 'button', className: view === key ? 'wh-tab active' : 'wh-tab', onClick: () => { setView(key); setSelectedKey(null); } }, label)))),
            h('div', { className: 'wh-nav' },
              h('button', { className: 'wh-btn', type: 'button', onClick: prev, 'aria-label': '上一页' }, '‹'),
              h('strong', { className: 'wh-nav-title' }, isYear ? `${cursor.year} 年` : monthLabel(cursor.year, cursor.month)),
              h('button', { className: 'wh-btn', type: 'button', onClick: next, 'aria-label': '下一页' }, '›'),
              h('button', { className: 'wh-btn', type: 'button', onClick: backToToday }, isYear ? '今年' : '今天')),
            view === 'month' ? h(MonthCalendar, { year: cursor.year, monthIndex: cursor.month, data, now, selectedKey, onSelectDay: key => setSelectedKey(current => current === key ? null : key) }) : null,
            view === 'list' ? h(MonthList, { year: cursor.year, monthIndex: cursor.month, data, now, onEditTime: editDayTime }) : null,
            view === 'year' ? h(YearView, { year: cursor.year, data, now, activeMonth: cursor.month, onPickMonth: index => { setCursor(current => ({ ...current, month: index })); setView('month'); setSelectedKey(null); } }) : null,
            view === 'month' && selectedKey ? h(DayDetail, { dayKey: selectedKey, data, now, onSaveDay: saveDayTimes, onClose: () => setSelectedKey(null) }) : null),
          h(SettingsPanel, { data, commit, fileRef, notice, onExport: onExportConfig, onImport }),
          h('section', { className: 'wh-panel wide' },
            h('div', { className: 'wh-label' }, '调试模式'),
            h('div', { className: 'wh-sub' }, '触发预览不会修改打卡记录；关闭当前 case 后恢复正常模式。'),
            ...debugCases.map(([mode, title, description]) => h('div', { className: 'wh-setting', key: mode },
              h('span', null, h('strong', null, title), h('span', { className: 'wh-sub', style: { display: 'block', marginTop: 0 } }, description)),
              h('button', { className: `wh-btn ${debug.mode === mode ? 'primary' : ''}`, type: 'button', onClick: () => setDebug(debug.mode === mode ? null : mode) }, debug.mode === mode ? '关闭' : '触发'))))
        )
      ));
    }

    function apply(ctx) {
      const style = document.createElement('style'); style.textContent = CSS; style.dataset.workHours = 'true'; document.head.appendChild(style);
      ctx.effect(() => () => style.remove(), 'work-hours: styles');
      ctx.effect(() => startSidebarDetails(), 'work-hours: sidebar details');
      ctx.effect(() => startQuickPanel(), 'work-hours: quick punch panel');
      ctx.slots.inject('main', () => ctx.slots.register({name:'main',key:PANEL_ID},Dashboard));
      ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({name:'sidebar.panellist',id:PANEL_ID,order:23,label:()=> '计时'},Icon));
      /* Full-width seat above the composer: the bar is exactly as wide as the
         conversation column and reflows with it. */
      ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({name:'conversation.input.dock',id:`${PANEL_ID}-reminder`,order:1},ReminderBar));
    }
    /* Test-only view of the pure helpers (averages, lateness, config migration).
       The app never defines this global, so the branch is dead in production. */
    if (globalThis.__WORK_HOURS_TEST__) {
      globalThis.__WORK_HOURS_TEST__.helpers = { load, save, monthStats, yearStats, weekStats, dayStats, normSettings, planOutFor, importData, exportData, hasWorkHours, DEFAULT_SETTINGS };
    }
    return { inject:['slots'], apply };
  },
});
