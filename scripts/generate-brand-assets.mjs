import sharp from 'sharp';

const fullIcon = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#F7F7FB"/>
  <path d="M0 0h1024v280L0 610z" fill="#FF5A5F"/>
  <path d="M1024 1024H0V784l1024-338z" fill="#00A98F"/>
  <path d="M0 610l1024-330v166L0 784z" fill="#FFD166"/>
  <rect x="202" y="202" width="620" height="620" rx="128" fill="#202027"/>
  <g fill="#FFFFFF">
    <rect x="324" y="476" width="376" height="72" rx="36"/>
    <rect x="278" y="396" width="74" height="232" rx="28"/>
    <rect x="216" y="430" width="68" height="164" rx="25"/>
    <rect x="672" y="396" width="74" height="232" rx="28"/>
    <rect x="740" y="430" width="68" height="164" rx="25"/>
  </g>
  <path d="M690 290l17 45 45 17-45 17-17 45-17-45-45-17 45-17z" fill="#FFD166"/>
</svg>`;

const adaptiveForeground = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect x="232" y="232" width="560" height="560" rx="124" fill="#202027"/>
  <g fill="#FFFFFF">
    <rect x="350" y="482" width="324" height="60" rx="30"/>
    <rect x="306" y="418" width="66" height="188" rx="24"/>
    <rect x="256" y="446" width="56" height="132" rx="21"/>
    <rect x="652" y="418" width="66" height="188" rx="24"/>
    <rect x="712" y="446" width="56" height="132" rx="21"/>
  </g>
  <path d="M682 324l14 36 36 14-36 14-14 36-14-36-36-14 36-14z" fill="#FFD166"/>
</svg>`;

const monochromeForeground = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <g fill="#000000">
    <rect x="350" y="482" width="324" height="60" rx="30"/>
    <rect x="306" y="418" width="66" height="188" rx="24"/>
    <rect x="256" y="446" width="56" height="132" rx="21"/>
    <rect x="652" y="418" width="66" height="188" rx="24"/>
    <rect x="712" y="446" width="56" height="132" rx="21"/>
  </g>
</svg>`;

await Promise.all([
  sharp(Buffer.from(fullIcon)).png().toFile('assets/icon-dudu.png'),
  sharp(Buffer.from(fullIcon)).resize(96, 96).png().toFile('assets/favicon-dudu.png'),
  sharp(Buffer.from(adaptiveForeground)).png().toFile('assets/android-icon-foreground-dudu.png'),
  sharp(Buffer.from(monochromeForeground)).png().toFile('assets/android-icon-monochrome-dudu.png'),
]);
