import { supabase } from "@/integrations/supabase/client";

export type Colaborador = {
  id: string;
  matricula: string;
  nome: string;
  setor_padrao_id: string | null;
  turno: string | null;
  horario_entrada: string | null;
  horario_saida: string | null;
};

export type Setor = { id: string; nome: string };
export type TarefaPadrao = {
  id: string;
  setor_id: string;
  nome: string;
  subtarefa: string | null;
  tempo_medio_minutos: number;
  tempo_por_peca_segundos: number | null;
};

export type Jornada = {
  id: string;
  colaborador_id: string;
  data: string;
  inicio: string;
  fim: string | null;
  status: string;
  turno: string | null;
};

export type Ciclo = {
  id: string;
  jornada_id: string;
  colaborador_id: string;
  setor_id: string | null;
  tarefa_padrao_id: string | null;
  nome_tarefa: string;
  subtarefa: string | null;
  quantidade_pecas: number | null;
  tempo_estimado_minutos: number | null;
  inicio: string;
  fim: string | null;
  duracao_real_minutos: number | null;
  desvio_minutos: number | null;
  tipo: string;
  status: string;
  observacao: string | null;
  motivo_externo: string | null;
};

export type Pausa = {
  id: string;
  jornada_id: string;
  colaborador_id: string;
  tipo: string;
  inicio: string;
  fim: string | null;
  duracao_minutos: number | null;
  justificativa: string | null;
  excedeu_limite: boolean | null;
};

export const PAUSA_LIMITES: Record<string, number> = {
  BANHEIRO: 8,
  AGUA: 5,
  ADMINISTRATIVO: 15,
  NECESSIDADE_PESSOAL: 10,
  OUTRO: 10,
};

export const PAUSA_LABELS: Record<string, string> = {
  BANHEIRO: "BANHEIRO",
  AGUA: "HIDRATAÇÃO / ÁGUA",
  ADMINISTRATIVO: "ADMINISTRATIVO",
  NECESSIDADE_PESSOAL: "NECESSIDADE PESSOAL",
  OUTRO: "OUTRO",
};

export async function loginPorMatricula(matricula: string): Promise<Colaborador | null> {
  const { data, error } = await supabase
    .from("colaboradores")
    .select("*")
    .eq("matricula", matricula)
    .eq("ativo", true)
    .maybeSingle();
  if (error) throw error;
  return data as Colaborador | null;
}

export async function getJornadaAbertaHoje(colaboradorId: string): Promise<Jornada | null> {
  const hoje = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("jornadas")
    .select("*")
    .eq("colaborador_id", colaboradorId)
    .eq("data", hoje)
    .eq("status", "ABERTA")
    .maybeSingle();
  return (data as Jornada) ?? null;
}

export async function iniciarJornada(c: Colaborador): Promise<Jornada> {
  const hoje = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("jornadas")
    .insert({
      colaborador_id: c.id,
      data: hoje,
      turno: c.turno,
      status: "ABERTA",
    })
    .select("*")
    .single();
  if (error) throw error;
  // Cria pontuação inicial
  await supabase.from("pontuacoes").insert({
    colaborador_id: c.id,
    jornada_id: data!.id,
    data: hoje,
    pontos_inicio: 1000,
    pontos_final: 1000,
    eventos: [],
  });
  return data as Jornada;
}

