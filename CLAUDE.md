# Penthos Office — Repo-Konventionen

## Verifikations-Screenshots

Alle Office-Verifikations-Screenshots (Layout-Checks, Phase-Verifikationen,
Live-Build-Vergleiche etc.) **immer** unter exakt diesem Pfad ablegen:

    C:\Users\paulp\penthos-office\_review\review.png

Regeln:

- Fester Ordner: `_review/` im Repo-Root. Falls nicht vorhanden, anlegen.
- Fester Dateiname: **immer** `review.png`. Jeder neue Screenshot **überschreibt**
  die alte Datei — so gibt es immer genau eine Datei und Paul weiß, wo sie liegt.
- Keine Phasen-Nummer im Namen, kein Suffix, kein Temp-Ordner.
- `_review/` ist in `.gitignore` — Screenshots werden NIE committet.
- Nach jedem Speichern: in der Antwort an Paul **immer** den exakten Pfad
  `C:\Users\paulp\penthos-office\_review\review.png` als eigene Klartext-Zeile
  ausgeben, damit er ihn direkt im Explorer öffnen kann.

Gilt sowohl für Screenshots vom lokalen Build als auch vom Live-Deploy
(`office.penthos.app`).
