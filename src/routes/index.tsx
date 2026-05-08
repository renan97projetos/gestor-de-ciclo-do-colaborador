import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { fmtDuration, useKeyboardNav, useNow } from "@/lib/totem/keyboard";
import {
  Ciclo,
  Colaborador,
  Jornada,
  PAUSA_LABELS,
  PAUSA_LIMITES,
  Pausa,
  Setor,
  TarefaPadrao,
  encerrarCiclo,
  encerrarJornada,
  encerrarPausa,
  getCicloAberto,
  getJornadaAbertaHoje,
  getPausaAberta,
  getPontuacao,
  iniciarCiclo,
  iniciarJornada,
  iniciarPausa,
  listarSetores,
  listarTarefasPadrao,
  listarUltimosCiclos,
  loginPorMatricula,
  registrarOcorrencia,
} from "@/lib/totem/api";
import { Activity, AlertTriangle, Clock, Coffee, LogOut, Play, Square, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tracker Operacional — Totem" },
      { name: "description", content: "Registro operacional de jornada, tarefas e pausas em tempo real." },
    ],
  }),
  component: TotemPage,
});

type Screen =
  | { name: "IDLE" }
  | { name: "LOGIN" }
  | { name: "CONFIRMA_LOGIN"; colaborador: Colaborador }
  | { name: "PAINEL" }
  | { name: "SELECT_SETOR" }
  | { name: "SELECT_TAREFA"; setor: Setor }
  | { name: "QTD_PECAS"; setor: Setor; tarefa: TarefaPadrao }
  | { name: "TAREFA_LIVRE"; setor: Setor }
  | { name: "CONFIRMA_TAREFA"; setor: Setor; tarefa: TarefaPadrao | null; nome: string; qtd: number | null; estimado: number }
  | { name: "ENCERRAR_TAREFA" }
  | { name: "MOTIVO_EXTERNO"; tipo: string }
  | { name: "PAUSA_TIPO" }
  | { name: "PAUSA_JUSTIFICA"; tipo: string }
  | { name: "OCORRENCIA_TIPO" }
  | { name: "OCORRENCIA_DESC"; tipo: string }
  | { name: "RESUMO" }
  | { name: "ENCERRAR_JORNADA" }
  | { name: "FLASH"; texto: string; tone: "ok" | "warn" | "err"; nextScreen: Screen };

const MOTIVOS: { key: string; label: string }[] = [
  { key: "AGUARDANDO_MATERIAL", label: "AGUARDEI MATERIAL" },
  { key: "ITEM_NAO_ENCONTRADO", label: "ITEM NÃO ESTAVA NO LOCAL" },
  { key: "LAYOUT_SETOR", label: "PROBLEMA DE LAYOUT DO SETOR" },
  { key: "FALHA_SISTEMA", label: "SISTEMA INDISPONÍVEL" },
  { key: "OUTRO", label: "OUTRO" },
];

const OCORRENCIAS: { key: string; label: string }[] = [
  { key: "ITEM_NAO_ENCONTRADO", label: "ITEM NÃO ENCONTRADO NO LOCAL" },
  { key: "AGUARDANDO_MATERIAL", label: "AGUARDANDO MATERIAL / ABASTECIMENTO" },
  { key: "FALHA_SISTEMA", label: "SISTEMA INDISPONÍVEL OU FALHA" },
  { key: "LAYOUT_SETOR", label: "PROBLEMA DE LAYOUT / ORGANIZAÇÃO" },
  { key: "COLAB_EXTERNO", label: "COLABORADOR EXTERNO ATRASOU TAREFA" },
  { key: "OUTRO", label: "OUTRO" },
];

const PAUSAS: { key: string; label: string }[] = [
  { key: "BANHEIRO", label: PAUSA_LABELS.BANHEIRO },
  { key: "AGUA", label: PAUSA_LABELS.AGUA },
  { key: "ADMINISTRATIVO", label: PAUSA_LABELS.ADMINISTRATIVO },
  { key: "NECESSIDADE_PESSOAL", label: PAUSA_LABELS.NECESSIDADE_PESSOAL },
  { key: "OUTRO", label: PAUSA_LABELS.OUTRO },
];

