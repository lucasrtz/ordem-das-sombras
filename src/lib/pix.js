// Payload "Pix copia e cola" (BR Code, padrão EMV do Banco Central), gerado no cliente.
const ascii = (s, max) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .\-@+]/g, "")
    .toUpperCase()
    .slice(0, max)
    .trim();

const field = (id, value) => id + String(value.length).padStart(2, "0") + value;

function crc16(str) {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

// amount opcional (em reais); sem valor, o pagador digita no app do banco.
export function pixPayload({ key, name, city, amount, txid = "***" }) {
  const account = field("00", "br.gov.bcb.pix") + field("01", key.trim());
  const body =
    field("00", "01") +
    field("26", account) +
    field("52", "0000") +
    field("53", "986") +
    (amount > 0 ? field("54", amount.toFixed(2)) : "") +
    field("58", "BR") +
    field("59", ascii(name, 25) || "APOIO") +
    field("60", ascii(city, 15) || "BRASIL") +
    field("62", field("05", txid)) +
    "6304";
  return body + crc16(body);
}
