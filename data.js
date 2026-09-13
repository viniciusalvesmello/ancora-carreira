// Conteúdo do Teste Âncoras de Carreira (Edgar Schein), reproduzido fielmente
// a partir do PDF do CEFET-MG/DCSA:
// https://www.dcsa.cefetmg.br/wp-content/uploads/sites/35/2018/09/Teste-ancora-de-carreira.pdf
// Cruzado item a item com a planilha de referência do usuário. Ver AGENTS.md
// sobre a convenção de fidelidade textual deste projeto (diferente de outros
// projetos da mesma família, aqui o texto do instrumento não é parafraseado).

const ANCHOR_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

const CAREER_ANCHORS = {
  A: {
    letter: 'A',
    name: 'Competência técnico-funcional',
    summary: 'Quer ser cada vez mais especialista na sua área de atuação.',
    description:
      'Pessoas tecnicamente ancoradas comprometem-se com uma carreira de especialização. Elas ficam motivadas quando são especialistas em um determinado assunto, buscam trabalhos desafiadores, querem testar o conhecimento e a habilidade que possuem em sua área de atuação. São pessoas que não visam altos cargos administrativos (essas normalmente são mais generalistas) e sim cargos de especialista em uma determinada área.',
  },
  B: {
    letter: 'B',
    name: 'Competência administrativa geral',
    summary: 'Busca liderar e assumir os mais altos níveis de responsabilidade.',
    description:
      'Quem tem como âncora de carreira a competência administrativa geral busca, ao longo de sua vida profissional, atingir os mais altos níveis de responsabilidade na organização. São pessoas que visam a liderança e têm como motivação atingir o topo da hierarquia corporativa. Para elas, a especialização é uma armadilha: entendem a importância de conhecer as áreas funcionais, mas não buscam se aprofundar tecnicamente, pois querem a função de gerência geral.',
  },
  C: {
    letter: 'C',
    name: 'Autonomia e independência',
    summary: 'Quer fazer as coisas do seu próprio jeito, com liberdade de decisão.',
    description:
      'Pessoas com essa âncora vão buscar, com o passar do tempo, uma carreira que possibilite maior independência, que permite impor suas próprias condições. A autonomia é inerente a qualquer ser humano, em níveis diferentes, mas quem possui fortemente essa âncora sente a necessidade de ser dono de seu próprio destino, fazer as coisas do seu jeito, e por isso vai organizar sua vida profissional em torno de trabalhos que lhe proporcionem mais escolha e poder de decisão.',
  },
  D: {
    letter: 'D',
    name: 'Segurança e estabilidade',
    summary: 'Valoriza previsibilidade, estabilidade e segurança financeira.',
    description:
      'Aqui se enquadram pessoas que precisam se sentir seguras no ambiente de trabalho. Elas buscam maior previsibilidade do futuro, querem "saber onde pisam". São atraídas por empregos em empresas que oferecem essa estabilidade, com bons planos de aposentadoria e boa reputação. É essa estabilidade, principalmente financeira, que vai guiar a carreira desses profissionais.',
  },
  E: {
    letter: 'E',
    name: 'Criatividade empreendedora',
    summary: 'Tem motivação pra criar e construir negócios próprios.',
    description:
      'Nessa âncora estão os profissionais com tino para a criação de novos negócios e organizações. Não são pessoas necessariamente com criatividade artística, mas sim com um espírito empreendedor, que querem estabelecer ou reestruturar negócios próprios. Possuem motivação para, desde cedo, iniciar empreendimentos para ganhar dinheiro. Vale ressaltar que o enfoque aqui não é a busca por autonomia e sim pela criação de negócios.',
  },
  F: {
    letter: 'F',
    name: 'Dedicação a uma causa',
    summary: 'Quer que o trabalho sirva a um valor ou causa maior.',
    description:
      'Pessoas com essa âncora são orientadas em sua carreira por valores que querem imprimir em seu trabalho. Elas se voltam para os valores e se dedicam a causas, mais do que aos seus talentos e competências. São profissionais que querem, de alguma forma, contribuir para um mundo melhor por meio de seu trabalho.',
  },
  G: {
    letter: 'G',
    name: 'Desafio puro',
    summary: 'Define sucesso como superar obstáculos cada vez mais difíceis.',
    description:
      'Nessa âncora se encaixam profissionais que definem sucesso como a superação de obstáculos impossíveis ou como a capacidade de solucionar problemas insolúveis. São pessoas que necessitam sentir que podem conquistar qualquer coisa. A busca por desafios permeia a carreira da maioria das pessoas, mas para quem é ancorado no desafio puro, é o que norteia a sua trajetória – todas as suas decisões profissionais vão sempre ser com o objetivo de superar desafios cada vez maiores.',
  },
  H: {
    letter: 'H',
    name: 'Estilo de vida',
    summary: 'Busca equilibrar carreira, família e vida pessoal.',
    description:
      'Muitas vezes interpretam essa âncora como sendo a de pessoas que não dão prioridade a sua carreira. Mas não se trata disso. A questão é que pessoas ancoradas pelo estilo de vida buscam encontrar uma forma de integrar todas as suas necessidades: individuais, de família e de carreira. Podem ser altamente motivadas pelo trabalho, mas entendem que ele deve se integrar a sua vida como um todo. São pessoas que querem, acima de tudo, flexibilidade. Por isso olham mais para a atitude da empresa do que para o programa de trabalho propriamente dito. A diferença para a âncora da autonomia é que elas se adaptam bem ao ambiente organizacional, com suas regras e restrições, mas querem ter opções mais flexíveis de trabalho.',
  },
};