function TotemPage() {
  const [screen, setScreen] = useState<Screen>({ name: "IDLE" });
  const [colaborador, setColaborador] = useState<Colaborador | null>(null);
  const [jornada, setJornada] = useState<Jornada | null>(null);
  const [ciclo, setCiclo] = useState<Ciclo | null>(null);
  const [pausa, setPausa] = useState<Pausa | null>(null);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [tarefas, setTarefas] = useState<TarefaPadrao[]>([]);
  const [ultimos, setUltimos] = useState<Ciclo[]>([]);
  const [pontos, setPontos] = useState<number>(1000);

  const refresh = async (j?: Jornada | null) => {
    const jj = j ?? jornada;
    if (!jj) return;
    const [c, p, u, pts] = await Promise.all([
      getCicloAberto(jj.id),
      getPausaAberta(jj.id),
      listarUltimosCiclos(jj.id, 30),
      getPontuacao(jj.id),
    ]);
    setCiclo(c);
    setPausa(p);
    setUltimos(u);
    setPontos(pts);
  };

  // Polling leve do estado (pontuação, listas)
  useEffect(() => {
    if (!jornada) return;
    const id = setInterval(() => refresh(), 8000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jornada?.id]);

  // Timeout de inatividade: 3 min sem interagir → volta para IDLE
  // (não encerra jornada; ao logar de novo o painel é restaurado)
  const lastActivityRef = useRef<number>(Date.now());
  useEffect(() => {
    const bump = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener("keydown", bump);
    window.addEventListener("mousedown", bump);
    window.addEventListener("touchstart", bump);
    return () => {
      window.removeEventListener("keydown", bump);
      window.removeEventListener("mousedown", bump);
      window.removeEventListener("touchstart", bump);
    };
  }, []);
  useEffect(() => {
    if (screen.name === "IDLE" || screen.name === "FLASH") return;
    lastActivityRef.current = Date.now();
    const id = setInterval(() => {
      if (Date.now() - lastActivityRef.current > 180_000) {
        setScreen({ name: "IDLE" });
      }
    }, 5000);
    return () => clearInterval(id);
  }, [screen.name]);

  const flash = (texto: string, tone: "ok" | "warn" | "err", next: Screen, ms = 1500) => {
    setScreen({ name: "FLASH", texto, tone, nextScreen: next });
    setTimeout(() => setScreen(next), ms);
  };

  return (
    <div className="min-h-screen bg-background text-foreground select-none">
      {screen.name === "IDLE" && <IdleScreen onAny={() => setScreen({ name: "LOGIN" })} />}
      {screen.name === "LOGIN" && (
        <LoginScreen
          onCancel={() => setScreen({ name: "IDLE" })}
          onSuccess={async (c) => {
            setColaborador(c);
            const j = await getJornadaAbertaHoje(c.id);
            if (j) {
              setJornada(j);
              await refresh(j);
              setScreen({ name: "PAINEL" });
            } else {
              setScreen({ name: "CONFIRMA_LOGIN", colaborador: c });
            }
          }}
        />
      )}
      {screen.name === "CONFIRMA_LOGIN" && (
        <ConfirmaLoginScreen
          colaborador={screen.colaborador}
          onBack={() => setScreen({ name: "IDLE" })}
          onIniciar={async () => {
            const j = await iniciarJornada(screen.colaborador);
            setJornada(j);
            await refresh(j);
            flash("JORNADA INICIADA", "ok", { name: "PAINEL" });
          }}
        />
      )}
      {screen.name === "PAINEL" && colaborador && jornada && (
        <PainelScreen
          colaborador={colaborador}
          jornada={jornada}
          ciclo={ciclo}
          pausa={pausa}
          ultimos={ultimos}
          pontos={pontos}
          onIniciarTarefa={async () => {
            if (pausa) {
              flash("⛔ PAUSA ABERTA — REGISTRE RETORNO PRIMEIRO", "err", { name: "PAINEL" }, 2200);
              return;
            }
            const s = await listarSetores();
            setSetores(s);
            setScreen({ name: "SELECT_SETOR" });
          }}
          onEncerrarTarefa={() => setScreen({ name: "ENCERRAR_TAREFA" })}
          onPausa={() => setScreen({ name: "PAUSA_TIPO" })}
          onRetornarPausa={async () => {
            if (!pausa) return;
            const p = await encerrarPausa(pausa);
            const dur = p.duracao_minutos ?? 0;
            const limite = PAUSA_LIMITES[p.tipo] ?? 10;
            if (p.excedeu_limite) {
              flash(`PAUSA EXCEDIDA (${dur}/${limite}min) — PONTOS DEDUZIDOS`, "err", { name: "PAINEL" }, 2200);
            } else {
              flash(`RETORNO REGISTRADO (${dur}min)`, "ok", { name: "PAINEL" });
            }
            await refresh();
          }}
          onOcorrencia={() => setScreen({ name: "OCORRENCIA_TIPO" })}
          onResumo={() => setScreen({ name: "RESUMO" })}
          onEncerrarJornada={() => setScreen({ name: "ENCERRAR_JORNADA" })}
        />
      )}
      {screen.name === "SELECT_SETOR" && colaborador && (
        <SelectSetorScreen
          setores={setores}
          padraoId={colaborador.setor_padrao_id}
          onBack={() => setScreen({ name: "PAINEL" })}
          onPick={async (s) => {
            const t = await listarTarefasPadrao(s.id);
            setTarefas(t);
            setScreen({ name: "SELECT_TAREFA", setor: s });
          }}
        />
      )}
      {screen.name === "SELECT_TAREFA" && (
        <SelectTarefaScreen
          tarefas={tarefas}
          onBack={() => setScreen({ name: "SELECT_SETOR" })}
          onLivre={() => setScreen({ name: "TAREFA_LIVRE", setor: screen.setor })}
          onPick={(t) => {
            if (t.tempo_por_peca_segundos) {
              setScreen({ name: "QTD_PECAS", setor: screen.setor, tarefa: t });
            } else {
              setScreen({
                name: "CONFIRMA_TAREFA",
                setor: screen.setor,
                tarefa: t,
                nome: t.nome,
                qtd: null,
                estimado: t.tempo_medio_minutos,
              });
            }
          }}
        />
      )}
      {screen.name === "TAREFA_LIVRE" && (
        <TextEntryScreen
          titulo="DIGITE O NOME DA TAREFA"
          onBack={() => setScreen({ name: "SELECT_TAREFA", setor: screen.setor })}
          onSubmit={(nome) =>
            setScreen({
              name: "CONFIRMA_TAREFA",
              setor: screen.setor,
              tarefa: null,
              nome: nome.toUpperCase(),
              qtd: null,
              estimado: 15,
            })
          }
        />
      )}
      {screen.name === "QTD_PECAS" && (
        <QtdPecasScreen
          tarefa={screen.tarefa}
          onBack={() => setScreen({ name: "SELECT_TAREFA", setor: screen.setor })}
          onSubmit={(qtd) => {
            const est =
              qtd && screen.tarefa.tempo_por_peca_segundos
                ? Math.max(1, Math.round((qtd * screen.tarefa.tempo_por_peca_segundos) / 60))
                : screen.tarefa.tempo_medio_minutos;
            setScreen({
              name: "CONFIRMA_TAREFA",
              setor: screen.setor,
              tarefa: screen.tarefa,
              nome: screen.tarefa.nome,
              qtd,
              estimado: est,
            });
          }}
        />
      )}
      {screen.name === "CONFIRMA_TAREFA" && jornada && (
        <ConfirmaTarefaScreen
          setor={screen.setor}
          nome={screen.nome}
          qtd={screen.qtd}
          estimado={screen.estimado}
          onBack={() => setScreen({ name: "SELECT_TAREFA", setor: screen.setor })}
          onConfirm={async () => {
            await iniciarCiclo({
              jornada,
              setor: screen.setor,
              tarefa: screen.tarefa,
              nomeTarefa: screen.nome,
              quantidadePecas: screen.qtd,
              tempoEstimadoMin: screen.estimado,
            });
            await refresh();
            flash("TAREFA INICIADA", "ok", { name: "PAINEL" });
          }}
        />
      )}
      {screen.name === "ENCERRAR_TAREFA" && ciclo && (
        <EncerrarTarefaScreen
          ciclo={ciclo}
          onBack={() => setScreen({ name: "PAINEL" })}
          onConfirmar={async () => {
            const c = await encerrarCiclo(ciclo);
            await refresh();
            if (c.status === "AUDITORIA") {
              flash("⚡ TAREFA EM AUDITORIA — SUPERVISOR NOTIFICADO", "warn", { name: "PAINEL" }, 2200);
            } else {
              flash("TAREFA ENCERRADA", "ok", { name: "PAINEL" });
            }
          }}
          onMotivo={() => setScreen({ name: "MOTIVO_EXTERNO", tipo: "" })}
        />
      )}
      {screen.name === "MOTIVO_EXTERNO" && ciclo && (
        <MotivoExternoScreen
          onBack={() => setScreen({ name: "ENCERRAR_TAREFA" })}
          onSubmit={async (tipo, desc) => {
            await encerrarCiclo(ciclo, { motivoExterno: `${tipo}: ${desc}` });
            if (jornada) {
              await registrarOcorrencia({
                colaboradorId: jornada.colaborador_id,
                jornadaId: jornada.id,
                cicloId: ciclo.id,
                tipo,
                descricao: desc,
              });
            }
            await refresh();
            flash("MOTIVO REGISTRADO — SUPERVISOR NOTIFICADO", "warn", { name: "PAINEL" }, 1800);
          }}
        />
      )}
      {screen.name === "PAUSA_TIPO" && jornada && (
        <PausaTipoScreen
          temTarefa={!!ciclo}
          onBack={() => setScreen({ name: "PAINEL" })}
          onPick={async (tipo, justificativa) => {
            if (ciclo) {
              await encerrarCiclo(ciclo, { observacao: "Encerrado para iniciar pausa" });
            }
            await iniciarPausa({ jornada, tipo, justificativa });
            await refresh();
            flash(`PAUSA INICIADA: ${PAUSA_LABELS[tipo]}`, "warn", { name: "PAINEL" });
          }}
          onJustificar={(tipo) => setScreen({ name: "PAUSA_JUSTIFICA", tipo })}
        />
      )}
      {screen.name === "PAUSA_JUSTIFICA" && jornada && (
        <TextEntryScreen
          titulo="DIGITE A JUSTIFICATIVA"
          onBack={() => setScreen({ name: "PAUSA_TIPO" })}
          onSubmit={async (j) => {
            if (ciclo) await encerrarCiclo(ciclo, { observacao: "Encerrado para iniciar pausa" });
            await iniciarPausa({ jornada, tipo: screen.tipo, justificativa: j });
            await refresh();
            flash(`PAUSA INICIADA: ${PAUSA_LABELS[screen.tipo]}`, "warn", { name: "PAINEL" });
          }}
        />
      )}
      {screen.name === "OCORRENCIA_TIPO" && (
        <OcorrenciaTipoScreen
          onBack={() => setScreen({ name: "PAINEL" })}
          onPick={(tipo) => setScreen({ name: "OCORRENCIA_DESC", tipo })}
        />
      )}
      {screen.name === "OCORRENCIA_DESC" && jornada && (
        <TextEntryScreen
          titulo="DESCREVA A OCORRÊNCIA"
          onBack={() => setScreen({ name: "OCORRENCIA_TIPO" })}
          onSubmit={async (desc) => {
            await registrarOcorrencia({
              colaboradorId: jornada.colaborador_id,
              jornadaId: jornada.id,
              cicloId: ciclo?.id ?? null,
              tipo: screen.tipo,
              descricao: desc,
            });
            flash("OCORRÊNCIA REGISTRADA", "ok", { name: "PAINEL" });
          }}
        />
      )}
      {screen.name === "RESUMO" && colaborador && jornada && (
        <ResumoScreen
          colaborador={colaborador}
          jornada={jornada}
          ultimos={ultimos}
          pontos={pontos}
          onBack={() => setScreen({ name: "PAINEL" })}
        />
      )}
      {screen.name === "ENCERRAR_JORNADA" && colaborador && jornada && (
        <EncerrarJornadaScreen
          colaborador={colaborador}
          jornada={jornada}
          pontos={pontos}
          onBack={() => setScreen({ name: "PAINEL" })}
          onConfirm={async () => {
            await encerrarJornada(jornada);
            flash("JORNADA ENCERRADA — BOM DESCANSO!", "ok", { name: "IDLE" }, 3000);
            setColaborador(null);
            setJornada(null);
            setCiclo(null);
            setPausa(null);
            setUltimos([]);
            setPontos(1000);
          }}
        />
      )}
      {screen.name === "FLASH" && <FlashScreen texto={screen.texto} tone={screen.tone} />}
    </div>
  );
}

/* ===================== TELAS ===================== */

function IdleScreen({ onAny }: { onAny: () => void }) {
  const now = useNow(1000);
  useEffect(() => {
    const handler = () => onAny();
    window.addEventListener("keydown", handler, { once: true });
    return () => window.removeEventListener("keydown", handler);
  }, [onAny]);
  const mounted = now > 0;
  const d = mounted ? new Date(now) : null;
  const hh = d ? String(d.getHours()).padStart(2, "0") : "--";
  const mm = d ? String(d.getMinutes()).padStart(2, "0") : "--";
  const ss = d ? String(d.getSeconds()).padStart(2, "0") : "--";
  const dataStr = d
    ? d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
    : "";
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-8 cursor-pointer" onClick={onAny}>
      <div className="text-sm uppercase tracking-[0.4em] text-muted-foreground font-display mb-6">
        Tracker Operacional
      </div>
      <div className="font-mono text-[180px] leading-none text-primary font-bold" suppressHydrationWarning>
        {hh}:{mm}<span className="text-muted-foreground">:{ss}</span>
      </div>
      <div className="mt-4 text-2xl text-muted-foreground capitalize" suppressHydrationWarning>
        {dataStr || "\u00a0"}
      </div>
      <div className="mt-16 px-8 py-4 border border-border bg-card font-display text-2xl uppercase tracking-widest pulse-alert">
        Pressione qualquer tecla para iniciar
      </div>
    </div>
  );
}

