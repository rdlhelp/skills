#!/usr/bin/env python3
"""Classifica uma URL antes do QA: LOCAL, HML ou PRODUCAO.

Uso: python guard_url.py <url> [<url> ...]
Saída: uma linha por URL ("LOCAL  http://127.0.0.1:5175/") e código de saída
0 se todas são LOCAL, 10 se alguma é HML (precisa do usuário presente),
20 se alguma é PRODUCAO ou desconhecida (pare e pergunte).

Regra: na dúvida, é PRODUCAO. Só é LOCAL o que roda nesta máquina; só é HML o que
tem o sufixo -hml nos domínios do LinkaPeça.
"""
import ipaddress
import io
import sys
from urllib.parse import urlparse

HML_HOSTS = {
    "hml.linkapeca.com.br",
    "cotacao-hml.linkapeca.com.br",
    "admin-hml.linkapeca.com.br",
    "api-hml.linkapeca.com.br",
}


def classify(raw: str) -> str:
    url = raw if "://" in raw else f"http://{raw}"
    host = (urlparse(url).hostname or "").lower().rstrip(".")
    if not host:
        return "PRODUCAO"
    if host == "localhost" or host.endswith(".localhost") or host.endswith(".test"):
        return "LOCAL"
    try:
        if ipaddress.ip_address(host).is_loopback:
            return "LOCAL"
    except ValueError:
        pass
    if host in HML_HOSTS or host.endswith("-hml.linkapeca.com.br"):
        return "HML"
    # *.workers.dev com -hml no nome do Worker também é homologação.
    if host.endswith(".workers.dev") and host.split(".")[0].startswith("linkapeca-") and host.split(".")[0].endswith("-hml"):
        return "HML"
    return "PRODUCAO"


def main() -> int:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    worst = 0
    for raw in sys.argv[1:]:
        kind = classify(raw)
        print(f"{kind:<9}{raw}")
        worst = max(worst, {"LOCAL": 0, "HML": 10, "PRODUCAO": 20}[kind])
    if worst == 20:
        print("PARE: URL de produção ou desconhecida. Não abra; pergunte ao usuário.")
    elif worst == 10:
        print("Homologação: só com o usuário presente; peça OK antes de qualquer ação que gere mensagem.")
    return worst


if __name__ == "__main__":
    sys.exit(main())
