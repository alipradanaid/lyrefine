/* Lyrefine by Alypradana — client-side writing clarity analyzer.
   Similarity is a transparent lexical heuristic, not an AI semantic model. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const textInput = $("textInput");
  const wordCount = $("wordCount"), charCount = $("charCount"), sentenceCount = $("sentenceCount");
  const resultsList = $("resultsList"), findingCount = $("findingCount"), resultStatus = $("resultStatus");

  // Common function words are excluded from topic-overlap scoring. Negations are intentionally retained.
  const STOPWORDS = new Set(`
    yang dan di ke dari untuk dengan pada kepada dalam adalah ialah merupakan yaitu yakni ini itu tersebut tadi
    atau maupun serta tetapi namun sedangkan melainkan agar supaya karena sebab sehingga maka jika jikalau apabila bila kalau
    ketika saat sewaktu selama sebelum sesudah setelah hingga sampai sejak semenjak juga pun saja hanya bahkan masih sudah telah sedang tengah akan
    dapat bisa mampu boleh harus perlu ingin hendak lebih paling sangat cukup terlalu kurang amat begitu demikian
    oleh terhadap tentang mengenai perihal sebagai secara menurut berdasarkan sesuai melalui lewat antara antar tiap setiap masing beberapa sejumlah banyak sedikit
    semua seluruh segala para ada menjadi terdapat terjadi berlangsung memiliki mempunyai punya dilakukan digunakan dibuat diberikan
    kami kita mereka saya aku anda kamu ia dia beliau dirinya nya lah kah tah suatu sebuah seseorang sesuatu berbagai
    pertama kedua berikut berikutnya misalnya contohnya misal adapun sementara bahwa yakni
  `.trim().split(/\s+/));

  // Related-word groups are intentionally conservative; context still determines meaning.
  const SYNONYM_GROUPS = [
    ["website", "situs", "web", "laman"],
    ["metode", "teknik", "pendekatan", "cara", "strategi", "prosedur"],
    ["menjelaskan", "menguraikan", "memaparkan", "menerangkan", "mendeskripsikan", "menjabarkan"],
    ["menemukan", "mendeteksi", "mengidentifikasi", "menemui"],
    ["hasil", "temuan", "output", "keluaran"],
    ["menggunakan", "memakai", "memanfaatkan", "mempergunakan"],
    ["tujuan", "maksud", "sasaran", "target"],
    ["keamanan", "proteksi", "perlindungan"],
    ["meningkatkan", "menaikkan", "memperbaiki", "mengembangkan", "memperkuat", "mengoptimalkan"],
    ["membantu", "memudahkan", "mendukung", "menolong"],
    ["ancaman", "bahaya", "risiko", "serangan", "gangguan"],
    ["menunjukkan", "memperlihatkan", "menggambarkan", "menandakan"],
    ["menerapkan", "mengimplementasikan", "melaksanakan", "menjalankan"],
    ["menganalisis", "menelaah", "mengkaji", "memeriksa"],
    ["membuat", "menciptakan", "menghasilkan", "menyusun", "merancang"],
    ["mengurangi", "meminimalkan", "menekan", "memperkecil"],
    ["mempercepat"],
    ["menyediakan", "memberikan", "menawarkan", "menghadirkan"],
    ["memperoleh", "mendapatkan", "meraih"],
    ["penting", "utama", "pokok", "krusial", "esensial"],
    ["permasalahan", "masalah", "persoalan", "kendala"],
    ["solusi", "pemecahan", "penyelesaian", "jalan keluar"],
    ["perubahan", "pergeseran", "transformasi", "peralihan"],
    ["efektif", "manjur", "ampuh"],
    ["efisien", "hemat"],
    ["informasi", "keterangan", "data", "penjelasan"],
    ["pengguna", "pemakai", "user"],
    ["aplikasi", "program", "perangkat lunak", "software"],
    ["sistem", "mekanisme", "tata cara"],
    ["memastikan", "menjamin", "memverifikasi", "mengonfirmasi"],
    ["mengamati", "memantau", "mengawasi", "memperhatikan"],
    ["menyebabkan", "mengakibatkan", "memicu", "menimbulkan"],
    ["mencegah", "menghindari", "menangkal", "mengantisipasi"],
    ["memilih", "menentukan", "menyeleksi", "menetapkan"],
    ["mengubah", "mengganti", "memodifikasi", "menyesuaikan"],
    ["menghubungkan", "mengaitkan", "menautkan", "mengintegrasikan"],
    ["menyimpan", "merekam", "mengarsipkan", "mendokumentasikan"],
    ["menampilkan", "memperlihatkan", "menyajikan", "memunculkan"],
    ["memperbarui", "memutakhirkan", "meng-update", "mengupdate"],
    ["mudah", "sederhana", "praktis", "gampang"],
    ["sulit", "rumit", "kompleks", "sukar"],
    ["cepat", "lekas", "singkat"],
    ["akurat", "tepat", "presisi", "cermat"],
    ["kesalahan", "kekeliruan", "error", "galat"],
    ["keuntungan", "manfaat", "kelebihan", "nilai tambah"],
    ["kekurangan", "kelemahan", "keterbatasan"],
    ["menyimpulkan", "merangkum", "mengikhtisarkan"],
    ["menyatakan", "mengatakan", "mengemukakan", "menuturkan"],
    ["membandingkan", "memperbandingkan", "mengontraskan"],
    ["mempertahankan", "menjaga", "melestarikan", "memelihara"],
    ["meningkat", "bertambah", "naik", "bertumbuh"],
    ["menurun", "berkurang", "merosot", "turun"],
    ["dampak", "pengaruh", "akibat", "efek"],
    ["kebutuhan", "keperluan"],
    ["proses", "tahapan", "langkah", "alur"],
    ["mencapai", "meraih", "memperoleh"]
  ];
  const SYNONYM_LOOKUP = new Map();
  for (const group of SYNONYM_GROUPS) {
    const canonical = group[0];
    for (const word of group) SYNONYM_LOOKUP.set(word, canonical);
  }


  let lastReport = "";

  function normalize(value) {
    return String(value ?? "").toLocaleLowerCase("id-ID").normalize("NFKC")
      .replace(/[“”„]/g, '"').replace(/[‘’]/g, "'").replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, " ").trim();
  }
  function comparisonKey(value) {
    return normalize(value).replace(/[.,!?;:()[\]{}"'`…—–-]/g, "").replace(/\s+/g, " ").trim();
  }
  function getSentences(text) {
    const clean = String(text ?? "").replace(/\r\n?/g, "\n").trim();
    if (!clean) return [];
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
      try {
        const parts = [...new Intl.Segmenter("id", { granularity: "sentence" }).segment(clean)]
          .map(item => item.segment.trim()).filter(Boolean);
        if (parts.length) return parts;
      } catch (_) {}
    }
    return (clean.match(/[^.!?]+(?:[.!?]+["'”’)]*)?|[^.!?]+$/g) || []).map(s => s.trim()).filter(Boolean);
  }
  function getParagraphs(text) {
    return String(text ?? "").replace(/\r\n?/g, "\n").split(/\n\s*\n+/).map(p => p.trim()).filter(Boolean);
  }
  function updateStats() {
    const text = textInput.value;
    $("wordCount").textContent = (text.trim() ? (text.trim().match(/\S+/g) || []).length : 0).toLocaleString("id-ID");
    $("charCount").textContent = text.length.toLocaleString("id-ID");
    $("sentenceCount").textContent = getSentences(text).length.toLocaleString("id-ID");
  }
  function groupDuplicates(items) {
    const groups = new Map();
    items.forEach((original, index) => {
      const key = comparisonKey(original);
      if (!key) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ original, index });
    });
    return [...groups.values()].filter(group => group.length > 1);
  }
  function tokenize(text) {
    const words = normalize(text).match(/[\p{L}\p{N}]+/gu) || [];
    return words.filter(w => w.length > 2 && !STOPWORDS.has(w)).map(w => SYNONYM_LOOKUP.get(w) || w);
  }
  function tokenWeights(a, b) {
    const all = [...a, ...b];
    const counts = new Map();
    all.forEach(w => counts.set(w, (counts.get(w) || 0) + 1));
    const weights = new Map();
    for (const [word, count] of counts) weights.set(word, 1 / Math.sqrt(count));
    return weights;
  }
  function similarity(a, b, minimumShared = 3) {
    const A = tokenize(a), B = tokenize(b);
    if (A.length < 5 || B.length < 5) return 0;
    const setA = new Set(A), setB = new Set(B);
    let shared = 0, sharedWeight = 0, weightA = 0, weightB = 0;
    const weights = tokenWeights(A, B);
    setA.forEach(w => { weightA += weights.get(w) || 1; if (setB.has(w)) { shared++; sharedWeight += weights.get(w) || 1; } });
    setB.forEach(w => { weightB += weights.get(w) || 1; });
    if (shared < minimumShared || !weightA || !weightB) return 0;
    const weightedOverlap = sharedWeight / Math.max(weightA, weightB);
    const containment = sharedWeight / Math.min(weightA, weightB);
    const score = weightedOverlap * 0.65 + containment * 0.35;
    return Math.min(score, 1);
  }
  function findSimilar(items, threshold, minimumShared = 3) {
    const findings = [];
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      if (comparisonKey(items[i]) === comparisonKey(items[j])) continue;
      const score = similarity(items[i], items[j], minimumShared);
      if (score >= threshold) findings.push({ a: items[i], b: items[j], i, j, score });
    }
    return findings.sort((x, y) => y.score - x.score);
  }
  function addFinding(type, label, meta, text, sub = "") {
    const article = document.createElement("article"); article.className = "finding";
    const top = document.createElement("div"); top.className = "finding-top";
    const badge = document.createElement("span"); badge.className = `finding-badge ${type}`; badge.textContent = label;
    const detail = document.createElement("span"); detail.className = "finding-meta"; detail.textContent = meta;
    top.append(badge, detail);
    const body = document.createElement("p"); body.className = "finding-text"; body.textContent = text;
    article.append(top, body);
    if (sub) { const note = document.createElement("p"); note.className = "finding-sub"; note.textContent = sub; article.append(note); }
    resultsList.append(article);
  }
  function resetResults() {
    ["duplicateSentenceCount", "duplicateParagraphCount", "similarIdeaCount", "similarSentenceCount"].forEach(id => { if ($(id)) $(id).textContent = "—"; });
    findingCount.textContent = "Menunggu teks"; resultStatus.textContent = "Belum dianalisis"; resultStatus.classList.remove("complete");
    lastReport = "";
    if ($("copyReportBtn")) $("copyReportBtn").disabled = true;
  }
  function renderEmpty(message, detail) {
    const box = document.createElement("div"); box.className = "empty-state";
    const strong = document.createElement("strong"); strong.textContent = message;
    const p = document.createElement("p"); p.textContent = detail; box.append(strong, p); resultsList.replaceChildren(box);
  }
  function analyzeText() {
    const text = textInput.value.trim(); resultsList.replaceChildren();
    if (!text) { resetResults(); renderEmpty("Tambahkan teks terlebih dahulu", "Tempel tulisan yang ingin kamu periksa pada kolom di sebelah kiri."); return; }
    const sentences = getSentences(text), paragraphs = getParagraphs(text);
    const duplicateSentences = groupDuplicates(sentences), duplicateParagraphs = groupDuplicates(paragraphs);
    const similarSentences = findSimilar(sentences, 0.56, 3).filter(pair => tokenize(pair.a).length >= 6 && tokenize(pair.b).length >= 6);
    const similarParagraphs = findSimilar(paragraphs, 0.34, 3).filter(pair => tokenize(pair.a).length >= 7 && tokenize(pair.b).length >= 7);
    $("duplicateSentenceCount").textContent = duplicateSentences.length.toLocaleString("id-ID");
    $("duplicateParagraphCount").textContent = duplicateParagraphs.length.toLocaleString("id-ID");
    $("similarIdeaCount").textContent = similarParagraphs.length.toLocaleString("id-ID");
    if ($("similarSentenceCount")) $("similarSentenceCount").textContent = similarSentences.length.toLocaleString("id-ID");
    resultStatus.textContent = "Analisis selesai"; resultStatus.classList.add("complete");
    const report = [`LYREFINE BY ALYPRADANA — LAPORAN ANALISIS`, `Kata: ${$("wordCount").textContent} | Karakter: ${$("charCount").textContent} | Kalimat: ${$("sentenceCount").textContent}`, `Kalimat identik: ${duplicateSentences.length} | Paragraf identik: ${duplicateParagraphs.length} | Kalimat berpotensi mirip: ${similarSentences.length} | Gagasan/paragraf berpotensi mirip: ${similarParagraphs.length}`, "", "Catatan: kemiripan adalah perkiraan berbasis kata dan kelompok istilah terkait, bukan penilaian AI atau bukti bahwa dua bagian memiliki makna sama."];
    let total = 0;
    duplicateSentences.forEach(group => { total++; const meta = `${group.length} kemunculan · kalimat ${group.map(x => x.index + 1).join(", ")}`; addFinding("sentence", "Kalimat identik", meta, group[0].original, "Kalimat muncul berulang setelah normalisasi tanda baca dan spasi."); report.push(`\n[KALIMAT IDENTIK] ${meta}\n${group[0].original}`); });
    duplicateParagraphs.forEach(group => { total++; const meta = `${group.length} kemunculan · paragraf ${group.map(x => x.index + 1).join(", ")}`; addFinding("paragraph", "Paragraf identik", meta, group[0].original, "Paragraf muncul berulang setelah normalisasi tanda baca dan spasi."); report.push(`\n[PARAGRAF IDENTIK] ${meta}\n${group[0].original}`); });
    similarSentences.forEach(pair => { total++; const meta = `Kalimat ${pair.i + 1} dan ${pair.j + 1} · skor kemiripan kata ${Math.round(pair.score * 100)}%`; addFinding("similar", "Kalimat berpotensi mirip", meta, pair.a, `Bandingkan dengan kalimat ${pair.j + 1}: “${pair.b}”`); report.push(`\n[KALIMAT BERPOTENSI MIRIP] ${meta}\nA: ${pair.a}\nB: ${pair.b}`); });
    similarParagraphs.forEach(pair => { total++; const meta = `Paragraf ${pair.i + 1} dan ${pair.j + 1} · skor kemiripan kata ${Math.round(pair.score * 100)}%`; addFinding("idea", "Gagasan berpotensi mirip", meta, pair.a, `Bandingkan dengan paragraf ${pair.j + 1}: “${pair.b}”`); report.push(`\n[GAGASAN BERPOTENSI MIRIP] ${meta}\nA: ${pair.a}\nB: ${pair.b}`); });
    findingCount.textContent = `${total.toLocaleString("id-ID")} temuan`;
    if (!total) renderEmpty("Tidak ditemukan pengulangan yang jelas", "Ini bukan jaminan bahwa tulisan bebas dari pengulangan. Tinjau kembali alur dan gagasan tulisan secara manual.");
    lastReport = report.join("\n"); if ($("copyReportBtn")) $("copyReportBtn").disabled = false;
  }

  $("analyzeBtn").addEventListener("click", analyzeText);
  $("clearBtn").addEventListener("click", () => { textInput.value = ""; updateStats(); resetResults(); renderEmpty("Siap merapikan tulisanmu?", "Masukkan teks lalu pilih Analisis tulisan untuk melihat temuan di sini."); textInput.focus(); });
  if ($("sampleBtn")) $("sampleBtn").addEventListener("click", () => { textInput.value = SAMPLE_TEXT; updateStats(); textInput.focus(); });
  if ($("copyReportBtn")) $("copyReportBtn").addEventListener("click", async () => {
    if (!lastReport) return;
    try { await navigator.clipboard.writeText(lastReport); $("copyReportBtn").textContent = "Laporan disalin"; }
    catch (_) { const field = document.createElement("textarea"); field.value = lastReport; document.body.append(field); field.select(); const ok = document.execCommand("copy"); field.remove(); $("copyReportBtn").textContent = ok ? "Laporan disalin" : "Salin gagal"; }
    setTimeout(() => { $("copyReportBtn").textContent = "Salin laporan"; }, 1800);
  });
  textInput.addEventListener("input", updateStats);
document.documentElement.dataset.theme = "dark";
updateStats();
})();
