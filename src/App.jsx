import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Play, Pause, SkipForward, SkipBack, RotateCcw, X, Volume2, VolumeX,
  ChevronRight, ChevronLeft, Plus, Minus, Trash2, ArrowUp, ArrowDown, Clock, Check, Pencil,
  Copy, Download, Upload, ListChecks,
} from "lucide-react";

/* ============================================================
   動作庫
   ============================================================ */
const EXERCISES = {
  "cat-cow": { name: "貓狗式", emoji: "🐱", category: "warmup",
    keyPoints: ["手腳跪地", "背一下拱、一下塌", "跟著呼吸慢慢做"],
    voiceCues: ["跟著呼吸，慢慢活動整條背", "拱背像貓咪，塌背像牛"] },
  "dead-bug": { name: "死蟲式", emoji: "🪲", category: "warmup",
    keyPoints: ["躺著，手腳對角互換", "下背緊貼地板"],
    voiceCues: ["下背貼緊地板", "手腳慢慢伸出再收回"] },
  "bird-dog": { name: "鳥狗式", emoji: "🐕", category: "warmup",
    keyPoints: ["跪姿伸出對角手腳", "想像被往外拉長", "身體不要晃"],
    voiceCues: ["往外延伸，不是往上抬", "身體穩住不要搖晃"] },
  "streamline-plank": { name: "流線型棒式", emoji: "📏", category: "core",
    keyPoints: ["手肘撐地、雙腳併攏", "肚子夾緊像一根直棍"],
    voiceCues: ["肚子用力收緊", "屁股不要抬高也不要下塌", "撐住，你做得到"],
    regression: "改成膝蓋跪地撐，維持 30 秒", dangerSigns: "腰開始痠痛就要馬上停下來喔" },
  "side-plank-rotation": { name: "側棒式轉體", emoji: "🔄", category: "core",
    keyPoints: ["側躺單肘撐地", "上手往天空伸直再穿過身體轉一圈"],
    voiceCues: ["骨盆抬高不要下沉", "慢慢轉，控制住身體"],
    regression: "下面小腿貼地支撐，只做靜態側棒" },
  "superman-flutter": { name: "趴姿超人打腿", emoji: "🦸", category: "core",
    keyPoints: ["趴著手腳離地一點點", "用屁股力氣小幅快速打腿"],
    voiceCues: ["用屁股發力打腿", "脖子放鬆看地面，不要抬頭"],
    regression: "只做上半身抬起，或只做下半身打腿" },
  "bear-plank-taps": { name: "熊爬定住＋拍肩", emoji: "🐻", category: "core",
    keyPoints: ["四足跪姿、膝蓋離地 5 公分", "左右手輪流拍對邊肩膀"],
    voiceCues: ["軀幹像凍結一樣不要晃", "膝蓋撐住離地一點點"],
    regression: "只維持熊爬姿勢定住，先不拍肩" },
  "hollow-hold": { name: "船身撐體", emoji: "🚣", category: "core",
    keyPoints: ["仰躺、肩腳同時離地", "下背貼地成淺碗狀"],
    voiceCues: ["下背貼緊地板不要拱起", "手腳伸長，像一艘船"],
    regression: "膝蓋彎曲抱團，縮短力臂" },
  "cobra-stretch": { name: "眼鏡蛇式伸展", emoji: "🐍", category: "cooldown",
    keyPoints: ["趴姿用手撐起上半身", "肚子貼地深呼吸"],
    voiceCues: ["深呼吸，吸氣把肚子撐大", "放鬆，拉伸肚子的肌肉"] },
  "child-pose": { name: "嬰兒式", emoji: "🧘", category: "cooldown",
    keyPoints: ["屁股坐向腳跟", "雙手往前伸長放鬆背與肩"],
    voiceCues: ["慢慢呼吸，放鬆背和肩膀", "訓練完成，你今天很棒"] },
};
const CAT_LABEL = { warmup: "暖身", core: "核心", cooldown: "伸展" };
const EMOJI_SET = ["💪","🤸","🧘","🏃","🦵","🙆","🤾","🧎","🏊","🚣","🌊","🐬","🐢","🦈","⭐","🔥"];

const DEFAULT_ROUTINE = {
  name: "30 分鐘游泳核心訓練",
  prepSeconds: 10,
  phases: [
    { name: "動態熱身", rounds: 1, roundBreakSeconds: 0, items: [
      { id: "cat-cow", work: 60, rest: 0 }, { id: "dead-bug", work: 120, rest: 0 }, { id: "bird-dog", work: 120, rest: 0 },
    ]},
    { name: "核心主菜單", rounds: 4, roundBreakSeconds: 60, items: [
      { id: "streamline-plank", work: 45, rest: 15 }, { id: "side-plank-rotation", work: 45, rest: 15 },
      { id: "superman-flutter", work: 45, rest: 15 }, { id: "bear-plank-taps", work: 45, rest: 15 },
    ]},
    { name: "冷卻伸展", rounds: 1, roundBreakSeconds: 0, items: [
      { id: "cobra-stretch", work: 120, rest: 0 }, { id: "child-pose", work: 180, rest: 0 },
    ]},
  ],
};

