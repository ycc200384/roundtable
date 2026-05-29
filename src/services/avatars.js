/**
 * 8个 Q版手绘风格头像 SVG，嵌入代码零延迟加载
 * 每个头像有独特的发型、发色、配饰
 */

const AVATARS = [
  // 0: 棕色短发 + 圆眼镜（学者型）
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#FFE0B2"/>
    <ellipse cx="50" cy="38" rx="24" ry="22" fill="#8D6E3A"/>
    <circle cx="38" cy="50" r="8" fill="#333" stroke="#ddd" stroke-width="1.5"/>
    <circle cx="62" cy="50" r="8" fill="#333" stroke="#ddd" stroke-width="1.5"/>
    <circle cx="40" cy="48" r="2.5" fill="#fff"/>
    <circle cx="64" cy="48" r="2.5" fill="#fff"/>
    <ellipse cx="50" cy="62" rx="5" ry="3.5" fill="#F48FB1"/>
    <path d="M25 40 Q50 28 75 40" fill="none" stroke="#5D4037" stroke-width="2"/>
    <path d="M30 62 Q50 72 70 62" fill="none" stroke="#E0A080" stroke-width="1.5"/>
  </svg>`,
  // 1: 银白长发 + 温婉（智者型）
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#FFF8E1"/>
    <ellipse cx="50" cy="42" rx="26" ry="24" fill="#E0E0E0"/>
    <path d="M24 42 Q24 70 40 78 Q50 82 60 78 Q76 70 76 42" fill="#E0E0E0"/>
    <circle cx="38" cy="52" r="7" fill="#5D4037"/>
    <circle cx="62" cy="52" r="7" fill="#5D4037"/>
    <circle cx="40" cy="50" r="2" fill="#fff"/>
    <circle cx="64" cy="50" r="2" fill="#fff"/>
    <ellipse cx="50" cy="65" rx="4.5" ry="3" fill="#E57373"/>
    <path d="M32 70 Q50 78 68 70" fill="none" stroke="#90A4AE" stroke-width="1.2"/>
  </svg>`,
  // 2: 黑色短发 + 干练（行动派）
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#F5F5DC"/>
    <ellipse cx="50" cy="40" rx="24" ry="18" fill="#1A1A2E"/>
    <circle cx="38" cy="52" r="7.5" fill="#2D2A26"/>
    <circle cx="62" cy="52" r="7.5" fill="#2D2A26"/>
    <circle cx="40" cy="50" r="2.5" fill="#fff"/>
    <circle cx="64" cy="50" r="2.5" fill="#fff"/>
    <ellipse cx="50" cy="64" rx="5" ry="3.5" fill="#FF8A65"/>
    <path d="M28 63 Q50 73 72 63" fill="none" stroke="#BCAAA4" stroke-width="1.5"/>
    <path d="M38 24 Q44 18 50 20" fill="none" stroke="#1A1A2E" stroke-width="3"/>
  </svg>`,
  // 3: 红棕色卷发 + 热情（艺术家型）
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#FFCCBC"/>
    <circle cx="36" cy="34" r="12" fill="#BF360C"/>
    <circle cx="64" cy="34" r="12" fill="#BF360C"/>
    <circle cx="42" cy="30" r="11" fill="#E64A19"/>
    <circle cx="58" cy="30" r="11" fill="#E64A19"/>
    <ellipse cx="50" cy="36" rx="20" ry="18" fill="#E64A19"/>
    <circle cx="39" cy="52" r="7" fill="#4E342E"/>
    <circle cx="61" cy="52" r="7" fill="#4E342E"/>
    <circle cx="41" cy="50" r="2" fill="#fff"/>
    <circle cx="63" cy="50" r="2" fill="#fff"/>
    <ellipse cx="50" cy="64" rx="4" ry="3" fill="#FFAB91"/>
  </svg>`,
  // 4: 银灰短发 + 冷静（分析型）
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#E8EAF6"/>
    <ellipse cx="50" cy="38" rx="22" ry="16" fill="#90A4AE"/>
    <circle cx="38" cy="50" r="7" fill="#37474F"/>
    <circle cx="62" cy="50" r="7" fill="#37474F"/>
    <circle cx="40" cy="48" r="2" fill="#fff"/>
    <circle cx="64" cy="48" r="2" fill="#fff"/>
    <rect x="37" y="58" width="26" height="3" rx="1.5" fill="#78909C"/>
    <path d="M26 63 Q50 71 74 63" fill="none" stroke="#90A4AE" stroke-width="1.5"/>
    <path d="M40 24 Q50 22 60 24" fill="none" stroke="#78909C" stroke-width="2.5"/>
  </svg>`,
  // 5: 金色长发 + 优雅（外交官型）
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#FFF9C4"/>
    <ellipse cx="50" cy="40" rx="20" ry="20" fill="#FFD54F"/>
    <path d="M30 36 Q28 68 38 80 Q44 86 50 86 Q56 86 62 80 Q72 68 70 36" fill="#FFD54F"/>
    <circle cx="38" cy="50" r="6.5" fill="#33691E"/>
    <circle cx="62" cy="50" r="6.5" fill="#33691E"/>
    <circle cx="40" cy="48" r="2" fill="#fff"/>
    <circle cx="64" cy="48" r="2" fill="#fff"/>
    <ellipse cx="50" cy="63" rx="4" ry="3" fill="#F06292"/>
    <path d="M34 68 Q50 74 66 68" fill="none" stroke="#BCAAA4" stroke-width="1.2"/>
  </svg>`,
  // 6: 蓝色短发 + 利落（战略家型）
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#BBDEFB"/>
    <ellipse cx="50" cy="38" rx="23" ry="17" fill="#1A237E"/>
    <circle cx="38" cy="50" r="7" fill="#1A237E"/>
    <circle cx="62" cy="50" r="7" fill="#1A237E"/>
    <circle cx="40" cy="48" r="2.5" fill="#fff"/>
    <circle cx="64" cy="48" r="2.5" fill="#fff"/>
    <ellipse cx="50" cy="62" rx="4.5" ry="3" fill="#7986CB"/>
    <path d="M28 60 Q50 70 72 60" fill="none" stroke="#7986CB" stroke-width="1.5"/>
    <path d="M42 22 L48 32 L40 28 L52 28 L44 32 Z" fill="#1A237E"/>
  </svg>`,
  // 7: 紫色长发 + 神秘（哲学家型）
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="#F3E5F5"/>
    <ellipse cx="50" cy="38" rx="20" ry="18" fill="#4A148C"/>
    <path d="M30 36 Q28 65 35 78 Q42 86 50 86 Q58 86 65 78 Q72 65 70 36" fill="#6A1B9A"/>
    <circle cx="38" cy="50" r="7" fill="#4A148C"/>
    <circle cx="62" cy="50" r="7" fill="#4A148C"/>
    <circle cx="40" cy="48" r="2.5" fill="#fff"/>
    <circle cx="64" cy="48" r="2.5" fill="#fff"/>
    <ellipse cx="50" cy="64" rx="4" ry="3" fill="#CE93D8"/>
    <path d="M32 66 Q50 74 68 66" fill="none" stroke="#9575CD" stroke-width="1.2"/>
  </svg>`,
];

// 主持人专用头像
const MODERATOR_AVATAR = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="48" fill="#E8E0D5"/>
  <ellipse cx="50" cy="42" rx="22" ry="20" fill="#6D5D4B"/>
  <circle cx="39" cy="52" r="7" fill="#3E2C1C"/>
  <circle cx="61" cy="52" r="7" fill="#3E2C1C"/>
  <circle cx="41" cy="50" r="2.5" fill="#fff"/>
  <circle cx="63" cy="50" r="2.5" fill="#fff"/>
  <ellipse cx="50" cy="63" rx="4.5" ry="3" fill="#BCAAA4"/>
  <path d="M30 45 Q50 38 70 45" fill="none" stroke="#5D4037" stroke-width="2"/>
  <path d="M33 65 Q50 73 67 65" fill="none" stroke="#8D6E63" stroke-width="1.5"/>
  <rect x="37" y="28" width="26" height="4" rx="2" fill="#5D4037"/>
</svg>`;

/**
 * 根据名字 hash 获取一个固定的头像
 */
export function getAvatar(name) {
  if (name === '主持人') return MODERATOR_AVATAR;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATARS[Math.abs(hash) % AVATARS.length];
}

export { MODERATOR_AVATAR, AVATARS };
