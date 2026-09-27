# Bruno & Kiki – Das Geheimnis des Sonnensteins

Ein 3D-Jump'n'Run im Stil der großen N64-Plattformer: ein Braunbär und ein frecher Rennkuckuck im Rucksack,
eine Welt voller Sammelkram, brabbelnde Figuren, ein niesender Zauberer – und das alles
direkt im Browser. Läuft auf dem **Handy mit Touch-Steuerung** und auf dem **Fernseher mit Controller**.

> Eigenständiges Fan-Projekt, inspiriert von Spielen wie *Banjo-Kazooie*. Alle Figuren, Level,
> Texturen, Sounds und Musikstücke sind eigens für dieses Spiel erstellt bzw. werden zur Laufzeit
> erzeugt – es werden keine Inhalte aus Nintendo- oder Rare-Spielen verwendet.

![Icon](icons/icon-192.png)

## Die Geschichte

Der griesgrämige Zauberer **Nebelbart** hasst Sonnenschein. Eines Morgens zerschmettert er den
**Sonnenstein** auf dem Sonnenhügel und verstreut die Splitter in alle Winde – das Wurzeltal
wird grau und trüb. **Bruno** der Braunbär und seine beste Freundin **Kiki**, ein Rennkuckuck, der in Brunos Rucksack wohnt, ziehen los,
um die **Sonnensplitter** zurückzuholen und Nebelbart in seinem Turm das Handwerk zu legen.

| Welt | Was dich erwartet |
|---|---|
| **Wurzelhügel** (Hub) | Brunos Höhle, Oma Tilda erklärt alles, Lernsteine für Hochsprung & Stampfer, Felsturm und rissige Steinplatte. Tore zu allen Welten. |
| **Pilzwald** (1 Splitter) | Opa Eiche mit Wendel-Baumpilzen bis zur Krone, Hüpfpilze zur schwebenden Insel, Giftsumpf mit Seerosen, Käferlichtung, verlorenes Igelkind Stupsi. |
| **Muschelbucht** (4 Splitter) | Leuchtturm mit Wendeltreppe, Tauchgang zum Schiffswrack, Schatzsuche mit Piraten-Pelikan Pedro, Boss Käpt'n Knack, schwimmende Fässer. |
| **Nebelturm** (10 Splitter) | Aufstieg über die Außentreppe und Endkampf gegen Nebelbart in drei Phasen. |

Insgesamt gibt es **14 Sonnensplitter**, über **180 Beeren**, **10 Glühwürmchen** (alle fünf einer
Welt ergeben einen Splitter) und Extra-Herzen für alle Beeren einer Welt.

## Spielen

