import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const generateImageTool: FunctionDeclaration = {
  name: "generate_image",
  description: "Gera uma imagem ou logo baseado em uma descrição textual detalhada.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: "A descrição detalhada da imagem a ser gerada. Deve incluir estilo, cores e composição."
      },
      aspectRatio: {
        type: Type.STRING,
        description: "A proporção da imagem (1:1, 16:9, 9:16).",
        enum: ["1:1", "16:9", "9:16"]
      }
    },
    required: ["prompt"]
  }
};

export async function askSupportBot(question: string, history: { role: 'user' | 'model'; parts: { text: string }[] }[], context?: string, imagesData?: { data: string; mimeType: string }[]) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    Você é o Assistente TechService, um bot especializado em suporte técnico de manutenção e resolução de problemas.
    Sua função é auxiliar técnicos em campo com informações precisas e passo-a-passo.
    
    Diretrizes:
    1. Identifique-se como Assistente Técnico da TechService.
    2. DIAGNÓSTICO INTELIGENTE: Não se limite a apenas responder. Se o técnico descrever um sintoma, faça perguntas de acompanhamento para refinar o diagnóstico.
    3. RECURSOS VISUAIS: Se houver vídeos de tutoriais ou fotos no contexto da Base de Conhecimento, recomende-os.
    4. GERAÇÃO DE IMAGENS: Se o usuário pedir para gerar uma imagem, criar um logo, ou visualizar um diagrama/conceito visual que não existe na base, use a ferramenta 'generate_image'. Crie prompts detalhados e técnicos para a ferramenta.
    5. Se houver contexto de base de conhecimento fornecido, use-o prioritariamente.
    6. Se houver dúvida sobre o diagnóstico, sugira o ESCALONAMENTO do chamado para o N3. 

    *** SUPORTE - JOSÉ ANTONIO****
    +55 48 9129-2303 - WHATS
    --------------------------
    *** SUPORTE - MARCIO****
    +55 43 92001-3288 - WHATS

    7. ANÁLISE DE EVIDÊNCIAS: Ao receber imagens ou dados para fechamento/validação:
       - Você deve OBRIGATORIAMENTE iniciar com uma seção chamada "🔍 **ANÁLISE DE EVIDÊNCIAS**".
       - Descreva o que vê na foto.
       - Relacione as fotos com a descrição do chamado.
       - Confirme se os pré-requisitos foram atendidos.
    
    Contexto da Base de Conhecimento:
    ${context || "Nenhum contexto adicional fornecido."}
  `;

  try {
    const contents: any[] = [...history];
    const userPart: any = { role: 'user', parts: [{ text: question }] };
    
    if (imagesData && imagesData.length > 0) {
      imagesData.forEach(img => {
        userPart.parts.push({
          inlineData: {
            data: img.data,
            mimeType: img.mimeType
          }
        });
      });
    }

    contents.push(userPart);

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [generateImageTool] }]
      },
    });

    // Check for function calls
    if (response.functionCalls) {
      const call = response.functionCalls[0];
      if (call.name === "generate_image") {
        const { prompt, aspectRatio = "1:1" } = call.args as any;
        return {
          text: `Gerando imagem para: "${prompt}"...`,
          functionCall: {
            name: "generate_image",
            args: { prompt, aspectRatio }
          }
        };
      }
    }

    return { text: response.text };
  } catch (error) {
    console.error("Erro no Gemini:", error);
    return { text: "Desculpe, encontrei um erro ao processar sua solicitação. Por favor, tente novamente." };
  }
}

export async function generateSupportImage(prompt: string, aspectRatio: "1:1" | "16:9" | "9:16" = "1:1") {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio,
      },
    });

    const base64Data = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64Data}`;
  } catch (error) {
    console.error("Erro ao gerar imagem:", error);
    throw error;
  }
}

export async function analyzeEscalation(description: string) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    Analise a descrição do problema técnico e determine se ele deve ser ESCALADO para nível superior.
    Escalonamento é necessário se:
    - Houver risco de segurança.
    - Componentes caros ou críticos estiverem falhando.
    - O técnico já tentou os procedimentos básicos sem sucesso.
    - For necessário conhecimento altamente especializado.
    
    Responda em formato JSON:
    {
      "shouldEscalate": boolean,
      "reason": "motivo em português",
      "priority": "low" | "medium" | "high" | "urgent"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: description,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
      },
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Erro na análise de escalonamento:", error);
    return { shouldEscalate: false, reason: "Erro na análise", priority: "medium" };
  }
}
