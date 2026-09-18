// src/data/services.js
// SENTINEL: NB_PHOSPHOR_SERVICES_V1
//
// The holder-facing service shelf. It describes real operating shapes without
// pretending their payment rails are open before the shared ledger exists.
// Prices stay in their source systems. The only fixed token amount repeated
// here is phosphor-day, whose canonical value lives in the studio catalog.
//
// Every visitor sentence travels as en, ja and zh in one record. A missing
// translation falls back to English through serviceText.
//
// No oxford commas, no em dashes.

export const SERVICES = [
  {
    slug: 'site-weight-pass',
    owner: 'kneeon musk',
    title: {
      en: 'site weight pass',
      ja: 'サイト軽量化パス',
      zh: '网站减重检查',
    },
    line: {
      en: 'one site. a written baseline. the heavy parts found and one approved repair proved before and after.',
      ja: '一つのサイト。書面の基準。重い箇所を見つけ、承認された一つの修正を前後で証明する。',
      zh: '一个网站。一份书面基线。找出沉重部分，并用前后对照证明一项获批修复。',
    },
    proof: {
      en: 'baseline • before and after • delivery receipt',
      ja: '基準 • 前後比較 • 納品記録',
      zh: '基线 • 前后对照 • 交付记录',
    },
    stage: 'pilot',
    rails: ['SOL', 'USDC', 'NEONBURRO'],
    href: 'https://neonburro.com/contact/?service=site-weight-pass',
  },
  {
    slug: 'watch-contract',
    owner: 'volt',
    title: {
      en: 'watch contract',
      ja: '監視契約',
      zh: '监测契约',
    },
    line: {
      en: 'one changing system watched against agreed conditions. silence is valid when nothing changed.',
      ja: '一つの変化するシステムを合意した条件で見守る。変化がなければ静かなままでよい。',
      zh: '按照约定条件监测一个变化中的系统。没有变化时，安静就是有效结果。',
    },
    proof: {
      en: 'starting state • exceptions • monthly receipt',
      ja: '開始状態 • 例外 • 月次記録',
      zh: '起始状态 • 异常 • 月度记录',
    },
    stage: 'testing',
    rails: ['SOL', 'USDC', 'NEONBURRO'],
    href: 'https://neonburro.com/contact/?service=watch-contract',
  },
  {
    slug: 'phosphor-day',
    owner: 'epoch',
    title: {
      en: 'a day inside phosphor',
      ja: 'phosphorで過ごす一日',
      zh: '在 phosphor 里的一天',
    },
    line: {
      en: 'one connected wallet. twenty four hours in the stacks. no automatic renewal and no custody.',
      ja: '接続した一つのウォレット。書庫で二十四時間。自動更新も預かりもない。',
      zh: '一个已连接钱包。在书库中停留二十四小时。不自动续期，也不托管。',
    },
    proof: {
      en: 'payment signature • access window • burn obligation',
      ja: '支払い署名 • 利用時間 • バーン義務',
      zh: '支付签名 • 访问时段 • 销毁义务',
    },
    stage: 'fitting',
    rails: ['100,000 NEONBURRO'],
    href: '/room/?r=the-coin',
  },
];

export const WORDS = {
  en: {
    kicker: 'the service hall',
    title: 'work leaves a receipt.',
    line: 'see what the burros can do. follow only the work tied to this wallet.',
    shelf: 'on the shelf',
    mine: 'your requests',
    none: 'no service request is tied to this wallet yet.',
    quiet: 'the shared service ledger is being fitted. the shelf is still true.',
    ask: 'ask about it',
    open: 'open epoch\'s desk',
    proof: 'proof',
    rails: 'rails',
    pilot: 'first supervised run',
    testing: 'internal testing',
    fitting: 'payment rail next',
    receipt: 'receipt',
    waiting: 'waiting',
  },
  ja: {
    kicker: 'サービスホール',
    title: '仕事には記録が残る。',
    line: 'burroたちの仕事を見る。このウォレットに結びついた仕事だけを追う。',
    shelf: 'サービス一覧',
    mine: 'あなたの依頼',
    none: 'このウォレットに結びついた依頼はまだない。',
    quiet: '共有サービス台帳を整備中。ここにあるサービス内容は変わらない。',
    ask: '相談する',
    open: 'epochの机を開く',
    proof: '証明',
    rails: '支払い方法',
    pilot: '最初の監督付き実行',
    testing: '内部テスト',
    fitting: '支払い導線を準備中',
    receipt: '記録',
    waiting: '待機中',
  },
  zh: {
    kicker: '服务大厅',
    title: '工作会留下记录。',
    line: '看看 burro 们能做什么。只跟踪与这个钱包相关的工作。',
    shelf: '服务架',
    mine: '你的请求',
    none: '这个钱包还没有关联任何服务请求。',
    quiet: '共享服务账簿正在安装中。服务架上的内容依然真实。',
    ask: '咨询这项服务',
    open: '打开 epoch 的桌面',
    proof: '证明',
    rails: '支付方式',
    pilot: '首次监督运行',
    testing: '内部测试',
    fitting: '下一步接入支付',
    receipt: '记录',
    waiting: '等待中',
  },
};

export const serviceText = (value, lang = 'en') => {
  if (typeof value === 'string') return value;
  return value?.[lang] || value?.en || '';
};

export const words = (lang = 'en') => WORDS[lang] || WORDS.en;

export default SERVICES;
