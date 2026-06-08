const COLORS = ['#c3f400', '#22C55E', '#60A5FA', '#F472B6', '#A78BFA', '#F59E0B']

function hashName(name: string): number {
  let h = 0
  for (const c of name) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

interface PartyAvatarProps { name: string; size?: number }

export function PartyAvatar({ name, size = 32 }: PartyAvatarProps) {
  const initial = name.trim()[0]?.toUpperCase() ?? '?'
  const bg = COLORS[hashName(name) % COLORS.length]
  return (
    <div
      title={name}
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: bg,
        color: '#0A0A0A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700,
        fontSize: size * 0.4,
        flexShrink: 0,
        userSelect: 'none',
        fontFamily: "'Hanken Grotesk', sans-serif",
      }}
    >
      {initial}
    </div>
  )
}
