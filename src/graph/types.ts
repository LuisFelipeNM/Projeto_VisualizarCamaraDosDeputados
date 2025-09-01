export interface NodeData {
  id: string;
  nome: string;
  partido: string;
  strength: number;
  comunidade: number;
}

export interface LinkData {
  source: string;
  target: string;
  concordancia: number;
}