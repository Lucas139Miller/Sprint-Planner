// ============================================================================
// E2E 03 — Backlog e Board Kanban (US3 + US5 + US6)
// ============================================================================
// Verifica o coracao do app: criar uma historia no backlog, leva-la para um
// sprint e mover o card pelas colunas do Kanban (A fazer -> Em andamento ->
// Concluido). E o fluxo que o time vai apresentar como "o usuario trabalhando
// de verdade no quadro".
//
// Observacao tecnica (pra explicar pro professor): o quadro usa drag & drop
// nativo do HTML5. O Cypress nao tem um ".drag()" pronto, entao criamos o
// helper cy.arrastarCard (em commands.js) que dispara os eventos dragstart /
// dragover / drop, exatamente como o navegador faz numa arrastada real.

describe('US3/US5/US6 - Backlog e Board Kanban', () => {
  const HISTORIA = 'Tela de login'

  // Arrange comum: usuario novo + projeto novo, ja dentro do workspace do
  // projeto (na tab Backlog). Assim cada it() comeca de um estado limpo.
  beforeEach(() => {
    const carimbo = Date.now()
    cy.registrar({
      username: `dev_${carimbo}`,
      email: `dev_${carimbo}@teste.com`,
      password: 'senha123',
    })
    // cria o projeto (sem IA = offline)
    cy.contains('button', '+ Novo Projeto').click()
    cy.get('input[placeholder="Ex: Loja Online"]').type('Projeto Kanban')
    cy.get('textarea[placeholder="Ex: E-commerce de roupas com pagamento online"]')
      .type('Projeto para testar o board')
    cy.contains('button', 'Criar sem IA').click()
    // abre o projeto (clica no card) -> cai na tab Backlog do workspace
    cy.contains('Projeto Kanban').click()
    cy.contains('Backlog do Produto').should('be.visible')
  })

  it('cria uma historia no backlog', () => {
    // Verifica o caminho mais basico (US3): abrir o formulario, dar um titulo e
    // ver a historia listada no backlog.

    // Act: abre o formulario "Nova Historia", preenche o titulo e cria
    cy.contains('button', '+ Nova História').click()
    cy.get('input[placeholder*="Como usuário, quero fazer login"]').type(HISTORIA)
    cy.contains('button', 'Criar').click()

    // Assert: a historia aparece na lista do backlog
    cy.contains(HISTORIA).should('be.visible')
  })

  it('move a historia do backlog para o board e arrasta To Do -> In Progress -> Done', () => {
    // Verifica o fluxo completo do quadro: criar historia (US3), manda-la pra um
    // sprint (US5) e arrastar o card pelas colunas do Kanban (US6).

    // Arrange: cria a historia no backlog
    cy.contains('button', '+ Nova História').click()
    cy.get('input[placeholder*="Como usuário, quero fazer login"]').type(HISTORIA)
    cy.contains('button', 'Criar').click()
    cy.contains(HISTORIA).should('be.visible')

    // Arrange: cria um sprint na tab Sprints (assim o workspace ja conhece o
    // sprint e o Board consegue abrir o quadro dele).
    cy.contains('button', 'Sprints').click()
    cy.contains('button', '+ Novo Sprint').click()
    cy.get('input[placeholder="Sprint 1"]').type('Sprint 1')
    cy.contains('button', 'Criar').click()
    cy.contains('Sprint 1').should('be.visible')

    // Arrange: volta ao Backlog e move a historia para o sprint pelo seletor
    cy.contains('button', 'Backlog').click()
    cy.moverHistoriaParaSprint('Sprint 1')

    // Act (parte 1): vai para a tab "Board" pra ver o quadro Kanban
    cy.contains('button', 'Board').click()

    // O card comeca na coluna "A fazer" (status padrao to_do)
    cy.contains('h3', 'A fazer')
      .parents('div.rounded-lg').first()
      .should('contain', HISTORIA)

    // Act (parte 2): arrasta A fazer -> Em andamento -> Concluido
    cy.arrastarCard(HISTORIA, 'Em andamento')
    cy.contains('h3', 'Em andamento')
      .parents('div.rounded-lg').first()
      .should('contain', HISTORIA)

    cy.arrastarCard(HISTORIA, 'Concluído')

    // Assert: a historia terminou na coluna "Concluido"
    cy.contains('h3', 'Concluído')
      .parents('div.rounded-lg').first()
      .should('contain', HISTORIA)
  })
})
