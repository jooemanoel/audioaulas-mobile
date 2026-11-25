// Downloads dos MP3 da release: um por vez, em fila. Cada um pode ser cancelado.
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { baixarAudio } from "../servicos/armazenamento";

export function useDownloads({ aoConcluir }) {
  const [fila, setFila] = useState([]); // ids aguardando (o primeiro é o que está baixando)
  const [fracoes, setFracoes] = useState({}); // id → 0..1
  const [erro, setErro] = useState(null);
  const filaRef = useRef([]);
  const aulasRef = useRef({});
  const controle = useRef(null); // { id, abort }
  const rodando = useRef(false);
  const callbacks = useRef({});
  useLayoutEffect(() => {
    callbacks.current = { aoConcluir };
  });

  const publicarFila = () => setFila([...filaRef.current]);

  const processar = useCallback(async () => {
    if (rodando.current) return;
    rodando.current = true;
    while (filaRef.current.length) {
      const id = filaRef.current[0];
      const aula = aulasRef.current[id];
      const abort = new AbortController();
      controle.current = { id, abort };
      setFracoes((f) => ({ ...f, [id]: 0 }));
      let ultimo = 0;
      try {
        await baixarAudio(
          aula,
          (fr) => {
            // Atualiza a tela a cada 1% para não sobrecarregar.
            if (fr - ultimo >= 0.01 || fr === 1) {
              ultimo = fr;
              setFracoes((f) => ({ ...f, [id]: fr }));
            }
          },
          abort.signal,
        );
        callbacks.current.aoConcluir?.(aula);
      } catch (e) {
        if (!abort.signal.aborted) {
          setErro(`Falha ao baixar ${aula.item} ${aula.titulo}: ${e?.message || e}. Verifique a internet e tente de novo.`);
          // Erro de rede: para a fila inteira em vez de falhar aula por aula.
          filaRef.current = [id];
        }
      }
      filaRef.current = filaRef.current.filter((x) => x !== id);
      controle.current = null;
      setFracoes((f) => {
        const n = { ...f };
        delete n[id];
        return n;
      });
      publicarFila();
    }
    rodando.current = false;
  }, []);

  /** Coloca aulas na fila de download. */
  const baixar = useCallback(
    (aulas) => {
      setErro(null);
      for (const a of aulas) {
        aulasRef.current[a.id] = a;
        if (!filaRef.current.includes(a.id)) filaRef.current.push(a.id);
      }
      publicarFila();
      processar();
    },
    [processar],
  );

  /** Cancela uma aula (ou todas, sem id). */
  const cancelar = useCallback((id) => {
    if (id == null) {
      filaRef.current = controle.current ? [controle.current.id] : [];
      controle.current?.abort.abort();
    } else if (controle.current?.id === id) {
      controle.current.abort.abort();
    } else {
      filaRef.current = filaRef.current.filter((x) => x !== id);
    }
    publicarFila();
  }, []);

  return { fila, fracoes, erro, limparErro: () => setErro(null), baixar, cancelar };
}
