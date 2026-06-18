// ============================================================================
// COMANDOS CUSTOMIZADOS DO CYPRESS (helpers reutilizaveis, em PT-BR)
// ============================================================================
// Aqui ficam acoes que se repetem em varios testes. Em vez de copiar/colar o
// mesmo "preenche email, preenche senha, clica" em cada arquivo, criamos um
// comando com nome claro (ex: cy.registrar(...)). Isso e a aplicacao da ideia
// de FIXTURE/HELPER do Cap. 8: o setup repetido fica num lugar so, e cada
// teste fica curto e focado no comportamento que ele verifica.

// ----------------------------------------------------------------------------
// cy.registrar(usuario) — cria uma conta nova pela tela de Registro.
// ----------------------------------------------------------------------------
// Como o banco e FAKE e zera a cada vez que o backend sobe, geramos um email
// unico (com Date.now()) pra nao esbarrar na regra de email UNICO entre testes.
Cypress.Commands.add('registrar', (usuario) => {
  cy.visit('/')                                  // abre o app (cai na tela de Login)
  cy.contains('button', 'Criar conta').click()   // troca para a tela de Registro
  cy.get('input[placeholder="Nome de usuário"]').type(usuario.username)
  cy.get('input[placeholder="Email"]').type(usuario.email)
  cy.get('input[placeholder="Senha"]').type(usuario.password)
  cy.contains('button', 'Criar Conta').click()
})

// ----------------------------------------------------------------------------
// cy.usuarioNovo() — devolve um objeto de usuario com dados unicos.
// ----------------------------------------------------------------------------
// Garante o principio "Independent" do FIRST: cada teste cria o proprio usuario
// e nao depende de dados deixados por outro teste.
Cypress.Commands.add('usuarioNovo', () => {
  const carimbo = Date.now()
  return cy.wrap({
    username: `user_${carimbo}`,
    email: `user_${carimbo}@teste.com`,
    password: 'senha123',
  })
})

// ----------------------------------------------------------------------------
// cy.moverHistoriaParaSprint(nomeDoSprint) — usa o seletor do backlog.
// ----------------------------------------------------------------------------
// No backlog, cada historia tem um <select> "Mover para sprint". O texto da
// opcao do sprint vem com emoji e espacos (ex: "🏃 Sprint de Maio "), o que
// dificulta casar pelo texto exato. Entao achamos a opcao que CONTEM o nome do
// sprint, lemos o "value" dela (o id) e selecionamos por value. Fica robusto e
// continua simples de explicar: "selecione a opcao desse sprint".
Cypress.Commands.add('moverHistoriaParaSprint', (nomeDoSprint) => {
  cy.get('select[title="Mover para sprint"]').first().within(() => {
    cy.contains('option', nomeDoSprint)
      .invoke('attr', 'value')
      .then((value) => {
        cy.root().select(value)
      })
  })
})

// ----------------------------------------------------------------------------
// cy.arrastarCard(textoDoCard, tituloDaColunaDestino) — move um card no Kanban.
// ----------------------------------------------------------------------------
// O board usa drag & drop nativo do HTML5. O Cypress nao tem um ".drag()"
// pronto pra isso, entao disparamos manualmente os 3 eventos que o navegador
// emite numa arrastada real: dragstart (no card), dragover e drop (na coluna).
// Encapsular isso aqui deixa o TESTE limpo: la ele so diz "arraste X pra Y".
Cypress.Commands.add('arrastarCard', (textoDoCard, tituloDaColunaDestino) => {
  // dataTransfer e o "porta-objetos" que o HTML5 usa durante a arrastada.
  const dataTransfer = new DataTransfer()

  // 1) Pega o card (pelo texto do titulo) e dispara o inicio da arrastada.
  cy.contains('[draggable="true"]', textoDoCard)
    .trigger('dragstart', { dataTransfer })

  // 2) Acha a COLUNA destino pelo titulo (ex: "Em andamento") e sobe ate o
  //    container da coluna (a div que tem o onDrop). Dispara dragover + drop.
  cy.contains('h3', tituloDaColunaDestino)
    .parents('div.rounded-lg')
    .first()
    .trigger('dragover', { dataTransfer })
    .trigger('drop', { dataTransfer })
})
