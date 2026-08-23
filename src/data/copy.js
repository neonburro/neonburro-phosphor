// src/data/copy.js
//
// Every sentence a visitor reads, in english, japanese and spanish, keyed.
// The first three languages Tyler named. The rest arrive with the speech work,
// see docs/speech.md, and should be added here as columns, never as a second
// file. A missing key falls back to english so a half translated room still
// reads.
//
// House voice in every language: lowercase, periods over commas, the • between
// things, never a dollar, never hype. A translator should keep the tone, not
// just the words. hue•man stays hue•man in every language.
//
// No oxford commas, no em dashes.

export const LANGS = [
  { id: 'en', label: 'english' },
  { id: 'ja', label: '日本語' },
  { id: 'es', label: 'español' },
];

export const COPY = {
  en: {
    door_kicker: 'burros. • the burrow',
    door_title: 'a room under the range.',
    door_line: 'hold enough NEONBURRO and the door knows you. nothing to type. nothing to remember. a dollar is a rumour up here.',
    door_button: 'verify your wallet',
    door_remember: 'remember this wallet',
    door_no_wallet: 'no wallet yet?',
    door_get_one: 'start here',
    door_get_one_plain: 'you will need a solana wallet. ask anyone in the room which one.',
    door_under: 'this wallet holds {balance} NEONBURRO. the door opens at {threshold}. come back when it does.',
    door_quiet: 'the door is quiet right now. try again in a minute.',
    door_signed: 'the wallet signed. checking the balance.',
    door_not_found: 'no wallet answered. open this page inside your wallet app, or',
    hello_kicker: 'three steps',
    hello_name: 'what should we call you?',
    hello_name_line: 'the burrow names you. reroll until one fits. it never changes after this.',
    hello_reroll: 'another',
    hello_lang: 'which language?',
    hello_wallet: 'your wallet',
    hello_wallet_line: 'this is the wallet that signed. it is yours now in here.',
    hello_verify: 'the door checks',
    hello_verify_line: 'one look at the balance. then you are in.',
    hello_next: 'next',
    hello_enter: 'enter',
    room_kicker: 'the room',
    room_title: 'welcome, {handle}.',
    room_empty: 'nothing on the walls yet. epoch is at the desk.',
    room_epoch: 'epoch • keeper of the record',
    room_epoch_line: 'ask me about the coin. only the coin. the rest is above my desk.',
    room_leave: 'leave',
    room_rooms: 'the rooms',
    room_back: 'rooms',
    room_say: 'say it here',
    room_hold: 'hold to talk',
    room_send: 'send',
    room_nothing: 'nothing said in here yet. you know what to do.',
    room_epoch_pin: 'epoch keeps this desk. the coin, the pool, the record. ask.',
    shell_holders: 'holders in the room',
  },
  ja: {
    door_kicker: 'burros. • 巣穴',
    door_title: '山の下の部屋。',
    door_line: 'NEONBURROを十分に持っていれば、扉はあなたを知っている。入力なし。記憶なし。ここではドルは噂にすぎない。',
    door_button: 'ウォレットを確認',
    door_remember: 'このウォレットを覚える',
    door_no_wallet: 'ウォレットはまだ？',
    door_get_one: 'ここから',
    door_get_one_plain: 'solanaのウォレットが必要です。部屋の誰かに聞いてください。',
    door_under: 'このウォレットには {balance} NEONBURRO。扉は {threshold} で開く。そのときにまた。',
    door_quiet: '扉は今静か。少ししてからもう一度。',
    door_signed: '署名を確認。残高を見ている。',
    door_not_found: 'ウォレットが応答しない。ウォレットアプリの中でこのページを開くか、',
    hello_kicker: '三つの手順',
    hello_name: 'なんと呼べばいい？',
    hello_name_line: '巣穴が名前を付ける。合うまで引き直して。この後は変わらない。',
    hello_reroll: 'もう一つ',
    hello_lang: 'どの言語？',
    hello_wallet: 'あなたのウォレット',
    hello_wallet_line: '署名したウォレット。ここではあなたのもの。',
    hello_verify: '扉が確認する',
    hello_verify_line: '残高を一度だけ見る。それで中へ。',
    hello_next: '次へ',
    hello_enter: '入る',
    room_kicker: '部屋',
    room_title: 'ようこそ、{handle}。',
    room_empty: '壁にはまだ何もない。epochが机にいる。',
    room_epoch: 'epoch • 記録の番人',
    room_epoch_line: 'コインのことなら聞いて。コインだけ。残りは机の上の話。',
    room_leave: '出る',
    room_rooms: '部屋',
    room_back: '部屋へ',
    room_say: 'ここで言う',
    room_hold: '押して話す',
    room_send: '送る',
    room_nothing: 'まだ誰も何も言っていない。どうぞ。',
    room_epoch_pin: 'この机はepochのもの。コインとプールと記録。聞いて。',
    shell_holders: '部屋にいる保有者',
  },
  es: {
    door_kicker: 'burros. • la madriguera',
    door_title: 'un cuarto bajo la sierra.',
    door_line: 'ten suficiente NEONBURRO y la puerta te reconoce. nada que escribir. nada que recordar. aquí arriba un dólar es un rumor.',
    door_button: 'verificar tu billetera',
    door_remember: 'recordar esta billetera',
    door_no_wallet: '¿sin billetera todavía?',
    door_get_one: 'empieza aquí',
    door_get_one_plain: 'necesitas una billetera de solana. pregunta a cualquiera en el cuarto cuál.',
    door_under: 'esta billetera tiene {balance} NEONBURRO. la puerta abre en {threshold}. vuelve cuando llegue.',
    door_quiet: 'la puerta está callada ahora. prueba en un minuto.',
    door_signed: 'la billetera firmó. revisando el saldo.',
    door_not_found: 'ninguna billetera respondió. abre esta página dentro de tu app de billetera, o',
    hello_kicker: 'tres pasos',
    hello_name: '¿cómo te llamamos?',
    hello_name_line: 'la madriguera te nombra. vuelve a tirar hasta que uno encaje. después no cambia.',
    hello_reroll: 'otro',
    hello_lang: '¿qué idioma?',
    hello_wallet: 'tu billetera',
    hello_wallet_line: 'esta es la billetera que firmó. aquí dentro ya es tuya.',
    hello_verify: 'la puerta revisa',
    hello_verify_line: 'una mirada al saldo. y entras.',
    hello_next: 'siguiente',
    hello_enter: 'entrar',
    room_kicker: 'el cuarto',
    room_title: 'bienvenido, {handle}.',
    room_empty: 'nada en las paredes todavía. epoch está en el escritorio.',
    room_epoch: 'epoch • guardián del registro',
    room_epoch_line: 'pregúntame por la moneda. solo la moneda. el resto queda arriba de mi escritorio.',
    room_leave: 'salir',
    room_rooms: 'los cuartos',
    room_back: 'cuartos',
    room_say: 'dilo aquí',
    room_hold: 'mantén para hablar',
    room_send: 'enviar',
    room_nothing: 'nadie ha dicho nada todavía. ya sabes qué hacer.',
    room_epoch_pin: 'este escritorio es de epoch. la moneda, el pool, el registro. pregunta.',
    shell_holders: 'holders en el cuarto',
  },
};

export const LANG_KEY = 'burrow-lang';

export const currentLang = () => {
  try { return localStorage.getItem(LANG_KEY) || 'en'; } catch { return 'en'; }
};

export const setLang = (id) => {
  try { localStorage.setItem(LANG_KEY, id); } catch { /* private mode */ }
};

// t('door_under', { balance, threshold }) with english as the floor.
export const t = (key, vars = {}, lang = currentLang()) => {
  const s = COPY[lang]?.[key] ?? COPY.en[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
};
