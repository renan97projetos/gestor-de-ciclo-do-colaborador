
-- Setores
CREATE TABLE public.setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Colaboradores
CREATE TABLE public.colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  setor_padrao_id UUID REFERENCES public.setores(id),
  turno TEXT CHECK (turno IN ('MANHA','TARDE','NOITE')),
  horario_entrada TIME,
  horario_saida TIME,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tarefas padrão
CREATE TABLE public.tarefas_padrao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  subtarefa TEXT,
  tempo_medio_minutos INTEGER NOT NULL DEFAULT 15,
  tempo_por_peca_segundos INTEGER,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Jornadas
CREATE TABLE public.jornadas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fim TIMESTAMPTZ,
  total_minutos INTEGER,
  total_produtivo_minutos INTEGER,
  total_ocioso_minutos INTEGER,
  pontuacao_final INTEGER,
  status TEXT NOT NULL DEFAULT 'ABERTA' CHECK (status IN ('ABERTA','ENCERRADA')),
  turno TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_jornadas_colab_data ON public.jornadas(colaborador_id, data);
CREATE INDEX idx_jornadas_status ON public.jornadas(status);

-- Ciclos
CREATE TABLE public.ciclos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id UUID NOT NULL REFERENCES public.jornadas(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  setor_id UUID REFERENCES public.setores(id),
  tarefa_padrao_id UUID REFERENCES public.tarefas_padrao(id),
  nome_tarefa TEXT NOT NULL,
  subtarefa TEXT,
  quantidade_pecas INTEGER,
  tempo_estimado_minutos INTEGER,
  inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fim TIMESTAMPTZ,
  duracao_real_minutos INTEGER,
  desvio_minutos INTEGER,
  tipo TEXT NOT NULL DEFAULT 'PRODUTIVO' CHECK (tipo IN ('PRODUTIVO','OCIOSO','PAUSA','AGUARDANDO','MOTIVO_EXTERNO')),
  status TEXT NOT NULL DEFAULT 'ABERTO' CHECK (status IN ('ABERTO','ENCERRADO','AUDITORIA')),
  observacao TEXT,
  motivo_externo TEXT,
  validado_supervisor BOOLEAN DEFAULT false,
  origem TEXT NOT NULL DEFAULT 'MANUAL',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_ciclos_jornada ON public.ciclos(jornada_id);
CREATE INDEX idx_ciclos_status ON public.ciclos(status);

-- Pausas
CREATE TABLE public.pausas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jornada_id UUID NOT NULL REFERENCES public.jornadas(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('BANHEIRO','AGUA','ADMINISTRATIVO','NECESSIDADE_PESSOAL','OUTRO')),
  inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  fim TIMESTAMPTZ,
  duracao_minutos INTEGER,
  justificativa TEXT,
  excedeu_limite BOOLEAN DEFAULT false,
  validado_supervisor BOOLEAN,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_pausas_jornada ON public.pausas(jornada_id);

-- Ocorrências
CREATE TABLE public.ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id),
  jornada_id UUID REFERENCES public.jornadas(id) ON DELETE CASCADE,
  ciclo_id UUID REFERENCES public.ciclos(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('ITEM_NAO_ENCONTRADO','FALHA_SISTEMA','AGUARDANDO_MATERIAL','LAYOUT_SETOR','COLAB_EXTERNO','OUTRO')),
  descricao TEXT NOT NULL,
  responsavel_externo TEXT,
  foto_url TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pontuações
CREATE TABLE public.pontuacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  jornada_id UUID NOT NULL REFERENCES public.jornadas(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  pontos_inicio INTEGER NOT NULL DEFAULT 1000,
  pontos_final INTEGER NOT NULL DEFAULT 1000,
  eventos JSONB NOT NULL DEFAULT '[]'::jsonb,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(jornada_id)
);

-- Regras de pontuação
CREATE TABLE public.regras_pontuacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento TEXT NOT NULL UNIQUE,
  pontos INTEGER NOT NULL,
  descricao TEXT
);

-- Alertas
CREATE TABLE public.alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  lido BOOLEAN NOT NULL DEFAULT false,
  lido_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Missões
CREATE TABLE public.missoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  meta_tipo TEXT NOT NULL,
  meta_valor NUMERIC NOT NULL,
  periodo TEXT NOT NULL CHECK (periodo IN ('DIARIA','SEMANAL','MENSAL')),
  pontos_bonus INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE public.missoes_colaborador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  missao_id UUID NOT NULL REFERENCES public.missoes(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
  periodo_referencia TEXT NOT NULL,
  progresso NUMERIC NOT NULL DEFAULT 0,
  concluida BOOLEAN NOT NULL DEFAULT false,
  pontos_ganhos INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: público (totem opera sem login Supabase nesta fase 1)
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas_padrao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jornadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ciclos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pausas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocorrencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pontuacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_pontuacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missoes_colaborador ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['setores','colaboradores','tarefas_padrao','jornadas','ciclos','pausas','ocorrencias','pontuacoes','regras_pontuacao','alertas','missoes','missoes_colaborador'])
  LOOP
    EXECUTE format('CREATE POLICY "public_read_%I" ON public.%I FOR SELECT USING (true);', t, t);
    EXECUTE format('CREATE POLICY "public_insert_%I" ON public.%I FOR INSERT WITH CHECK (true);', t, t);
    EXECUTE format('CREATE POLICY "public_update_%I" ON public.%I FOR UPDATE USING (true);', t, t);
    EXECUTE format('CREATE POLICY "public_delete_%I" ON public.%I FOR DELETE USING (true);', t, t);
  END LOOP;