const CUE_INTERVAL = 15;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
// 動作圖片路徑：搭配 Vite 的 base 設定（本機 "/"，GitHub Pages 為 "/repo名稱/"），
// 執行時組出的字串不會被 Vite 自動改寫，需自行帶上 BASE_URL，避免部署到子路徑後 404。
const exerciseImagePath = (filename) => `${import.meta.env.BASE_URL}exercises/${filename}`;
// 相容舊資料：先前可能已把 "/exercises/xxx.png" 這種不含 base 的絕對路徑存進 localStorage，
// 這裡取出檔名後用目前的 BASE_URL 重新組成正確路徑。
const exerciseFilenameFromPath = (p) => (p || "").replace(/^.*\/exercises\//, "");
const fmt = (s) => { const t = Math.ceil(Math.max(0, s)); return t < 60 ? `${t}` : `${Math.floor(t/60)}:${String(t%60).padStart(2,"0")}`; };

function buildSegments(routine, lib) {
  const segs = [];
  if (routine.prepSeconds > 0) segs.push({ type: "PREP", duration: routine.prepSeconds });
  routine.phases.forEach((phase) => {
    for (let r = 1; r <= phase.rounds; r++) {
      phase.items.forEach((item, idx) => {
        const ex = lib[item.id];
        if (!ex) return;
        segs.push({ type: "WORK", duration: item.work, exercise: ex, phaseName: phase.name, round: r, totalRounds: phase.rounds });
        const isLast = idx === phase.items.length - 1;
        if (isLast && r < phase.rounds && phase.roundBreakSeconds > 0)
          segs.push({ type: "ROUND_BREAK", duration: phase.roundBreakSeconds, phaseName: phase.name, round: r, totalRounds: phase.rounds });
        else if (item.rest > 0)
          segs.push({ type: "REST", duration: item.rest, phaseName: phase.name });
      });
    }
  });
  for (let i = 0; i < segs.length; i++)
    if (segs[i].type !== "WORK")
      for (let j = i + 1; j < segs.length; j++) if (segs[j].type === "WORK") { segs[i].nextExercise = segs[j].exercise; break; }
  while (segs.length && segs[segs.length-1].type !== "WORK" && !segs[segs.length-1].nextExercise) segs.pop();
  const totalWork = segs.filter((s) => s.type === "WORK").length;
  let wc = 0; segs.forEach((s) => { s.totalWork = totalWork; if (s.type === "WORK") s.workIndex = ++wc; });
  return segs;
}
const totalSeconds = (routine, lib) => buildSegments(routine, lib).reduce((a, s) => a + s.duration, 0);

const THEME = {
  PREP: { g: "linear-gradient(160deg,#4C5BD4,#6D7BF0)", ring: "#EEF1FF" },
  WORK: { g: "linear-gradient(160deg,#FF6B4A,#FF9E5E)", ring: "#FFF3EC" },
  REST: { g: "linear-gradient(160deg,#12B6C9,#1E88D6)", ring: "#E8FBFF" },
  ROUND_BREAK: { g: "linear-gradient(160deg,#0E8A93,#125E8B)", ring: "#DBF7FB" },
  DONE: { g: "linear-gradient(160deg,#FFC24B,#FF7A45)", ring: "#FFF7E6" },
};

/* ============================================================
   App：設定頁 ⇄ 訓練頁
   ============================================================ */
const LS_ROUTINE = "sct.routine.v1";       // 舊版單一課表 key（僅用於一次性搬移）
const LS_ROUTINES = "sct.routines.v1";     // 新版：多套課表陣列
const LS_CURRENT = "sct.currentRoutineId.v1";
const LS_CUSTOM = "sct.customExercises.v1";
const LS_HISTORY = "sct.history.v1";

const makeId = () => `routine-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const blankRoutine = (name = "新課表") => ({ name, prepSeconds: 10, phases: [] });

function loadRoutines() {
  try {
    const s = localStorage.getItem(LS_ROUTINES);
    if (s) { const arr = JSON.parse(s); if (Array.isArray(arr) && arr.length) return arr; }
  } catch {}
  // 從舊版單一課表資料搬移，避免既有使用者的課表憑空消失
  try {
    const old = localStorage.getItem(LS_ROUTINE);
    if (old) return [{ id: makeId(), ...JSON.parse(old) }];
  } catch {}
  return [{ id: makeId(), ...DEFAULT_ROUTINE }];
}

export default function SwimTrainerApp() {
  const [routines, setRoutines] = useState(loadRoutines);
  const [currentId, setCurrentId] = useState(() => {
    try { const s = localStorage.getItem(LS_CURRENT); if (s && routines.some((r) => r.id === s)) return s; } catch {}
    return routines[0]?.id;
  });
  const [library, setLibrary] = useState(() => {
    const seed = {};
    // 內建動作：圖片依 id 對應 public/exercises/<id>.png，找不到時自動退回 emoji
    for (const [k, v] of Object.entries(EXERCISES)) seed[k] = { ...v, image: exerciseImagePath(`${k}.png`), builtin: true };
    try {
      const s = localStorage.getItem(LS_CUSTOM);
      if (s) {
        const custom = JSON.parse(s);
        for (const [k, v] of Object.entries(custom))
          seed[k] = { ...v, image: v.image ? exerciseImagePath(exerciseFilenameFromPath(v.image)) : undefined, builtin: false };
      }
    } catch {}
    return seed;
  });
  const [view, setView] = useState("home"); // home | edit | train

  // 持久化：課表清單、目前選用課表、自訂動作（內建動作不存，維持由程式碼提供）
  useEffect(() => { try { localStorage.setItem(LS_ROUTINES, JSON.stringify(routines)); } catch {} }, [routines]);
  useEffect(() => { try { if (currentId) localStorage.setItem(LS_CURRENT, currentId); } catch {} }, [currentId]);
  useEffect(() => {
    try {
      const custom = {};
      for (const [k, v] of Object.entries(library)) if (!v.builtin) custom[k] = v;
      localStorage.setItem(LS_CUSTOM, JSON.stringify(custom));
    } catch {}
  }, [library]);

  const routine = routines.find((r) => r.id === currentId) || routines[0];
  const setRoutine = (fn) => {
    setRoutines((list) => list.map((r) => {
      if (r.id !== currentId) return r;
      const next = typeof fn === "function" ? fn(r) : fn;
      return { id: r.id, ...next };
    }));
  };

  const openRoutine = (id) => { setCurrentId(id); setView("edit"); };
  const addRoutine = () => {
    const r = { id: makeId(), ...blankRoutine(`新課表 ${routines.length + 1}`) };
    setRoutines((list) => [...list, r]);
    openRoutine(r.id);
  };
  const duplicateRoutine = (id) => {
    const src = routines.find((r) => r.id === id);
    if (!src) return;
    const copy = { ...structuredClone(src), id: makeId(), name: `${src.name}（複製）` };
    setRoutines((list) => [...list, copy]);
  };
  const deleteRoutine = (id) => {
    setRoutines((list) => {
      const next = list.filter((r) => r.id !== id);
      const finalList = next.length ? next : [{ id: makeId(), ...blankRoutine() }];
      if (id === currentId) setCurrentId(finalList[0].id);
      return finalList;
    });
  };
  const importRoutine = (payload) => {
    const incoming = payload.routine || payload; // 相容純課表 JSON 或 { routine, exercises } 包裝
    if (!incoming || typeof incoming !== "object" || typeof incoming.name !== "string" || !Array.isArray(incoming.phases))
      throw new Error("課表格式不正確");
    if (payload.exercises && typeof payload.exercises === "object") {
      setLibrary((lib) => {
        const merged = { ...lib };
        for (const [k, v] of Object.entries(payload.exercises))
          if (!merged[k]) merged[k] = { ...v, image: v.image ? exerciseImagePath(exerciseFilenameFromPath(v.image)) : undefined, builtin: false };
        return merged;
      });
    }
    const r = { id: makeId(), name: incoming.name, prepSeconds: incoming.prepSeconds ?? 10, phases: incoming.phases };
    setRoutines((list) => [...list, r]);
    return r.id;
  };
  const exportRoutine = (id) => {
    const r = routines.find((x) => x.id === id);
    if (!r) return;
    const { id: _id, ...routineData } = r;
    const usedCustomIds = new Set();
    routineData.phases.forEach((p) => p.items.forEach((it) => { if (library[it.id] && !library[it.id].builtin) usedCustomIds.add(it.id); }));
    const exercises = {};
    // 匯出用檔名而非完整路徑，避免帶入本機的 base 路徑，讓匯入端能用自己的路徑正確組出圖片網址
    usedCustomIds.forEach((k) => { exercises[k] = { ...library[k], image: library[k].image ? exerciseFilenameFromPath(library[k].image) : undefined }; });
    const payload = { type: "sct.routine.v1", routine: routineData, exercises };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${r.name.replace(/[\\/:*?"<>|]/g, "_") || "課表"}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={S.root}>
      <style>{CSS}</style>
      {view === "home" && (
        <Home routines={routines} library={library} currentId={currentId}
          onOpen={openRoutine} onAdd={addRoutine} onDuplicate={duplicateRoutine}
          onDelete={deleteRoutine} onExport={exportRoutine} onImport={importRoutine} />
      )}
      {view === "edit" && routine && (
        <Editor routine={routine} setRoutine={setRoutine} library={library} setLibrary={setLibrary}
          onStart={() => setView("train")} onHome={() => setView("home")} />
      )}
      {view === "train" && routine && (
        <Trainer routine={routine} library={library} onExit={() => setView("edit")} />
      )}
    </div>
  );
}

/* ============================================================
   首頁：課表清單（多課表管理 + 匯出／匯入）
   ============================================================ */
function Home({ routines, library, currentId, onOpen, onAdd, onDuplicate, onDelete, onExport, onImport }) {
  const fileRef = useRef(null);
  const [importError, setImportError] = useState("");

  const pickImport = () => { setImportError(""); fileRef.current?.click(); };
  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);
        onImport(payload);
      } catch (err) {
        setImportError("匯入失敗：JSON 格式不正確或課表結構錯誤");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div style={S.editScroll}>
      <div style={S.edHeader}>
        <div style={S.edKicker}>🏊‍♀️ 大里假期泳隊 · 陸上核心訓練</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: "#12384d" }}>我的課表</div>
      </div>

      {routines.map((r) => {
        const total = totalSeconds(r, library);
        const isCurrent = r.id === currentId;
        return (
          <div key={r.id} style={S.phaseCard}>
            <div style={S.phaseHead}>
              <button style={{ ...S.homeCardName, ...(isCurrent ? S.homeCardNameActive : {}) }} onClick={() => onOpen(r.id)}>
                {r.name}
              </button>
            </div>
            <div style={S.sumItem}><Clock size={15} /> 約 {Math.round(total / 60)} 分鐘 · {r.phases.length} 個階段</div>
            <div style={S.homeCardTools}>
              <button style={S.homeToolBtn} onClick={() => onOpen(r.id)}><Pencil size={14} /> 編輯</button>
              <button style={S.homeToolBtn} onClick={() => onDuplicate(r.id)}><Copy size={14} /> 複製</button>
              <button style={S.homeToolBtn} onClick={() => onExport(r.id)}><Download size={14} /> 匯出</button>
              <button style={S.homeToolBtnDel} onClick={() => { if (confirm(`確定要刪除課表「${r.name}」嗎？`)) onDelete(r.id); }}>
                <Trash2 size={14} /> 刪除
              </button>
            </div>
          </div>
        );
      })}

      <button style={S.addPhase} onClick={onAdd}><Plus size={16} /> 新增課表</button>
      <button style={S.newExBtn} onClick={pickImport}><Upload size={16} /> 匯入課表 JSON</button>
      <input ref={fileRef} type="file" accept="application/json" style={{ display: "none" }} onChange={handleFile} />
      {importError && <div style={S.importErr}>{importError}</div>}
      <div style={{ height: 20 }} />
    </div>
  );
}

/* ============================================================
   設定頁
   ============================================================ */
function Editor({ routine, setRoutine, library, setLibrary, onStart, onHome }) {
  const [picker, setPicker] = useState(null); // phase index for exercise picker
  const [form, setForm] = useState(null);     // 動作表單 state（null = 關閉）；含 editId 表示編輯既有動作
  const total = totalSeconds(routine, library);
  const hasWork = buildSegments(routine, library).some((s) => s.type === "WORK");

  const upd = (fn) => setRoutine((r) => { const c = structuredClone(r); fn(c); return c; });

  const openForm = () => setForm({ editId: null, name: "", emoji: "💪", category: "core", keyPoints: "", voiceCues: "", regression: "", danger: "", image: "" });
  const openEdit = (id) => {
    const e = library[id];
    setForm({ editId: id, name: e.name, emoji: e.emoji, category: e.category,
      keyPoints: (e.keyPoints || []).join("\n"), voiceCues: (e.voiceCues || []).join("\n"),
      regression: e.regression || "", danger: e.dangerSigns || "",
      image: exerciseFilenameFromPath(e.image) });
  };
  const saveForm = () => {
    const keyPoints = form.keyPoints.split("\n").map((s) => s.trim()).filter(Boolean);
    if (!form.name.trim() || keyPoints.length === 0) return; // 需有名稱與至少一個要領
    const voiceCues = form.voiceCues.split("\n").map((s) => s.trim()).filter(Boolean);
    const fname = form.image.trim();
    setLibrary((lib) => {
      const id = form.editId || `custom-${Date.now()}`;
      return { ...lib, [id]: {
        name: form.name.trim(), emoji: form.emoji, category: form.category,
        keyPoints, voiceCues: voiceCues.length ? voiceCues : keyPoints,
        regression: form.regression.trim() || undefined,
        dangerSigns: form.danger.trim() || undefined,
        image: fname ? exerciseImagePath(fname) : undefined,
        builtin: form.editId ? (lib[form.editId]?.builtin ?? false) : false,
      }};
    });
    setForm(null);
  };
  const deleteExercise = (id) => {
    setLibrary((lib) => { const c = { ...lib }; delete c[id]; return c; });
    upd((c) => { c.phases.forEach((p) => { p.items = p.items.filter((it) => it.id !== id); }); }); // 移除引用
  };

  return (
    <div style={S.editScroll}>
      <div style={S.edHeader}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={S.edKicker}>🏊‍♀️ 大里假期泳隊 · 陸上核心訓練</div>
          <button style={S.homeLinkBtn} onClick={onHome}><ListChecks size={14} /> 所有課表</button>
        </div>
        <input style={S.nameInput} value={routine.name}
          onChange={(e) => upd((c) => { c.name = e.target.value; })} />
      </div>

      {/* 總覽 */}
      <div style={S.summaryBar}>
        <span style={S.sumItem}><Clock size={16} /> 預估 {Math.round(total/60)} 分鐘</span>
        <span style={S.sumItem}>{routine.phases.length} 個階段</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
          <span style={{ fontSize: 13, color: "#5B7387" }}>開始前準備</span>
          <Stepper value={routine.prepSeconds} suffix="秒"
            onDec={() => upd((c) => { c.prepSeconds = clamp(c.prepSeconds - 5, 0, 30); })}
            onInc={() => upd((c) => { c.prepSeconds = clamp(c.prepSeconds + 5, 0, 30); })} />
        </div>
      </div>

      {/* 階段 */}
      {routine.phases.map((phase, pi) => (
        <div key={pi} style={S.phaseCard}>
          <div style={S.phaseHead}>
            <input style={S.phaseName} value={phase.name}
              onChange={(e) => upd((c) => { c.phases[pi].name = e.target.value; })} />
            <div style={S.phaseMeta}>
              <span style={S.metaLabel}>輪數</span>
              <Stepper value={phase.rounds} min compact
                onDec={() => upd((c) => { c.phases[pi].rounds = clamp(c.phases[pi].rounds - 1, 1, 8); })}
                onInc={() => upd((c) => { c.phases[pi].rounds = clamp(c.phases[pi].rounds + 1, 1, 8); })} />
              <button style={S.delPhase} title="刪除階段"
                onClick={() => upd((c) => { c.phases.splice(pi, 1); })}><Trash2 size={16} /></button>
            </div>
          </div>

          {phase.rounds > 1 && (
            <div style={S.roundBreakRow}>
              <span style={S.metaLabel}>每輪間休息</span>
              <Stepper value={phase.roundBreakSeconds} suffix="秒" compact
                onDec={() => upd((c) => { c.phases[pi].roundBreakSeconds = clamp(c.phases[pi].roundBreakSeconds - 15, 0, 180); })}
                onInc={() => upd((c) => { c.phases[pi].roundBreakSeconds = clamp(c.phases[pi].roundBreakSeconds + 15, 0, 180); })} />
            </div>
          )}

          {phase.items.map((item, ii) => {
            const ex = library[item.id];
            if (!ex) return null;
            return (
              <div key={ii} style={S.itemRow}>
                <div style={S.itemTop}>
                  <span style={S.itemName}><span style={{ fontSize: 22 }}>{ex.emoji}</span>{ex.name}</span>
                  <div style={S.reorder}>
                    <button style={S.miniBtn} disabled={ii === 0} title="上移"
                      onClick={() => upd((c) => { const a = c.phases[pi].items; [a[ii-1], a[ii]] = [a[ii], a[ii-1]]; })}><ArrowUp size={15} /></button>
                    <button style={S.miniBtn} disabled={ii === phase.items.length - 1} title="下移"
                      onClick={() => upd((c) => { const a = c.phases[pi].items; [a[ii+1], a[ii]] = [a[ii], a[ii+1]]; })}><ArrowDown size={15} /></button>
                    <button style={S.miniBtnDel} title="移除"
                      onClick={() => upd((c) => { c.phases[pi].items.splice(ii, 1); })}><X size={15} /></button>
                  </div>
                </div>
                <div style={S.itemCtrls}>
                  <span style={S.ctrlLabel}>動作</span>
                  <Stepper value={item.work} suffix="秒" compact
                    onDec={() => upd((c) => { c.phases[pi].items[ii].work = clamp(item.work - 5, 10, 300); })}
                    onInc={() => upd((c) => { c.phases[pi].items[ii].work = clamp(item.work + 5, 10, 300); })} />
                  <span style={S.ctrlLabel}>休息</span>
                  <Stepper value={item.rest} suffix="秒" compact
                    onDec={() => upd((c) => { c.phases[pi].items[ii].rest = clamp(item.rest - 5, 0, 120); })}
                    onInc={() => upd((c) => { c.phases[pi].items[ii].rest = clamp(item.rest + 5, 0, 120); })} />
                </div>
              </div>
            );
          })}

          <button style={S.addItem} onClick={() => setPicker(pi)}><Plus size={16} /> 加入動作</button>
        </div>
      ))}

      <button style={S.addPhase}
        onClick={() => upd((c) => { c.phases.push({ name: "新階段", rounds: 1, roundBreakSeconds: 0, items: [] }); })}>
        <Plus size={16} /> 新增階段
      </button>

      <button style={{ ...S.startBig, opacity: hasWork ? 1 : 0.5, cursor: hasWork ? "pointer" : "not-allowed" }}
        disabled={!hasWork} onClick={onStart}>
        <Play size={24} fill="#fff" /> 開始訓練
      </button>
      <div style={{ height: 20 }} />

      {/* 動作挑選器 */}
      {picker !== null && (
        <div style={S.overlay} onClick={() => setPicker(null)}>
          <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={S.sheetHead}>
              <span style={{ fontWeight: 700, fontSize: 17 }}>加入動作到「{routine.phases[picker].name}」</span>
              <button style={S.iconBtnDark} onClick={() => setPicker(null)}><Check size={20} /></button>
            </div>
            <button style={S.newExBtn} onClick={openForm}><Plus size={16} /> 新增自訂動作</button>
            {["warmup", "core", "cooldown"].map((cat) => (
              <div key={cat}>
                <div style={S.catLabel}>{CAT_LABEL[cat]}</div>
                <div style={S.pickGrid}>
                  {Object.entries(library).filter(([, e]) => e.category === cat).map(([id, e]) => (
                    <div key={id} style={S.pickCell}>
                      <button style={S.pickBtn}
                        onClick={() => upd((c) => { c.phases[picker].items.push({ id, work: cat === "core" ? 45 : 60, rest: cat === "core" ? 15 : 0 }); })}>
                        <ExerciseVisual ex={e} size={40} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{e.name}</span>
                        {!e.builtin && <span style={S.customTag}>自訂</span>}
                      </button>
                      <div style={S.cellTools}>
                        <button style={S.cellEdit} title="編輯動作"
                          onClick={(ev) => { ev.stopPropagation(); openEdit(id); }}><Pencil size={12} /></button>
                        {!e.builtin && (
                          <button style={S.cellDel} title="刪除自訂動作"
                            onClick={(ev) => { ev.stopPropagation(); deleteExercise(id); }}><X size={12} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 新增自訂動作表單 */}
      {form && (
        <div style={S.overlay} onClick={() => setForm(null)}>
          <div style={S.sheet} onClick={(e) => e.stopPropagation()}>
            <div style={S.sheetHead}>
              <span style={{ fontWeight: 700, fontSize: 17 }}>{form.editId ? "編輯動作" : "新增自訂動作"}</span>
              <button style={S.iconBtnGhost} onClick={() => setForm(null)}><X size={20} /></button>
            </div>

            <label style={S.fLabel}>動作名稱 *</label>
            <input style={S.fInput} value={form.name} placeholder="例如：平板撐體開合腳"
              onChange={(e) => setForm({ ...form, name: e.target.value })} />

            <label style={S.fLabel}>圖示（沒有動圖時顯示）</label>
            <div style={S.emojiRow}>
              {EMOJI_SET.map((em) => (
                <button key={em} onClick={() => setForm({ ...form, emoji: em })}
                  style={{ ...S.emojiBtn, ...(form.emoji === em ? S.emojiActive : {}) }}>{em}</button>
              ))}
            </div>

            <label style={S.fLabel}>動作圖片檔名（選填；放在 public/exercises/ 內的 PNG）</label>
            <div style={S.gifUploadRow}>
              <div style={S.gifPreview}>
                <ExerciseVisual ex={{ image: form.image.trim() ? exerciseImagePath(form.image.trim()) : undefined, emoji: form.emoji, name: form.name }} size={88} fit="contain" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                <input style={S.fInput} value={form.image} placeholder="例如：streamline-plank.png"
                  onChange={(e) => setForm({ ...form, image: e.target.value })} />
                <span style={S.gifNote}>把同名 PNG 放進專案的 public/exercises/ 資料夾即可。留空或檔案不存在時，會顯示上面選的 emoji 圖標。</span>
              </div>
            </div>

            <label style={S.fLabel}>分類</label>
            <div style={S.catRow}>
              {["warmup", "core", "cooldown"].map((cat) => (
                <button key={cat} onClick={() => setForm({ ...form, category: cat })}
                  style={{ ...S.catBtn, ...(form.category === cat ? S.catActive : {}) }}>{CAT_LABEL[cat]}</button>
              ))}
            </div>

            <label style={S.fLabel}>動作要領 *（一行一個，會顯示給孩子看）</label>
            <textarea style={S.fArea} rows={3} value={form.keyPoints} placeholder={"肚子收緊\n背打直不要塌腰"}
              onChange={(e) => setForm({ ...form, keyPoints: e.target.value })} />

            <label style={S.fLabel}>語音提示（一行一句，訓練中輪播；留空則用上面的要領）</label>
            <textarea style={S.fArea} rows={2} value={form.voiceCues} placeholder={"肚子用力\n撐住，你做得到"}
              onChange={(e) => setForm({ ...form, voiceCues: e.target.value })} />

            <label style={S.fLabel}>太累退階做法（選填）</label>
            <input style={S.fInput} value={form.regression} placeholder="例如：改成膝蓋著地"
              onChange={(e) => setForm({ ...form, regression: e.target.value })} />

            <label style={S.fLabel}>危險提醒（選填）</label>
            <input style={S.fInput} value={form.danger} placeholder="例如：腰痛就要停下來"
              onChange={(e) => setForm({ ...form, danger: e.target.value })} />

            <button style={{ ...S.saveBtn, opacity: (form.name.trim() && form.keyPoints.trim()) ? 1 : 0.5 }}
              disabled={!(form.name.trim() && form.keyPoints.trim())} onClick={saveForm}>
              <Check size={18} /> {form.editId ? "儲存變更" : "儲存並加入動作庫"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({ value, onDec, onInc, suffix = "", compact = false }) {
  return (
    <div style={{ ...S.stepper, ...(compact ? { padding: 3 } : {}) }}>
      <button style={S.stepBtn} onClick={onDec}><Minus size={compact ? 14 : 16} /></button>
      <span style={{ ...S.stepVal, minWidth: compact ? 40 : 54 }}>{value}{suffix}</span>
      <button style={S.stepBtn} onClick={onInc}><Plus size={compact ? 14 : 16} /></button>
    </div>
  );
}

// 動作視覺：有 PNG 就顯示，載入失敗（檔案不存在）時自動退回 emoji 靜態圖標
// fit：小縮圖用 "cover"（置中裁切），休息大圖／表單預覽用 "contain"（完整顯示不裁切）
function ExerciseVisual({ ex, size, fit = "cover" }) {
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [ex?.image]);
  const box = { width: size, height: size, borderRadius: size * 0.14, background: "rgba(255,255,255,.16)", boxShadow: "0 6px 18px rgba(0,0,0,.15)" };
  if (ex?.image && !err)
    return <img src={ex.image} alt={ex.name} onError={() => setErr(true)} style={{ ...box, objectFit: fit }} />;
  return <div style={{ ...box, display: "grid", placeItems: "center", fontSize: size * 0.5 }}>{ex?.emoji}</div>;
}

/* ============================================================
   訓練頁（狀態機 + 語音 + 字幕 fallback）
   ============================================================ */
function Trainer({ routine, library, onExit }) {
  const segments = useMemo(() => buildSegments(routine, library), [routine, library]);
  const prefix = useMemo(() => { const p = [0]; segments.forEach((s, i) => p.push(p[i] + s.duration)); return p; }, [segments]);
  const totalDur = prefix[prefix.length - 1];

  const [status, _setStatus] = useState("ready");
  const [segIndex, _setSegIndex] = useState(0);
  const [remaining, setRemaining] = useState(segments[0]?.duration || 0);
  const [caption, setCaption] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [showReg, setShowReg] = useState(false);
  const [doneStats, setDoneStats] = useState(null);

  const statusRef = useRef("ready"), segIndexRef = useRef(0), segStartRef = useRef(0);
  const curEnteredRef = useRef(-1), cueIdxRef = useRef(0), nextCueRef = useRef(CUE_INTERVAL);
  const lastBeepRef = useRef(null), pauseElapsedRef = useRef(0), soundRef = useRef(true);
  const audioCtxRef = useRef(null), wakeRef = useRef(null);

  const setStatus = (v) => { statusRef.current = v; _setStatus(v); };
  const setSegIndex = (v) => { const nv = typeof v === "function" ? v(segIndexRef.current) : v; segIndexRef.current = nv; _setSegIndex(nv); };
  useEffect(() => { soundRef.current = soundOn; }, [soundOn]);

  const ensureAudio = () => { try { if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume().catch(() => {}); } catch {} };
  const beep = (f = 800) => { if (!soundRef.current) return; const ctx = audioCtxRef.current; if (!ctx) return; try { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = f; g.gain.setValueAtTime(0.0001, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18); o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.2); } catch {} };
  const speak = (t) => { setCaption(t); if (!soundRef.current) return; try { const s = window.speechSynthesis; if (!s) return; s.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = "zh-TW"; u.rate = 0.92; u.pitch = 1.05; s.speak(u); } catch {} };

  const enterSpeak = (seg) => {
    const nx = seg.nextExercise;
    if (seg.type === "PREP") speak(`準備開始！第一個動作是 ${nx?.name || ""}。${nx?.keyPoints?.[0] || ""}`);
    else if (seg.type === "WORK") speak(`${seg.exercise.name}。${seg.exercise.keyPoints?.[0] || ""}`);
    else if (seg.type === "REST") speak(`休息一下。接下來：${nx?.name || ""}，${nx?.keyPoints?.[0] || ""}`);
    else if (seg.type === "ROUND_BREAK") speak(`這一輪完成了，好好喘口氣。下一輪第一個動作：${nx?.name || ""}`);
  };

  const finish = () => {
    setStatus("done");
    const core = routine.phases.find((p) => p.rounds > 1);
    setDoneStats({ minutes: Math.round(totalDur / 60), rounds: core?.rounds || 0 });
    releaseWake(); speak("全部完成，你今天超級棒！"); setCaption("全部完成，你今天超級棒！🎉");
  };

  const tick = useCallback(() => {
    const i = segIndexRef.current, seg = segments[i]; if (!seg) return;
    if (curEnteredRef.current !== i) {
      curEnteredRef.current = i; segStartRef.current = performance.now();
      cueIdxRef.current = 0; nextCueRef.current = CUE_INTERVAL; lastBeepRef.current = null;
      setShowReg(false); enterSpeak(seg);
    }
    const elapsed = (performance.now() - segStartRef.current) / 1000;
    const rem = seg.duration - elapsed;
    if (seg.type === "WORK" && seg.exercise.voiceCues?.length && elapsed >= nextCueRef.current && rem > 3) {
      speak(seg.exercise.voiceCues[cueIdxRef.current % seg.exercise.voiceCues.length]); cueIdxRef.current++; nextCueRef.current += CUE_INTERVAL;
    }
    const rc = Math.ceil(rem);
    if (rem <= 3 && rem > 0 && lastBeepRef.current !== rc) { lastBeepRef.current = rc; beep(rc === 1 ? 1046 : 784); }
    setRemaining(Math.max(0, rem));
    if (rem <= 0) { if (i + 1 < segments.length) { beep(880); setSegIndex(i + 1); } else finish(); }
  }, [segments]);

  useEffect(() => { if (status !== "running") return; const id = setInterval(tick, 100); return () => clearInterval(id); }, [status, tick]);

  const requestWake = () => { try { navigator.wakeLock?.request("screen").then((l) => (wakeRef.current = l)).catch(() => {}); } catch {} };
  const releaseWake = () => { try { wakeRef.current?.release?.(); wakeRef.current = null; } catch {} };
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible" && statusRef.current === "running") requestWake(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); releaseWake(); };
  }, []);

  const start = () => { ensureAudio(); try { const u = new SpeechSynthesisUtterance(" "); u.volume = 0; window.speechSynthesis?.speak(u); } catch {} requestWake(); curEnteredRef.current = -1; setSegIndex(0); setRemaining(segments[0].duration); setStatus("running"); };
  const pause = () => { pauseElapsedRef.current = performance.now() - segStartRef.current; setStatus("paused"); try { window.speechSynthesis?.cancel(); } catch {} };
  const resume = () => { ensureAudio(); segStartRef.current = performance.now() - pauseElapsedRef.current; setStatus("running"); };
  const goTo = (idx) => { const c = clamp(idx, 0, segments.length - 1); try { window.speechSynthesis?.cancel(); } catch {} curEnteredRef.current = -1; setSegIndex(c); setRemaining(segments[c].duration); if (statusRef.current !== "running") setStatus("running"); };
  const restart = () => { setDoneStats(null); start(); };
  const exit = () => { try { window.speechSynthesis?.cancel(); } catch {} releaseWake(); onExit(); };

  const seg = segments[segIndex];
  const theme = status === "done" ? THEME.DONE : (THEME[seg?.type] || THEME.REST);
  const frac = status === "running" || status === "paused" ? clamp((seg ? remaining / seg.duration : 0), 0, 1) : 1;
  const overall = status === "done" ? 1 : clamp((prefix[segIndex] + (seg.duration - remaining)) / totalDur, 0, 1);
  const R = 130, C = 2 * Math.PI * R;

  if (status === "ready")
    return (
      <div style={{ ...S.screen, background: "linear-gradient(160deg,#1E88D6,#12B6C9)" }}>
        <button style={S.backTop} onClick={exit}><ChevronLeft size={18} /> 回設定</button>
        <div style={S.badge}>準備開始</div>
        <div style={S.idleTitle}>{routine.name}</div>
        <div style={S.idleMeta}>約 {Math.round(totalDur/60)} 分鐘 · 把平板橫放立好，孩子站前方跟著做</div>
        <button style={S.startBtn} onClick={start}><Play size={28} fill="#12557a" /> 開始</button>
        <div style={S.hint}>開啟聲音效果最好。首次進入請按一下「開始」，即可啟用語音提示與螢幕常亮（訓練中螢幕不會自動休眠）。</div>
      </div>
    );

  if (status === "done")
    return (
      <div style={{ ...S.screen, background: theme.g }}>
        <div style={{ fontSize: 84, animation: "pop .5s ease" }}>🎉</div>
        <div style={S.idleTitle}>全部完成！</div>
        <div style={S.idleMeta}>完成 {doneStats?.rounds} 輪核心 · 總時長約 {doneStats?.minutes} 分鐘 · 你今天超級棒 👏</div>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button style={S.startBtn} onClick={restart}><RotateCcw size={22} /> 再做一次</button>
          <button style={S.ghostBtn} onClick={exit}>回設定</button>
        </div>
      </div>
    );

  return (
    <div style={{ ...S.screen, background: theme.g, justifyContent: "flex-start" }}>
      <div style={S.topbar}>
        <div style={S.topLeft}>
          <span style={S.phasePill}>{seg.phaseName || "準備"}</span>
          {seg.totalRounds > 1 && <span style={S.roundPill}>第 {seg.round} / {seg.totalRounds} 輪</span>}
        </div>
        <div style={S.topRight}>
          <button style={S.iconBtn} onClick={() => setSoundOn((v) => !v)}>{soundOn ? <Volume2 size={22} /> : <VolumeX size={22} />}</button>
          <button style={S.iconBtn} onClick={exit}><X size={22} /></button>
        </div>
      </div>

      <div style={S.progressTrack}><div style={{ ...S.progressFill, width: `${overall * 100}%` }} /></div>
      <div style={S.stateLabel}>
        {seg.type === "WORK" ? "加油！撐住" : seg.type === "REST" ? "休息 · 看下一個動作" : seg.type === "ROUND_BREAK" ? "這輪完成，喘口氣" : "準備開始"}
      </div>

      <div style={S.ringWrap}>
        <svg viewBox="0 0 300 300" style={S.ring}>
          <circle cx="150" cy="150" r={R} fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="16" />
          <circle cx="150" cy="150" r={R} fill="none" stroke={theme.ring} strokeWidth="16" strokeLinecap="round"
            strokeDasharray={C} strokeDashoffset={C * (1 - frac)} transform="rotate(-90 150 150)"
            style={{ transition: "stroke-dashoffset .12s linear" }} />
        </svg>
        <div style={S.ringCenter}>
          <div style={S.bigNum}>{fmt(remaining)}</div>
          <div style={S.numUnit}>{Math.ceil(remaining) < 60 ? "秒" : "分:秒"}</div>
        </div>
      </div>

      {seg.type === "WORK" ? (
        <div style={S.exBlock}>
          <div style={S.exName}>
            <ExerciseVisual ex={seg.exercise} size={46} />
            {seg.exercise.name}
          </div>
          <div style={S.captionBox}>{caption || seg.exercise.keyPoints[0]}</div>
          {seg.exercise.regression && <button style={S.regBtn} onClick={() => setShowReg((v) => !v)}>太累了？{showReg ? "收起" : "看退階做法"}</button>}
          {showReg && seg.exercise.regression && <div style={S.regText}>💡 {seg.exercise.regression}</div>}
          {seg.exercise.dangerSigns && <div style={S.danger}>⚠️ {seg.exercise.dangerSigns}</div>}
        </div>
      ) : (
        <div style={S.exBlock}>
          {seg.nextExercise && (<>
            <div style={S.nextLabel}>接下來 <ChevronRight size={18} /></div>
            <ExerciseVisual ex={seg.nextExercise} size={150} fit="contain" />
            <div style={S.exName}>{seg.nextExercise.name}</div>
            <div style={S.nextPoints}>{seg.nextExercise.keyPoints.map((k, i) => <span key={i} style={S.chip}>{k}</span>)}</div>
          </>)}
          <div style={S.captionBox}>{caption}</div>
        </div>
      )}

      <div style={S.controls}>
        <button style={S.ctrlBtn} onClick={() => goTo(segIndex - 1)}><SkipBack size={24} /></button>
        <button style={S.mainCtrl} onClick={status === "paused" ? resume : pause}>{status === "paused" ? <Play size={30} fill="#12557a" /> : <Pause size={30} fill="#12557a" />}</button>
        <button style={S.ctrlBtn} onClick={() => goTo(segIndex + 1)}><SkipForward size={24} /></button>
        <button style={S.ctrlBtn} onClick={restart}><RotateCcw size={22} /></button>
      </div>

      {(seg.type === "REST" || seg.type === "ROUND_BREAK") && (
        <div style={S.wave} className="wave">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ width: "200%", height: "100%" }}>
            <path d="M0,60 C240,110 480,10 720,60 C960,110 1200,10 1440,60 L1440,120 L0,120 Z" fill="rgba(255,255,255,.12)" />
          </svg>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   樣式
   ============================================================ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&display=swap');
@keyframes pop { 0%{transform:scale(.4);opacity:0} 60%{transform:scale(1.15)} 100%{transform:scale(1);opacity:1} }
@keyframes drift { from{transform:translateX(0)} to{transform:translateX(-50%)} }
.wave svg { animation: drift 7s linear infinite; }
@media (prefers-reduced-motion: reduce){ .wave svg{ animation:none } }
`;
const base = { fontFamily: "'Fredoka','Nunito',-apple-system,'PingFang TC','Microsoft JhengHei',sans-serif" };
const S = {
  root: { ...base, width: "100%", height: "100%", minHeight: 600, position: "relative", overflow: "hidden", borderRadius: 20, background: "#EEF6F8" },

  /* 設定頁 */
  editScroll: { position: "absolute", inset: 0, overflowY: "auto", padding: "18px 16px 8px", color: "#1F3A4D" },
  edHeader: { marginBottom: 12 },
  edKicker: { fontSize: 13, fontWeight: 600, color: "#1E88D6", marginBottom: 4 },
  homeLinkBtn: { ...base, display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: "#EAF4F8", color: "#12557a", borderRadius: 999, padding: "6px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  homeCardName: { ...base, textAlign: "left", flex: 1, border: "none", background: "transparent", fontSize: 18, fontWeight: 700, color: "#12557a", padding: 0, cursor: "pointer" },
  homeCardNameActive: { color: "#FF6B4A" },
  homeCardTools: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 },
  homeToolBtn: { ...base, display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: "#EAF4F8", color: "#12557a", borderRadius: 10, padding: "8px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  homeToolBtnDel: { ...base, display: "inline-flex", alignItems: "center", gap: 5, border: "none", background: "#FDECEC", color: "#E05656", borderRadius: 10, padding: "8px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  importErr: { fontSize: 13.5, fontWeight: 600, color: "#E05656", background: "#FDECEC", padding: "8px 14px", borderRadius: 10, marginTop: 8 },
  nameInput: { ...base, fontSize: 26, fontWeight: 700, color: "#12384d", border: "none", borderBottom: "2px solid #cfe3ea", background: "transparent", width: "100%", padding: "2px 0", outline: "none" },
  summaryBar: { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: "#fff", borderRadius: 14, padding: "10px 14px", marginBottom: 14, boxShadow: "0 2px 8px rgba(30,80,110,.06)" },
  sumItem: { display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 700, fontSize: 14, color: "#1F3A4D" },

  phaseCard: { background: "#fff", borderRadius: 16, padding: 14, marginBottom: 14, boxShadow: "0 2px 10px rgba(30,80,110,.07)" },
  phaseHead: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 },
  phaseName: { ...base, fontSize: 18, fontWeight: 700, color: "#12557a", border: "none", background: "#EAF4F8", borderRadius: 8, padding: "6px 10px", flex: 1, minWidth: 0, outline: "none" },
  phaseMeta: { display: "flex", alignItems: "center", gap: 6 },
  metaLabel: { fontSize: 13, color: "#5B7387", fontWeight: 600 },
  delPhase: { ...base, width: 32, height: 32, display: "grid", placeItems: "center", border: "none", background: "#FDECEC", color: "#E05656", borderRadius: 8, cursor: "pointer" },
  roundBreakRow: { display: "flex", alignItems: "center", gap: 8, background: "#F4FAFB", borderRadius: 10, padding: "6px 10px", marginBottom: 10 },

  itemRow: { border: "1px solid #E7F0F3", borderRadius: 12, padding: "10px 12px", marginBottom: 8 },
  itemTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  itemName: { display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 15.5 },
  reorder: { display: "flex", gap: 5 },
  miniBtn: { ...base, width: 30, height: 30, display: "grid", placeItems: "center", border: "none", background: "#EAF4F8", color: "#2E6f92", borderRadius: 8, cursor: "pointer" },
  miniBtnDel: { ...base, width: 30, height: 30, display: "grid", placeItems: "center", border: "none", background: "#FDECEC", color: "#E05656", borderRadius: 8, cursor: "pointer" },
  itemCtrls: { display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" },
  ctrlLabel: { fontSize: 13, color: "#5B7387", fontWeight: 600 },

  addItem: { ...base, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "2px dashed #BFDCE6", background: "#F7FBFC", color: "#1E88D6", borderRadius: 12, padding: "10px", fontWeight: 700, fontSize: 15, cursor: "pointer", marginTop: 4 },
  addPhase: { ...base, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "none", background: "#DCEEF4", color: "#12557a", borderRadius: 12, padding: "12px", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 16 },
  startBig: { ...base, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, border: "none", background: "linear-gradient(160deg,#FF6B4A,#FF9E5E)", color: "#fff", borderRadius: 16, padding: "16px", fontWeight: 700, fontSize: 20, boxShadow: "0 6px 18px rgba(255,107,74,.35)" },

  stepper: { display: "inline-flex", alignItems: "center", gap: 2, background: "#EAF4F8", borderRadius: 10, padding: 4 },
  stepBtn: { ...base, width: 30, height: 30, display: "grid", placeItems: "center", border: "none", background: "#fff", color: "#1E88D6", borderRadius: 8, cursor: "pointer", boxShadow: "0 1px 3px rgba(0,0,0,.08)" },
  stepVal: { textAlign: "center", fontWeight: 700, fontSize: 15, color: "#1F3A4D" },

  overlay: { position: "absolute", inset: 0, background: "rgba(18,55,77,.45)", display: "flex", alignItems: "flex-end", zIndex: 20 },
  sheet: { background: "#fff", width: "100%", maxHeight: "82%", overflowY: "auto", borderRadius: "20px 20px 0 0", padding: 18, boxShadow: "0 -8px 30px rgba(0,0,0,.2)" },
  sheetHead: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, color: "#12384d" },
  iconBtnDark: { ...base, width: 40, height: 40, display: "grid", placeItems: "center", border: "none", background: "#FF6B4A", color: "#fff", borderRadius: 12, cursor: "pointer" },
  catLabel: { fontSize: 13, fontWeight: 700, color: "#1E88D6", margin: "10px 0 6px" },
  pickGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(96px,1fr))", gap: 8 },
  pickCell: { position: "relative" },
  pickBtn: { ...base, position: "relative", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, border: "1px solid #E7F0F3", background: "#F9FCFD", borderRadius: 12, padding: "12px 6px", cursor: "pointer", color: "#1F3A4D" },
  customTag: { position: "absolute", top: 4, left: 4, fontSize: 10, fontWeight: 700, color: "#1E88D6", background: "#E1F0FA", padding: "1px 6px", borderRadius: 6 },
  gifTag: { position: "absolute", bottom: 4, left: 4, fontSize: 10, fontWeight: 700, color: "#0E8A93", background: "#D6F5F8", padding: "1px 6px", borderRadius: 6 },
  cellTools: { position: "absolute", top: -6, right: -6, display: "flex", gap: 4 },
  cellEdit: { ...base, width: 22, height: 22, display: "grid", placeItems: "center", border: "none", background: "#1E88D6", color: "#fff", borderRadius: "50%", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,.2)" },
  cellDel: { ...base, width: 22, height: 22, display: "grid", placeItems: "center", border: "none", background: "#E05656", color: "#fff", borderRadius: "50%", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,.2)" },
  gifUploadRow: { display: "flex", gap: 14, alignItems: "center" },
  gifPreview: { width: 90, height: 90, flexShrink: 0, borderRadius: 14, background: "#EAF4F8", display: "grid", placeItems: "center", overflow: "hidden", border: "1px solid #D6E6EC" },
  uploadBtn: { ...base, display: "inline-flex", alignItems: "center", gap: 6, background: "#1E88D6", color: "#fff", padding: "9px 16px", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer" },
  removeGif: { ...base, display: "inline-flex", alignItems: "center", gap: 5, background: "#FDECEC", color: "#E05656", border: "none", padding: "8px 14px", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" },
  gifNote: { fontSize: 11.5, color: "#8AA0AE" },
  pickDel: { ...base, position: "absolute", top: -6, right: -6, width: 22, height: 22, display: "grid", placeItems: "center", border: "none", background: "#E05656", color: "#fff", borderRadius: "50%", cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,.2)" },
  newExBtn: { ...base, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "2px dashed #FFC2B0", background: "#FFF4F0", color: "#FF6B4A", borderRadius: 12, padding: "10px", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 6 },
  iconBtnGhost: { ...base, width: 40, height: 40, display: "grid", placeItems: "center", border: "none", background: "#EAF4F8", color: "#12557a", borderRadius: 12, cursor: "pointer" },
  fLabel: { display: "block", fontSize: 13, fontWeight: 700, color: "#2E6f92", margin: "12px 0 5px" },
  fInput: { ...base, width: "100%", boxSizing: "border-box", fontSize: 15, color: "#1F3A4D", border: "1px solid #D6E6EC", borderRadius: 10, padding: "10px 12px", outline: "none", background: "#F9FCFD" },
  fArea: { ...base, width: "100%", boxSizing: "border-box", fontSize: 15, color: "#1F3A4D", border: "1px solid #D6E6EC", borderRadius: 10, padding: "10px 12px", outline: "none", background: "#F9FCFD", resize: "vertical", lineHeight: 1.5 },
  emojiRow: { display: "flex", flexWrap: "wrap", gap: 6 },
  emojiBtn: { ...base, width: 42, height: 42, fontSize: 22, display: "grid", placeItems: "center", border: "2px solid transparent", background: "#F2F8FA", borderRadius: 10, cursor: "pointer" },
  emojiActive: { border: "2px solid #FF6B4A", background: "#FFF0EB" },
  catRow: { display: "flex", gap: 8 },
  catBtn: { ...base, flex: 1, padding: "9px", fontSize: 15, fontWeight: 700, color: "#5B7387", border: "1px solid #D6E6EC", background: "#F9FCFD", borderRadius: 10, cursor: "pointer" },
  catActive: { color: "#fff", background: "#1E88D6", border: "1px solid #1E88D6" },
  saveBtn: { ...base, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", background: "linear-gradient(160deg,#FF6B4A,#FF9E5E)", color: "#fff", borderRadius: 12, padding: "14px", fontWeight: 700, fontSize: 16, cursor: "pointer", marginTop: 18 },

  /* 訓練頁 */
  screen: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "18px 20px", textAlign: "center", color: "#fff", transition: "background .4s ease", ...base },
  backTop: { ...base, position: "absolute", top: 16, left: 16, display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,.2)", color: "#fff", border: "none", padding: "7px 14px", borderRadius: 999, fontWeight: 600, fontSize: 14, cursor: "pointer" },
  badge: { background: "rgba(255,255,255,.2)", padding: "6px 16px", borderRadius: 999, fontWeight: 600, fontSize: 14, marginBottom: 16 },
  idleTitle: { fontSize: 38, fontWeight: 700, lineHeight: 1.15, marginBottom: 12 },
  idleMeta: { fontSize: 16, opacity: .92, marginBottom: 26, maxWidth: 460 },
  startBtn: { ...base, display: "inline-flex", alignItems: "center", gap: 10, background: "#fff", color: "#12557a", border: "none", padding: "15px 32px", borderRadius: 999, fontSize: 21, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,.18)" },
  ghostBtn: { ...base, background: "rgba(255,255,255,.22)", color: "#fff", border: "none", padding: "15px 26px", borderRadius: 999, fontSize: 18, fontWeight: 700, cursor: "pointer" },
  hint: { marginTop: 22, fontSize: 13, opacity: .85, maxWidth: 440, lineHeight: 1.5 },

  topbar: { width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  topLeft: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
  topRight: { display: "flex", gap: 8 },
  phasePill: { background: "rgba(255,255,255,.22)", padding: "5px 14px", borderRadius: 999, fontWeight: 600, fontSize: 14 },
  roundPill: { background: "rgba(0,0,0,.14)", padding: "5px 14px", borderRadius: 999, fontWeight: 700, fontSize: 14 },
  iconBtn: { ...base, width: 40, height: 40, display: "grid", placeItems: "center", background: "rgba(255,255,255,.18)", border: "none", borderRadius: 12, color: "#fff", cursor: "pointer" },
  progressTrack: { width: "100%", height: 8, background: "rgba(255,255,255,.22)", borderRadius: 999, overflow: "hidden", marginBottom: 6 },
  progressFill: { height: "100%", background: "#fff", borderRadius: 999, transition: "width .2s linear" },
  stateLabel: { fontSize: 17, fontWeight: 600, opacity: .95, margin: "8px 0 2px" },
  ringWrap: { position: "relative", width: "min(300px,52vw)", maxWidth: 300, aspectRatio: "1 / 1", margin: "4px 0" },
  ring: { width: "100%", height: "100%", filter: "drop-shadow(0 6px 16px rgba(0,0,0,.15))" },
  ringCenter: { position: "absolute", inset: 0, display: "grid", placeItems: "center", lineHeight: 1 },
  bigNum: { fontSize: "clamp(56px, 15vw, 108px)", fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  numUnit: { fontSize: 16, fontWeight: 600, opacity: .8, marginTop: 6 },
  exBlock: { marginTop: 6, maxWidth: 560, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  exName: { fontSize: 30, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 },
  exEmoji: { fontSize: 34 },
  captionBox: { fontSize: 18, fontWeight: 600, background: "rgba(255,255,255,.16)", padding: "8px 18px", borderRadius: 14, minHeight: 24, maxWidth: 520 },
  nextLabel: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 15, fontWeight: 700, letterSpacing: 1, opacity: .9 },
  nextPoints: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  chip: { background: "rgba(255,255,255,.2)", padding: "5px 12px", borderRadius: 999, fontSize: 14, fontWeight: 600 },
  regBtn: { ...base, background: "rgba(0,0,0,.16)", color: "#fff", border: "none", padding: "6px 16px", borderRadius: 999, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  regText: { fontSize: 15, fontWeight: 600, background: "rgba(255,255,255,.18)", padding: "6px 16px", borderRadius: 12 },
  danger: { fontSize: 13.5, fontWeight: 600, background: "rgba(0,0,0,.18)", padding: "5px 14px", borderRadius: 10 },
  controls: { display: "flex", alignItems: "center", gap: 16, marginTop: 16 },
  ctrlBtn: { ...base, width: 54, height: 54, display: "grid", placeItems: "center", background: "rgba(255,255,255,.2)", border: "none", borderRadius: 16, color: "#fff", cursor: "pointer" },
  mainCtrl: { ...base, width: 74, height: 74, display: "grid", placeItems: "center", background: "#fff", color: "#12557a", border: "none", borderRadius: "50%", cursor: "pointer", boxShadow: "0 6px 18px rgba(0,0,0,.2)" },
  wave: { position: "absolute", left: 0, right: 0, bottom: 0, height: 70, overflow: "hidden", pointerEvents: "none" },
};
