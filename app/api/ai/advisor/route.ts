import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [], businessContext, customApiKey, mode = 'mentor_geral' } = body;

    const apiKey =
      customApiKey?.trim() ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      'AQ.Ab8RN6Kwv0wnC_oPuNqVYcI6TFSuuP59b_lS_BOgNQ1J097ULQ';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Chave de API do Gemini não configurada.' },
        { status: 400 }
      );
    }

    // Definição da persona de acordo com o modo selecionado
    let personaPrompt = '';
    switch (mode) {
      case 'cfo':
        personaPrompt = `Você é o Diretor Financeiro (CFO) do negócio. Seu foco é fluxo de caixa, precificação lucrativa, aumento do MRR, eliminação de risco de cliente único e metas financeiras reais. Fale de forma objetiva, pé no chão e focada em números.`;
        break;
      case 'comercial':
        personaPrompt = `Você é o Diretor Comercial & Especialista em Vendas. Seu foco é fechar novos contratos, scripts de abordagem no WhatsApp/Instagram, estratégias de upsell para os clientes atuais e negociação rápida. Sempre entregue os textos prontos para copiar e mandar no WhatsApp.`;
        break;
      case 'tech_lead':
        personaPrompt = `Você é o Tech Lead & Gerente de Projetos. Seu foco é produtividade no Kanban, organização dos prazos, stack moderna (React, Next.js, Tailwind, TypeScript) e velocidade de entrega com código limpo.`;
        break;
      default:
        personaPrompt = `Você é o Mentor e Parceiro Estratégico de Negócios do desenvolvedor dono desta empresa digital. Você é experiente, direto ao ponto e ajuda a tomar as melhores decisões de crescimento.`;
        break;
    }

    const systemPrompt = `${personaPrompt}

DADOS REAIS DO NEGÓCIO ATUAL DO USUÁRIO:
--------------------------------------------------
• FATURAMENTO TOTAL CADASTRADO: R$ ${businessContext?.totalValue?.toFixed(2) || '0,00'}
• TOTAL JÁ RECEBIDO: R$ ${businessContext?.receivedValue?.toFixed(2) || '0,00'}
• TOTAL A RECEBER / PREVISTO: R$ ${businessContext?.pendingValue?.toFixed(2) || '0,00'}
• MRR ATUAL (Receita Recorrente Mensal): R$ ${businessContext?.mrr?.toFixed(2) || '0,00'} /mês
• ARR PROJETADO (MRR anualizado x 12): R$ ${((businessContext?.mrr || 0) * 12).toFixed(2)} /ano

CLIENTES E CASOS DE SUCESSO:
${(businessContext?.clients || [])
  .map(
    (c: any) =>
      `• ${c.name} (${c.category === 'comercial' ? 'Cliente Pago Recorrente' : c.category === 'portfolio' ? 'Portfólio / Case Desenvolvido' : 'Projeto Pessoal'}) - ${c.notes || 'Sem observações'}${
        c.siteUrl ? ` | Site: ${c.siteUrl}` : ''
      }${c.githubUrl ? ` | GitHub: ${c.githubUrl}` : ''}`
  )
  .join('\n') || 'Nenhum cliente cadastrado ainda.'}

QUADRO KANBAN DE TAREFAS & DEMANDAS:
${(businessContext?.tasks || [])
  .map(
    (t: any) =>
      `• [Status: ${t.status.toUpperCase()}] [Prioridade: ${t.priority}] ${t.title} (Cliente: ${t.client})`
  )
  .join('\n') || 'Nenhuma tarefa pendente no momento.'}

BIBLIOTECA DE PROMPTS & COMPONENTES:
${(businessContext?.snippets || [])
  .map((s: any) => `• ${s.title} [${s.category}]`)
  .join('\n') || 'Nenhum recurso cadastrado.'}
--------------------------------------------------

TOM DE VOZ E DIRETRIZES DE RESPOSTA:
1. Converse de forma 100% natural, humana, direta e profissional em Português do Brasil. Fale como um sócio experiente conversando no dia a dia.
2. Evite formalismos robóticos, introduções genéricas ("Com certeza! Segue abaixo uma análise detalhada") ou enrolação. Vá direto à resposta.
3. Cite nominalmente os clientes reais (XK Eventos, Said Climatização, Odonto Braga) para dar soluções tangíveis.
4. Quando sugerir uma abordagem para clientes, forneça o texto exato pronto para enviar no WhatsApp.`;

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nReconheça os dados da minha empresa.` }],
      },
      {
        role: 'model',
        parts: [{ text: 'Estou com todo o raio-x da sua empresa carregado. Vamos acelerar seus resultados.' }],
      },
    ];

    if (Array.isArray(history)) {
      for (const h of history) {
        if (h.role && h.text) {
          contents.push({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.text }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    // Modelos candidatos com fallback automático
    const candidateModels = [
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.7-flash',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
    ];

    let lastError = '';

    for (const model of candidateModels) {
      try {
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.7,
              topP: 0.95,
              maxOutputTokens: 2048,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) {
            return NextResponse.json({ reply: replyText });
          }
        } else {
          lastError = await response.text();
          console.warn(`Tentativa com ${model} retornou status ${response.status}. Tentando próximo modelo...`);
        }
      } catch (err: any) {
        lastError = err.message;
      }
    }

    console.error('Todos os modelos Gemini falharam. Último erro:', lastError);
    return NextResponse.json(
      { error: `Erro na API do Gemini: ${lastError}` },
      { status: 503 }
    );
  } catch (error: any) {
    console.error('Erro na rota /api/ai/advisor:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno no servidor de IA.' },
      { status: 500 }
    );
  }
}
