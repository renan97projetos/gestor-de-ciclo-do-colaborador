export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alertas: {
        Row: {
          colaborador_id: string | null
          criado_em: string
          id: string
          lido: boolean
          lido_em: string | null
          mensagem: string
          tipo: string
        }
        Insert: {
          colaborador_id?: string | null
          criado_em?: string
          id?: string
          lido?: boolean
          lido_em?: string | null
          mensagem: string
          tipo: string
        }
        Update: {
          colaborador_id?: string | null
          criado_em?: string
          id?: string
          lido?: boolean
          lido_em?: string | null
          mensagem?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "alertas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      ciclos: {
        Row: {
          colaborador_id: string
          criado_em: string
          desvio_minutos: number | null
          duracao_real_minutos: number | null
          fim: string | null
          id: string
          inicio: string
          jornada_id: string
          motivo_externo: string | null
          nome_tarefa: string
          observacao: string | null
          origem: string
          quantidade_pecas: number | null
          setor_id: string | null
          status: string
          subtarefa: string | null
          tarefa_padrao_id: string | null
          tempo_estimado_minutos: number | null
          tipo: string
          validado_supervisor: boolean | null
        }
        Insert: {
          colaborador_id: string
          criado_em?: string
          desvio_minutos?: number | null
          duracao_real_minutos?: number | null
          fim?: string | null
          id?: string
          inicio?: string
          jornada_id: string
          motivo_externo?: string | null
          nome_tarefa: string
          observacao?: string | null
          origem?: string
          quantidade_pecas?: number | null
          setor_id?: string | null
          status?: string
          subtarefa?: string | null
          tarefa_padrao_id?: string | null
          tempo_estimado_minutos?: number | null
          tipo?: string
          validado_supervisor?: boolean | null
        }
        Update: {
          colaborador_id?: string
          criado_em?: string
          desvio_minutos?: number | null
          duracao_real_minutos?: number | null
          fim?: string | null
          id?: string
          inicio?: string
          jornada_id?: string
          motivo_externo?: string | null
          nome_tarefa?: string
          observacao?: string | null
          origem?: string
          quantidade_pecas?: number | null
          setor_id?: string | null
          status?: string
          subtarefa?: string | null
          tarefa_padrao_id?: string | null
          tempo_estimado_minutos?: number | null
          tipo?: string
          validado_supervisor?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ciclos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ciclos_jornada_id_fkey"
            columns: ["jornada_id"]
            isOneToOne: false
            referencedRelation: "jornadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ciclos_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ciclos_tarefa_padrao_id_fkey"
            columns: ["tarefa_padrao_id"]
            isOneToOne: false
            referencedRelation: "tarefas_padrao"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          ativo: boolean
          criado_em: string
          horario_entrada: string | null
          horario_saida: string | null
          id: string
          matricula: string
          nome: string
          setor_padrao_id: string | null
          turno: string | null
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          horario_entrada?: string | null
          horario_saida?: string | null
          id?: string
          matricula: string
          nome: string
          setor_padrao_id?: string | null
          turno?: string | null
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          horario_entrada?: string | null
          horario_saida?: string | null
          id?: string
          matricula?: string
          nome?: string
          setor_padrao_id?: string | null
          turno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_setor_padrao_id_fkey"
            columns: ["setor_padrao_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      jornadas: {
        Row: {
          colaborador_id: string
          criado_em: string
          data: string
          fim: string | null
          id: string
          inicio: string
          pontuacao_final: number | null
          status: string
          total_minutos: number | null
          total_ocioso_minutos: number | null
          total_produtivo_minutos: number | null
          turno: string | null
        }
        Insert: {
          colaborador_id: string
          criado_em?: string
          data: string
          fim?: string | null
          id?: string
          inicio?: string
          pontuacao_final?: number | null
          status?: string
          total_minutos?: number | null
          total_ocioso_minutos?: number | null
          total_produtivo_minutos?: number | null
          turno?: string | null
        }
        Update: {
          colaborador_id?: string
          criado_em?: string
          data?: string
          fim?: string | null
          id?: string
          inicio?: string
          pontuacao_final?: number | null
          status?: string
          total_minutos?: number | null
          total_ocioso_minutos?: number | null
          total_produtivo_minutos?: number | null
          turno?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jornadas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
        ]
      }
      missoes: {
        Row: {
          ativo: boolean
          descricao: string | null
          id: string
          meta_tipo: string
          meta_valor: number
          periodo: string
          pontos_bonus: number
          titulo: string
        }
        Insert: {
          ativo?: boolean
          descricao?: string | null
          id?: string
          meta_tipo: string
          meta_valor: number
          periodo: string
          pontos_bonus?: number
          titulo: string
        }
        Update: {
          ativo?: boolean
          descricao?: string | null
          id?: string
          meta_tipo?: string
          meta_valor?: number
          periodo?: string
          pontos_bonus?: number
          titulo?: string
        }
        Relationships: []
      }
      missoes_colaborador: {
        Row: {
          colaborador_id: string
          concluida: boolean
          criado_em: string
          id: string
          missao_id: string
          periodo_referencia: string
          pontos_ganhos: number
          progresso: number
        }
        Insert: {
          colaborador_id: string
          concluida?: boolean
          criado_em?: string
          id?: string
          missao_id: string
          periodo_referencia: string
          pontos_ganhos?: number
          progresso?: number
        }
        Update: {
          colaborador_id?: string
          concluida?: boolean
          criado_em?: string
          id?: string
          missao_id?: string
          periodo_referencia?: string
          pontos_ganhos?: number
          progresso?: number
        }
        Relationships: [
          {
            foreignKeyName: "missoes_colaborador_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "missoes_colaborador_missao_id_fkey"
            columns: ["missao_id"]
            isOneToOne: false
            referencedRelation: "missoes"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencias: {
        Row: {
          ciclo_id: string | null
          colaborador_id: string
          criado_em: string
          descricao: string
          foto_url: string | null
          id: string
          jornada_id: string | null
          responsavel_externo: string | null
          tipo: string
        }
        Insert: {
          ciclo_id?: string | null
          colaborador_id: string
          criado_em?: string
          descricao: string
          foto_url?: string | null
          id?: string
          jornada_id?: string | null
          responsavel_externo?: string | null
          tipo: string
        }
        Update: {
          ciclo_id?: string | null
          colaborador_id?: string
          criado_em?: string
          descricao?: string
          foto_url?: string | null
          id?: string
          jornada_id?: string | null
          responsavel_externo?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_ciclo_id_fkey"
            columns: ["ciclo_id"]
            isOneToOne: false
            referencedRelation: "ciclos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_jornada_id_fkey"
            columns: ["jornada_id"]
            isOneToOne: false
            referencedRelation: "jornadas"
            referencedColumns: ["id"]
          },
        ]
      }
      pausas: {
        Row: {
          colaborador_id: string
          criado_em: string
          duracao_minutos: number | null
          excedeu_limite: boolean | null
          fim: string | null
          id: string
          inicio: string
          jornada_id: string
          justificativa: string | null
          tipo: string
          validado_supervisor: boolean | null
        }
        Insert: {
          colaborador_id: string
          criado_em?: string
          duracao_minutos?: number | null
          excedeu_limite?: boolean | null
          fim?: string | null
          id?: string
          inicio?: string
          jornada_id: string
          justificativa?: string | null
          tipo: string
          validado_supervisor?: boolean | null
        }
        Update: {
          colaborador_id?: string
          criado_em?: string
          duracao_minutos?: number | null
          excedeu_limite?: boolean | null
          fim?: string | null
          id?: string
          inicio?: string
          jornada_id?: string
          justificativa?: string | null
          tipo?: string
          validado_supervisor?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pausas_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pausas_jornada_id_fkey"
            columns: ["jornada_id"]
            isOneToOne: false
            referencedRelation: "jornadas"
            referencedColumns: ["id"]
          },
        ]
      }
      pontuacoes: {
        Row: {
          atualizado_em: string
          colaborador_id: string
          data: string
          eventos: Json
          id: string
          jornada_id: string
          pontos_final: number
          pontos_inicio: number
        }
        Insert: {
          atualizado_em?: string
          colaborador_id: string
          data: string
          eventos?: Json
          id?: string
          jornada_id: string
          pontos_final?: number
          pontos_inicio?: number
        }
        Update: {
          atualizado_em?: string
          colaborador_id?: string
          data?: string
          eventos?: Json
          id?: string
          jornada_id?: string
          pontos_final?: number
          pontos_inicio?: number
        }
        Relationships: [
          {
            foreignKeyName: "pontuacoes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pontuacoes_jornada_id_fkey"
            columns: ["jornada_id"]
            isOneToOne: true
            referencedRelation: "jornadas"
            referencedColumns: ["id"]
          },
        ]
      }
      regras_pontuacao: {
        Row: {
          descricao: string | null
          evento: string
          id: string
          pontos: number
        }
        Insert: {
          descricao?: string | null
          evento: string
          id?: string
          pontos: number
        }
        Update: {
          descricao?: string | null
          evento?: string
          id?: string
          pontos?: number
        }
        Relationships: []
      }
      setores: {
        Row: {
          criado_em: string
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      tarefas_padrao: {
        Row: {
          ativo: boolean
          criado_em: string
          id: string
          nome: string
          setor_id: string
          subtarefa: string | null
          tempo_medio_minutos: number
          tempo_por_peca_segundos: number | null
        }
        Insert: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome: string
          setor_id: string
          subtarefa?: string | null
          tempo_medio_minutos?: number
          tempo_por_peca_segundos?: number | null
        }
        Update: {
          ativo?: boolean
          criado_em?: string
          id?: string
          nome?: string
          setor_id?: string
          subtarefa?: string | null
          tempo_medio_minutos?: number
          tempo_por_peca_segundos?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tarefas_padrao_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