function LoginScreen({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: (c: Colaborador) => void }) {
  const [mat, setMat] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const tentar = async () => {
    if (!mat) return;
    setCarregando(true);
    try {
      const c = await loginPorMatricula(mat);
      if (!c) {
        setErro("MATRÍCULA NÃO ENCONTRADA");
        setTimeout(() => {
          setErro(null);
          setMat("");
        }, 1800);
      } else {
        onSuccess(c);
      }
    } finally {
      setCarregando(false);
    }
  };

  useKeyboardNav(
    {
      onDigit: (n) => {
        setErro(null);
        setMat((m) => (m.length < 8 ? m + String(n) : m));
      },
      onBackspace: () => setMat((m) => m.slice(0, -1)),
      onEnter: tentar,
      onEscape: () => (mat ? setMat("") : onCancel()),
    },
    [mat, carregando],
  );

  return (
    <div className={`flex min-h-screen flex-col items-center justify-center px-8 ${erro ? "bg-destructive/30" : ""}`}>
      <div className="text-2xl font-display uppercase tracking-widest text-muted-foreground mb-8">
        Digite sua matrícula
      </div>
      <div className="font-mono text-[140px] leading-none text-primary font-bold tracking-wider min-h-[160px]">
        {mat || <span className="text-muted-foreground/40">_____</span>}
      </div>
      {erro && (
        <div className="mt-8 text-3xl font-display text-destructive uppercase tracking-wider">
          ⛔ {erro}
        </div>
      )}
      <div className="mt-16 flex gap-6 text-lg text-muted-foreground font-display uppercase">
        <span><span className="kbd">0-9</span> Digitar</span>
        <span><span className="kbd">⏎</span> Confirmar</span>
        <span><span className="kbd">⌫</span> Apagar</span>
        <span><span className="kbd">ESC</span> Cancelar</span>
      </div>
    </div>
  );
}

