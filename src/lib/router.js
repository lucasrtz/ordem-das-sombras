// Roteador mínimo por hash (#/mid/syndra): funciona em qualquer hospedagem estática.
import { useEffect, useState } from "react";

const read = () => (location.hash.replace(/^#/, "") || "/").replace(/\/+$/, "") || "/";

export function useRoute() {
  const [path, setPath] = useState(read);
  useEffect(() => {
    const on = () => {
      setPath(read());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return path.split("/").filter(Boolean);
}

export const go = (path) => {
  location.hash = path;
};