export async function getCicloAberto(jornadaId: string): Promise<Ciclo | null> {
  const { data } = await supabase
    .from("ciclos")
    .select("*")
    .eq("jornada_id", jornadaId)
    .eq("status", "ABERTO")
    .order("inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Ciclo) ?? null;
}

export async function getPausaAberta(jornadaId: string): Promise<Pausa | null> {
  const { data } = await supabase
    .from("pausas")
    .select("*")
    .eq("jornada_id", jornadaId)
    .is("fim", null)
    .order("inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Pausa) ?? null;
}

export async function listarSetores(): Promise<Setor[]> {
  const { data } = await supabase.from("setores").select("id,nome").order("nome");
  return (data as Setor[]) ?? [];
}

export async function listarTarefasPadrao(setorId: string): Promise<TarefaPadrao[]> {
  const { data } = await supabase
    .from("tarefas_padrao")
    .select("*")
    .eq("setor_id", setorId)
    .eq("ativo", true)
    .order("nome");
  return (data as TarefaPadrao[]) ?? [];
}

export async function iniciarCiclo(opts: {
  jornada: Jornada;
  setor: Setor;
  tarefa: TarefaPadrao | null;
  nomeTarefa: string;
  quantidadePecas: number | null;
  tempoEstimadoMin: number;
}): Promise<Ciclo> {
  const { data, error } = await supabase
    .from("ciclos")
    .insert({
      jornada_id: opts.jornada.id,
      colaborador_id: opts.jornada.colaborador_id,
      setor_id: opts.setor.id,
      tarefa_padrao_id: opts.tarefa?.id ?? null,
      nome_tarefa: opts.nomeTarefa,
      subtarefa: opts.tarefa?.subtarefa ?? null,
      quantidade_pecas: opts.quantidadePecas,
      tempo_estimado_minutos: opts.tempoEstimadoMin,
      tipo: "PRODUTIVO",
      status: "ABERTO",
      origem: "MANUAL",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Ciclo;
}

export async function encerrarCiclo(ciclo: Ciclo, opts?: {
  motivoExterno?: string;
  observacao?: string;
  forcarAuditoria?: boolean;
}): Promise<Ciclo> {
  const fim = new Date();
  const inicio = new Date(ciclo.inicio);
  const duracaoMin = Math.max(0, Math.round((fim.getTime() - inicio.getTime()) / 60000));
  const desvio = (ciclo.tempo_estimado_minutos ?? 0) > 0
    ? duracaoMin - (ciclo.tempo_estimado_minutos as number)
    : 0;

  const muitoRapido =
    !!ciclo.tempo_estimado_minutos &&
    duracaoMin < (ciclo.tempo_estimado_minutos as number) * 0.5;

  const status = opts?.forcarAuditoria || muitoRapido ? "AUDITORIA" : "ENCERRADO";

  const { data, error } = await supabase
    .from("ciclos")
    .update({
      fim: fim.toISOString(),
      duracao_real_minutos: duracaoMin,
      desvio_minutos: desvio,
      status,
      motivo_externo: opts?.motivoExterno ?? null,
      observacao: opts?.observacao ?? null,
      tipo: opts?.motivoExterno ? "MOTIVO_EXTERNO" : ciclo.tipo,
    })
    .eq("id", ciclo.id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Ciclo;
}

export async function iniciarPausa(opts: {
  jornada: Jornada;
  tipo: string;
  justificativa?: string;
}): Promise<Pausa> {
  const { data, error } = await supabase
    .from("pausas")
    .insert({
      jornada_id: opts.jornada.id,
      colaborador_id: opts.jornada.colaborador_id,
      tipo: opts.tipo,
      justificativa: opts.justificativa ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Pausa;
}

export async function encerrarPausa(p: Pausa): Promise<Pausa> {
  const fim = new Date();
  const dur = Math.max(0, Math.round((fim.getTime() - new Date(p.inicio).getTime()) / 60000));
  const limite = PAUSA_LIMITES[p.tipo] ?? 10;
  const excedeu = dur > limite;
  const { data, error } = await supabase
    .from("pausas")
    .update({
      fim: fim.toISOString(),
      duracao_minutos: dur,
      excedeu_limite: excedeu,
    })
    .eq("id", p.id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Pausa;
}

export async function registrarOcorrencia(opts: {
  colaboradorId: string;
  jornadaId: string;
  cicloId: string | null;
  tipo: string;
  descricao: string;
  responsavelExterno?: string;
}) {
  const { error } = await supabase.from("ocorrencias").insert({
    colaborador_id: opts.colaboradorId,
    jornada_id: opts.jornadaId,
    ciclo_id: opts.cicloId,
    tipo: opts.tipo,
    descricao: opts.descricao,
    responsavel_externo: opts.responsavelExterno ?? null,
  });
  if (error) throw error;
}

export async function encerrarJornada(j: Jornada): Promise<void> {
  // Encerra ciclo aberto, se houver
  const ciclo = await getCicloAberto(j.id);
  if (ciclo) {
    await encerrarCiclo(ciclo, { observacao: "Encerrado pelo fechamento de jornada" });
  }
  // Encerra pausa aberta, se houver
  const pausa = await getPausaAberta(j.id);
  if (pausa) {
    await encerrarPausa(pausa);
  }

  const fim = new Date();
  const total = Math.max(0, Math.round((fim.getTime() - new Date(j.inicio).getTime()) / 60000));

  // Soma produtivo
  const { data: ciclos } = await supabase
    .from("ciclos")
    .select("duracao_real_minutos,tipo,status")
    .eq("jornada_id", j.id);

  const produtivo = (ciclos ?? [])
    .filter((c: any) => c.tipo === "PRODUTIVO" && c.duracao_real_minutos)
    .reduce((s: number, c: any) => s + (c.duracao_real_minutos ?? 0), 0);

  const { data: pausas } = await supabase
    .from("pausas")
    .select("duracao_minutos")
    .eq("jornada_id", j.id);

  const totalPausa = (pausas ?? []).reduce(
    (s: number, p: any) => s + (p.duracao_minutos ?? 0),
    0,
  );

  const ocioso = Math.max(0, total - produtivo - totalPausa);

  await supabase
    .from("jornadas")
    .update({
      fim: fim.toISOString(),
      total_minutos: total,
      total_produtivo_minutos: produtivo,
      total_ocioso_minutos: ocioso,
      status: "ENCERRADA",
    })
    .eq("id", j.id);
}

export async function listarUltimosCiclos(jornadaId: string, limit = 5): Promise<Ciclo[]> {
  const { data } = await supabase
    .from("ciclos")
    .select("*")
    .eq("jornada_id", jornadaId)
    .order("inicio", { ascending: false })
    .limit(limit);
  return (data as Ciclo[]) ?? [];
}

export async function getPontuacao(jornadaId: string): Promise<number> {
  const { data } = await supabase
    .from("pontuacoes")
    .select("pontos_final")
    .eq("jornada_id", jornadaId)
    .maybeSingle();
  return (data?.pontos_final as number | undefined) ?? 1000;
}