END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.jornadas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ciclos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pausas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ocorrencias;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alertas;

-- Seed: Setores
INSERT INTO public.setores (nome, descricao) VALUES
  ('SEPARAÇÃO','Picking e separação de pedidos'),
  ('RECEBIMENTO','Recebimento de mercadoria'),
  ('EXPEDIÇÃO','Expedição e carregamento'),
  ('INVENTÁRIO','Contagem e inventário'),
  ('CONFERÊNCIA','Conferência de pedidos');

-- Seed: Tarefas padrão
INSERT INTO public.tarefas_padrao (setor_id, nome, subtarefa, tempo_medio_minutos, tempo_por_peca_segundos)
SELECT id, 'PICKING COM RF', NULL, 20, 12 FROM public.setores WHERE nome='SEPARAÇÃO';
INSERT INTO public.tarefas_padrao (setor_id, nome, subtarefa, tempo_medio_minutos, tempo_por_peca_segundos)
SELECT id, 'PICKING MANUAL', NULL, 25, 18 FROM public.setores WHERE nome='SEPARAÇÃO';
INSERT INTO public.tarefas_padrao (setor_id, nome, subtarefa, tempo_medio_minutos, tempo_por_peca_segundos)
SELECT id, 'REPOSIÇÃO', NULL, 15, NULL FROM public.setores WHERE nome='SEPARAÇÃO';
INSERT INTO public.tarefas_padrao (setor_id, nome, subtarefa, tempo_medio_minutos, tempo_por_peca_segundos)
SELECT id, 'CONFERÊNCIA DE PEDIDO', NULL, 12, 8 FROM public.setores WHERE nome='CONFERÊNCIA';
INSERT INTO public.tarefas_padrao (setor_id, nome, subtarefa, tempo_medio_minutos, tempo_por_peca_segundos)
SELECT id, 'DESCARGA', 'PALETIZADO', 30, NULL FROM public.setores WHERE nome='RECEBIMENTO';
INSERT INTO public.tarefas_padrao (setor_id, nome, subtarefa, tempo_medio_minutos, tempo_por_peca_segundos)
SELECT id, 'CONFERÊNCIA NF', NULL, 20, 15 FROM public.setores WHERE nome='RECEBIMENTO';
INSERT INTO public.tarefas_padrao (setor_id, nome, subtarefa, tempo_medio_minutos, tempo_por_peca_segundos)
SELECT id, 'CARREGAMENTO', NULL, 35, NULL FROM public.setores WHERE nome='EXPEDIÇÃO';
INSERT INTO public.tarefas_padrao (setor_id, nome, subtarefa, tempo_medio_minutos, tempo_por_peca_segundos)
SELECT id, 'CONTAGEM CICLICA', NULL, 25, 6 FROM public.setores WHERE nome='INVENTÁRIO';

-- Seed: Regras pontuação
INSERT INTO public.regras_pontuacao (evento, pontos, descricao) VALUES
  ('ENTRADA_NO_HORARIO', 20, 'Entrada dentro de ±5min do turno'),
  ('ENTRADA_ATRASADA_15', -20, 'Entrada atrasada 5–15min'),
  ('ENTRADA_ATRASADA_MAIS_15', -40, 'Entrada atrasada > 15min'),
  ('TAREFA_ADIANTADA', 25, 'Tarefa encerrada antes do estimado'),
  ('TAREFA_NO_PRAZO', 15, 'Tarefa encerrada no prazo (±10%)'),
  ('TAREFA_ATRASADA_10', -10, 'Tarefa com atraso até 10min'),
  ('TAREFA_ATRASADA_MAIS_10', -25, 'Tarefa com atraso > 10min'),
  ('CICLO_SEM_OCORRENCIA', 10, 'Ciclo completo sem ocorrência'),
  ('PAUSA_DENTRO', 0, 'Pausa dentro do limite'),
  ('PAUSA_EXCEDIDA_50', -15, 'Pausa excedida até 50%'),
  ('PAUSA_EXCEDIDA_MAIS_50', -30, 'Pausa excedida > 50%'),
  ('PAUSA_NAO_ENCERRADA', -50, 'Pausa encerrada pelo supervisor'),
  ('OCIOSIDADE_5', -15, 'Ociosidade entre tarefas > 5min'),
  ('OCIOSIDADE_15', -35, 'Ociosidade > 15min'),
  ('JORNADA_NO_HORARIO', 20, 'Jornada encerrada no horário'),
  ('TAREFA_AUDITORIA', -50, 'Tarefa muito rápida marcada para auditoria');

-- Seed: Colaboradores exemplo
INSERT INTO public.colaboradores (matricula, nome, setor_padrao_id, turno, horario_entrada, horario_saida) VALUES
  ('1042', 'JOÃO SILVA', (SELECT id FROM public.setores WHERE nome='SEPARAÇÃO'), 'MANHA', '07:00', '16:00'),
  ('1055', 'MARIA SANTOS', (SELECT id FROM public.setores WHERE nome='CONFERÊNCIA'), 'MANHA', '07:00', '16:00'),
  ('2010', 'CARLOS MENDES', (SELECT id FROM public.setores WHERE nome='RECEBIMENTO'), 'TARDE', '14:00', '23:00'),
  ('2024', 'PEDRO LIMA', (SELECT id FROM public.setores WHERE nome='EXPEDIÇÃO'), 'TARDE', '14:00', '23:00'),
  ('3001', 'ANA COSTA', (SELECT id FROM public.setores WHERE nome='INVENTÁRIO'), 'NOITE', '22:00', '07:00');