function ConfirmaLoginScreen({
  colaborador,
  onBack,
  onIniciar,
}: {
  colaborador: Colaborador;
  onBack: () => void;
  onIniciar: () => void;
}) {
  useKeyboardNav({
    onDigit: (n) => n === 1 && onIniciar(),
    onEnter: onIniciar,
    onEscape: onBack,
  });

  const fora = horarioForaJanela(colaborador);

  return (
    <ScreenFrame titulo="Confirme sua identidade" onEsc={onBack}>
      <div className="panel p-8 mb-6">
        <div className="text-sm font-display uppercase text-muted-foreground tracking-widest">Colaborador</div>
        <div className="text-6xl font-display font-bold mt-2">{colaborador.nome}</div>
        <div className="text-2xl text-muted-foreground mt-2 font-mono">MAT: {colaborador.matricula}</div>
        <div className="grid grid-cols-3 gap-6 mt-8">
          <Info label="Turno" valor={colaborador.turno ?? "—"} />
          <Info label="Entrada" valor={colaborador.horario_entrada?.slice(0, 5) ?? "—"} />
          <Info label="Saída" valor={colaborador.horario_saida?.slice(0, 5) ?? "—"} />
        </div>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-muted text-muted-foreground font-display uppercase tracking-wider text-sm">
          <Activity className="size-4" /> Sem jornada aberta hoje
        </div>
        {fora && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-warning/20 text-warning font-display uppercase tracking-wider text-sm">
            <AlertTriangle className="size-4" /> Fora da janela de horário — pode gerar penalidade
          </div>
        )}
      </div>
      <MenuList
        items={[
          { kbd: "1", label: "INICIAR JORNADA", onSelect: onIniciar, variant: "success", icon: <Play className="size-6" /> },
        ]}
      />
      <FooterHint />
    </ScreenFrame>
  );
}

