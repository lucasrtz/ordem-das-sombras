import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { PIX_KEY, PIX_NAME, PIX_CITY, PIX_AMOUNTS } from "../config.js";
import { pixPayload } from "../lib/pix.js";

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export default function PixModal({ onClose }) {
  const dialog = useRef(null);
  const [qr, setQr] = useState(null);
  const [copied, setCopied] = useState("");
  const [preset, setPreset] = useState(0); // 0 = valor livre
  const [custom, setCustom] = useState("");
  const customValue = Math.min(10000, Math.max(0, parseFloat(custom.replace(",", ".")) || 0));
  const amount = Math.round((custom ? customValue : preset) * 100) / 100;
  const configured = PIX_KEY.trim().length > 0;
  const payload = configured ? pixPayload({ key: PIX_KEY, name: PIX_NAME, city: PIX_CITY, amount }) : "";

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  useEffect(() => {
    if (!payload) return;
    QRCode.toDataURL(payload, { margin: 1, width: 240, color: { dark: "#0b0709", light: "#f4ecdf" } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [payload]);

  const doCopy = async (what, text) => {
    if (await copy(text)) {
      setCopied(what);
      setTimeout(() => setCopied(""), 1800);
    }
  };

  return (
    <dialog
      ref={dialog}
      className="modal"
      aria-labelledby="pix-title"
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && onClose()}
    >
      <div className="modal-card">
        <button className="modal-x" onClick={onClose} aria-label="Fechar">
          ×
        </button>
        <h2 id="pix-title" className="card-title">
          Apoiar via Pix
        </h2>
        {configured ? (
          <>
            <div className="chips pix-amounts" role="group" aria-label="Valor">
              {[0, ...PIX_AMOUNTS].map((v) => (
                <button
                  key={v}
                  className="chip"
                  aria-pressed={!custom && preset === v}
                  onClick={() => {
                    setPreset(v);
                    setCustom("");
                  }}
                >
                  {v ? `R$ ${v}` : "Livre"}
                </button>
              ))}
              <input
                className="search pix-custom"
                inputMode="decimal"
                placeholder="Outro valor"
                aria-label="Outro valor em reais"
                value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/[^0-9.,]/g, ""))}
              />
            </div>
            <p className="fine">
              {amount > 0
                ? `QR com R$ ${amount.toFixed(2).replace(".", ",")}. Aponte a câmera do app do banco.`
                : "Valor livre: você digita no app do banco. Aponte a câmera pro QR ou copie a chave."}
            </p>
            <div className="qr">{qr ? <img src={qr} alt="QR code Pix" width="240" height="240" /> : <span>Gerando…</span>}</div>
            <div className="pix-key">
              <code>{PIX_KEY}</code>
              <button className="btn-ghost small" onClick={() => doCopy("key", PIX_KEY)}>
                {copied === "key" ? "Copiado!" : "Copiar chave"}
              </button>
            </div>
            <button className="btn-ghost small wide" onClick={() => doCopy("payload", payload)}>
              {copied === "payload" ? "Copiado!" : "Copiar Pix copia e cola"}
            </button>
          </>
        ) : (
          <p className="note">Chave Pix ainda não configurada. Preencha PIX_KEY em src/config.js.</p>
        )}
        <p className="fine">
          Apoio voluntário ao site. Não libera conteúdo nenhum: tudo aqui continua aberto pra todo mundo.
        </p>
      </div>
    </dialog>
  );
}
