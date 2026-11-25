// Progresso de cada aula (posição, concluída), última aula aberta e velocidade preferida.
// Gravado em progresso.json a cada mudança.
import { useCallback, useEffect, useRef, useState } from "react";
import { gravarProgresso, lerProgresso } from "../servicos/armazenamento";

export function useProgresso() {
  const [progresso, setProgresso] = useState(lerProgresso);
  const primeira = useRef(true);

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    gravarProgresso(progresso);
  }, [progresso]);

  /** Mescla campos no progresso de uma aula. */
  const atualizarAula = useCallback((id, campos) => {
    setProgresso((p) => ({
      ...p,
      aulas: { ...p.aulas, [id]: { ...p.aulas[id], ...campos, atualizadoEm: Date.now() } },
    }));
  }, []);

  /** Mescla campos gerais (ultima, velocidade). */
  const atualizarGeral = useCallback((campos) => setProgresso((p) => ({ ...p, ...campos })), []);

  return { progresso, atualizarAula, atualizarGeral };
}