function PainelScreen(props: {
  colaborador: Colaborador;
  jornada: Jornada;
  ciclo: Ciclo | null;
  pausa: Pausa | null;
  ultimos: Ciclo[];
  pontos: number;
  onIniciarTarefa: () => void;
  onEncerrarTarefa: () => void;
  onPausa: () => void;
  onRetornarPausa: () => void;
  onOcorrencia: () => void;
  onResumo: () => void;
  onEncerrarJornada: () => void;
}) {
  const { colaborador, jornada, ciclo, pausa, ultimos, pontos } = props;
  const now = useNow(1000);
  const jornadaSec = (now - new Date(jornada.inicio).getTime()) / 1000;

  const status = pausa ? "PAUSA" : ciclo ? "TAREFA" : "OCIOSO";

  // Estado C: pelo menos um ciclo já encerrado nesta jornada (libera [9] ENCERRAR JORNADA)
  const algumCicloEncerrado = ultimos.some((c) => !!c.fim);

  const items = useMemo(() => {
    // Estado: PAUSA aberta
    if (pausa) {
      return [
        { kbd: "1", label: "RETORNAR DA PAUSA", onSelect: props.onRetornarPausa, variant: "success" as const, icon: <Play className="size-6" /> },
        { kbd: "3", label: "REGISTRAR OCORRÊNCIA", onSelect: props.onOcorrencia, icon: <AlertTriangle className="size-6" /> },
      ];
    }
    // Estado B: TAREFA em andamento
    if (ciclo) {
      return [
        { kbd: "1", label: "ENCERRAR TAREFA ATUAL", onSelect: props.onEncerrarTarefa, variant: "success" as const, icon: <Square className="size-6" /> },
        { kbd: "2", label: "REGISTRAR PAUSA", onSelect: props.onPausa, variant: "warning" as const, icon: <Coffee className="size-6" /> },
        { kbd: "3", label: "REGISTRAR OCORRÊNCIA NESTA TAREFA", onSelect: props.onOcorrencia, icon: <AlertTriangle className="size-6" /> },
      ];
    }
    // Estado A (jornada sem tarefa, nenhum ciclo encerrado) ou C (já encerrou pelo menos uma)
    const base: { kbd: string; label: string; onSelect: () => void; variant?: "success" | "warning" | "danger"; icon?: React.ReactNode }[] = [
      { kbd: "1", label: "INICIAR TAREFA", onSelect: props.onIniciarTarefa, variant: "success", icon: <Play className="size-6" /> },
      { kbd: "2", label: "PAUSA FORÇADA (SEM TAREFA)", onSelect: props.onPausa, variant: "warning", icon: <Coffee className="size-6" /> },
      { kbd: "3", label: "REGISTRAR OCORRÊNCIA", onSelect: props.onOcorrencia, icon: <AlertTriangle className="size-6" /> },
    ];
    if (algumCicloEncerrado) {
      base.push({ kbd: "9", label: "ENCERRAR JORNADA", onSelect: props.onEncerrarJornada, variant: "danger" as const, icon: <LogOut className="size-6" /> });
    }
    return base;
  }, [pausa?.id, ciclo?.id, algumCicloEncerrado]);

  useKeyboardNav(
    {
      onDigit: (n) => {
        const it = items.find((i) => i.kbd === String(n));
        if (it) it.onSelect();
      },
    },
    [items],
  );

  const pontosColor = pontos >= 800 ? "text-success" : pontos >= 500 ? "text-warning" : "text-destructive";

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-card">
        <div>
          <div className="text-xs font-display uppercase tracking-widest text-muted-foreground">Colaborador</div>
          <div className="text-2xl font-display font-bold">{colaborador.nome}</div>
          <div className="text-xs text-muted-foreground font-mono">MAT {colaborador.matricula} · {colaborador.turno}</div>
        </div>
        <div className="text-center">
          <div className="text-xs font-display uppercase tracking-widest text-muted-foreground">Jornada</div>
          <div className="font-mono text-5xl text-primary font-bold">{fmtDuration(jornadaSec)}</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-display uppercase tracking-widest text-muted-foreground">Pontuação</div>
          <div className={`font-mono text-5xl font-bold ${pontosColor}`}>{pontos}</div>
        </div>
      </header>

      {/* Status */}
      <section className="px-8 py-6">
        {status === "TAREFA" && ciclo && <CardTarefaAtiva ciclo={ciclo} now={now} />}
        {status === "PAUSA" && pausa && <CardPausaAtiva pausa={pausa} now={now} />}
        {status === "OCIOSO" && <CardOcioso ultimos={ultimos} jornada={jornada} now={now} />}
      </section>

      {/* Menu */}
      <section className="px-8 flex-1">
        <div className="text-sm font-display uppercase tracking-widest text-muted-foreground mb-3">Ações</div>
        <MenuList items={items} />
      </section>

      {/* Últimas */}
      <footer className="border-t border-border bg-card px-8 py-4">
        <div className="text-xs font-display uppercase tracking-widest text-muted-foreground mb-2">Últimas tarefas</div>
        {ultimos.length === 0 ? (
          <div className="text-muted-foreground text-sm">Nenhuma tarefa ainda hoje.</div>
        ) : (
          <ul className="grid grid-cols-3 gap-3">
            {ultimos.slice(0, 3).map((c) => (
              <li key={c.id} className="border border-border px-3 py-2 text-sm flex items-center justify-between">
                <span className="font-display uppercase truncate">{c.nome_tarefa}</span>
                <span className="font-mono text-muted-foreground">
                  {c.duracao_real_minutos != null ? `${c.duracao_real_minutos}m` : "…"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </footer>
    </div>
  );
}

function CardTarefaAtiva({ ciclo, now }: { ciclo: Ciclo; now: number }) {
  const sec = (now - new Date(ciclo.inicio).getTime()) / 1000;
  const min = sec / 60;
  const est = ciclo.tempo_estimado_minutos ?? 0;
  const pct = est ? Math.min(100, (min / est) * 100) : 0;
  const atrasado = est && min > est;
  const cor = atrasado ? "bg-destructive" : "bg-success";
  return (
    <div className="panel p-6 border-l-4" style={{ borderLeftColor: "var(--success)" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-display uppercase tracking-widest text-muted-foreground">Tarefa em execução</div>
          <div className="text-3xl font-display font-bold mt-1">{ciclo.nome_tarefa}</div>
          {ciclo.quantidade_pecas != null && (
            <div className="text-sm text-muted-foreground font-mono mt-1">{ciclo.quantidade_pecas} peças</div>
          )}
        </div>
        <div className="text-right">
          <div className="font-mono text-6xl text-success font-bold">{fmtDuration(sec)}</div>
          {est > 0 && (
            <div className="text-sm text-muted-foreground font-mono">
              estimado {String(est).padStart(2, "0")}:00
            </div>
          )}
        </div>
      </div>
      {est > 0 && (
        <div className="mt-4">
          <div className="h-3 bg-muted overflow-hidden">
            <div className={`h-full ${cor} transition-all`} style={{ width: `${pct}%` }} />
          </div>
          {atrasado && (
            <div className="mt-2 text-destructive font-display uppercase tracking-widest text-sm">
              ⚠ Atrasado em {Math.round(min - est)}min
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CardPausaAtiva({ pausa, now }: { pausa: Pausa; now: number }) {
  const sec = (now - new Date(pausa.inicio).getTime()) / 1000;
  const min = sec / 60;
  const limite = PAUSA_LIMITES[pausa.tipo] ?? 10;
  const excedeu = min > limite;
  return (
    <div className={`panel p-6 border-l-4 ${excedeu ? "pulse-alert" : ""}`} style={{ borderLeftColor: "var(--warning)" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-display uppercase tracking-widest text-muted-foreground">Pausa em andamento</div>
          <div className="text-3xl font-display font-bold mt-1">{PAUSA_LABELS[pausa.tipo]}</div>
          <div className="text-sm text-muted-foreground font-mono mt-1">limite {limite} min</div>
        </div>
        <div className={`font-mono text-6xl font-bold ${excedeu ? "text-destructive" : "text-warning"}`}>
          {fmtDuration(sec)}
        </div>
      </div>
    </div>
  );
}

function CardOcioso({ ultimos, jornada, now }: { ultimos: Ciclo[]; jornada: Jornada; now: number }) {
  const ultimo = ultimos.find((c) => c.fim);
  // Se ainda não houve nenhuma tarefa encerrada, mede ociosidade desde o início da jornada
  const ref = ultimo?.fim ? new Date(ultimo.fim).getTime() : new Date(jornada.inicio).getTime();
  const desdeInicio = !ultimo;
  const sec = Math.max(0, (now - ref) / 1000);
  const alerta = sec > 300;
  return (
    <div className={`panel p-6 border-l-4 ${alerta ? "pulse-alert" : ""}`} style={{ borderLeftColor: "var(--destructive)" }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-display uppercase tracking-widest text-muted-foreground">Status</div>
          <div className="text-3xl font-display font-bold mt-1 text-destructive">SEM TAREFA ATIVA</div>
          <div className="text-sm text-muted-foreground mt-1">Inicie uma tarefa pressionando [1]</div>
        </div>
        <div className="text-right">
          <div className="text-xs font-display uppercase text-muted-foreground tracking-widest">
            {desdeInicio ? "Ocioso desde início" : "Ocioso há"}
          </div>
          <div className={`font-mono text-6xl font-bold ${alerta ? "text-destructive" : "text-warning"}`}>
            {fmtDuration(sec)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============ Subtelas auxiliares ============ */

function ScreenFrame({ titulo, onEsc, children }: { titulo: string; onEsc: () => void; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col px-8 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display uppercase tracking-widest text-3xl">{titulo}</h1>
        <span className="text-sm text-muted-foreground font-display uppercase">
          <span className="kbd mr-2">ESC</span> Voltar
        </span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function MenuList({
  items,
}: {
  items: { kbd: string; label: string; onSelect: () => void; variant?: "success" | "warning" | "danger"; icon?: React.ReactNode }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {items.map((it) => (
        <button
          key={it.kbd}
          className="totem-btn"
          data-variant={it.variant}
          onClick={it.onSelect}
        >
          <span className="kbd">{it.kbd}</span>
          {it.icon}
          <span className="flex-1">{it.label}</span>
        </button>
      ))}
    </div>
  );
}

function SelectSetorScreen({
  setores,
  padraoId,
  onBack,
  onPick,
}: {
  setores: Setor[];
  padraoId: string | null;
  onBack: () => void;
  onPick: (s: Setor) => void;
}) {
  // Coloca setor padrão primeiro
  const ordenados = useMemo(() => {
    const arr = [...setores];
    arr.sort((a, b) => (a.id === padraoId ? -1 : b.id === padraoId ? 1 : 0));
    return arr.slice(0, 9);
  }, [setores, padraoId]);

  useKeyboardNav(
    {
      onDigit: (n) => {
        const s = ordenados[n - 1];
        if (s) onPick(s);
      },
      onEscape: onBack,
    },
    [ordenados],
  );

  return (
    <ScreenFrame titulo="Selecione o setor" onEsc={onBack}>
      <MenuList
        items={ordenados.map((s, i) => ({
          kbd: String(i + 1),
          label: s.id === padraoId ? `${s.nome}   ◄ PADRÃO` : s.nome,
          onSelect: () => onPick(s),
        }))}
      />
    </ScreenFrame>
  );
}

function SelectTarefaScreen({
  tarefas,
  onBack,
  onPick,
  onLivre,
}: {
  tarefas: TarefaPadrao[];
  onBack: () => void;
  onPick: (t: TarefaPadrao) => void;
  onLivre: () => void;
}) {
  const opts = tarefas.slice(0, 8);
  const livreKey = String(opts.length + 1);
  useKeyboardNav(
    {
      onDigit: (n) => {
        if (n - 1 < opts.length) onPick(opts[n - 1]);
        else if (String(n) === livreKey) onLivre();
      },
      onEscape: onBack,
    },
    [opts, livreKey],
  );

  return (
    <ScreenFrame titulo="Selecione a tarefa" onEsc={onBack}>
      <MenuList
        items={[
          ...opts.map((t, i) => ({
            kbd: String(i + 1),
            label: t.subtarefa ? `${t.nome} — ${t.subtarefa}` : t.nome,
            onSelect: () => onPick(t),
          })),
          { kbd: livreKey, label: "OUTRO (DIGITAR)", onSelect: onLivre, variant: "warning" as const },
        ]}
      />
    </ScreenFrame>
  );
}

function QtdPecasScreen({
  tarefa,
  onBack,
  onSubmit,
}: {
  tarefa: TarefaPadrao;
  onBack: () => void;
  onSubmit: (qtd: number | null) => void;
}) {
  const [qtd, setQtd] = useState("");
  const numero = qtd ? parseInt(qtd, 10) : 0;
  const estimado = tarefa.tempo_por_peca_segundos
    ? Math.max(1, Math.round((numero * tarefa.tempo_por_peca_segundos) / 60))
    : tarefa.tempo_medio_minutos;

  useKeyboardNav(
    {
      onDigit: (n) => setQtd((q) => (q.length < 6 ? q + String(n) : q)),
      onBackspace: () => setQtd((q) => q.slice(0, -1)),
      onEnter: () => onSubmit(numero || null),
      onEscape: onBack,
    },
    [qtd],
  );

  return (
    <ScreenFrame titulo={`${tarefa.nome} — Quantidade de peças`} onEsc={onBack}>
      <div className="panel p-8 flex flex-col items-center">
        <div className="text-sm font-display uppercase tracking-widest text-muted-foreground">Peças / itens</div>
        <div className="font-mono text-[120px] leading-none text-primary font-bold mt-2 min-h-[120px]">
          {qtd || <span className="text-muted-foreground/40">0</span>}
        </div>
        <div className="mt-6 text-2xl font-display uppercase tracking-widest">
          Tempo estimado:{" "}
          <span className="text-primary font-mono">{estimado} min</span>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
          ENTER em branco para usar tempo padrão de {tarefa.tempo_medio_minutos}min
        </div>
      </div>
      <FooterHint />
    </ScreenFrame>
  );
}

function ConfirmaTarefaScreen({
  setor,
  nome,
  qtd,
  estimado,
  onBack,
  onConfirm,
}: {
  setor: Setor;
  nome: string;
  qtd: number | null;
  estimado: number;
  onBack: () => void;
  onConfirm: () => void;
}) {
  useKeyboardNav({
    onEnter: onConfirm,
    onEscape: onBack,
    onDigit: (n) => n === 1 && onConfirm(),
  });
  return (
    <ScreenFrame titulo="Confirmar início da tarefa" onEsc={onBack}>
      <div className="panel p-8">
        <div className="grid grid-cols-2 gap-6">
          <Info label="Setor" valor={setor.nome} />
          <Info label="Tarefa" valor={nome} />
          <Info label="Peças" valor={qtd != null ? String(qtd) : "—"} />
          <Info label="Tempo Estimado" valor={`${estimado} MIN`} highlight />
        </div>
      </div>
      <div className="mt-6">
        <MenuList
          items={[
            { kbd: "1", label: "INICIAR AGORA", onSelect: onConfirm, variant: "success", icon: <Play className="size-6" /> },
          ]}
        />
      </div>
      <FooterHint />
    </ScreenFrame>
  );
}

function EncerrarTarefaScreen({
  ciclo,
  onBack,
  onConfirmar,
  onMotivo,
}: {
  ciclo: Ciclo;
  onBack: () => void;
  onConfirmar: () => void;
  onMotivo: () => void;
}) {
  const now = useNow(1000);
  const sec = (now - new Date(ciclo.inicio).getTime()) / 1000;
  const min = sec / 60;
  const est = ciclo.tempo_estimado_minutos ?? 0;
  const muitoRapido = est > 0 && min < est * 0.5;
  const atrasado = est > 0 && min > est;

  useKeyboardNav({
    onDigit: (n) => {
      if (n === 1) onConfirmar();
      if (n === 2) onMotivo();
    },
    onEnter: onConfirmar,
    onEscape: onBack,
  });

  return (
    <ScreenFrame titulo="Encerrar tarefa" onEsc={onBack}>
      <div className="panel p-8">
        <div className="text-3xl font-display font-bold">{ciclo.nome_tarefa}</div>
        <div className="grid grid-cols-3 gap-6 mt-6">
          <Info label="Tempo decorrido" valor={fmtDuration(sec)} highlight />
          <Info label="Estimado" valor={est ? `${est} MIN` : "—"} />
          <Info label="Desvio" valor={est ? `${Math.round(min - est)} MIN` : "—"} />
        </div>
        <div className="mt-6">
          {muitoRapido && (
            <div className="px-4 py-3 bg-warning/20 text-warning font-display uppercase tracking-wider">
              ⚡ TEMPO MUITO ABAIXO DA MÉDIA — ESTA TAREFA SERÁ MARCADA PARA AUDITORIA
            </div>
          )}
          {atrasado && (
            <div className="px-4 py-3 bg-destructive/20 text-destructive font-display uppercase tracking-wider">
              ⚠ ATRASADO +{Math.round(min - est)} MIN
            </div>
          )}
          {!muitoRapido && !atrasado && est > 0 && (
            <div className="px-4 py-3 bg-success/20 text-success font-display uppercase tracking-wider">
              ✓ NO PRAZO
            </div>
          )}
        </div>
      </div>
      <div className="mt-6">
        <MenuList
          items={[
            { kbd: "1", label: "CONFIRMAR ENCERRAMENTO", onSelect: onConfirmar, variant: "success", icon: <Square className="size-6" /> },
            { kbd: "2", label: "ENCERRAR COM MOTIVO EXTERNO", onSelect: onMotivo, variant: "warning", icon: <AlertTriangle className="size-6" /> },
          ]}
        />
      </div>
    </ScreenFrame>
  );
}

function MotivoExternoScreen({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit: (tipo: string, descricao: string) => void;
}) {
  const [tipo, setTipo] = useState<string | null>(null);
  const [desc, setDesc] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tipo) setTimeout(() => inputRef.current?.focus(), 50);
  }, [tipo]);

  useKeyboardNav(
    {
      onDigit: (n) => {
        if (!tipo) {
          const m = MOTIVOS[n - 1];
          if (m) setTipo(m.key);
        }
      },
      onEnter: () => {
        if (tipo && desc.trim()) onSubmit(tipo, desc.trim());
      },
      onEscape: () => (tipo ? setTipo(null) : onBack()),
      ignoreDigits: !!tipo,
    },
    [tipo, desc],
  );

  if (!tipo) {
    return (
      <ScreenFrame titulo="Motivo externo" onEsc={onBack}>
        <MenuList
          items={MOTIVOS.map((m, i) => ({
            kbd: String(i + 1),
            label: m.label,
            onSelect: () => setTipo(m.key),
          }))}
        />
      </ScreenFrame>
    );
  }
  return (
    <ScreenFrame titulo={`Motivo: ${MOTIVOS.find((m) => m.key === tipo)?.label}`} onEsc={() => setTipo(null)}>
      <div className="panel p-6">
        <label className="block text-sm font-display uppercase tracking-widest text-muted-foreground mb-2">
          Descreva brevemente
        </label>
        <input
          ref={inputRef}
          autoFocus
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full bg-input border border-border px-4 py-4 text-2xl font-mono text-foreground"
          maxLength={200}
        />
      </div>
      <FooterHint extra="ENTER para enviar" />
    </ScreenFrame>
  );
}

function PausaTipoScreen({
  temTarefa,
  onBack,
  onPick,
  onJustificar,
}: {
  temTarefa: boolean;
  onBack: () => void;
  onPick: (tipo: string, justificativa?: string) => void;
  onJustificar: (tipo: string) => void;
}) {
  useKeyboardNav(
    {
      onDigit: (n) => {
        const p = PAUSAS[n - 1];
        if (!p) return;
        if (p.key === "ADMINISTRATIVO" || p.key === "OUTRO") onJustificar(p.key);
        else onPick(p.key);
      },
      onEscape: onBack,
    },
    [],
  );
  return (
    <ScreenFrame titulo="Selecione o tipo de pausa" onEsc={onBack}>
      {temTarefa && (
        <div className="mb-4 px-4 py-3 bg-warning/20 text-warning font-display uppercase tracking-wider">
          ⚠ Tarefa atual será encerrada automaticamente
        </div>
      )}
      <MenuList
        items={PAUSAS.map((p, i) => ({
          kbd: String(i + 1),
          label: `${p.label} (limite ${PAUSA_LIMITES[p.key]} min${p.key === "ADMINISTRATIVO" || p.key === "OUTRO" ? " · justificar" : ""})`,
          onSelect: () =>
            p.key === "ADMINISTRATIVO" || p.key === "OUTRO" ? onJustificar(p.key) : onPick(p.key),
          variant: "warning" as const,
        }))}
      />
    </ScreenFrame>
  );
}

function OcorrenciaTipoScreen({
  onBack,
  onPick,
}: {
  onBack: () => void;
  onPick: (tipo: string) => void;
}) {
  useKeyboardNav({
    onDigit: (n) => {
      const o = OCORRENCIAS[n - 1];
      if (o) onPick(o.key);
    },
    onEscape: onBack,
  });
  return (
    <ScreenFrame titulo="Tipo de ocorrência" onEsc={onBack}>
      <MenuList
        items={OCORRENCIAS.map((o, i) => ({
          kbd: String(i + 1),
          label: o.label,
          onSelect: () => onPick(o.key),
        }))}
      />
    </ScreenFrame>
  );
}

function TextEntryScreen({
  titulo,
  onBack,
  onSubmit,
}: {
  titulo: string;
  onBack: () => void;
  onSubmit: (texto: string) => void;
}) {
  const [v, setV] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  useKeyboardNav(
    {
      onEnter: () => v.trim() && onSubmit(v.trim()),
      onEscape: onBack,
      ignoreDigits: true,
    },
    [v],
  );
  return (
    <ScreenFrame titulo={titulo} onEsc={onBack}>
      <div className="panel p-6">
        <input
          ref={ref}
          autoFocus
          value={v}
          onChange={(e) => setV(e.target.value)}
          maxLength={200}
          className="w-full bg-input border border-border px-4 py-4 text-2xl font-mono text-foreground"
        />
      </div>
      <FooterHint extra="ENTER para confirmar" />
    </ScreenFrame>
  );
}

function ResumoScreen({
  colaborador,
  jornada,
  ultimos,
  pontos,
  onBack,
}: {
  colaborador: Colaborador;
  jornada: Jornada;
  ultimos: Ciclo[];
  pontos: number;
  onBack: () => void;
}) {
  const now = useNow(1000);
  const sec = (now - new Date(jornada.inicio).getTime()) / 1000;
  useKeyboardNav({ onEscape: onBack, onEnter: onBack });
  const pontosColor = pontos >= 800 ? "text-success" : pontos >= 500 ? "text-warning" : "text-destructive";
  return (
    <ScreenFrame titulo={`Resumo do dia — ${colaborador.nome}`} onEsc={onBack}>
      <div className="grid grid-cols-3 gap-6">
        <div className="panel p-6 col-span-1">
          <div className="text-xs font-display uppercase tracking-widest text-muted-foreground">Pontuação</div>
          <div className={`font-mono text-7xl font-bold mt-2 ${pontosColor}`}>{pontos}</div>
          <div className="text-xs text-muted-foreground mt-1">de 1000 pontos</div>
        </div>
        <div className="panel p-6 col-span-1">
          <div className="text-xs font-display uppercase tracking-widest text-muted-foreground">Jornada</div>
          <div className="font-mono text-5xl mt-2 text-primary font-bold">{fmtDuration(sec)}</div>
        </div>
        <div className="panel p-6 col-span-1">
          <div className="text-xs font-display uppercase tracking-widest text-muted-foreground">Tarefas</div>
          <div className="font-mono text-5xl mt-2 font-bold">{ultimos.filter((c) => c.fim).length}</div>
        </div>
      </div>
      <div className="panel p-6 mt-6">
        <div className="text-xs font-display uppercase tracking-widest text-muted-foreground mb-3">Linha do tempo</div>
        <ul className="flex flex-col gap-2">
          {ultimos.length === 0 && <li className="text-muted-foreground">Sem registros ainda.</li>}
          {ultimos.map((c) => {
            const inicio = new Date(c.inicio);
            const cor = c.status === "AUDITORIA" ? "text-warning" : c.fim ? "text-success" : "text-primary";
            return (
              <li key={c.id} className="flex items-center justify-between border border-border px-4 py-2">
                <div>
                  <div className="font-display uppercase">{c.nome_tarefa}</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {String(inicio.getHours()).padStart(2, "0")}:{String(inicio.getMinutes()).padStart(2, "0")}
                  </div>
                </div>
                <div className={`font-mono ${cor}`}>
                  {c.duracao_real_minutos != null ? `${c.duracao_real_minutos} min` : "EM CURSO"}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <FooterHint />
    </ScreenFrame>
  );
}

function EncerrarJornadaScreen({
  colaborador,
  jornada,
  pontos,
  onBack,
  onConfirm,
}: {
  colaborador: Colaborador;
  jornada: Jornada;
  pontos: number;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const now = useNow(1000);
  const sec = (now - new Date(jornada.inicio).getTime()) / 1000;
  useKeyboardNav({
    onDigit: (n) => n === 1 && onConfirm(),
    onEnter: onConfirm,
    onEscape: onBack,
  });
  return (
    <ScreenFrame titulo="Encerramento de jornada" onEsc={onBack}>
      <div className="panel p-8">
        <div className="text-2xl font-display uppercase">{colaborador.nome}</div>
        <div className="grid grid-cols-3 gap-6 mt-6">
          <Info label="Início" valor={new Date(jornada.inicio).toLocaleTimeString("pt-BR").slice(0, 5)} />
          <Info label="Agora" valor={new Date(now).toLocaleTimeString("pt-BR").slice(0, 5)} />
          <Info label="Total" valor={fmtDuration(sec)} highlight />
          <Info label="Pontuação" valor={`${pontos} / 1000`} highlight />
        </div>
      </div>
      <div className="mt-6">
        <MenuList
          items={[
            { kbd: "1", label: "CONFIRMAR ENCERRAMENTO", onSelect: onConfirm, variant: "danger", icon: <LogOut className="size-6" /> },
          ]}
        />
      </div>
      <FooterHint />
    </ScreenFrame>
  );
}

function FlashScreen({ texto, tone }: { texto: string; tone: "ok" | "warn" | "err" }) {
  const bg = tone === "ok" ? "bg-success/30" : tone === "warn" ? "bg-warning/30" : "bg-destructive/30";
  const fg = tone === "ok" ? "text-success" : tone === "warn" ? "text-warning" : "text-destructive";
  const Icon = tone === "ok" ? Zap : tone === "warn" ? Clock : AlertTriangle;
  return (
    <div className={`flex min-h-screen items-center justify-center px-8 ${bg}`}>
      <div className={`flex items-center gap-6 ${fg}`}>
        <Icon className="size-20" />
        <div className="font-display uppercase tracking-widest text-6xl font-bold">{texto}</div>
      </div>
    </div>
  );
}

/* ============ Helpers ============ */

function Info({ label, valor, highlight }: { label: string; valor: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs font-display uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-3xl ${highlight ? "text-primary font-bold" : ""}`}>{valor}</div>
    </div>
  );
}

function FooterHint({ extra }: { extra?: string }) {
  return (
    <div className="mt-6 flex gap-6 text-sm text-muted-foreground font-display uppercase">
      <span><span className="kbd">ESC</span> Voltar</span>
      {extra && <span><span className="kbd">⏎</span> {extra}</span>}
    </div>
  );
}

function horarioForaJanela(c: Colaborador): boolean {
  if (!c.horario_entrada) return false;
  const [h, m] = c.horario_entrada.split(":").map(Number);
  const agora = new Date();
  const ref = new Date();
  ref.setHours(h, m, 0, 0);
  const diffMin = Math.abs((agora.getTime() - ref.getTime()) / 60000);
  return diffMin > 30;
}
