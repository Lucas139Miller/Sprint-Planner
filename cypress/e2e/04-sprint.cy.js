// ============================================================================
// E2E 04 — Criar sprint e mover historia para o sprint (US4 + US5)
// ============================================================================
// Verifica o planejamento do sprint: criar um sprint com nome (US4) e, no
// backlog, mover uma historia para esse sprint (US5). E o passo que o time de
// Scrum faz no inicio de cada ciclo: montar o que vai entrar no sprint.

describe('US4/US5 - Sprint e mover historia', () => {
  const HISTORIA = 'Cadastro de cliente'
  const SPRINT = 'Sprint de Maio'

  // Arrange comum: usuario + projeto novos, ja dentro do workspace (tab Backlog).
  beforeEach(() => {
    const carimbo = Date.now()
    cy.registrar({
      username: `po_${carimbo}`,
      email: `po_${carimbo}@teste.com`,
      password: 'senha123',
    })
    cy.contains('button', '+ Novo Projeto').click()
    cy.get('input[placeholder="Ex: Loja Online"]').type('Projeto Sprint')
    cy.get('textarea[placeholder="Ex: E-commerce de roupas com pagamento online"]')
      .type('Projeto para testar sprints')
    cy.contains('button', 'Criar sem IA').click()
    cy.contains('Projeto Sprint').click()
    cy.contains('Backlog do Produto').should('be.visible')
  })

  it('cria um sprint na tab Sprints', () => {
    // Verifica o caminho basico do US4: abrir o formulario de sprint, dar um
    // nome e ver o sprint listado.

    // Act: vai para a tab Sprints, abre o formulario e cria o sprint
    cy.contains('button', 'Sprints').click()
    cy.contains('button', '+ Novo Sprint').click()
    cy.get('input[placeholder="Sprint 1"]').type(SPRINT)
    cy.contains('button', 'Criar').click()

    // Assert: o sprint recem-criado aparece na lista de sprints
    cy.contains(SPRINT).should('be.visible')
  })

  it('move uma historia do backlog para o sprint criado', () => {
    // Verifica o US5 ponta a ponta: ter uma historia no backlog, criar um
    // sprint, e mover a historia pra ele pelo seletor do backlog. A prova de que
    // moveu: a historia some da visao padrao do backlog (que so mostra o que NAO
    // esta em sprint) e reaparece quando ligamos "Mostrar historias em sprints".

    // Arrange: cria a historia no backlog
    cy.contains('button', '+ Nova História').click()
    cy.get('input[placeholder*="Como usuário, quero fazer login"]').type(HISTORIA)
    cy.contains('button', 'Criar').click()
    cy.contains(HISTORIA).should('be.visible')

    // Arrange: cria o sprint na tab Sprints e volta para o Backlog
    cy.contains('button', 'Sprints').click()
    cy.contains('button', '+ Novo Sprint').click()
    cy.get('input[placeholder="Sprint 1"]').type(SPRINT)
    cy.contains('button', 'Criar').click()
    cy.contains(SPRINT).should('be.visible')
    cy.contains('button', 'Backlog').click()

    // Act: no card da historia, escolhe o sprint no seletor "Mover para sprint"
    // (helper que acha a opcao do sprint pelo nome e seleciona).
    cy.moverHistoriaParaSprint(SPRINT)

    // Assert (parte 1): a historia saiu da visao padrao do backlog
    cy.contains(HISTORIA).should('not.exist')

    // Assert (parte 2): ligando "Mostrar historias em sprints", ela reaparece
    // (continua existindo, agora dentro do sprint).
    cy.contains('label', 'Mostrar histórias em sprints').find('input').check()
    cy.contains(HISTORIA).should('be.visible')
  })
})
