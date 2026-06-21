// ============================================================================
// E2E 01 — Registro e Login (US1)
// ============================================================================
// Verifica o fluxo de entrada do app: criar uma conta nova e, depois, conseguir
// entrar com ela. E o "caminho feliz" da autenticacao, do ponto de vista do
// usuario real (digitando na tela, nao chamando a API direto).
//
// Padrao AAA (Arrange / Act / Assert) em cada teste, com comentarios em PT-BR.

describe('US1 - Registro e Login', () => {
  it('registra uma conta nova e cai na tela de projetos', () => {
    // Verifica que, ao criar uma conta valida, o usuario e levado para a area
    // logada (a tela "Meus Projetos"), ou seja, o registro JA loga.

    // Arrange: dados unicos para nao colidir com o email UNICO do banco fake
    const carimbo = Date.now()
    const usuario = {
      username: `joao_${carimbo}`,
      email: `joao_${carimbo}@teste.com`,
      password: 'senha123',
    }

    // Act: abre o app, vai para "Criar conta" e preenche o formulario
    cy.visit('/')
    cy.contains('button', 'Criar conta').click()
    cy.get('input[placeholder="Nome de usuário"]').type(usuario.username)
    cy.get('input[placeholder="Email"]').type(usuario.email)
    cy.get('input[placeholder="Senha"]').type(usuario.password)
    cy.contains('button', 'Criar Conta').click()

    // Assert: a tela logada mostra o titulo "Meus Projetos"
    cy.contains('Meus Projetos').should('be.visible')
  })

  it('faz login com uma conta que acabou de ser criada', () => {
    // Verifica o login propriamente dito: criamos a conta, saimos, e entramos
    // de novo digitando email e senha na tela de Login.

    // Arrange: cria a conta (que ja loga) e depois clica em "Sair"
    const carimbo = Date.now()
    const usuario = {
      username: `maria_${carimbo}`,
      email: `maria_${carimbo}@teste.com`,
      password: 'senha123',
    }
    cy.registrar(usuario)              // helper: cria a conta pela UI
    cy.contains('Meus Projetos').should('be.visible')
    cy.contains('button', 'Sair').click()   // volta para a tela de Login

    // Act: preenche email + senha e clica em "Entrar"
    cy.get('input[placeholder="Email"]').type(usuario.email)
    cy.get('input[placeholder="Senha"]').type(usuario.password)
    cy.contains('button', 'Entrar').click()

    // Assert: logou de novo -> a tela "Meus Projetos" aparece
    cy.contains('Meus Projetos').should('be.visible')
  })

  it('nao deixa entrar quando a senha esta errada', () => {
    // Verifica o "caminho triste": com senha errada o backend devolve 401 e o
    // usuario NAO entra. (Detalhe do app: em 401 o frontend limpa a sessao e
    // recarrega, entao o usuario simplesmente continua na tela de Login, sem
    // alcancar "Meus Projetos".)

    // Arrange: cria a conta e sai
    const carimbo = Date.now()
    const usuario = {
      username: `ana_${carimbo}`,
      email: `ana_${carimbo}@teste.com`,
      password: 'senha123',
    }
    cy.registrar(usuario)
    cy.contains('button', 'Sair').click()

    // Act: tenta logar com a senha ERRADA
    cy.get('input[placeholder="Email"]').type(usuario.email)
    cy.get('input[placeholder="Senha"]').type('senha-errada')
    cy.contains('button', 'Entrar').click()

    // Assert: continua na tela de Login (botao "Entrar" visivel) e NAO entrou
    cy.contains('button', 'Entrar').should('be.visible')
    cy.contains('Meus Projetos').should('not.exist')
  })
})
