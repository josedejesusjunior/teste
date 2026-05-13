export interface Part {
  id: string;
  name: string;
  partNumber: string;
  price: number;
  stock: number;
  category: 'Fusor' | 'Consumível' | 'Placa' | 'Mecânica';
  compatibleModels: string[];
  videoUrl?: string;
}

const MOCK_PARTS: Part[] = [
  {
    id: '1',
    name: 'Kit de Fusão 110V Lexmark MS510/MS610',
    partNumber: '40X8016',
    price: 1250.00,
    stock: 5,
    category: 'Fusor',
    compatibleModels: ['MS510', 'MS610', 'MX510', 'MX610'],
    videoUrl: 'https://www.youtube.com/watch?v=9LhO1k3P7mY'
  },
  {
    id: '2',
    name: 'Unidade de Imagem (UI) 60k Retorno',
    partNumber: '500Z',
    price: 380.00,
    stock: 12,
    category: 'Consumível',
    compatibleModels: ['MS310', 'MS410', 'MS510', 'MS610']
  },
  {
    id: '3',
    name: 'Rolete de Tração (Pick Roller) MPF',
    partNumber: '40X8297',
    price: 45.00,
    stock: 50,
    category: 'Mecânica',
    compatibleModels: ['MS Series', 'MX Series']
  },
  {
    id: '4',
    name: 'Toner Preto de Alta Capacidade 20k',
    partNumber: '60F4H00',
    price: 890.00,
    stock: 8,
    category: 'Consumível',
    compatibleModels: ['MS510', 'MS610']
  },
  {
    id: '5',
    name: 'Placa Principal (System Board) MS510',
    partNumber: '41X0345',
    price: 1540.00,
    stock: 2,
    category: 'Placa',
    compatibleModels: ['MS510']
  }
];

export const partsService = {
  getParts: async (query?: string, categories?: string[]): Promise<Part[]> => {
    // Simulate API delay
    await new Promise(r => setTimeout(r, 800));
    
    let results = MOCK_PARTS;

    if (categories && categories.length > 0) {
      results = results.filter(p => categories.includes(p.category));
    }

    if (query) {
      const lowerQuery = query.toLowerCase().trim();
      results = results.filter(p => 
        p.name.toLowerCase().includes(lowerQuery) || 
        p.partNumber.toLowerCase().includes(lowerQuery) ||
        p.compatibleModels.some(m => m.toLowerCase().includes(lowerQuery))
      );

      // Prioritize exact Part Number matches
      results = [...results].sort((a, b) => {
        const aExact = a.partNumber.toLowerCase() === lowerQuery;
        const bExact = b.partNumber.toLowerCase() === lowerQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      });
    }
    
    return results;
  }
};
