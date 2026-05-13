const DECISION_WORDS = ["決定", "決まり", "合意", "承認", "採用", "方針", "確定", "進める"];
const ACTION_WORDS = ["担当", "TODO", "タスク", "対応", "作成", "送付", "共有", "修正", "準備", "確認", "調整", "提出", "レビュー", "連絡", "実施", "検討"];
const RISK_WORDS = ["課題", "懸念", "リスク", "問題", "不足", "遅れ", "難しい", "ボトルネック", "未定", "保留"];
const NEXT_WORDS = ["次回", "次に", "今後", "来週", "明日", "月末", "期限", "までに", "フォロー", "継続"];

const STOPWORDS = new Set([
  "です",
  "ます",
  "する",
  "した",
  "して",
  "こと",
  "これ",
  "それ",
  "ため",
  "よう",
  "さん",
  "こちら",
  "そこ",
  "ところ",
  "今回",
  "今日",
  "本日",
  "会議",
  "ミーティング",
]);

export function buildMinutes(record) {
  const sentences = toSentences(record.transcriptText || "");
  const keywords = extractKeywords(record.transcriptText || "");
  const summary = pickSummary(sentences, keywords);
  const decisions = pickMatches(sentences, DECISION_WORDS, 6);
  const actionItems = pickActionSentences(sentences, 8).map((sentence) => ({
    owner: inferOwner(sentence),
    task: shorten(sentence, 92),
    due: inferDue(sentence),
    status: "未着手",
  }));
  const risks = pickMatches(sentences, RISK_WORDS, 5);
  const nextSteps = pickMatches(sentences, NEXT_WORDS, 5);

  return {
    generatedAt: new Date().toISOString(),
    title: record.title || "無題のMTG",
    meetingDate: record.meetingDate,
    participants: record.participants || [],
    summary: summary.length ? summary : ["文字起こし本文から議事録を生成する準備ができました。"],
    agenda: inferAgenda(sentences, keywords),
    decisions: decisions.length ? decisions.map((item) => shorten(item, 90)) : ["明確な決定事項は本文からは未検出です。"],
    actionItems: actionItems.length
      ? actionItems
      : [{ owner: "未設定", task: "次の対応事項は本文からは未検出です。", due: "未設定", status: "未着手" }],
    risks: risks.length ? risks.map((item) => shorten(item, 90)) : ["大きな懸念点は本文からは未検出です。"],
    nextSteps: nextSteps.length ? nextSteps.map((item) => shorten(item, 90)) : ["次回アクションは本文からは未検出です。"],
    keywords,
  };
}

export function buildDiagramPrompt(record) {
  const minutes = record.minutes || buildMinutes(record);
  const actionItems = (minutes.actionItems || [])
    .slice(0, 5)
    .map((item, index) => `${index + 1}. 担当: ${item.owner || "未設定"} / 期限: ${item.due || "未設定"} / ${item.task || ""}`)
    .join("\n");

  return `Use case: infographic-diagram
Asset type: meeting minutes visual summary for a web archive
Primary request: Create a polished Japanese business infographic image from the meeting minutes below.
Canvas: 16:9 landscape, clean white paper background, 1536x864 composition.
Style: editorial business diagram, precise grid, restrained color accents (navy, cobalt blue, teal, amber, rose), thin rules, high readability, no decorative blobs.
Typography: Japanese text must be crisp and readable. Use short labels and compact wording. Keep all visible text in Japanese.
Layout:
- Header with meeting title, date, and participants.
- Four structured zones: 要約, 決定事項, アクション, 課題・次回.
- Use arrows or flow connectors only where they clarify the relationship.
- Include a small keyword row at the bottom.
Accuracy constraints:
- Do not invent facts, names, decisions, dates, or numbers.
- If a field is unknown, write 未設定 or 未検出.
- No logos, no watermark, no fake UI chrome.

Meeting title: ${minutes.title || record.title || "無題のMTG"}
Meeting date: ${minutes.meetingDate || record.meetingDate || "日付未設定"}
Participants: ${(minutes.participants || []).join(" / ") || "未設定"}

要約:
${bulletText(minutes.summary)}

議題:
${bulletText(minutes.agenda)}

決定事項:
${bulletText(minutes.decisions)}

アクション:
${actionItems || "1. 担当: 未設定 / 期限: 未設定 / 未検出"}

課題・懸念:
${bulletText(minutes.risks)}

次回までに:
${bulletText(minutes.nextSteps)}

キーワード:
${(minutes.keywords || []).slice(0, 8).map((keyword) => keyword.term).join(" / ") || "未検出"}`;
}