### Auf dem Handy
1. Die Seite im Browser öffnen (siehe [Veröffentlichen](#veröffentlichen)).
2. Handy quer halten, **Neues Spiel** antippen.
3. Optional: im Browser-Menü **„Zum Startbildschirm hinzufügen“** – dann startet das Spiel wie eine App im Vollbild und funktioniert auch offline.

### Auf dem Fernseher
Im Spiel unter **„Fernseher & Controller“** stehen beide Wege noch einmal erklärt:

- **Handy streamen + Controller:** Handybildschirm per Chromecast/„Smart View“/AirPlay auf den
  Fernseher spiegeln und einen Bluetooth-Controller (Xbox, PlayStation, Switch Pro, …) mit dem
  Handy koppeln. Der Controller wird automatisch erkannt, die Touch-Knöpfe verschwinden.
- **Spiel am Fernseher, Handy als Controller:** Das Spiel im Browser des Fernsehers, einer Konsole
  oder eines Laptops am HDMI-Anschluss öffnen → „Handy als Controller verbinden“ → QR-Code mit dem
  Handy scannen. Die Eingaben laufen per WebRTC direkt übers WLAN (für den Verbindungsaufbau wird
  kurz der öffentliche PeerJS-Server genutzt). Mit `?tv` in der Adresse (`…/index.html?tv`) wird
  die Anzeige für große Bildschirme vergrößert. Wer keinen öffentlichen Server nutzen möchte, kann
  einen eigenen [PeerServer](https://github.com/peers/peerjs-server) starten
  (`npx peer --port 9000`) und ihn mit `?peer=<host>:9000` angeben – der QR-Code übernimmt die
  Einstellung automatisch für das Handy.

## Steuerung

| Aktion | Handy | Controller | Tastatur |
|---|---|---|---|
| Laufen | linke Bildschirmhälfte (Joystick erscheint unterm Daumen) | linker Stick / Steuerkreuz | WASD / Pfeiltasten |
| Kamera | rechte Hälfte wischen, 📷 zentriert | rechter Stick, Y zentriert | Q / E, R zentriert |
| Springen (A) | grüner Knopf | A / Kreuz | Leertaste |
| Angriff / Reden (B) | blauer Knopf | B / X | J |
| Ducken / Stampfen (Z) | lila Knopf | Schultertasten / Trigger | Z / C / Shift |
| Pause | ⏸ oben rechts | Start | Esc |

**Bewegungen:** Sprung, Flattersprung (in der Luft A halten), Rolle (B), Schnabelhieb (B in der
Luft), sowie an Lernsteinen: **Hochsprung** (Z halten + A), **Stampfer** (Z in der Luft) und
**Tauchen** (Z im Wasser).

## Technik

- Reines **HTML5/JavaScript** mit [three.js](https://threejs.org) (WebGL) – kein Build-Schritt nötig.
- **N64-Look:** Bild wird absichtlich in niedriger Auflösung (240p/360p) gerendert und weich
  hochskaliert, Low-Poly-Modelle aus Grundformen, Vertex-Farben, kleine prozedurale Texturen mit
  bilinearer Filterung, Blob-Schatten, Entfernungsnebel. Auflösung und „Pixel-Look“ in den Optionen.
- **Sound komplett synthetisiert** (Web Audio): Effekte, Brabbel-Stimmen und eigene Musikstücke pro Welt.
- **PWA:** Manifest + Service Worker → installierbar und offline spielbar.
- Spielstand wird automatisch im Browser gespeichert.

```
index.html            Spiel
controller.html       Handy-Controller für den TV-Modus
src/engine/           Renderer, Eingabe (Touch/Gamepad/Tastatur/Remote), Kamera, Kollision, Audio, Partikel
src/game/             Spielfigur, Modelle, Gegner & Objekte, Dialoge, Menüs, HUD, Speichern
src/levels/           Wurzelhügel, Pilzwald, Muschelbucht, Nebelturm
vendor/               three.js, PeerJS, QR-Code-Generator (siehe vendor/LICENSES.md)
tools/                Icon-Generator
```

## Lokal starten

```bash
npm start            # startet einen kleinen Webserver auf http://localhost:8080
```

Zum Testen auf dem Handy im selben WLAN `http://<IP-des-Rechners>:8080` öffnen. Hinweis: Service
Worker und Vollbild funktionieren auf dem Handy nur über **https** – dafür am besten GitHub Pages nutzen.

## Veröffentlichen

Das Repository enthält einen GitHub-Actions-Workflow (`.github/workflows/pages.yml`):

1. Auf GitHub unter **Settings → Pages** als Quelle **„GitHub Actions“** wählen.
2. Den Code auf `main` bringen (oder den Workflow manuell starten).
3. Das Spiel ist danach unter `https://<benutzer>.github.io/<repo>/` erreichbar – diese Adresse
   auf dem Handy öffnen und zum Startbildschirm hinzufügen.

Wer eine „echte“ App für den Play Store / App Store möchte, kann die Webseite z.B. mit
[Capacitor](https://capacitorjs.com) oder als Trusted Web Activity verpacken.

## Lizenz

Code: MIT (siehe `LICENSE`). Verwendete Bibliotheken und Schriften: siehe `vendor/LICENSES.md`.
