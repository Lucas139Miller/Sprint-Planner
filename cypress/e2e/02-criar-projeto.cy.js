// ============================================================================
// E2E 02 — Criar um projeto (US2)
// ============================================================================
// Verifica que um usuario logado consegue criar um projeto e ve-lo aparecer na
// sua lista "Meus Projetos". Usamos o botao "Criar sem IA" de proposito: o
// caminho com IA chamaria o Gemini (rede + credito), e o E2E precisa rodar
// offline e deterministico. O fluxo de criacao em si e o mesmo.

describe('US2 - Criar projeto', () => {
  // beforeEach = "Arrange" comum a todos os testes deste arquivo: cada teste
  // comeca com um usuario novo e ja logado. Isso isola os testes (FIRST:
  // Independent) e evita repetir o registro em cada it().
  beforeEach(() => {
    const carimbo = Date.now()
    cy.registrar({
      username: `dono_${carimbo}`,
      email: `dono_${carimbo}@teste.com`,
      password: 'senha123',
    })
    cy.contains('Meus Projetos').should('be.visible')
  })

  it('cria um projeto e ele aparece na lista de projetos', () => {
    // Verifica o caminho feliz: preencher nome + descricao, salvar, e ver o
    // card do projeto recem-criado na tela "Meus Projetos".

    // Arrange: abre o formulario de novo projeto
    cy.contains('button', '+ Novo Projeto').click()
    cy.contains('Novo Projeto').should('be.visible')

    // Act: preenche nome + descricao e cria SEM IA (offline)
    cy.get('input[placeholder="Ex: Loja Online"]').type('Loja do Ze')
    cy.get('textarea[placeholder="Ex: E-commerce de roupas com pagamento online"]')
      .type('E-commerce de camisetas')
    cy.contains('button', 'Criar sem IA').click()

    // Assert: voltou para a lista e o card do novo projeto esta visivel
    cy.contains('Meus Projetos').should('be.visible')
    cy.contains('Loja do Ze').should('be.visible')
  })

  it('mostra o papel "PO" no projeto criado (quem cria vira Product Owner)', () => {
    // Verifica uma regra de negocio importante: quem CRIA o projeto entra como
    // PO (Product Owner). O card do projeto exibe esse papel.

    // Arrange + Act: cria um projeto sem IA
    cy.contains('button', '+ Novo Projeto').click()
    cy.get('input[placeholder="Ex: Loja Online"]').type('App de Tarefas')
    cy.get('textarea[placeholder="Ex: E-commerce de roupas com pagamento online"]')
      .type('Gerenciador de tarefas simples')
    cy.contains('button', 'Criar sem IA').click()

    // Assert: o card do projeto mostra a etiqueta de papel "PO"
    cy.contains('App de Tarefas').should('be.visible')
    cy.contains('PO').should('be.visible')
  })
})
