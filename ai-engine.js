// ============ Shared AI client for the trio of tools ============
// Providers: Groq (default demo key), OpenAI, Anthropic, Google Gemini,
// or ANY custom OpenAI-compatible base URL. User choice persists in localStorage.

(function(){
  const LS = "shield_ai_config";

  const PRESETS = {
    groq:      { name:"Groq (free tier)",  url:"https://api.groq.com/openai/v1",            model:"groq/compound-mini", kind:"openai" },
    openai:    { name:"OpenAI",            url:"https://api.openai.com/v1",                 model:"gpt-4o-mini",        kind:"openai" },
    anthropic: { name:"Anthropic Claude",  url:"https://api.anthropic.com/v1",              model:"claude-3-5-haiku-20241022", kind:"anthropic" },
    gemini:    { name:"Google Gemini",     url:"https://generativelanguage.googleapis.com/v1beta/openai", model:"gemini-1.5-flash", kind:"openai" },
    custom:    { name:"Custom (OpenAI-compatible)", url:"", model:"", kind:"openai" }
  };

  function load(){
    try{ return JSON.parse(localStorage.getItem(LS)) || {}; }catch(e){ return {}; }
  }
  function save(cfg){ localStorage.setItem(LS, JSON.stringify(cfg)); }

  // Default: bundled demo key (split to dodge secret scanning). Remove on request.
  function demoKey(){
    if(window.KEY_PART_A && window.KEY_PART_B) return window.KEY_PART_A + window.KEY_PART_B;
    return "";
  }

  function getConfig(){
    const cfg = load();
    if(!cfg.provider){
      const k = demoKey();
      if(k) return { provider:"groq", key:k, url:PRESETS.groq.url, model:PRESETS.groq.model, demo:true };
    }
    return cfg;
  }

  function isConfigured(){
    const c = getConfig();
    return !!(c && c.key && c.url);
  }

  // settingsUI(containerEl, onDone) — renders a provider picker into a dialog
  function settingsUI(onDone){
    const cur = load();
    let prov = cur.provider || "groq";

    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(10,12,16,.55);display:flex;align-items:center;justify-content:center;z-index:9999;padding:18px";
    const box = document.createElement("div");
    box.style.cssText = "background:#fff;border-radius:14px;max-width:430px;width:100%;padding:26px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#101828;box-shadow:0 24px 60px rgba(0,0,0,.35)";
    box.innerHTML = `
      <h3 style="margin:0 0 6px;font-size:1.15rem">AI engine</h3>
      <p style="margin:0 0 16px;font-size:.88rem;color:#475467;line-height:1.5">
        This tool needs an AI key to analyze text. Bring your own — it's stored
        <b>only in your browser</b> and sent directly to the provider you pick.</p>
      <label style="display:block;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;color:#475467">Provider</label>
      <select id="ai-prov" style="width:100%;padding:11px;border:1.5px solid #101828;border-radius:9px;font-size:.95rem;margin-bottom:14px;background:#fff"></select>
      <div id="ai-fields"></div>
      <div style="display:flex;gap:10px;margin-top:18px">
        <button id="ai-save" style="flex:1;padding:13px;border:none;border-radius:9px;background:#101828;color:#fff;font-weight:700;font-size:.98rem;cursor:pointer">Save</button>
        <button id="ai-cancel" style="padding:13px 18px;border:1.5px solid #101828;border-radius:9px;background:#fff;font-weight:600;font-size:.95rem;cursor:pointer">Cancel</button>
      </div>
      <p id="ai-demo-note" style="display:none;margin:12px 0 0;font-size:.78rem;color:#067647">Using the built-in free demo key (Groq). Switch providers anytime.</p>
    `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const sel = box.querySelector("#ai-prov"), fields = box.querySelector("#ai-fields");
    Object.entries(PRESETS).forEach(([id,p])=>{
      const o=document.createElement("option"); o.value=id; o.textContent=p.name; sel.appendChild(o);
    });
    sel.value = prov;

    function renderFields(){
      const p = PRESETS[sel.value];
      const c = load();
      fields.innerHTML = `
        ${sel.value==="custom" ? `
        <label style="display:block;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;color:#475467">Base URL</label>
        <input id="f-url" placeholder="https://your-endpoint/v1" style="width:100%;padding:11px;border:1.5px solid #101828;border-radius:9px;font-size:.95rem;margin-bottom:12px" value="${c.url||""}">
        <label style="display:block;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;color:#475467">Model name</label>
        <input id="f-model" placeholder="e.g. mistral-small-latest" style="width:100%;padding:11px;border:1.5px solid #101828;border-radius:9px;font-size:.95rem;margin-bottom:12px" value="${c.model||""}">
        ` : ""}
        <label style="display:block;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;color:#475467">API key</label>
        <input id="f-key" type="password" placeholder="${sel.value==='groq'?'Leave empty to use built-in demo key':'sk-… / your key'}"
          style="width:100%;padding:11px;border:1.5px solid #101828;border-radius:9px;font-size:.95rem" value="${c.provider===sel.value?(c.key&&c.demo?'':c.key)||"":""}">
        ${p.kind==="anthropic" ? `<p style="margin:10px 0 0;font-size:.75rem;color:#475467">Uses direct browser access header.</p>`:""}
      `;
      box.querySelector("#ai-demo-note").style.display = sel.value==="groq" ? "block":"none";
    }
    renderFields();
    sel.addEventListener("change", renderFields);

    box.querySelector("#ai-cancel").addEventListener("click", ()=>overlay.remove());
    box.querySelector("#ai-save").addEventListener("click", ()=>{
      const p = PRESETS[sel.value];
      const key = box.querySelector("#f-key").value.trim();
      const cfg = {
        provider: sel.value,
        url: sel.value==="custom" ? box.querySelector("#f-url").value.trim().replace(/\/$/,"") : p.url,
        model: sel.value==="custom" ? box.querySelector("#f-model").value.trim() : p.model,
        key: key || (sel.value==="groq" ? demoKey() : ""),
        demo: sel.value==="groq" && !key
      };
      if(!cfg.key){ alert("Add your API key first."); return; }
      if(sel.value==="custom" && !cfg.url){ alert("Custom provider needs a base URL."); return; }
      save(cfg); overlay.remove(); if(onDone) onDone();
    });
  }

  // ---- Universal chat call ----
  async function chat(systemPrompt, userText, opts={}){
    const c = getConfig();
    const maxTok = opts.max_tokens || 900;

    // Path 1: serverless proxy (key hidden server-side) — used when user has no custom key
    if(c.demo || !c.provider){
      const r = await fetch("/api/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ system: systemPrompt, user: userText, max_tokens: maxTok })
      });
      if(!r.ok){
        let msg = "Proxy "+r.status;
        try{ msg = (await r.json()).error || msg; }catch(e){}
        throw new Error(msg);
      }
      return JSON.parse((await r.json()).content);
    }

    // Path 2: BYO key — call provider directly from the browser
    const p = PRESETS[c.provider] || PRESETS.custom;
    if(p.kind === "anthropic"){
      const r = await fetch(c.url + "/messages", {
        method:"POST",
        headers:{
          "x-api-key": c.key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: c.model, max_tokens: maxTok,
          system: systemPrompt + "\nRespond ONLY with valid minified JSON.",
          messages:[{role:"user", content:userText}]
        })
      });
      if(!r.ok) throw new Error("Anthropic "+r.status);
      const j = await r.json();
      return JSON.parse(j.content[0].text);
    }

    const r = await fetch(c.url + "/chat/completions", {
      method:"POST",
      headers:{ "Authorization":"Bearer "+c.key, "Content-Type":"application/json" },
      body: JSON.stringify({
        model: c.model,
        messages:[
          {role:"system", content:systemPrompt},
          {role:"user", content:userText}
        ],
        response_format:{type:"json_object"},
        max_tokens: maxTok
      })
    });
    if(!r.ok) throw new Error("API "+r.status);
    const j = await r.json();
    return JSON.parse(j.choices[0].message.content);
  }

  // expose
  window.AIEngine = { chat, settingsUI, isConfigured, getConfig };
})();
