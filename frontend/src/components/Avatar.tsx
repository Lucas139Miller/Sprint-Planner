// Avatar circular com inicial colorida (estilo GitHub/Linear).
// Cor é determinística baseada no username - mesmo usuário sempre tem mesma cor.

interface AvatarProps {
  username: string | null | undefined
  size?: 'xs' | 'sm' | 'md' | 'lg'
  title?: string
}

// Paleta fixa de 8 cores - cada username é mapeado para uma delas via hash
// Gera variedade visual sem cair em cores estranhas (rosa neon, etc.)
const COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500',
  'bg-teal-500', 'bg-blue-500', 'bg-indigo-500', 'bg-purple-500',
]

// Hash simples (djb2) - estável entre renders, sem colisões para ~50 users
function hash(str: string): number {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) & 0xffffffff
  return Math.abs(h)
}

const SIZES = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
}

export default function Avatar({ username, size = 'sm', title }: AvatarProps) {
  if (!username) {
    return (
      <span className={`${SIZES[size]} rounded-full bg-gray-200 inline-flex items-center justify-center text-gray-400`}
        title={title || 'Sem responsável'}>?</span>
    )
  }
  const initial = username.charAt(0).toUpperCase()
  const color = COLORS[hash(username) % COLORS.length]
  return (
    <span className={`${SIZES[size]} ${color} text-white rounded-full inline-flex items-center justify-center font-semibold flex-shrink-0`}
      title={title || username}>
      {initial}
    </span>
  )
}