// Texto das 40 afirmações, na ordem oficial do instrumento. O campo `anchor`
// de cada item é resolvido por ANCHOR_LETTERS[(number - 1) % 8] — cada âncora
// acaba com exatamente 5 itens (ex.: A = 1,9,17,25,33 · H = 8,16,24,32,40).
const QUESTION_TEXTS = [
  'Sonho em ser tão bom no que faço que minha opinião de especialista seja sempre solicitada.',
  'Me sinto mais realizado em meu trabalho quando sou capaz de integrar e gerenciar o trabalho dos outros.',
  'Sonho em ter uma carreira que me dê a liberdade de fazer o trabalho do meu jeito e no tempo por mim programado.',
  'Segurança e estabilidade são mais importantes para mim do que liberdade e autonomia.',
  'Estou sempre procurando ideias que me permitam iniciar meu próprio negócio.',
  'Sentirei sucesso na minha carreira se sentir que contribuí verdadeiramente para o bem-estar da sociedade.',
  'Sonho com uma carreira na qual eu possa solucionar problemas ou vencer em situações extremamente desafiadoras.',
  'Prefiro deixar meu emprego a ser colocado em um trabalho que comprometa minha capacidade de satisfazer meus interesses pessoais e familiares.',
  'Só me sentirei bem-sucedido em minha carreira se puder desenvolver minhas habilidades técnicas e funcionais até o mais alto nível de competência.',
  'Sonho em dirigir uma organização complexa e tomar decisões que afetem muitas pessoas.',
  'Me sinto mais realizado em meu trabalho quando tenho total liberdade de definir minhas próprias tarefas, horários e procedimentos.',
  'Prefiro manter minha atividade atual a aceitar outra tarefa que possa colocar em risco minha segurança na empresa.',
  'Montar meu próprio negócio é mais importante para mim do que atingir uma alta posição gerencial como funcionário.',
  'Me sinto mais realizado em minha carreira quando posso utilizar meus talentos a serviço dos outros.',
  'Me sinto realizado em minha carreira apenas quando enfrento e supero desafios extremamente difíceis.',
  'Sonho com uma carreira que me permita integrar minhas necessidades pessoais, familiares e de trabalho.',
  'Me tornar um gerente técnico em minha área de especialização é mais atraente para mim do que me tornar um gerente geral em alguma organização.',
  'Me sentirei bem-sucedido em minha carreira apenas quando me tornar um gerente geral em alguma organização.',
  'Me sentirei bem-sucedido em minha carreira apenas quando alcançar total autonomia e liberdade.',
  'Procuro trabalhos em organizações que me deem senso de segurança e estabilidade.',
  'Me sinto realizado em minha carreira quando sou capaz de construir alguma coisa que seja inteiramente resultado de minhas ideias e esforços.',
  'Utilizar minhas habilidades para tornar o mundo um lugar melhor para se viver e trabalhar é mais importante para mim do que alcançar uma posição gerencial de alto nível.',
  'Me sinto mais realizado em minha carreira quando soluciono problemas aparentemente insolúveis ou venço o que aparentemente era impossível de ser vencido.',
  'Me sinto bem-sucedido na vida apenas quando sou capaz de equilibrar minhas necessidades pessoais, familiares e de carreira.',
  'Prefiro sair da empresa onde estou a aceitar uma tarefa em esquema rotativo que me afaste da minha área de experiência.',
  'Me tornar um diretor geral é mais atraente para mim do que me tornar um diretor técnico em minha área de especialização.',
  'Para mim, poder fazer um trabalho do meu jeito, livre de regras e restrições, é mais importante do que segurança.',
  'Me sinto mais realizado em meu trabalho quando percebo que tenho total segurança financeira e estabilidade no trabalho.',
  'Me sinto bem-sucedido em meu trabalho apenas quando posso criar ou construir alguma coisa que seja inteiramente de minha autoria.',
  'Sonho em ter uma carreira que faça uma real contribuição à humanidade e à sociedade.',
  'Procuro oportunidades de trabalho que desafiem fortemente minhas habilidades para solucionar problemas.',
  'Equilibrar as exigências da minha vida pessoal e profissional é mais importante do que alcançar alta posição gerencial.',
  'Me sinto plenamente realizado em meu trabalho quando sou capaz de empregar minhas habilidades e talentos especiais.',
  'Prefiro sair da empresa onde estou a aceitar um cargo que me afaste do caminho da diretoria geral.',
  'Prefiro sair da empresa onde estou a aceitar um cargo que reduza minha autonomia e liberdade.',
  'Sonho em ter uma carreira que me dê senso de segurança e estabilidade.',
  'Sonho em iniciar e montar meu próprio negócio.',
  'Prefiro sair da empresa onde estou a aceitar um cargo que prejudique minha capacidade de ser útil aos outros.',
  'Trabalhar em problemas praticamente insolúveis para mim é mais importante do que alcançar uma posição gerencial de alto nível.',
  'Sempre procurei oportunidades de trabalho que minimizassem interferências com assuntos pessoais e familiares.',
];

const QUESTIONS = QUESTION_TEXTS.map((text, index) => {
  const number = index + 1;
  return {
    number,
    anchor: ANCHOR_LETTERS[(number - 1) % 8],
    text,
  };
});
