// Helper centralizado para chamadas à API.
// Antes, cada componente repetia 'http://localhost:3001' e o header Authorization.
// Aqui ficam: base URL, injeção automática do token, tratamento de 401 (logout)
// e parse de erro consistente.

// URL base da API.
// - Em produção (Vercel): VITE_API_URL = "" (vazio) → fetches usam path relativo
//   (/api/...) e a Vercel roteia internamente pra função serverless. Same-origin,
//   sem CORS issue, sem domínio hardcoded.
// - Em dev local: fallback para localhost:3001 onde o backend Express roda.
export const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

// Lê o token mais recente do localStorage a cada chamada (em vez de fechar sobre
// um valor antigo). Isso garante que após login, requisições já usam o novo token.
function getToken(): string | null {
  return localStorage.getItem('token')
}

// Tipo do erro lançado pelo apiFetch — permite ao caller mostrar mensagem amigável
export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message); this.status = status
  }
}

// Wrapper único para todas as chamadas. Retorna o JSON parsed ou lança ApiError.
// Em 401, limpa localStorage e força reload para a tela de login (evita zumbis).
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch {
    // Falha de rede (backend caído, sem internet)
    throw new ApiError('Não foi possível conectar ao servidor', 0)
  }

  // 401 = token inválido/expirado → desloga o usuário automaticamente
  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.reload()
    throw new ApiError('Sessão expirada', 401)
  }

  // Tenta parsear JSON; respostas vazias (204) viram null
  const text = await res.text()
  const data = text ? JSON.parse(text) : null

  if (!res.ok) {
    throw new ApiError(data?.error || `Erro ${res.status}`, res.status)
  }
  return data as T
}
