export type PdiUpdate = {
  id: string;
  author: string;
  content: string;
  createdAt: string;
};

export type PdiHistory = {
  id: string;
  label: string;
  createdAt: string;
};

export type PdiChecklistItem = {
  id: string;
  content: string;
  completed: boolean;
  createdAt: string;
};

export type PdiNote = {
  id: string;
  author: string;
  section: "action" | "general";
  content: string;
  createdAt: string;
};

export type PdiTrack = {
  id: string;
  developmentPoint: string;
  objective: string;
  action: string;
  how: string;
  expectedResult: string;
  deadline: string;
  observation: string;
  progress: number;
  status: "Não iniciado" | "Em andamento" | "Concluído";
  updates: PdiUpdate[];
  history: PdiHistory[];
  checklist: PdiChecklistItem[];
  notes: PdiNote[];
};