function toSentences(text) {
  return normalizeText(text)
    .replace(/([。！？!?])\s*/g, "$1\n")
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 8)
    .flatMap((line) => splitLongLine(line))
    .filter(uniqueByValue)
    .slice(0, 160);
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/^\d+\s*$/gm, "")
    .replace(/\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[,.]\d{3}/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function splitLongLine(line) {
  if (line.length <= 130) return [line];
  const chunks = [];
  let rest = line;
  while (rest.length > 130) {
    let index = rest.slice(0, 130).lastIndexOf("、");
    if (index < 48) index = 110;
    chunks.push(rest.slice(0, index + 1).trim());
    rest = rest.slice(index + 1).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

function uniqueByValue(value, index, array) {
  return array.indexOf(value) === index;
}

function extractKeywords(text) {
  const counts = new Map();
  for (const match of String(text || "").matchAll(/[A-Za-z][A-Za-z0-9_-]{2,}|[一-龠々ぁ-んァ-ヶー]{2,}/gu)) {
    const term = match[0].trim();
    if (!term || STOPWORDS.has(term) || term.length > 18) continue;
    counts.set(term, (counts.get(term) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"))
    .slice(0, 12)
    .map(([term, count]) => ({ term, count }));
}

function pickSummary(sentences, keywords) {
  const keywordTerms = new Set(keywords.slice(0, 8).map((item) => item.term));
  return sentences
    .map((sentence, index) => ({
      sentence,
      score: scoreSentence(sentence, keywordTerms) + Math.max(0, 8 - index) * 0.12,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((item) => shorten(item.sentence, 96));
}

function scoreSentence(sentence, keywordTerms) {
  let score = sentence.length > 24 && sentence.length < 120 ? 2 : 0;
  for (const term of keywordTerms) {
    if (sentence.includes(term)) score += 1.2;
  }
  for (const word of [...DECISION_WORDS, ...ACTION_WORDS, ...RISK_WORDS]) {
    if (sentence.includes(word)) score += 0.8;
  }
  return score;
}

function pickMatches(sentences, words, limit) {
  const matches = sentences.filter((sentence) => words.some((word) => sentence.toLowerCase().includes(word.toLowerCase())));
  return matches.filter(uniqueByValue).slice(0, limit);
}

function pickActionSentences(sentences, limit) {
  const taskSignals = /(担当|TODO|タスク|さん[がは]|氏[がは]|までに|期限|来週|明日|月末|週明け|次回)/u;
  return sentences
    .filter((sentence) => ACTION_WORDS.some((word) => sentence.toLowerCase().includes(word.toLowerCase())))
    .filter((sentence) => taskSignals.test(sentence))
    .filter(uniqueByValue)
    .slice(0, limit);
}

function inferAgenda(sentences, keywords) {
  const agenda = keywords.slice(0, 5).map((item) => `${item.term}について確認`);
  if (agenda.length) return agenda;
  return sentences.slice(0, 3).map((sentence) => shorten(sentence, 60));
}

function inferOwner(sentence) {
  const explicit = sentence.match(/(?:担当|担当者|owner)\s*[:：]?\s*([一-龠々ぁ-んァ-ヶA-Za-z0-9_-]{2,14})/iu);
  if (explicit) return normalizeOwner(explicit[1]);
  const subject = sentence.match(/^([一-龠々ぁ-んァ-ヶA-Za-z0-9_-]{2,14}?)(?:さん|氏)?[がは]/u);
  if (subject) return normalizeOwner(subject[1]);
  return "未設定";
}

function normalizeOwner(owner) {
  const value = String(owner || "").replace(/(さん|氏)$/u, "").trim();
  if (/^(本日|今日|今回|会議|次回|懸念点|課題|問題|それ|これ)/u.test(value)) return "未設定";
  return value || "未設定";
}

function inferDue(sentence) {
  const due = sentence.match(/(今日|本日|明日|明後日|今週|来週|月末|週明け|\d{1,2}月\d{1,2}日|\d{1,2}\/\d{1,2}|\d{1,2}日まで)/u);
  return due ? due[1] : "未設定";
}

function shorten(text, max) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function bulletText(items) {
  const values = (items || []).slice(0, 5).map((item) => `- ${shorten(item, 72)}`);
  return values.length ? values.join("\n") : "- 未検出";
}
